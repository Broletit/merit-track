import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { appUi } from "@/lib/ui/appUi";
import type { ReactNode } from "react";

export default function ReportPageHeader({
  title,
  description,
  termSelect,
  compact = false,
}: {
  title: string;
  description?: string;
  termSelect?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)] shadow-slate-200/60">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {!compact && description ? <p className="mt-1 text-sm text-blue-100/80">{description}</p> : null}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {termSelect}
          <Link href="/dashboard/admin/reports" className={appUi.secondaryButton} data-back-link>
            <ArrowLeft size={16} />
            <span className="ml-2">Quay về</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
