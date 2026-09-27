"use client";

import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { appUi } from "@/lib/ui/appUi";

export default function CriteriaTemplatesHeader() {
  return (
    <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <ClipboardList size={22} />
          </div>

          <div>
            <h1 className="text-2xl font-semibold">Bộ tiêu chuẩn</h1>
          </div>
        </div>

        <Link
          href="/dashboard/admin/criteria-templates/create"
          className={appUi.secondaryButton}
        >
          <Plus size={16} />
          <span className="ml-2">Tạo bộ tiêu chuẩn</span>
        </Link>
      </div>
    </section>
  );
}
