import { CircleAlert } from "lucide-react";

export default function MissingEmailBadge({className=""}:{className?:string}) {
  return <span role="img" aria-label="Chưa cập nhật email khôi phục" title="Chưa cập nhật email khôi phục" className={`inline-flex shrink-0 items-center justify-center rounded-full bg-red-50 p-0.5 text-red-600 ${className}`}><CircleAlert size={14} aria-hidden="true"/></span>;
}
