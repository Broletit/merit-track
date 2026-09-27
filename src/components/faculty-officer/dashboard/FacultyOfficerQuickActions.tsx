import Link from "next/link";

const actions = [
  {
    title: "Hoạt động",
    description: "Xem danh sách hoạt động và tiến độ tham gia của nhiều lớp.",
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
    title: "Hồ sơ khoa",
    description: "Duyệt hồ sơ vòng 2 và lọc theo từng lớp phụ trách.",
    href: "/dashboard/faculty-officer/submissions",
    bgClass: "bg-violet-50",
  },
];

export default function FacultyOfficerQuickActions() {
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