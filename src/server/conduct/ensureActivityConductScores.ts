import { getDb } from "@/server/db/sqlite";

export function ensureActivityConductScores() {
  const db = getDb();

  const activePeriod = db
    .prepare(
      `
      SELECT id
      FROM conduct_periods
      WHERE is_active = 1
      LIMIT 1
      `
    )
    .get() as { id: number } | undefined;

  if (!activePeriod) {
    return;
  }

  const rows = db
    .prepare(
      `
      SELECT
        ar.user_id,
        ar.activity_id,
        a.title,
        a.conduct_score
      FROM activity_registrations ar

      INNER JOIN activities a
        ON a.id = ar.activity_id

      WHERE ar.status = 'attended'
        AND datetime(a.end_at) <= datetime('now')
        AND COALESCE(a.conduct_score, 0) > 0

        AND NOT EXISTS (
          SELECT 1
          FROM conduct_scores cs
          WHERE cs.user_id = ar.user_id
            AND cs.source_type = 'activity'
            AND cs.source_id = ar.activity_id
        )
      `
    )
    .all() as Array<{
    user_id: number;
    activity_id: number;
    title: string;
    conduct_score: number;
  }>;

  if (rows.length === 0) {
    return;
  }

  const insertStmt = db.prepare(
    `
    INSERT INTO conduct_scores (
      user_id,
      period_id,
      source_type,
      source_id,
      score_value,
      note,
      created_at
    )
    VALUES (
      ?, ?, 'activity', ?, ?, ?, datetime('now')
    )
    `
  );

  const tx = db.transaction(() => {
    for (const row of rows) {
      insertStmt.run(
        row.user_id,
        activePeriod.id,
        row.activity_id,
        Number(row.conduct_score ?? 0),
        `Điểm từ hoạt động: ${row.title}`
      );
    }
  });

  tx();
}