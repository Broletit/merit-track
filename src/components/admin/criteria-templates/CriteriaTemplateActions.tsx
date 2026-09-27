"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteCriteriaTemplate } from "@/server/actions/criteria-templates/deleteCriteriaTemplate";
import type { AdminCriteriaTemplateItem } from "./types";
import ActionFeedback from "@/components/shared/ActionFeedback";
import toast from "react-hot-toast";

export default function CriteriaTemplateActions({
  item,
  onEdit,
  onDeleted,
}: {
  item: AdminCriteriaTemplateItem;
  onEdit: () => void;
  onDeleted?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState({ message: "", ok: false });

  function handleDelete() {
    const confirmed = window.confirm(`Xóa bộ tiêu chuẩn "${item.name}"?`);
    if (!confirmed) return;
    const reason=window.prompt("Nhập lý do xóa (tối thiểu 10 ký tự):")?.trim()??"";
    if(reason.length<10){setFeedback({message:"Vui lòng nhập lý do xóa cụ thể, tối thiểu 10 ký tự.",ok:false});return;}
    const formData=new FormData();formData.set("reason",reason);

    startTransition(async () => {
      try {
        await deleteCriteriaTemplate(item.id,formData);
        toast.success("Xóa bộ tiêu chuẩn thành công.", { id: `criteria-template-delete-${item.id}` });
        onDeleted?.();
      } catch (error) {
        setFeedback({ message: error instanceof Error ? error.message : "Xóa bộ tiêu chuẩn thất bại.", ok: false });
      }
    });
  }

  return (
    <div className="flex flex-nowrap items-center justify-center gap-2">
      <ActionFeedback pending={pending} message={feedback.message} ok={feedback.ok} />
      <Link
        href={`/dashboard/admin/criteria-templates/${item.id}/configure`}
        data-action-variant="view"
        className="inline-flex h-8 items-center whitespace-nowrap rounded-lg border border-blue-300 bg-white px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
      >
        Cấu hình
      </Link>

      <button
        type="button"
        disabled={pending}
        onClick={onEdit}
        className="h-8 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Sửa
      </button>

      <button
        type="button"
        disabled={pending || item.usedEvents > 0}
        title={item.usedEvents > 0 ? `Không thể xóa vì đang được ${item.usedEvents} đợt xét sử dụng.` : "Xóa bộ tiêu chuẩn"}
        onClick={handleDelete}
        className="h-8 whitespace-nowrap rounded-lg border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
      >
        Xóa
      </button>
    </div>
  );
}
