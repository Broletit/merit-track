import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import { appUi } from "@/lib/ui/appUi";
import type { OfficerEventDetail } from "./types";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";

export default function OfficerEventDetailHeader({
  event,
  backHref,
}: {
  event: OfficerEventDetail;
  backHref: string;
}) {
  return (
    <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <Trophy size={22} />
          </div>

          <div>
            <h1 className="text-2xl font-semibold">{event.title}</h1>
            <p className="text-sm text-blue-100/80">
              {formatDateTimeVN(event.startAt)} → {formatDateTimeVN(event.endAt)}
            </p>
          </div>
        </div>

        <Link
          href={backHref}
          className={appUi.secondaryButton}
        >
          <ArrowLeft size={16} />
          <span className="ml-2">Quay về</span>
        </Link>
      </div>
    </section>
  );
}
