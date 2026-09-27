import Link from "next/link";
import {
  Activity,
  Award,
  ClipboardCheck,
  Trophy,
} from "lucide-react";
import { requireAdminContext } from "@/server/auth/guards";

export default async function AdminReportsPage() {
  await requireAdminContext();

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
        <h1 className="text-2xl font-semibold">Báo cáo & thống kê</h1>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <ReportCard
          href="/dashboard/admin/reports/student-activities"
          icon={<Activity size={22} />}
          title="Hoạt động sinh viên"
          description="Tỉ lệ đăng ký, điểm danh, lớp tham gia tích cực và sinh viên ít tham gia."
        />

        <ReportCard
          href="/dashboard/admin/reports/student-awards"
          icon={<ClipboardCheck size={22} />}
          title="Xét thưởng sinh viên"
          description="Thống kê đạt/không đạt, thiếu tiêu chí và danh sách đủ điều kiện."
        />

        <ReportCard
          href="/dashboard/admin/reports/officer-achievements"
          icon={<Trophy size={22} />}
          title="Cán bộ đoàn tiêu biểu"
          description="Xếp hạng cán bộ theo điểm hồ sơ, phục vụ báo cáo cấp trường."
        />

        <ReportCard
          href="/dashboard/admin/reports/overview"
          icon={<Award size={22} />}
          title="Tổng quan khoa"
          description="Tổng hợp nhanh toàn bộ chỉ số hoạt động và xét duyệt."
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
      className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        {icon}
      </div>

      <h2 className="mt-5 text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </Link>
  );
}
