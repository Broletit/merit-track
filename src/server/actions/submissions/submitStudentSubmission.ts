"use server";

import { revalidatePath } from "next/cache";
import { requireStudentContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { assertEventAcceptsSubmissions } from "@/lib/events/eventSubmissionPhase";
import { evaluateSubmissionAuto } from "@/server/events/evaluateSubmissionAuto";
import { evaluateSubmissionRequirements } from "@/server/submissions/evaluateSubmissionRequirements";

type SubmissionRow={id:number;event_id:number;user_id:number;status:string;review_round:number;event_status:string;event_start_at:string;event_end_at:string;event_allow_late:number};

export async function submitStudentSubmission(submissionId:number){
  const user=await requireStudentContext();
  const db=getDatabase();
  const submission=(await db.first(`
    SELECT s.id,s.event_id,s.user_id,s.status,s.review_round,e.status event_status,
      e.start_at event_start_at,e.end_at event_end_at,e.allow_late event_allow_late
    FROM submissions s INNER JOIN events e ON e.id=s.event_id
    WHERE s.id=? AND s.user_id=? AND e.type='student' LIMIT 1
  `, [submissionId, user.id])) as SubmissionRow|undefined;
  if(!submission) throw new Error("Không tìm thấy hồ sơ.");
  assertEventAcceptsSubmissions({status:submission.event_status,startAt:submission.event_start_at,endAt:submission.event_end_at,allowLate:Number(submission.event_allow_late)===1});
  if(!["draft","needs_revision_v1","needs_revision_v2","rejected_v1","rejected_v2"].includes(submission.status)) throw new Error("Hồ sơ hiện không thể nộp.");

  (await evaluateSubmissionAuto(submissionId));
  const requirements = (await evaluateSubmissionRequirements(db, submissionId));
  if (!requirements.valid) {
    return {
      ok: false,
      message: "Vui lòng bổ sung và lưu minh chứng trước khi hoàn tất hồ sơ.",
      missingCriteria: requirements.missingCriteria,
      deficientGroups: requirements.deficientGroups,
    };
  }

  const nextStatus = Number(submission.review_round) === 2 ? "submitted_v2" : "submitted_v1";
  (await db.execute(`UPDATE submissions SET status=?,submitted_at=CURRENT_TIMESTAMP(3),updated_at=CURRENT_TIMESTAMP(3) WHERE id=? AND user_id=?`, [nextStatus, submissionId, user.id]));
  (await db.execute(`
    INSERT INTO submission_timeline(submission_id,actor_user_id,action,from_status,to_status,message,created_at)
    VALUES(?,?,'submit',?,?,'Sinh viên gửi hồ sơ',CURRENT_TIMESTAMP(3))
  `, [submissionId, user.id, submission.status, nextStatus]));
  revalidatePath(`/dashboard/student/submissions/${submissionId}`);
  revalidatePath("/dashboard/student/submissions");
  revalidatePath("/dashboard/class-officer/reviews");
  return {ok:true,message:"Đã gửi hồ sơ thành công."};
}
