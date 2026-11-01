"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText } from "lucide-react";
import { ensureStudentSubmissionDraft } from "@/server/actions/submissions/ensureStudentSubmissionDraft";
import type { StudentEventDetail } from "./types";
import EventSubmissionPhaseBadge from "@/components/shared/EventSubmissionPhaseBadge";
import ActionFeedback from "@/components/shared/ActionFeedback";

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
    <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <ActionFeedback pending={pending} message={message} ok={false} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Thông tin đợt xét
          </h2>
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
                  ? "Tiếp tục hồ sơ"
                  : item.submissionStatus
                    ? "Chỉnh sửa hồ sơ"
                    : "Tạo hồ sơ xét"}
            </button>
          )
        ) : null}
      </div>

      <div className="mt-5 grid items-stretch gap-4 md:grid-cols-2">
        <div className="min-w-0 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 shadow-md shadow-slate-200/60"><h3 className="text-sm font-medium text-slate-600">Mô tả</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{item.description || "Chưa có mô tả."}</p></div>
        <div className="min-w-0 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 shadow-md shadow-slate-200/60">
          <div className="text-sm font-medium text-slate-600">Trạng thái tiếp nhận</div>
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
      </div>



    </section>
  );
}

