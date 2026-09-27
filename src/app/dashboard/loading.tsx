import { LoaderCircle } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="fixed inset-x-0 top-0 z-[9999] h-[3px] overflow-hidden bg-sky-100/90 shadow-[0_1px_6px_rgba(14,165,233,0.3)]" role="status" aria-label="Đang tải trang">
      <div className="top-loading-gradient h-full w-[38%]" />
      <span className="sr-only"><LoaderCircle />Đang tải dữ liệu...</span>
    </div>
  );
}
