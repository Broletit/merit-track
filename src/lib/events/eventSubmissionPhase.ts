export type EventSubmissionPhase =
  | "not_published"
  | "not_open"
  | "accepting"
  | "late_allowed"
  | "expired"
  | "closed";

export type EventSubmissionState = {
  status: string;
  startAt: string;
  endAt: string;
  allowLate: boolean;
};

export function getEventSubmissionPhase(
  event: EventSubmissionState,
  now = new Date()
): EventSubmissionPhase {
  if (event.status === "closed") return "closed";
  if (event.status !== "published") return "not_published";

  const start = new Date(event.startAt);
  const end = new Date(event.endAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "not_published";
  }

  if (now < start) return "not_open";
  if (now <= end) return "accepting";
  if (event.allowLate) return "late_allowed";
  return "expired";
}

export function canSubmitToEvent(event: EventSubmissionState, now = new Date()) {
  const phase = getEventSubmissionPhase(event, now);
  return phase === "accepting" || phase === "late_allowed";
}

export function getEventSubmissionPhaseLabel(phase: EventSubmissionPhase) {
  switch (phase) {
    case "not_published":
      return "Chưa công khai";
    case "not_open":
      return "Chưa mở nộp";
    case "accepting":
      return "Đang nhận hồ sơ";
    case "late_allowed":
      return "Đang nhận hồ sơ trễ";
    case "expired":
      return "Đã hết hạn nộp";
    case "closed":
      return "Đã ngừng nhận";
  }
}

export function getEventSubmissionPhaseError(phase: EventSubmissionPhase) {
  switch (phase) {
    case "not_published":
      return "Đợt xét chưa được công khai.";
    case "not_open":
      return "Đợt xét chưa đến thời gian nhận hồ sơ.";
    case "expired":
      return "Đợt xét đã hết hạn nhận hồ sơ.";
    case "closed":
      return "Đợt xét đã ngừng nhận hồ sơ.";
    case "accepting":
    case "late_allowed":
      return "";
  }
}

export function assertEventAcceptsSubmissions(event: EventSubmissionState) {
  const phase = getEventSubmissionPhase(event);
  const error = getEventSubmissionPhaseError(phase);
  if (error) throw new Error(error);
  return phase;
}
