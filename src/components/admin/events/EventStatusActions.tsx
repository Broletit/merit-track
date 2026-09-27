"use client";

import { useState, useTransition } from "react";
import { Archive, Eye, RotateCcw } from "lucide-react";
import { updateEventStatus } from "@/server/actions/events/updateEventStatus";
import ActionFeedback from "@/components/shared/ActionFeedback";

export default function EventStatusActions({
  eventId,
  status,
  submissions,
}: {
  eventId: number;
  status: string;
  submissions: number;
}) {
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(nextStatus: "draft" | "published" | "closed") {
    setMessage("");

    startTransition(async () => {
      try {
        const result = await updateEventStatus(eventId, nextStatus);
        setOk(true);
        setMessage(result.message);
      } catch (error) {
        setOk(false);
        setMessage(
          error instanceof Error ? error.message : "Cập nhật trạng thái thất bại."
        );
      }
    });
  }

  return (
    <div className="space-y-3">
      <ActionFeedback pending={pending} message={message} ok={ok} />
      {status === "closed" ? (
        <span className="inline-flex rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-500">
          Đã đóng
        </span>
      ) : (
        <div className="flex flex-wrap gap-2">
          {status === "draft" ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => submit("published")}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
            >
              <Eye size={16} />
              Công khai
            </button>
          ) : null}

          {status === "published" ? (
            <button
              type="button"
              disabled={pending || submissions > 0}
              onClick={() => submit("draft")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RotateCcw size={16} />
              Về nháp
            </button>
          ) : null}

          <button
            type="button"
            disabled={pending}
            onClick={() => submit("closed")}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
          >
            <Archive size={16} />
            Đóng
          </button>
        </div>
      )}

    </div>
  );
}
