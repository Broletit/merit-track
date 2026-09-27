import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Pencil,
  Users,
} from "lucide-react";

import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import EventSubmissionPhaseBadge from "@/components/shared/EventSubmissionPhaseBadge";

import EventStatusActions from "@/components/admin/events/EventStatusActions";

type Params = Promise<{
  id: string;
}>;

type EventRow = {
  id: number;
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
};

type ScopeRow = {
  code: string;
  name: string;
};

export default async function AdminEventDetailPage({
  params,
}: {
  params: Params;
}) {
  await requireAdminContext();

  const { id } = await params;
  const eventId = Number(id);

  if (!Number.isFinite(eventId) || eventId <= 0) {
    notFound();
  }

  const db = getDb();

  const event = db
    .prepare(
      `
      SELECT
        e.id,
        e.title,
        e.description,
        e.type,
        e.status,
        e.start_at,
        e.end_at,
        e.allow_late,
        e.created_at,

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
      `
    )
    .get(eventId) as EventRow | undefined;

  if (!event) {
    notFound();
  }

  const scopes = db
    .prepare(
      `
      SELECT
        c.code,
        c.name
      FROM event_scopes es
      INNER JOIN classes c
        ON c.id = es.class_id
      WHERE es.event_id = ?
      ORDER BY c.code ASC
      `
    )
    .all(eventId) as ScopeRow[];

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
        : "Cán bộ đoàn",
      icon: Users,
    },
    {
      label: "Cho nộp trễ",
      value: Number(event.allow_late ?? 0) === 1
        ? "Có"
        : "Không",
      icon: CalendarDays,
    },
  ];

  return (
    <main className="space-y-6">
      {/* HEADER */}
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
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

              <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100/80">
                {event.description || "Không có mô tả."}
              </p>

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

          <div className="flex flex-col items-stretch gap-3">
            <div className="flex flex-wrap gap-3">
              {Boolean(event.term_is_active) ? <Link
                href="/dashboard/admin/events"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
              >
                <ArrowLeft size={16} />
                Quay về
              </Link> : null}

              <Link
                href={`/dashboard/admin/events/${event.id}/edit`}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-900 transition hover:bg-blue-50"
              >
                <Pencil size={16} />
                Chỉnh sửa
              </Link>
            </div>
            <Link href={`/dashboard/admin/events/${event.id}/candidates`} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-2 text-sm font-medium text-amber-950 transition hover:bg-amber-200"><BarChart3 size={16} />Phân tích hồ sơ và ứng viên</Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-500">
                    {item.label}
                  </div>

                  <div className="mt-3 text-2xl font-bold text-slate-900">
                    {item.value}
                  </div>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Icon size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* THÔNG TIN */}
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">
            Thông tin đợt xét
          </h2>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
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

            <InfoItem
              label="Cho phép nộp trễ"
              value={
                Number(event.allow_late ?? 0) === 1
                  ? "Có"
                  : "Không"
              }
            />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">
            Trạng thái đợt xét
          </h2>

          <div className="mt-5">
            <div className="mb-4">
              <div className="mb-2 text-sm font-medium text-slate-500">
                Tình trạng nhận hồ sơ
              </div>
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
            <div className="mt-5 border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">Phạm vi áp dụng</h3>
                {scopes.length > 0 ? (
                  <span className="text-xs font-semibold text-blue-700">{scopes.length} lớp</span>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {scopes.length > 0 ? scopes.map((item) => (
                  <span key={item.code} title={item.name} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700">{item.code}</span>
                )) : (
                  <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">Áp dụng cho toàn khoa</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
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
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
      <div className="text-sm font-medium text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-sm font-semibold text-slate-900">
        {value}
      </div>
    </div>
  );
}
