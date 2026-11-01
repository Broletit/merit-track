"use server";
import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { writeAuditLog } from "@/server/audit/writeAuditLog";

export async function cancelRegistrationAdmin(_previous:{ok:boolean;message:string},form:FormData) {
 try {
  const admin=await requireAdminContext();const db=getDatabase();const id=Number(form.get('registrationId'));const reason='Quản trị viên xác nhận hủy đăng ký theo đề nghị của sinh viên.';
  const activityId=(await (async () => (await db.withTransaction(async ()=>{
   const row=(await db.first('SELECT id,activity_id,user_id,status FROM activity_registrations WHERE id=?', [id])) as {id:number;activity_id:number;user_id:number;status:string}|undefined;
   if(!row)throw Error('Không tìm thấy đăng ký.');
   if(row.status==='cancelled')throw Error('Đăng ký đã được hủy.');
   if(row.status==='attended')throw Error('Không thể hủy đăng ký đã được điểm danh.');
   (await db.execute("UPDATE activity_registrations SET status='cancelled',note=? WHERE id=?", [reason, id]));
   (await db.execute("DELETE FROM conduct_scores WHERE user_id=? AND source_type='activity' AND source_id=?", [row.user_id, row.activity_id]));
   (await writeAuditLog({db,actorUserId:admin.id,action:'activity.registration.cancel',entityType:'activity_registration',entityId:id,reason,before:{status:row.status},after:{status:'cancelled'}}));
   return row.activity_id;
  })))());
  for(const route of ['/dashboard/admin/activities','/dashboard/student/activities','/dashboard/student/conduct-score',`/dashboard/admin/activities/${activityId}`,`/dashboard/student/activities/${activityId}`])revalidatePath(route);
  return {ok:true,message:'Đã hủy đăng ký và trả lại chỗ.'};
 }catch(error){return {ok:false,message:error instanceof Error?error.message:'Không thể hủy đăng ký.'};}
}
