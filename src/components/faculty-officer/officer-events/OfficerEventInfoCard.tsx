import Link from "next/link";
import { FileText } from "lucide-react";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import { createOfficerSubmission } from "@/server/actions/officer-submissions/createOfficerSubmission";
import type { OfficerEventDetail, OfficerEventSubmissionItem } from "./types";
import EventSubmissionPhaseBadge from "@/components/shared/EventSubmissionPhaseBadge";
import ServerActionSubmitButton from "@/components/shared/ServerActionSubmitButton";

function submissionActionLabel(status: string) {
  if (status === "draft") return "Tiếp tục tạo hồ sơ";
  if (status.startsWith("needs_revision")) return "Chỉnh sửa hồ sơ";
  return "Xem hồ sơ đã tạo";
}

export default function OfficerEventInfoCard({
  event,
  existingSubmission,
  disabledReason,
  submissionBasePath,
}: {
  event: OfficerEventDetail;
  existingSubmission: OfficerEventSubmissionItem | null;
  disabledReason: string;
  submissionBasePath: string;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Thông tin đợt xét</h2>
          <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {event.description || "Chưa có mô tả."}
          </p>
        </div>

        {existingSubmission ? (
          <Link
            href={`${submissionBasePath}/detail/${existingSubmission.id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            <FileText size={16} />
            {submissionActionLabel(existingSubmission.status)}
          </Link>
        ) : disabledReason ? (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white opacity-60"
          >
            <FileText size={16} />
            Tạo hồ sơ xét
          </button>
        ) : (
          <form action={createOfficerSubmission.bind(null, event.id)}>
            <ServerActionSubmitButton
              idleLabel="Tạo hồ sơ xét"
              pendingLabel="Đang mở hồ sơ..."
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </form>
        )}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-sm text-slate-500">Tình trạng nhận hồ sơ</div>
          <div className="mt-2"><EventSubmissionPhaseBadge event={event} /></div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-sm text-slate-500">Thời gian nhận hồ sơ</div>
          <div className="mt-1 text-sm font-medium text-slate-900">
            {formatDateTimeVN(event.startAt)} → {formatDateTimeVN(event.endAt)}
          </div>
        </div>
      </div>

      {disabledReason ? (
        <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-100">
          {disabledReason}
        </div>
      ) : null}
    </section>
  );
}
