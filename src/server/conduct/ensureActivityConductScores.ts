import { getDatabase } from "@/server/db/mysql";

export async function ensureActivityConductScores() {
  const db = getDatabase();
  try {
  (await (async () => (await db.withTransaction(async () => {
    (await db.execute(`UPDATE activity_registrations
      SET status='absent', note=COALESCE(note,'Vắng sau khi kết thúc hoạt động')
      WHERE status='registered' AND EXISTS (
        SELECT 1 FROM activities a WHERE a.id=activity_registrations.activity_id
        AND CAST(a.end_at AS DATETIME(3))<=CURRENT_TIMESTAMP(3)
        AND a.audience_type='student' AND a.status IN ('published','closed')
      )`, []));
    const rows = (await db.rows(`SELECT ar.user_id,ar.activity_id,ar.status,a.title,a.conduct_score,
      t.id term_id,t.name term_name,t.academic_year,t.semester,t.start_at,t.end_at,t.is_active
      FROM activity_registrations ar JOIN activities a ON a.id=ar.activity_id
      JOIN academic_terms t ON t.id=a.term_id
      WHERE ar.status IN ('attended','absent') AND CAST(a.end_at AS DATETIME(3))<=CURRENT_TIMESTAMP(3)
      AND a.audience_type='student' AND a.status IN ('published','closed')
      AND COALESCE(a.conduct_score,0)>0`, [])) as Array<{
        user_id:number;activity_id:number;status:string;title:string;conduct_score:number;
        term_id:number;term_name:string;academic_year:string;semester:string;
        start_at:string;end_at:string;is_active:number;
      }>;
    
    
    
    for (const row of rows) {
      let period = (await db.first('SELECT id FROM conduct_periods WHERE academic_year=? AND semester=? LIMIT 1', [row.academic_year, row.semester])) as {id:number}|undefined;
      if (!period) period={id:Number((await db.execute(`INSERT INTO conduct_periods(code,name,academic_year,semester,start_at,end_at,is_active) VALUES(?,?,?,?,?,?,?)`, ['TERM-'+row.term_id, 'Điểm rèn luyện - '+row.term_name, row.academic_year, row.semester, row.start_at, row.end_at, row.is_active])).insertId)};
      const absent = row.status==='absent';
      (await db.execute(`INSERT INTO conduct_scores(user_id,period_id,source_type,source_id,score_value,note,created_at)
      VALUES(?,?,'activity',?,?,?,CURRENT_TIMESTAMP(3))
      ON DUPLICATE KEY UPDATE period_id=VALUES(period_id),score_value=VALUES(score_value),note=VALUES(note)`, [row.user_id, period.id, row.activity_id, absent ? -Number(row.conduct_score) : Number(row.conduct_score), (absent ? 'Trừ điểm do đăng ký nhưng không tham gia: ' : 'Cộng điểm từ hoạt động: ')+row.title]));
    }
  })))());
  } catch (error) {
    // This maintenance task is invoked lazily by several read pages. A concurrent
    // import/check-in may already hold the write lock; never make a page fail just
    // because that same score synchronization is in progress elsewhere.
    if (error instanceof Error && /lock wait timeout|deadlock/i.test(error.message)) return;
    throw error;
  }
}
