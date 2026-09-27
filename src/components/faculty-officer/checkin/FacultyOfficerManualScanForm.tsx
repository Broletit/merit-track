"use client";

import { useActionState } from "react";
import { scanActivityQr } from "@/server/actions/activities/scanActivityQr";
import ActionFeedback from "@/components/shared/ActionFeedback";

type ScanState = {
  ok: boolean;
  message: string;
  nonce: number;
};

const initialState: ScanState = {
  ok: false,
  message: "",
  nonce: 0,
};

async function scanAction(
  _prevState: ScanState,
  formData: FormData
): Promise<ScanState> {
  try {
    const activityId = Number(formData.get("activityId"));
    const mssv = String(formData.get("mssv") ?? "").trim();

    if (!mssv) {
      throw new Error("Vui lòng nhập MSSV.");
    }

    const result = await scanActivityQr(activityId, mssv, "manual");

    return {
      ok: true,
      message: result.message,
      nonce: Date.now(),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Điểm danh thất bại.",
      nonce: Date.now(),
    };
  }
}

export default function FacultyOfficerManualScanForm({
  activityId,
}: {
  activityId: number;
}) {
  const [state, formAction, pending] = useActionState(scanAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <ActionFeedback pending={pending} message={state.message} ok={state.ok} />
      <input type="hidden" name="activityId" value={activityId} />

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Điểm danh thủ công
            </h2>
            <p className="text-sm text-slate-500">
              Dùng khi camera không quét được hoặc hoạt động xác nhận thủ công bằng MSSV
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 md:flex-row">
          <input
            name="mssv"
            placeholder="Nhập MSSV, ví dụ: 21110003"
            className="h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500"
            required
          />

          <button
            type="submit"
            disabled={pending}
            className="h-11 whitespace-nowrap rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
          >
            {pending ? "Đang điểm danh..." : "Điểm danh"}
          </button>
        </div>

      </section>
    </form>
  );
}
