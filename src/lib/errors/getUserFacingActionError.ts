export function getUserFacingActionError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/body exceeded|body size limit|request entity too large|payload too large/i.test(message)) {
    return "Tổng dung lượng tệp tải lên quá lớn. Mỗi tệp chỉ được tối đa 10 MB; vui lòng chọn tệp nhỏ hơn hoặc lưu từng minh chứng.";
  }
  return message.trim() || fallback;
}
