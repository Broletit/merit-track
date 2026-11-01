import { Building2, MapPin } from "lucide-react";

export default function SiteFooter() {
  return (
    <footer className="shrink-0 border-t border-amber-200 bg-white bg-[linear-gradient(110deg,rgba(252,211,77,0.32),rgba(255,255,255,0.85)_48%,rgba(147,197,253,0.32))] px-4 py-3 text-center text-xs font-bold text-blue-900 shadow-[0_-4px_18px_rgba(30,58,138,0.05)] sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-1.5">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <p className="flex items-center justify-center gap-1.5 leading-5 text-blue-900"><Building2 size={14} aria-hidden="true" className="shrink-0 text-blue-700" />Đoàn – Hội Khoa Công nghệ Điện tử</p>
          <p className="flex items-center justify-center gap-1 leading-5"><MapPin size={12} aria-hidden="true" className="shrink-0 text-blue-700" />Văn phòng Đoàn khoa: X7.16</p>
        </div>
        <p className="leading-5">© 2026 · Phát triển bởi <span className="whitespace-nowrap text-blue-900">DAO HOA ANH THU</span></p>
      </div>
    </footer>
  );
}
