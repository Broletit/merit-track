import type { Database } from "@/server/db/mysql";

/** Reopen only automatic deadline failures, preserving all human review decisions. Caller holds a write transaction. */
export async function restoreDeadlineFinalizedSubmissions(db:Database,eventId:number,actorUserId:number) {
  const rows=(await db.rows(`SELECT s.id,t.from_status FROM submissions s
    JOIN events e ON e.id=s.event_id
    JOIN submission_timeline t ON t.id=(SELECT MAX(latest.id) FROM submission_timeline latest WHERE latest.submission_id=s.id AND latest.to_status IS NOT NULL)
    WHERE s.event_id=? AND s.status='failed' AND e.status='published' AND CAST(e.end_at AS DATETIME(3))>CURRENT_TIMESTAMP(3)
      AND t.action='finalize' AND t.message LIKE 'Đã hết hạn nhận hồ sơ%'
      AND t.from_status IN ('draft','submitted_v1','submitted_v2','needs_revision_v1','needs_revision_v2','rejected_v1','rejected_v2')`, [eventId])) as Array<{id:number;from_status:string}>;
  
  
  let restored=0;
  for(const row of rows){if(!(await db.execute("UPDATE submissions SET status=?,updated_at=CURRENT_TIMESTAMP(3) WHERE id=? AND status='failed'", [row.from_status, row.id])).changes)continue;(await db.execute("INSERT INTO submission_timeline(submission_id,action,from_status,to_status,message,actor_user_id) VALUES(?,'reopen_deadline','failed',?,'Đợt xét đã được gia hạn; hồ sơ được khôi phục trạng thái trước khi tự chốt do hết hạn.',?)", [row.id, row.from_status, actorUserId]));restored++;}
  return restored;
}
