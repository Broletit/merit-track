"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText } from "lucide-react";
import { ensureStudentSubmissionDraft } from "@/server/actions/submissions/ensureStudentSubmissionDraft";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import type { StudentEventDetail } from "./types";
import EventSubmissionPhaseBadge from "@/components/shared/EventSubmissionPhaseBadge";
import ActionFeedback from "@/components/shared/ActionFeedback";
import {
  getEventSubmissionPhase,
  getEventSubmissionPhaseError,
} from "@/lib/events/eventSubmissionPhase";

export default function StudentEventDetailCard({
  item,
  showAction=true,
}: {
  item: StudentEventDetail;
  showAction?:boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const submissionPhase = getEventSubmissionPhase({
    status: item.status,
    startAt: item.startAt,
    endAt: item.endAt,
    allowLate: item.allowLate,
  });
  const phaseError = getEventSubmissionPhaseError(submissionPhase);

  function handleCreateDraft() {
    setMessage("");

    startTransition(async () => {
      try {
        const result = await ensureStudentSubmissionDraft(item.id);
        const submissionId = result.submissionId ?? result.id;

        if (!submissionId) {
          throw new Error("Không lấy được mã hồ sơ vừa tạo.");
        }

        router.push(`/dashboard/student/events/${item.id}?edit=1#minh-chung-can-bo-sung`);
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Không thể tạo hồ sơ."
        );
      }
    });
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <ActionFeedback pending={pending} message={message} ok={false} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Thông tin đợt xét
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {item.description || "Chưa có mô tả."}
          </p>
        </div>

        {showAction ? (
          item.submissionId && !item.canSubmit ? (
            <Link
              href={`/dashboard/student/submissions/${item.submissionId}`}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              <FileText size={16} />
              Xem hồ sơ đã tạo
            </Link>
          ) : (
            <button
              type="button"
              disabled={!item.canSubmit || pending}
              onClick={handleCreateDraft}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileText size={16} />
              {pending
                ? "Đang mở hồ sơ..."
                : item.submissionStatus === "draft"
                  ? "Tiếp tục tạo hồ sơ"
                  : item.submissionStatus
                    ? "Chỉnh sửa hồ sơ"
                    : "Tạo hồ sơ xét"}
            </button>
          )
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-sm text-slate-500">Tình trạng nhận hồ sơ</div>
          <div className="mt-2">
            <EventSubmissionPhaseBadge
              event={{
                status: item.status,
                startAt: item.startAt,
                endAt: item.endAt,
                allowLate: item.allowLate,
              }}
            />
          </div>
        </div>
        <Info label="Thời gian nhận hồ sơ" value={`${formatDateTimeVN(item.startAt)} → ${formatDateTimeVN(item.endAt)}`} />
      </div>

      {phaseError ? (
        <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-100">
          {phaseError}
        </div>
      ) : null}

    </section>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
