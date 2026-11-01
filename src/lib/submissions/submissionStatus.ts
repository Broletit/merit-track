import { canSubmitToEvent, type EventSubmissionState } from "@/lib/events/eventSubmissionPhase";

export function getSubmissionStatusLabel(status: string) {
  switch (status) {
    case "support": return "Cần hỗ trợ";
    case "none": return "Chưa tạo hồ sơ";
    case "closed": return "Đã đóng";
    case "draft":
      return "Chưa hoàn tất";
    case "submitted_v1":
      return "Chờ duyệt vòng 1";
    case "submitted_v2":
      return "Chờ duyệt vòng 2";
    case "needs_revision_v1":
    case "needs_revision_v2":
    case "rejected_v1":
    case "rejected_v2":
      return "Cần chỉnh sửa";
    case "passed":
    case "approved":
      return "Đạt";
    case "failed":
    case "rejected":
      return "Không đạt";
    default:
      return "Đang xử lý";
  }
}

export function canEditSubmission(status: string, event?: EventSubmissionState) {
  return [
    "draft",
    "needs_revision_v1",
    "needs_revision_v2",
    "rejected_v1",
    "rejected_v2",
  ].includes(status) && (!event || canSubmitToEvent(event));
}
