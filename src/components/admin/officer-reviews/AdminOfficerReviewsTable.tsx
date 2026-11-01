import NumberedTable from "@/components/common/NumberedTable";
import Link from "next/link";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import SubmissionStatusBadge from "@/components/shared/submissions/SubmissionStatusBadge";
import AdminOfficerSubmissionsFilter from "@/components/admin/officer-submissions/AdminOfficerSubmissionsFilter";

export type AdminOfficerReviewRow = {
  id: number;
  eventTitle: string;
  officerName: string;
  officerCode: string;
  classCode: string;
  scoreTotal: number;
  scoreMax: number;
  status: string;
  updatedAt: string | null;
  submittedAt: string | null;
  eventEndAt: string;
  reviewerName: string | null;
  lastReviewNote: string | null;
  revisionCount: number;
  totalCriteria: number;
  completedCriteria: number;
};

export default function AdminOfficerReviewsTable({ page = 1, items }: { page?: number; items: AdminOfficerReviewRow[] }) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <div><AdminOfficerSubmissionsFilter /></div>

      <div className="mt-5">
        <h2 className="text-xl font-semibold text-slate-900">Danh sách hồ sơ cán bộ</h2>
      </div>
      <div className="mt-5 overflow-x-auto rounded-none border border-slate-200">
        <NumberedTable page={page} className="w-full min-w-0 table-fixed divide-y divide-slate-200">
          <thead className="bg-slate-50"><tr>
            <th className="w-[29%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Đợt xét</th>
            <th className="w-[14%] px-3 py-3 text-left text-sm font-semibold text-slate-700">Cán bộ</th>
            <th data-column-align="left" className="w-[9%] px-3 py-3  text-sm font-semibold text-slate-700 text-left">Lớp</th>
            <th className="w-[9%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Điểm</th>
            <th className="w-[16%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Trạng thái</th>
            <th className="w-[12%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Cập nhật</th>
            <th className="w-[11%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Thao tác</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {items.length ? items.map((item) => {
              const canReview = item.status === "submitted_v1";
              return <tr key={item.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-4 text-sm font-semibold text-slate-900">{item.eventTitle}</td>
                <td className="px-3 py-4"><div className="line-clamp-2 text-sm font-medium text-slate-800">{item.officerName}</div><div className="mt-1 truncate text-xs text-slate-500">{item.officerCode}</div></td>
                <td data-column-align="left" className="px-3 py-4 text-sm font-medium text-slate-700 text-left">{item.classCode || "—"}</td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-800">{item.scoreTotal}/{item.scoreMax}</td>
                <td className="px-4 py-4"><SubmissionStatusBadge status={item.status} /></td>
                <td className="px-4 py-4 text-sm text-slate-700">{item.updatedAt ? formatDateTimeVN(item.updatedAt) : "-"}</td>
                <td className="px-4 py-4"><div className="flex justify-center gap-2"><Link href={`/dashboard/admin/officer-reviews/${item.id}?mode=view`} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Xem</Link>{canReview?<Link href={`/dashboard/admin/officer-reviews/${item.id}?mode=review#review-panel`} className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Duyệt</Link>:<button type="button" disabled className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-300 opacity-40">Duyệt</button>}</div></td>
              </tr>;
            }) : <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">Không có hồ sơ cán bộ phù hợp.</td></tr>}
          </tbody>
        </NumberedTable>
      </div>
    </section>
  );
}
