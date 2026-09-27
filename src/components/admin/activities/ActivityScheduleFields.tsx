"use client";

import { useMemo, useState } from "react";

type FormState = {
  registrationStartAt: string;
  registrationEndAt: string;
  startAt: string;
  endAt: string;
};

function toDate(value: string) {
  return value ? new Date(value) : null;
}

function getNowLocalInputValue() {
  const now = new Date();
  now.setSeconds(0, 0);

  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);

  return local.toISOString().slice(0, 16);
}

export default function ActivityScheduleFields({
  defaultValues,
  allowPastRegistrationStart = false,
  serverErrorField,
  disabledFields = [],
}: {
  defaultValues?: Partial<FormState>;
  allowPastRegistrationStart?: boolean;
  serverErrorField?: string;
  disabledFields?: Array<keyof FormState>;
}) {
  const minNow = useMemo(() => getNowLocalInputValue(), []);

  const [form, setForm] = useState<FormState>({
    registrationStartAt: defaultValues?.registrationStartAt ?? "",
    registrationEndAt: defaultValues?.registrationEndAt ?? "",
    startAt: defaultValues?.startAt ?? "",
    endAt: defaultValues?.endAt ?? "",
  });

  function updateField(name: keyof FormState, value: string) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  const errors = useMemo(() => {
    const now = new Date();
    const regStart = toDate(form.registrationStartAt);
    const regEnd = toDate(form.registrationEndAt);
    const activityStart = toDate(form.startAt);
    const activityEnd = toDate(form.endAt);

    return {
      registrationStartAt:
        !allowPastRegistrationStart && regStart && regStart < now
          ? "Thời gian mở đăng ký không được ở quá khứ."
          : "",

      registrationEndAt:
        regStart && regEnd && regEnd <= regStart
          ? "Thời gian đóng đăng ký phải sau thời gian mở đăng ký."
          : "",

      startAt:
        regEnd && activityStart && activityStart <= regEnd
          ? "Thời gian bắt đầu hoạt động phải sau thời gian đóng đăng ký."
          : "",

      endAt:
        activityStart && activityEnd && activityEnd <= activityStart
          ? "Thời gian kết thúc hoạt động phải sau thời gian bắt đầu."
          : "",
    };
  }, [form, allowPastRegistrationStart]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field
        label="Mở đăng ký"
        name="registrationStartAt"
        value={form.registrationStartAt}
        min={allowPastRegistrationStart ? "" : minNow}
        error={errors.registrationStartAt}
        serverError={serverErrorField === "registrationStartAt"}
        disabled={disabledFields.includes("registrationStartAt")}
        onChange={updateField}
      />

      <Field
        label="Đóng đăng ký"
        name="registrationEndAt"
        value={form.registrationEndAt}
        min={form.registrationStartAt || minNow}
        error={errors.registrationEndAt}
        serverError={serverErrorField === "registrationEndAt"}
        disabled={disabledFields.includes("registrationEndAt")}
        onChange={updateField}
      />

      <Field
        label="Bắt đầu hoạt động"
        name="startAt"
        value={form.startAt}
        min={form.registrationEndAt || minNow}
        error={errors.startAt}
        serverError={serverErrorField === "startAt"}
        disabled={disabledFields.includes("startAt")}
        onChange={updateField}
      />

      <Field
        label="Kết thúc hoạt động"
        name="endAt"
        value={form.endAt}
        min={form.startAt || form.registrationEndAt || minNow}
        error={errors.endAt}
        serverError={serverErrorField === "endAt"}
        disabled={disabledFields.includes("endAt")}
        onChange={updateField}
      />
    </div>
  );
}

function Field({
  label,
  name,
  value,
  min,
  error,
  serverError,
  disabled,
  onChange,
}: {
  label: string;
  name: keyof FormState;
  value: string;
  min: string;
  error: string;
  serverError: boolean;
  disabled: boolean;
  onChange: (name: keyof FormState, value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-600">
        {label}
      </label>

      <input
        type="datetime-local"
        name={name}
        value={value}
        min={min || undefined}
        required
        disabled={disabled}
        aria-invalid={Boolean(error || serverError)}
        onChange={(event) => onChange(name, event.target.value)}
        className={`h-11 w-full rounded-xl border px-4 text-sm outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${
          error || serverError
            ? "border-rose-500 bg-white ring-3 ring-rose-100 focus:border-rose-600"
            : "border-slate-200 focus:border-blue-500"
        }`}
      />

      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
