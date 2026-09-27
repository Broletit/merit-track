"use client";

import Link from "next/link";
import { Upload, CalendarCheck2, ClipboardCheck, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type QuickAction = {
  title: string;
  desc: string;
  href: string;
  icon: LucideIcon;
  cardClass: string;
  iconWrapClass: string;
};

export default function AdminQuickActions() {
  const actions: QuickAction[] = [
    {
      title: "Import sinh viên",
      desc: "Tạo tài khoản và gán lớp tự động.",
      href: "/dashboard/admin/students-import",
      icon: Upload,
      cardClass: "bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50",
      iconWrapClass: "bg-blue-900 text-white",
    },
    {
      title: "Hoạt động",
      desc: "Tạo hoạt động và quản lý điểm danh.",
      href: "/dashboard/admin/activities",
      icon: CalendarCheck2,
      cardClass: "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50",
      iconWrapClass: "bg-amber-400 text-slate-900",
    },
    {
      title: "Đợt xét",
      desc: "Tạo đợt xét và mapping tiêu chí.",
      href: "/dashboard/admin/events",
      icon: Trophy,
      cardClass: "bg-gradient-to-br from-violet-50 via-fuchsia-50 to-purple-50",
      iconWrapClass: "bg-violet-600 text-white",
    },
    {
      title: "Hồ sơ xét",
      desc: "Đánh giá và duyệt hồ sơ sinh viên.",
      href: "/dashboard/admin/submissions",
      icon: ClipboardCheck,
      cardClass: "bg-gradient-to-br from-emerald-50 via-lime-50 to-green-50",
      iconWrapClass: "bg-emerald-600 text-white",
    },
  ];

  return (
    <section className="rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      <div className="text-xl font-semibold text-slate-900">Truy cập nhanh</div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {actions.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.title}
              href={item.href}
              className={[
                "rounded-2xl p-5 shadow-[0_10px_30px_rgba(15,23,42,0.10)] transition",
                "hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.14)]",
                item.cardClass,
              ].join(" ")}
            >
              <div className="flex items-start gap-4">
                <div
                  className={[
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm",
                    item.iconWrapClass,
                  ].join(" ")}
                >
                  <Icon size={22} />
                </div>

                <div>
                  <div className="text-lg font-semibold text-slate-900">{item.title}</div>
                  <div className="mt-1 text-sm text-slate-700">{item.desc}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}