"use server";

import { revalidatePath } from "next/cache";
import { requireStudentContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { assertEventAcceptsSubmissions } from "@/lib/events/eventSubmissionPhase";
import { evaluateSubmissionAuto } from "@/server/events/evaluateSubmissionAuto";
import { assertSubmissionRequirements } from "@/server/submissions/evaluateSubmissionRequirements";

type SubmissionRow={id:number;event_id:number;user_id:number;status:string;event_status:string;event_start_at:string;event_end_at:string;event_allow_late:number};

export async function submitStudentSubmission(submissionId:number){
  const user=await requireStudentContext();
  const db=getDb();
  const submission=db.prepare(`
    SELECT s.id,s.event_id,s.user_id,s.status,e.status event_status,
      e.start_at event_start_at,e.end_at event_end_at,e.allow_late event_allow_late
    FROM submissions s INNER JOIN events e ON e.id=s.event_id
    WHERE s.id=? AND s.user_id=? LIMIT 1
  `).get(submissionId,user.id) as SubmissionRow|undefined;
  if(!submission) throw new Error("Không tìm thấy hồ sơ.");
  assertEventAcceptsSubmissions({status:submission.event_status,startAt:submission.event_start_at,endAt:submission.event_end_at,allowLate:Number(submission.event_allow_late)===1});
  if(!["draft","needs_revision_v1","needs_revision_v2","rejected_v1","rejected_v2"].includes(submission.status)) throw new Error("Hồ sơ hiện không thể nộp.");

  evaluateSubmissionAuto(submissionId);
  assertSubmissionRequirements(db,submissionId);

  db.prepare(`UPDATE submissions SET status='submitted_v1',submitted_at=datetime('now'),updated_at=datetime('now') WHERE id=? AND user_id=?`).run(submissionId,user.id);
  db.prepare(`
    INSERT INTO submission_timeline(submission_id,actor_user_id,action,from_status,to_status,message,created_at)
    VALUES(?,?,'submit',?,'submitted_v1','Sinh viên gửi hồ sơ',datetime('now'))
  `).run(submissionId,user.id,submission.status);
  revalidatePath(`/dashboard/student/submissions/${submissionId}`);
  revalidatePath("/dashboard/student/submissions");
  revalidatePath("/dashboard/class-officer/reviews");
  return {ok:true,message:"Đã gửi hồ sơ thành công."};
}
