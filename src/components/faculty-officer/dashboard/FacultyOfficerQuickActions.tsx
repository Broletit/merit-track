import Link from "next/link";

const actions = [
  {
    title: "Hoạt động",
    description: "Theo dõi hoạt động và tình hình tham gia của sinh viên toàn khoa.",
    href: "/dashboard/faculty-officer/activities",
    bgClass: "bg-blue-50",
  },
  {
    title: "Điểm danh QR",
    description: "Quét QR để ghi nhận người tham gia các hoạt động của khoa.",
    href: "/dashboard/faculty-officer/checkin",
    bgClass: "bg-amber-50",
  },
  {
    title: "Duyệt hồ sơ",
    description: "Duyệt vòng 1 hỗ trợ cán bộ lớp và tiếp tục duyệt vòng 2.",
    href: "/dashboard/faculty-officer/reviews",
    bgClass: "bg-violet-50",
  },
];

export default function FacultyOfficerQuickActions() {
  return (
    <section className="min-w-0 rounded-3xl bg-linear-to-br from-white via-blue-50 to-sky-100 p-6 shadow-md ring-1 ring-blue-100 transition-all duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-100/60">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
        Truy cập nhanh
      </h2>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`rounded-3xl p-6 transition hover:shadow-md ${action.bgClass}`}
          >
            <div className="text-lg font-semibold text-slate-900">
              {action.title}
            </div>
            <p className="mt-3 text-base leading-8 text-slate-600">
              {action.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
