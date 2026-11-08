"use server";

import { revalidatePath } from "next/cache";
import { requireLogin } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";

type SubmissionRow = { id:number; user_id:number; class_id:number; status:string; review_round:number; event_type:string; review_open:number };

export async function reopenSubmission(submissionId:number) {
  const user=await requireLogin();
  const actingRole=user.loginContext ?? user.role;
  const roles=new Set(user.roles?.length ? user.roles : [user.role]);
  if (!["admin","class_officer","faculty_officer"].includes(actingRole)||!roles.has(actingRole)) throw new Error("Bạn không có quyền mở lại hồ sơ trong giao diện này.");

  const db=getDatabase();
  const submission=await db.first<SubmissionRow>(`SELECT s.id,s.user_id,s.class_id,s.status,s.review_round,e.type AS event_type,CASE WHEN e.status='published' AND CAST(e.end_at AS DATETIME(3))>=CURRENT_TIMESTAMP(3) THEN 1 ELSE 0 END AS review_open FROM submissions s INNER JOIN events e ON e.id=s.event_id WHERE s.id=? LIMIT 1`,[submissionId]);
  if (!submission) throw new Error("Hồ sơ không tồn tại.");
  if (submission.event_type!=="student"||submission.status!=="failed") throw new Error("Chỉ có thể mở lại hồ sơ sinh viên đã đóng.");
  if (Number(submission.review_open)!==1) throw new Error("Đợt xét đã khóa hoặc đã kết thúc, không thể mở lại hồ sơ.");
  if (actingRole==="class_officer") {
    if (Number(submission.review_round)!==1) throw new Error("Cán bộ lớp chỉ có thể mở lại hồ sơ ở vòng 1.");
    const allowed=await db.first("SELECT 1 FROM class_members WHERE user_id=? AND class_id=? AND left_at IS NULL LIMIT 1",[user.id,submission.class_id]);
    if (!allowed) throw new Error("Bạn không có quyền duyệt hồ sơ lớp này.");
  }
  if (actingRole==="faculty_officer") {
    const allowed=await db.first("SELECT 1 FROM faculty_class_assignments WHERE faculty_officer_id=? AND class_id=? LIMIT 1",[user.id,submission.class_id]);
    if (!allowed) throw new Error("Bạn không có quyền duyệt hồ sơ lớp này.");
  }
  const nextStatus=Number(submission.review_round)===2?"submitted_v2":"submitted_v1";
  await db.withTransaction(async()=>{
    await db.execute("UPDATE submissions SET status=?,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?",[nextStatus,submission.id]);
    await db.execute("INSERT INTO submission_timeline(submission_id,actor_user_id,action,from_status,to_status,message,created_at) VALUES(?,?, 'reopen', 'failed', ?, 'Mở lại hồ sơ để tiếp tục xét duyệt.', CURRENT_TIMESTAMP(3))",[submission.id,user.id,nextStatus]);
    await db.execute("INSERT INTO notifications(user_id,type,title,content,link) VALUES(?,?,?,?,?)",[submission.user_id,"submission_review","Hồ sơ đã được mở lại","Hồ sơ đã được mở lại để tiếp tục xét duyệt.",`/dashboard/student/submissions/${submission.id}`]);
  });
  for(const path of ["/dashboard/class-officer/reviews","/dashboard/faculty-officer/reviews",`/dashboard/class-officer/reviews/${submission.id}`,`/dashboard/faculty-officer/reviews/${submission.id}`,"/dashboard/student/notifications",`/dashboard/student/submissions/${submission.id}`]) revalidatePath(path);
  return {ok:true,message:"Đã mở lại hồ sơ."};
}
