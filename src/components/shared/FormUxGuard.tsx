"use client";

import { useEffect } from "react";

export default function FormUxGuard() {
  useEffect(() => {
    const errors = new Map<HTMLElement, HTMLParagraphElement>();
    const generatedErrors = new Set<HTMLParagraphElement>();
    let sequence = 0;
    let focusFrame = 0;
    function clearFieldError(field: HTMLElement) {
      const error = errors.get(field);
      if (!error) return;
      const describedBy = (field.getAttribute('aria-describedby') ?? '').split(' ').filter(id => id && id !== error.id).join(' ');
      if (describedBy) field.setAttribute('aria-describedby', describedBy);
      else field.removeAttribute('aria-describedby');
      if (generatedErrors.has(error)) {
        error.remove();
        generatedErrors.delete(error);
      } else {
        error.textContent = "";
      }
      errors.delete(field);
    }
    function showFieldError(field: HTMLElement, message: string) {
      let error = errors.get(field);
      if (!error) {
        const wrapper = field.closest("label") ?? field.parentElement;
        error = wrapper?.querySelector<HTMLParagraphElement>("[data-field-error]") ?? undefined;
        if (!error) {
          error = document.createElement("p");
          error.dataset.fieldError = "true";
          error.className = "mt-1 whitespace-normal text-xs font-medium leading-5 text-rose-700 break-words";
          const row = field.parentElement;
          if (row && getComputedStyle(row).display.includes("flex") && getComputedStyle(row).flexDirection === "row") {
            row.insertAdjacentElement("afterend", error);
          } else {
            field.insertAdjacentElement("afterend", error);
          }
          generatedErrors.add(error);
        }
        if (!error.id) error.id = `field-required-error-${++sequence}`;
        error.setAttribute("role", "alert");
        errors.set(field, error);
        field.setAttribute("aria-describedby", [field.getAttribute("aria-describedby"), error.id].filter(Boolean).join(" "));
      }
      error.textContent = message;
    }
    function focusInvalidField(field: HTMLElement, source: "native" | "action") {
      delete field.dataset.validationValid;
      field.dataset.validationErrorSource = source;
      field.setAttribute("aria-invalid", "true");
      if (focusFrame) return;
      focusFrame = requestAnimationFrame(() => {
        focusFrame = 0;
        if (!field.closest("form[data-stable-validation]")) {
          const bounds = field.getBoundingClientRect();
          if (bounds.top < 0 || bounds.bottom > window.innerHeight) field.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        field.focus({ preventScroll: true });
      });
    }

    function handleInvalid(event: Event) {
      event.preventDefault();
      const field = event.target;
      if (!(field instanceof HTMLElement)) return;
      focusInvalidField(field, "native");

      const input = field as HTMLInputElement;
      const labelNode = input.labels?.[0]?.cloneNode(true) as HTMLElement | undefined;
      labelNode?.querySelectorAll('input,select,textarea,[role="alert"],[aria-hidden="true"]').forEach(node => node.remove());
      const label = labelNode?.textContent?.trim() || input.getAttribute('aria-label');
      showFieldError(field, input.validity?.valueMissing ? `Vui lòng ${input.tagName === 'SELECT' ? 'chọn' : 'nhập'} ${label || 'thông tin bắt buộc'}.` : input.validationMessage || "Vui lòng kiểm tra thông tin chưa hợp lệ.");
    }

    function handleActionError(event: Event) {
      const originalMessage = String((event as CustomEvent<{ message?: string }>).detail?.message ?? "");
      const message = originalMessage.toLowerCase();
      if (!/vui lòng|bắt buộc|không được để trống|phải nhập|thiếu thông tin/.test(message)) return;
      const fieldName = inferFieldName(message);

      const aliases: Record<string, string[]> = {title: ["title", "name"], audienceType: ["audienceType", "forType", "type"], classId: ["classId", "targetClassId"]};
      const names = fieldName ? aliases[fieldName] ?? [fieldName] : [];
      const candidates = names.flatMap(name => Array.from(document.querySelectorAll<HTMLElement>(`[name="${name}"]`)));
      if (!candidates.length) {
        const activeForm = document.activeElement?.closest("form");
        const invalid = Array.from((activeForm ?? document).querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input:invalid, select:invalid, textarea:invalid"))
          .filter(input => input.type !== "hidden" && (input.offsetParent !== null || input.type === "file"));
        if (invalid.length) {
          event.preventDefault();
          invalid.forEach(input => { showFieldError(input, input.validity.valueMissing ? "Vui lòng điền hoặc chọn thông tin bắt buộc." : input.validationMessage); focusInvalidField(input, "action"); });
        }
        return;
      }
      const field = candidates.find((item) => item.offsetParent !== null && !item.hasAttribute("disabled"));
      if (field) {
        event.preventDefault();
        showFieldError(field, originalMessage);
        focusInvalidField(field, "action");
      }
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

      if (field.validity.valid) {
        clearFieldError(field);
        field.setAttribute("aria-invalid", "false");
        delete field.dataset.validationErrorSource;
        delete field.dataset.validationValid;
      }
    }

    document.addEventListener("invalid", handleInvalid, true);
    document.addEventListener("input", handleFieldChange, true);
    document.addEventListener("change", handleFieldChange, true);
    document.addEventListener("reset", preserveActionValues, true);
    window.addEventListener("app:action-error", handleActionError);
    return () => {
      if (focusFrame) cancelAnimationFrame(focusFrame);
      errors.forEach((_, field) => clearFieldError(field));
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
    [["số tiêu chí tối thiểu", "số tiêu chí cần đạt"], "minRequired"],
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
    [["file", "tệp"], "file"],
    [["lớp"], "classId"],
    [["lý do", "ghi chú thay đổi"], "reason"],
  ];

  return rules.find(([keywords]) => keywords.some((keyword) => message.includes(keyword)))?.[1];
}
