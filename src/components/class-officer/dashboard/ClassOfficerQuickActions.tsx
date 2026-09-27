import Link from "next/link";

const actions = [
  {
    title: "Hoạt động",
    description: "Theo dõi các hoạt động liên quan đến sinh viên lớp phụ trách.",
    href: "/dashboard/class-officer/activities",
    bgClass: "bg-blue-50",
  },
  {
    title: "Đợt xét",
    description: "Xem các đợt xét đang áp dụng cho lớp hiện tại.",
    href: "/dashboard/class-officer/events",
    bgClass: "bg-amber-50",
  },
  {
    title: "Hồ sơ",
    description: "Tiếp nhận, kiểm tra và duyệt hồ sơ vòng 1 của lớp.",
    href: "/dashboard/class-officer/submissions",
    bgClass: "bg-violet-50",
  },
];

export default function ClassOfficerQuickActions() {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
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
