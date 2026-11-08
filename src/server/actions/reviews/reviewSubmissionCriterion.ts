"use server";

import { revalidatePath } from "next/cache";
import { requireLogin } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { evaluateSubmission } from "@/server/submissions/evaluateSubmission";
import { assertSubmissionReviewAccess } from "@/server/auth/submissionReviewAccess";

export async function reviewSubmissionCriterion(submissionId:number,criteriaCode:string,decision:"pass"|"fail",approvedCount=1){
  const user=await requireLogin();
  const db=getDatabase();
  if(!Number.isInteger(approvedCount)||approvedCount<0||approvedCount>50)throw new Error("Số lượt công nhận phải từ 0 đến 50.");
  if(!["pass","fail"].includes(decision))throw new Error("Kết quả tiêu chí không hợp lệ.");
  const row=(await db.first(`SELECT s.status,s.class_id,i.code,i.is_required,e.type event_type,
    CASE WHEN e.status='published' AND CAST(e.end_at AS DATETIME(3))>=CURRENT_TIMESTAMP(3) THEN 1 ELSE 0 END review_open,
    EXISTS(SELECT 1 FROM submission_ready_files sf WHERE sf.submission_id=s.id AND sf.criteria_code=i.code) has_file,
    EXISTS(SELECT 1 FROM submission_items si WHERE si.submission_id=s.id AND si.criteria_code=i.code AND TRIM(COALESCE(si.content_text,''))<>'') has_note,
    EXISTS(SELECT 1 FROM submission_auto_results ar WHERE ar.submission_id=s.id AND ar.criteria_code=i.code AND ar.passed=1) auto_passed
    FROM submissions s
    INNER JOIN events e ON e.id=s.event_id
    INNER JOIN event_criteria_items i ON i.event_id=s.event_id AND i.code=?
    WHERE s.id=? LIMIT 1`, [criteriaCode, submissionId])) as {status:string;class_id:number;code:string;event_type:string;review_open:number;has_file:number;has_note:number;auto_passed:number}|undefined;
  if(!row)throw new Error("Không tìm thấy tiêu chí trong hồ sơ.");
  (await assertSubmissionReviewAccess(db, user, row, true));
  const round=row.status==="submitted_v1"?1:row.status==="submitted_v2"?2:0;
  if(!round)throw new Error("Hồ sơ không ở trạng thái chờ duyệt.");
  if(Number(row.auto_passed)===1)throw new Error("Tiêu chí này đã đạt tự động.");
  if(!Number(row.has_file)&&!Number(row.has_note))throw new Error("Tiêu chí chưa có minh chứng để đánh giá.");
  if(round===1&&(user.role==="class_officer"||user.role==="faculty_officer")){
    const allowed=user.role==="class_officer"
      ? (await db.first(`SELECT 1 FROM class_members WHERE user_id=? AND class_id=? AND left_at IS NULL LIMIT 1`, [user.id, row.class_id]))
      : (await db.first(`SELECT 1 FROM faculty_class_assignments WHERE faculty_officer_id=? AND class_id=? LIMIT 1`, [user.id, row.class_id]));
    if(!allowed)throw new Error("Bạn không có quyền duyệt hồ sơ lớp này.");
  }else if(round===2&&user.role==="faculty_officer"){
    const allowed=(await db.first(`SELECT 1 FROM faculty_class_assignments WHERE faculty_officer_id=? AND class_id=? LIMIT 1`, [user.id, row.class_id]));
    if(!allowed)throw new Error("Bạn không có quyền duyệt hồ sơ lớp này.");
  }else if(user.role!=="admin")throw new Error("Bạn không có quyền đánh giá tiêu chí ở vòng này.");
  (await db.execute(`INSERT INTO submission_criteria_reviews(submission_id,criteria_code,round,reviewer_id,decision,reviewed_at)
    VALUES(?,?,?,?,?,CURRENT_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE reviewer_id=VALUES(reviewer_id),decision=VALUES(decision),reviewed_at=CURRENT_TIMESTAMP(3)`, [submissionId, criteriaCode, round, user.id, decision]));
  await db.execute(`INSERT INTO submission_evidence_reviews(submission_id,evidence_unit_id,round,reviewer_id,decision,approved_count,reviewed_at)
    SELECT eu.submission_id,eu.id,?,?,?,CASE WHEN ?='pass' THEN LEAST(GREATEST(1,COALESCE(eu.claimed_count,1)),?) ELSE 0 END,CURRENT_TIMESTAMP(3)
    FROM submission_evidence_units eu WHERE eu.submission_id=? AND eu.criteria_code=?
    ON DUPLICATE KEY UPDATE reviewer_id=VALUES(reviewer_id),decision=VALUES(decision),approved_count=VALUES(approved_count),reviewed_at=CURRENT_TIMESTAMP(3)`, [round,user.id,decision,decision,approvedCount,submissionId,criteriaCode]);
  if(row.event_type==="officer")(await evaluateSubmission(submissionId));
  revalidatePath(`/dashboard/class-officer/reviews/${submissionId}`);
  revalidatePath(`/dashboard/faculty-officer/reviews/${submissionId}`);
  return {ok:true,message:decision==="pass"?"Đã xác nhận tiêu chí đạt.":"Đã đánh dấu tiêu chí chưa đạt."};
}
