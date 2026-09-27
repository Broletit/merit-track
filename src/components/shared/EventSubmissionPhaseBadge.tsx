import {
  getEventSubmissionPhase,
  getEventSubmissionPhaseLabel,
  type EventSubmissionState,
} from "@/lib/events/eventSubmissionPhase";

const phaseClassNames = {
  not_published: "bg-slate-100 text-slate-600 ring-slate-200",
  not_open: "bg-violet-50 text-violet-700 ring-violet-100",
  accepting: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  late_allowed: "bg-amber-50 text-amber-700 ring-amber-100",
  expired: "bg-rose-50 text-rose-700 ring-rose-100",
  closed: "bg-slate-200 text-slate-700 ring-slate-300",
} as const;

export default function EventSubmissionPhaseBadge({
  event,
}: {
  event: EventSubmissionState;
}) {
  const phase = getEventSubmissionPhase(event);

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${phaseClassNames[phase]}`}
    >
      {getEventSubmissionPhaseLabel(phase)}
    </span>
  );
}
