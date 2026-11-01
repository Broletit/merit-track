"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { requireChangeReason, writeAuditLog } from "@/server/audit/writeAuditLog";

export async function deleteConductCategory(categoryId:number,formData?:FormData){
  const admin=await requireAdminContext();const db=getDatabase();const reason=requireChangeReason(formData?.get("reason")??null);
  const item=(await db.first(`SELECT * FROM conduct_score_categories WHERE id=?`, [categoryId])) as Record<string,unknown>|undefined;
  if(!item)throw new Error("Mục điểm không tồn tại.");
  const children=Number(((await db.first(`SELECT COUNT(*) total FROM conduct_score_categories WHERE parent_id=?`, [categoryId])) as {total:number}).total);
  if(children>0)throw new Error("Mục này còn mục con. Hãy xóa hoặc chuyển các mục con trước.");
  const activities=Number(((await db.first(`SELECT COUNT(*) total FROM activities WHERE conduct_category_id=?`, [categoryId])) as {total:number}).total);
  if(activities>0)throw new Error(`Mục này đang được ${activities} hoạt động sử dụng. Hãy chuyển các hoạt động sang mục khác trước khi xóa.`);
  const tx=(async () => (await db.withTransaction(async ()=>{(await db.execute(`DELETE FROM conduct_score_categories WHERE id=?`, [categoryId]));(await writeAuditLog({db,actorUserId:admin.id,action:"conduct.category.delete",entityType:"conduct_score_category",entityId:categoryId,reason,before:item,after:null}));})));(await tx());
  revalidatePath("/dashboard/admin/conduct-score-frame");revalidatePath("/dashboard/admin/activities/create");revalidatePath("/dashboard/student/conduct-score");
  return {ok:true,message:"Đã xóa mục điểm và lưu lịch sử thao tác."};
}
