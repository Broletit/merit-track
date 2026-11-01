import type { EventSubmissionPhase } from "@/lib/events/eventSubmissionPhase";

const PHASE_FILTERS: Record<EventSubmissionPhase, string> = {
  not_published: "e.status NOT IN ('published', 'closed')",
  not_open: "e.status = 'published' AND CAST(e.start_at AS DATETIME(3)) > CURRENT_TIMESTAMP(3)",
  accepting:
    "e.status = 'published' AND CAST(e.start_at AS DATETIME(3)) <= CURRENT_TIMESTAMP(3) AND CAST(e.end_at AS DATETIME(3)) >= CURRENT_TIMESTAMP(3)",
  expired:
    "e.status = 'published' AND CAST(e.end_at AS DATETIME(3)) < CURRENT_TIMESTAMP(3)",
  closed: "e.status = 'closed'",
};

export function getEventSubmissionPhaseFilter(phase: string) {
  return Object.hasOwn(PHASE_FILTERS,phase) ? PHASE_FILTERS[phase as EventSubmissionPhase] : null;
}
