"use server";

import { revalidatePath } from "next/cache";
import { requireLogin } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";

export async function reviewSubmissionCriterion(submissionId:number,criteriaCode:string,decision:"pass"|"fail"){
  const user=await requireLogin();
  const db=getDb();
  if(!["pass","fail"].includes(decision))throw new Error("Kết quả tiêu chí không hợp lệ.");
  const row=db.prepare(`SELECT s.status,s.class_id,i.code,i.is_required,
    EXISTS(SELECT 1 FROM submission_files sf WHERE sf.submission_id=s.id AND sf.criteria_code=i.code) has_file,
    EXISTS(SELECT 1 FROM submission_items si WHERE si.submission_id=s.id AND si.criteria_code=i.code AND TRIM(COALESCE(si.content_text,''))<>'') has_note,
    EXISTS(SELECT 1 FROM submission_auto_results ar WHERE ar.submission_id=s.id AND ar.criteria_code=i.code AND ar.passed=1) auto_passed
    FROM submissions s INNER JOIN event_criteria_items i ON i.event_id=s.event_id AND i.code=? WHERE s.id=? LIMIT 1`).get(criteriaCode,submissionId) as {status:string;class_id:number;code:string;has_file:number;has_note:number;auto_passed:number}|undefined;
  if(!row)throw new Error("Không tìm thấy tiêu chí trong hồ sơ.");
  const round=row.status==="submitted_v1"?1:row.status==="submitted_v2"?2:0;
  if(!round)throw new Error("Hồ sơ không ở trạng thái chờ duyệt.");
  if(Number(row.auto_passed)===1)throw new Error("Tiêu chí này đã đạt tự động.");
  if(!Number(row.has_file)&&!Number(row.has_note))throw new Error("Tiêu chí chưa có minh chứng để đánh giá.");
  if(round===1&&user.role==="class_officer"){
    const allowed=db.prepare(`SELECT 1 FROM class_members WHERE user_id=? AND class_id=? AND left_at IS NULL LIMIT 1`).get(user.id,row.class_id);
    if(!allowed)throw new Error("Bạn không có quyền duyệt hồ sơ lớp này.");
  }else if(round===2&&user.role==="faculty_officer"){
    const allowed=db.prepare(`SELECT 1 FROM faculty_class_assignments WHERE faculty_officer_id=? AND class_id=? LIMIT 1`).get(user.id,row.class_id);
    if(!allowed)throw new Error("Bạn không có quyền duyệt hồ sơ lớp này.");
  }else if(user.role!=="admin")throw new Error("Bạn không có quyền đánh giá tiêu chí ở vòng này.");
  db.prepare(`INSERT INTO submission_criteria_reviews(submission_id,criteria_code,round,reviewer_id,decision,reviewed_at)
    VALUES(?,?,?,?,?,datetime('now')) ON CONFLICT(submission_id,criteria_code,round) DO UPDATE SET reviewer_id=excluded.reviewer_id,decision=excluded.decision,reviewed_at=datetime('now')`).run(submissionId,criteriaCode,round,user.id,decision);
  revalidatePath(`/dashboard/class-officer/reviews/${submissionId}`);
  revalidatePath(`/dashboard/faculty-officer/reviews/${submissionId}`);
  return {ok:true,message:decision==="pass"?"Đã xác nhận tiêu chí đạt.":"Đã đánh dấu tiêu chí chưa đạt."};
}
