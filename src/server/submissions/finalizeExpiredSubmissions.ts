import type { Database } from "@/server/db/mysql";

export async function finalizeExpiredSubmissions(db: Database) {
  const now = Date.now();
  const rows = ((await db.rows(`SELECT s.id,s.status,e.status event_status,e.end_at FROM submissions s JOIN events e ON e.id=s.event_id
    WHERE s.status NOT IN ('passed','approved','failed','rejected')
      AND e.status IN ('closed','published')`, [])) as {id:number;status:string;event_status:string;end_at:string}[])
    .filter(row => row.event_status === 'closed' || new Date(row.end_at).getTime() < now);
  if (!rows.length) return 0;
  return (await (async () => (await db.withTransaction(async () => {
    
    
    let finalized = 0;
    for (const row of rows) {
      if (!(await db.execute("UPDATE submissions SET status='failed',updated_at=CURRENT_TIMESTAMP(3) WHERE id=? AND status=?", [row.id, row.status])).changes) continue;
      (await db.execute(`INSERT INTO submission_timeline(submission_id,action,from_status,to_status,message) VALUES(?,'finalize',?,'failed',?)`, [row.id, row.status, row.event_status==='closed' ? 'Đợt xét đã đóng; hồ sơ chưa hoàn tất xét duyệt nên được chốt không đạt.' : 'Đã hết hạn nhận hồ sơ; hồ sơ chưa hoàn tất xét duyệt nên được chốt không đạt.']));
      finalized++;
    }
    return finalized;
  })))());
}
