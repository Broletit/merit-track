import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarCheck, CheckCircle2, Pencil, Star, Users } from "lucide-react";

import ActivityStatusActions from "@/components/admin/activities/ActivityStatusActions";
import FacultyAttendanceImport from "@/components/admin/activities/FacultyAttendanceImport";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";

type ActivityRow = {
  id: number; title: string; description: string | null; audience_type: string; status: string;
  start_at: string; end_at: string; registration_start_at: string | null; registration_end_at: string | null;
  conduct_score: number; qr_checkin_enabled: number; term_name: string; term_is_active: number;
  organizer_level: string; participation_source: string;
  registration_locked: number;
  registrations: number; registration_records: number; attended: number; created_at: string; registration_phase: string;
};

export default async function AdminActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminContext();
  const { id } = await params;
  const activityId = Number(id);
  if (!Number.isFinite(activityId) || activityId <= 0) notFound();

  const db = getDb();
  const activity = db.prepare(`
    SELECT a.*, at.name AS term_name, at.is_active AS term_is_active,
      CASE
        WHEN a.status = 'draft' THEN 'draft'
        WHEN a.registration_locked = 1 THEN 'locked'
        WHEN a.registration_start_at IS NOT NULL
          AND datetime('now') < datetime(a.registration_start_at) THEN 'upcoming'
        WHEN a.registration_end_at IS NOT NULL
          AND datetime('now') > datetime(a.registration_end_at) THEN 'expired'
        ELSE 'open'
      END AS registration_phase,
      (SELECT COUNT(*) FROM activity_registrations ar
        WHERE ar.activity_id = a.id AND ar.status != 'cancelled') AS registrations,
      (SELECT COUNT(*) FROM activity_registrations ar
        WHERE ar.activity_id = a.id) AS registration_records,
      (SELECT COUNT(*) FROM activity_registrations ar
        WHERE ar.activity_id = a.id AND ar.status = 'attended') AS attended
    FROM activities a
    INNER JOIN academic_terms at ON at.id = a.term_id
    WHERE a.id = ? LIMIT 1
  `).get(activityId) as ActivityRow | undefined;
  if (!activity) notFound();

  const stats = [
    { label: "Đã đăng ký", value: Number(activity.registrations ?? 0), icon: Users },
    { label: "Đã tham gia", value: Number(activity.attended ?? 0), icon: CheckCircle2 },
    { label: "Điểm rèn luyện", value: Number(activity.conduct_score ?? 0), icon: Star },
  ];

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <CalendarCheck size={26} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="min-w-0 break-words text-2xl font-semibold">{activity.title}</h1>
                <StatusBadge status={activity.status} />
              </div>
              <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-blue-100/80">
                {activity.description || "Không có mô tả."}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-blue-100/80">
                <span>Học kỳ: <span className="font-medium text-white">{activity.term_name}</span></span>
                <span>•</span>
                <span>Tạo lúc: <span className="font-medium text-white">{formatDateTimeVN(activity.created_at)}</span></span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <div className="flex flex-nowrap items-center gap-2">
            <Link href="/dashboard/admin/activities" className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/15 sm:px-4">
              <ArrowLeft size={16} />Quay về
            </Link>
            {Boolean(activity.term_is_active) ? (
              <Link href={`/dashboard/admin/activities/${activity.id}/edit`} className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-white px-3 py-2 text-sm font-semibold text-blue-900 transition hover:bg-blue-50 sm:px-4">
                <Pencil size={16} />Chỉnh sửa
              </Link>
            ) : (
              <span
                aria-disabled="true"
                title="Học kỳ không hiện hành, chỉ được xem dữ liệu"
                className="inline-flex shrink-0 cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-400 shadow-sm sm:px-4"
              >
                <Pencil size={16} />Chỉnh sửa
              </span>
            )}
            </div>
            {Number(activity.registrations ?? 0) > 0 ? (
              <a href={`/api/admin/activities/${activity.id}/export`} className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-xl bg-amber-300 px-3 text-sm font-medium text-amber-950 transition hover:bg-amber-200">Xuất danh sách tham gia</a>
            ) : (
              <span
                aria-disabled="true"
                title="Chưa có người đăng ký nên chưa thể xuất danh sách"
                className="inline-flex h-9 cursor-not-allowed items-center justify-center whitespace-nowrap rounded-xl bg-slate-200 px-3 text-sm font-medium text-slate-400"
              >
                Xuất danh sách tham gia
              </span>
            )}
          </div>
        </div>
      </section>

      {!activity.term_is_active ? (
        <section className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-700 ring-1 ring-amber-100">
          Hoạt động thuộc học kỳ không hiện hành. Dữ liệu chỉ được xem lại và không thể chỉnh sửa trạng thái.
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-500">{item.label}</div>
                  <div className="mt-3 text-2xl font-bold text-slate-900">{item.value}</div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Icon size={20} /></div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Thông tin hoạt động</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <InfoItem label="Thời gian đăng ký" value={formatRange(activity.registration_start_at, activity.registration_end_at)} />
            <InfoItem label="Thời gian hoạt động" value={formatRange(activity.start_at, activity.end_at)} />
            <InfoItem label="Đối tượng" value={getAudienceLabel(activity.audience_type)} />
            <InfoItem label="Hình thức điểm danh" value={activity.qr_checkin_enabled ? "Quét mã QR" : "Điểm danh thủ công"} />
            <InfoItem label="Cấp tổ chức" value={activity.organizer_level === "class" ? "Chi đoàn / lớp" : "Cấp khoa"} />
            <InfoItem label="Nguồn đăng ký" value={activity.participation_source === "external" ? "Hệ thống của trường" : "Hệ thống của khoa"} />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Trạng thái hoạt động</h2>
          <div className="mt-5">
            <div className="mb-4">
              <div className="mb-2 text-sm font-medium text-slate-500">Tình trạng nhận đăng ký</div>
              <RegistrationPhaseBadge activity={activity} />
            </div>
            {activity.term_is_active ? (
              <ActivityStatusActions activityId={activity.id} status={activity.status} registrationCount={Number(activity.registration_records ?? 0)} registrationLocked={Boolean(activity.registration_locked)} />
            ) : (
              <p className="text-sm text-slate-500">Học kỳ đã kết thúc — chỉ được xem dữ liệu.</p>
            )}
          </div>
        </div>
      </section>

      <FacultyAttendanceImport activityId={activity.id} />
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className = status === "published" ? "bg-emerald-400/20 text-emerald-100" : "bg-amber-400/20 text-amber-100";
  const label = status === "published" ? "Đang công khai" : "Nháp";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function RegistrationPhaseBadge({ activity }: { activity: ActivityRow }) {
  let label = "Đang nhận đăng ký";
  let className = "bg-emerald-50 text-emerald-700 ring-emerald-100";

  if (activity.registration_phase === "draft") {
    label = "Chưa công khai";
    className = "bg-amber-50 text-amber-700 ring-amber-100";
  } else if (activity.registration_phase === "locked") {
    label = "Đã khóa đăng ký thủ công";
    className = "bg-slate-100 text-slate-600 ring-slate-200";
  } else if (activity.registration_phase === "upcoming") {
    label = "Chưa đến thời gian đăng ký";
    className = "bg-blue-50 text-blue-700 ring-blue-100";
  } else if (activity.registration_phase === "expired") {
    label = "Đã hết hạn đăng ký";
    className = "bg-rose-50 text-rose-700 ring-rose-100";
  }
  return <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${className}`}>{label}</span>;
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4"><div className="text-sm font-medium text-slate-500">{label}</div><div className="mt-2 text-sm font-semibold text-slate-900">{value}</div></div>;
}

function formatRange(start: string | null, end: string | null) {
  if (!start && !end) return "Không giới hạn";
  return `${start ? formatDateTimeVN(start) : "Không giới hạn"} → ${end ? formatDateTimeVN(end) : "Không giới hạn"}`;
}

function getAudienceLabel(value: string) {
  if (value === "student") return "Sinh viên";
  if (value === "officer") return "Cán bộ";
  return "Không xác định";
}
