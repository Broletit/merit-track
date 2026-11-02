import statCardStyles from "@/components/shared/statistics/StatCard.module.css";
import CriteriaDefinitionTable from "@/components/shared/criteria/CriteriaDefinitionTable";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  ClipboardCheck,
  FileText,
  Pencil,
  Users,
} from "lucide-react";

import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import EventSubmissionPhaseBadge from "@/components/shared/EventSubmissionPhaseBadge";

import EventStatusActions from "@/components/admin/events/EventStatusActions";

type Params = Promise<{
  id: string;
}>;

type EventRow = {
  id: number;
  term_id: number;
  title: string;
  description: string | null;
  type: string;
  status: string;
  start_at: string;
  end_at: string;
  allow_late: number;
  template_name: string | null;
  term_name: string | null;
  term_is_active: number;
  submissions: number;
  created_at: string;
  score_max: number | null;
};

export default async function AdminEventDetailPage({
  params,
}: {
  params: Params;
}) {
  await requireAdminContext();

  const { id } = await params;
  const eventId = await getDatabase().resolveRouteRecordId(id);

  if (!Number.isFinite(eventId) || eventId <= 0) {
    notFound();
  }

  const db = getDatabase();

  const event = (await db.first(`
      SELECT
        e.id,
        e.term_id,
        e.title,
        e.description,
        e.type,
        e.status,
        e.start_at,
        e.end_at,
        e.allow_late,
        e.created_at,
        e.score_max,

        ct.name AS template_name,
        at.name AS term_name,
        at.is_active AS term_is_active,

        (
          SELECT COUNT(*)
          FROM submissions s
          WHERE s.event_id = e.id
        ) AS submissions

      FROM events e

      LEFT JOIN criteria_templates ct
        ON ct.id = e.criteria_template_id

      LEFT JOIN academic_terms at
        ON at.id = e.term_id

      WHERE e.id = ?
      LIMIT 1
      `, [eventId])) as EventRow | undefined;

  if (!event) {
    notFound();
  }

  const stats = [
    {
      label: "Tổng hồ sơ",
      value: Number(event.submissions ?? 0),
      icon: FileText,
    },
    {
      label: "Đối tượng",
      value: event.type === "student"
        ? "Sinh viên"
        : "Cán bộ",
      icon: Users,
    },

  ];

  return (
    <main className="space-y-6">
      {/* HEADER */}
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)] shadow-slate-200/60">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <ClipboardCheck size={26} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold">
                  {event.title}
                </h1>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    event.status === "published"
                      ? "bg-emerald-400/20 text-emerald-100"
                      : event.status === "closed"
                      ? "bg-rose-400/20 text-rose-100"
                      : "bg-amber-400/20 text-amber-100"
                  }`}
                >
                  {event.status === "published"
                    ? "Đang công khai"
                    : event.status === "closed"
                    ? "Đã đóng"
                    : "Nháp"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-xs text-blue-100/80">
                <span>
                  Học kỳ:{" "}
                  <span className="font-medium text-white">
                    {event.term_name ?? "-"}
                  </span>
                </span>

                <span>•</span>

                <span>
                  Tạo lúc:{" "}
                  <span className="font-medium text-white">
                    {formatDateTimeVN(event.created_at)}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col items-stretch gap-2 lg:w-auto lg:gap-3">
            <div className="flex flex-wrap gap-2 lg:gap-3">
              {Boolean(event.term_is_active) ? <Link
                href="/dashboard/admin/events"
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15 lg:min-h-0 lg:flex-none"
               data-back-link>
                <ArrowLeft size={16} />
                Quay về
              </Link> : null}

              <Link
                href={`/dashboard/admin/events/${event.id}/edit`}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-900 transition hover:bg-blue-50 lg:min-h-0 lg:flex-none"
              >
                <Pencil size={16} />
                Chỉnh sửa
              </Link>
            </div>
            <Link href={event.type === "officer" ? `/dashboard/admin/reports/officer-achievements?termId=${event.term_id}&eventId=${event.id}` : `/dashboard/admin/reports/student-awards?termId=${event.term_id}&eventId=${event.id}`} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-2 text-sm font-medium text-amber-950 transition hover:bg-amber-200"><BarChart3 size={16} />{event.type === "officer" ? "Phân tích và xếp hạng cán bộ" : "Phân tích hồ sơ và ứng viên"}</Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="grid gap-4 md:grid-cols-2">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className={[statCardStyles.card, "min-w-0"].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <div className={statCardStyles.label}>{item.label}</div>
                <div className={[statCardStyles.icon, "flex items-center justify-center"].join(" ")}>
                  <Icon size={20} />
                </div>
              </div>
              <div className={[statCardStyles.value, "text-slate-900"].join(" ")}>{item.value}</div>
            </div>
          );
        })}
      </section>

      {/* THÔNG TIN */}
      <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Thông tin đợt xét
          </h2>

          <div className={`mt-5 grid gap-5 ${event.type === "officer" ? "sm:grid-cols-2 md:grid-cols-4" : "md:grid-cols-3"}`}>
            <InfoItem
              label="Thời gian mở nộp"
              value={formatDateTimeVN(event.start_at)}
            />

            <InfoItem
              label="Thời gian đóng nộp"
              value={formatDateTimeVN(event.end_at)}
            />

            <InfoItem
              label="Mẫu tiêu chuẩn"
              value={event.template_name ?? "-"}
            />

            {event.type === "officer" ? (
              <InfoItem label="Điểm tối đa" value={`${Number(event.score_max ?? 0)} điểm`} />
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid items-stretch gap-4 md:grid-cols-2">
          <div className="min-w-0 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 shadow-md shadow-slate-200/60"><h3 className="text-sm font-medium text-slate-600">Mô tả</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{event.description || "Chưa có mô tả."}</p></div>
          <div className="min-w-0 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 shadow-md shadow-slate-200/60">
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-medium text-slate-600">Trạng thái tiếp nhận</h3>
              <EventSubmissionPhaseBadge
                event={{
                  status: event.status,
                  startAt: event.start_at,
                  endAt: event.end_at,
                  allowLate: Number(event.allow_late ?? 0) === 1,
                }}
              />
            </div>
            <EventStatusActions
              eventId={event.id}
              status={event.status}
              submissions={Number(event.submissions ?? 0)}
            />

          </div>
        </div>
      </section>
    <CriteriaDefinitionTable eventId={eventId}/>
</main>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 shadow-md shadow-slate-200/60">
      <div className="text-sm font-medium text-slate-500">
        {label}
      </div>

      <div className="mt-2 break-words text-sm font-semibold text-slate-900">
        {value}
      </div>
    </div>
  );
}
