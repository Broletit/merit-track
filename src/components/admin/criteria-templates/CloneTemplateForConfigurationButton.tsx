"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Copy } from "lucide-react";
import { cloneCriteriaTemplate } from "@/server/actions/criteria-templates/cloneCriteriaTemplate";
import type { AdminCriteriaTemplateDetail } from "./types";

export default function CloneTemplateForConfigurationButton({
  template,
}: {
  template: AdminCriteriaTemplateDetail;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function clone() {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("name", template.name);
        formData.set("description", template.description ?? "");
        formData.set("forType", template.forType);
        const result = await cloneCriteriaTemplate(template.id, formData);
        toast.success(result.message);
        router.push(`/dashboard/admin/criteria-templates/${result.id}/configure`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể tạo bản sao bộ tiêu chuẩn.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={clone}
      disabled={pending}
      className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Copy size={16} />
      {pending ? "Đang tạo bản sao..." : "Tạo bản sao để cấu hình"}
    </button>
  );
}
