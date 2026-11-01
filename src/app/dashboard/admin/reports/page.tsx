import Link from "next/link";
import { Activity, ClipboardCheck, Trophy } from "lucide-react";
import { requireAdminContext } from "@/server/auth/guards";

export default async function AdminReportsPage() {
  await requireAdminContext();

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)] shadow-slate-200/60">
        <h1 className="text-2xl font-semibold">Báo cáo & thống kê</h1>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <ReportCard
          href="/dashboard/admin/reports/student-activities"
          icon={<Activity size={22} />}
          title="Hoạt động sinh viên"
          description="Tỉ lệ đăng ký, điểm danh, lớp tham gia tích cực và sinh viên ít tham gia."
        />

        <ReportCard
          href="/dashboard/admin/reports/student-awards"
          icon={<ClipboardCheck size={22} />}
          title="Đợt xét sinh viên"
          description="Thống kê đạt/không đạt, thiếu tiêu chí và danh sách đủ điều kiện."
        />

        <ReportCard
          href="/dashboard/admin/reports/officer-achievements"
          icon={<Trophy size={22} />}
          title="Đợt xét cán bộ"
          description="Xếp hạng cán bộ theo điểm hồ sơ, phục vụ báo cáo cấp trường."
        />

      </section>
    </main>
  );
}

function ReportCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-3xl border border-blue-100 bg-linear-to-br from-white via-blue-50 to-cyan-50 p-6 shadow-[0_10px_28px_rgba(37,99,235,.10)] transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_18px_38px_rgba(37,99,235,.18)]"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-lg shadow-blue-200 transition group-hover:scale-105">
        {icon}
      </div>

      <h2 className="mt-5 text-lg font-semibold text-slate-900">{title}</h2>
      {description ? null : null}
    </Link>
  );
}
