import type { EventSubmissionPhase } from "@/lib/events/eventSubmissionPhase";

const PHASE_FILTERS: Record<EventSubmissionPhase, string> = {
  not_published: "e.status NOT IN ('published', 'closed')",
  not_open: "e.status = 'published' AND datetime(e.start_at) > datetime('now')",
  accepting:
    "e.status = 'published' AND datetime(e.start_at) <= datetime('now') AND datetime(e.end_at) >= datetime('now')",
  late_allowed:
    "e.status = 'published' AND datetime(e.end_at) < datetime('now') AND e.allow_late = 1",
  expired:
    "e.status = 'published' AND datetime(e.end_at) < datetime('now') AND e.allow_late = 0",
  closed: "e.status = 'closed'",
};

export function getEventSubmissionPhaseFilter(phase: string) {
  return PHASE_FILTERS[phase as EventSubmissionPhase] ?? null;
}
