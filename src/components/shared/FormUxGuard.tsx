"use client";

import { useEffect } from "react";
import toast from "react-hot-toast";

export default function FormUxGuard() {
  useEffect(() => {
    function focusInvalidField(field: HTMLElement, source: "native" | "action") {
      delete field.dataset.validationValid;
      field.dataset.validationErrorSource = source;
      field.setAttribute("aria-invalid", "true");
      requestAnimationFrame(() => {
        field.scrollIntoView({ behavior: "smooth", block: "center" });
        field.focus({ preventScroll: true });
      });
    }

    function handleInvalid(event: Event) {
      const field = event.target;
      if (!(field instanceof HTMLElement)) return;
      focusInvalidField(field, "native");

      const input = field as HTMLInputElement;
      toast.error(input.validationMessage || "Vui lòng kiểm tra trường thông tin chưa hợp lệ.", {
        id: "native-form-validation",
      });
    }

    function handleActionError(event: Event) {
      const message = String((event as CustomEvent<{ message?: string }>).detail?.message ?? "").toLowerCase();
      const fieldName = inferFieldName(message);
      if (!fieldName) return;

      const candidates = Array.from(document.querySelectorAll<HTMLElement>(`[name="${fieldName}"]`));
      const field = candidates.find((item) => item.offsetParent !== null && !item.hasAttribute("disabled"));
      if (field) focusInvalidField(field, "action");
    }

    function preserveActionValues(event: Event) {
      if (!event.isTrusted && event.target instanceof HTMLFormElement) {
        event.preventDefault();
      }
    }

    function handleFieldChange(event: Event) {
      const field = event.target;
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;
      if (!field.dataset.validationErrorSource) return;

      if (field.checkValidity()) {
        field.setAttribute("aria-invalid", "false");
        delete field.dataset.validationErrorSource;
        field.dataset.validationValid = "true";
      }
    }

    document.addEventListener("invalid", handleInvalid, true);
    document.addEventListener("input", handleFieldChange, true);
    document.addEventListener("change", handleFieldChange, true);
    document.addEventListener("reset", preserveActionValues, true);
    window.addEventListener("app:action-error", handleActionError);
    return () => {
      document.removeEventListener("invalid", handleInvalid, true);
      document.removeEventListener("input", handleFieldChange, true);
      document.removeEventListener("change", handleFieldChange, true);
      document.removeEventListener("reset", preserveActionValues, true);
      window.removeEventListener("app:action-error", handleActionError);
    };
  }, []);

  return null;
}

function inferFieldName(message: string) {
  const rules: Array<[string[], string]> = [
    [["tên đợt xét", "tên hoạt động", "tên bộ tiêu chuẩn", "tên học kỳ", "tên tiêu chuẩn"], "title"],
    [["mô tả"], "description"],
    [["mẫu tiêu chuẩn"], "templateId"],
    [["đối tượng"], "audienceType"],
    [["điểm rèn luyện"], "conductScore"],
    [["thời gian diễn ra hoạt động", "phải sau thời gian đóng đăng ký"], "startAt"],
    [["kết thúc hoạt động"], "endAt"],
    [["mở đăng ký"], "registrationStartAt"],
    [["đóng đăng ký"], "registrationEndAt"],
    [["bắt đầu hoạt động"], "startAt"],
    [["thời gian mở nộp"], "startAt"],
    [["thời gian đóng nộp"], "endAt"],
    [["mật khẩu hiện tại"], "currentPassword"],
    [["mật khẩu xác nhận", "xác nhận mật khẩu"], "confirmPassword"],
    [["mật khẩu mới"], "newPassword"],
    [["lớp"], "classId"],
    [["lý do", "ghi chú thay đổi"], "reason"],
  ];

  return rules.find(([keywords]) => keywords.some((keyword) => message.includes(keyword)))?.[1];
}
