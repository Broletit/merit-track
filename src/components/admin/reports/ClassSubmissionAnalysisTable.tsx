type SubmissionRow = {
  id: number;
  studentCode: string;
  studentName: string;
  eventTitle: string;
  status: string;
  submittedAt: string;
  completedCriteria: number;
  totalCriteria: number;
  missingCriteria: number;
  roundOne: string | null;
  roundTwo: string | null;
};

const statusLabels: Record<string, string> = {
  submitted_v1: "Chờ duyệt vòng 1",
  submitted_v2: "Chờ duyệt vòng 2",
  needs_revision_v1: "Cần chỉnh sửa vòng 1",
  needs_revision_v2: "Cần chỉnh sửa vòng 2",
  passed: "Đạt",
  failed: "Không đạt",
  closed: "Đã đóng",
};

const decisionLabels: Record<string, string> = {
  pass: "Đạt",
  revise: "Cần chỉnh sửa",
  fail: "Không đạt",
};

export default function ClassSubmissionAnalysisTable({ items }: { items: SubmissionRow[] }) {
  return (
    <div className="max-h-[560px] overflow-auto rounded-2xl border border-slate-200">
      <table className="w-full min-w-[1220px] table-fixed divide-y divide-slate-200">
        <thead className="sticky top-0 z-10 bg-slate-50">
          <tr>
            <th className="w-[17%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Sinh viên</th>
            <th className="w-[20%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Đợt xét</th>
            <th className="w-[13%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Thời gian nộp</th>
            <th className="w-[14%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Trạng thái</th>
            <th className="w-[16%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Hoàn thiện tiêu chí</th>
            <th className="w-[10%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Vòng 1</th>
            <th className="w-[10%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Vòng 2</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {items.length > 0 ? items.map((item) => {
            const progress = item.totalCriteria > 0 ? Math.round((item.completedCriteria / item.totalCriteria) * 100) : 0;
            return (
              <tr key={item.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">{item.studentName}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.studentCode}</div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{item.eventTitle}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{formatDateTimeVN(item.submittedAt)}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-700">{statusLabels[item.status] ?? item.status}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-between text-xs text-slate-600"><span>{item.completedCriteria}/{item.totalCriteria}</span><span>{progress}%</span></div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} /></div>
                  {item.missingCriteria > 0 ? <div className="mt-1 text-center text-xs text-amber-700">Còn thiếu {item.missingCriteria}</div> : null}
                </td>
                <td className="px-4 py-3 text-center text-sm text-slate-700">{item.roundOne ? decisionLabels[item.roundOne] ?? item.roundOne : "Chưa xét"}</td>
                <td className="px-4 py-3 text-center text-sm text-slate-700">{item.roundTwo ? decisionLabels[item.roundTwo] ?? item.roundTwo : "Chưa xét"}</td>
              </tr>
            );
          }) : (
            <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">Không có hồ sơ phù hợp.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
