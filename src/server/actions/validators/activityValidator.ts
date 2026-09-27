export function validateActivityTime({
  registrationStartAt,
  registrationEndAt,
  startAt,
  endAt,
  allowPastRegistrationStart = false,
}: {
  registrationStartAt: string;
  registrationEndAt: string;
  startAt: string;
  endAt: string;
  allowPastRegistrationStart?: boolean;
}) {
  const now = new Date();

  const regStart = new Date(registrationStartAt);
  const regEnd = new Date(registrationEndAt);
  const activityStart = new Date(startAt);
  const activityEnd = new Date(endAt);

  if (
    Number.isNaN(regStart.getTime()) ||
    Number.isNaN(regEnd.getTime()) ||
    Number.isNaN(activityStart.getTime()) ||
    Number.isNaN(activityEnd.getTime())
  ) {
    throw new Error("Thời gian không hợp lệ.");
  }

  if (!allowPastRegistrationStart && regStart < now) {
    throw new Error("Thời gian mở đăng ký không được ở quá khứ.");
  }

  if (regEnd <= regStart) {
    throw new Error("Thời gian đóng đăng ký phải sau thời gian mở đăng ký.");
  }

  if (activityStart <= regEnd) {
    throw new Error("Thời gian bắt đầu hoạt động phải sau thời gian đóng đăng ký.");
  }

  if (activityEnd <= activityStart) {
    throw new Error("Thời gian kết thúc hoạt động phải sau thời gian bắt đầu.");
  }
}