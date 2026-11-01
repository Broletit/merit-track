export type EventSubmissionPhase =
  | "not_published"
  | "not_open"
  | "accepting"
  | "expired"
  | "closed";

export type EventSubmissionState = {
  status: string;
  startAt: string;
  endAt: string;
  /** Ignored legacy field: acceptance depends exclusively on opening/closing times. */
  allowLate?: boolean;
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
  return "expired";
}

export function canSubmitToEvent(event: EventSubmissionState, now = new Date()) {
  const phase = getEventSubmissionPhase(event, now);
  return phase === "accepting";
}

export function getEventSubmissionPhaseLabel(phase: EventSubmissionPhase) {
  switch (phase) {
    case "not_published":
      return "Nháp";
    case "not_open":
      return "Chưa mở nhận hồ sơ";
    case "accepting":
      return "Đang nhận hồ sơ";
    case "expired":
      return "Đã hết hạn";
    case "closed":
      return "Đã đóng";
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
      return "";
  }
}

export function assertEventAcceptsSubmissions(event: EventSubmissionState) {
  const phase = getEventSubmissionPhase(event);
  const error = getEventSubmissionPhaseError(phase);
  if (error) throw new Error(error);
  return phase;
}

/** One event lifecycle filter; explicit phase supersedes old publication-status URLs. */
export function resolveEventListPhase(phase:unknown,status?:unknown):EventSubmissionPhase|"" {
  if(["not_published","not_open","accepting","expired","closed"].includes(String(phase??"")))return phase as EventSubmissionPhase;
  if(status==="draft")return "not_published";
  if(status==="published")return "accepting";
  if(status==="closed")return "closed";
  return "";
}
