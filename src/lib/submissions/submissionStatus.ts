export function getSubmissionStatusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Đang soạn hồ sơ";
    case "submitted_v1":
      return "Chờ cán bộ lớp duyệt";
    case "submitted_v2":
      return "Chờ cán bộ khoa duyệt";
    case "needs_revision_v1":
    case "needs_revision_v2":
    case "rejected_v1":
    case "rejected_v2":
      return "Cần chỉnh sửa";
    case "passed":
    case "approved":
      return "Đã đạt";
    case "failed":
    case "rejected":
      return "Không đạt";
    default:
      return "Đang xử lý";
  }
}

export function canEditSubmission(status: string) {
  return [
    "draft",
    "needs_revision_v1",
    "needs_revision_v2",
    "rejected_v1",
    "rejected_v2",
  ].includes(status);
}