import type { Database } from "@/server/db/mysql";
import { canEditSubmission } from "@/lib/submissions/submissionStatus";
import { assertEventAcceptsSubmissions } from "@/lib/events/eventSubmissionPhase";

export async function assertEvidenceEditable(db: Database, submissionId: number, userId: number, type: "student"|"officer") {
  const row = (await db.first(`SELECT s.status,e.status event_status,e.start_at,e.end_at,e.allow_late
    FROM submissions s JOIN events e ON e.id=s.event_id WHERE s.id=? AND s.user_id=? AND e.type=?`, [submissionId, userId, type])) as {status:string;event_status:string;start_at:string;end_at:string;allow_late:number}|undefined;
  if (!row || !canEditSubmission(row.status)) throw new Error("Hồ sơ không còn được phép chỉnh sửa.");
  assertEventAcceptsSubmissions({status:row.event_status,startAt:row.start_at,endAt:row.end_at,allowLate:Number(row.allow_late)===1});
}
