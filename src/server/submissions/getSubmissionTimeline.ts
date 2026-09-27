import type { SubmissionTimelineItem } from "@/components/shared/reviews/ReviewHistory";
import { getDb } from "@/server/db/sqlite";

type Row = {
  id: number;
  action: string;
  from_status: string | null;
  to_status: string | null;
  message: string | null;
  actor_name: string | null;
  created_at: string;
};

export function getSubmissionTimeline(submissionId: number): SubmissionTimelineItem[] {
  const rows = getDb().prepare(`
    SELECT
      timeline.id,
      timeline.action,
      timeline.from_status,
      timeline.to_status,
      timeline.message,
      actor.full_name AS actor_name,
      timeline.created_at
    FROM submission_timeline timeline
    LEFT JOIN users actor ON actor.id = timeline.actor_user_id
    WHERE timeline.submission_id = ?
    ORDER BY datetime(timeline.created_at) ASC, timeline.id ASC
  `).all(submissionId) as Row[];

  return rows.map((item) => ({
    id: Number(item.id),
    action: String(item.action ?? ""),
    fromStatus: item.from_status ? String(item.from_status) : null,
    toStatus: item.to_status ? String(item.to_status) : null,
    message: item.message ? String(item.message) : null,
    actorName: item.actor_name ? String(item.actor_name) : null,
    createdAt: String(item.created_at ?? ""),
  }));
}
