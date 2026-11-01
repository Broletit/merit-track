import DataTable from "@/components/common/DataTable";
import { getDatabase } from "@/server/db/mysql";
import { ensureActivityConductScores } from "@/server/conduct/ensureActivityConductScores";
import CancelRegistrationControl from "./CancelRegistrationControl";
import TableResultsFooter from "@/components/common/TableResultsFooter";
import PaginationArrow from "@/components/common/PaginationArrow";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";

export default async function AdminActivityRegistrations({ activityId, requestedPage = '1' }: { activityId: number; requestedPage?: string }) {
  (await ensureActivityConductScores());
  const db = getDatabase();
  const activity=(await db.first("SELECT CASE WHEN end_at IS NOT NULL AND CAST(end_at AS DATETIME(3))<=CURRENT_TIMESTAMP(3) THEN 1 ELSE 0 END AS ended FROM activities WHERE id=?", [activityId])) as {ended:number}|undefined;
  const showActions=Boolean(activity) && !activity?.ended;
  const { total } = (await db.first("SELECT COUNT(*) total FROM activity_registrations WHERE activity_id=? AND status<>'cancelled'", [activityId])) as { total: number };
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const parsedPage = Number(requestedPage);
  const page = Math.min(totalPages, Number.isSafeInteger(parsedPage) ? Math.max(1, parsedPage) : 1);
  const rows = (await db.rows("SELECT ar.id,ar.status,ar.registered_at,ar.import_batch_id,(SELECT note FROM activity_attendance_logs al WHERE al.activity_id=ar.activity_id AND al.user_id=ar.user_id AND al.result='success' ORDER BY al.id DESC LIMIT 1) AS attendance_note,u.full_name,u.mssv FROM activity_registrations ar JOIN users u ON u.id=ar.user_id WHERE ar.activity_id=? AND ar.status<>'cancelled' ORDER BY ar.registered_at DESC,ar.id DESC LIMIT ? OFFSET ?", [activityId, pageSize, (page - 1) * pageSize])) as { id: number; status: string; import_batch_id: number | null; attendance_note: string | null; registered_at: string | null; full_name: string; mssv: string }[];
  return <section className="min-w-0 rounded-3xl bg-white p-4 shadow-md ring-1 ring-slate-100 sm:p-6 shadow-slate-200/60">
    <h2 className="text-lg font-semibold text-slate-900">Danh sách đăng ký</h2>
    <div data-table-frame className="mt-5 min-w-0">
      <div className="overflow-x-auto rounded-none border border-slate-200">
        <DataTable className="activity-registrations-table">
          <colgroup><col style={{ width: '3.75rem' }}/><col/><col/><col style={{ width: '14rem' }}/><col/><col/>{showActions?<col/>:null}</colgroup>
          <thead className="bg-blue-800 text-white" style={{ backgroundColor: "#1e40af", color: "#ffffff" }}><tr><th className="bg-blue-800 px-4 py-3 text-center text-sm text-white">STT</th>{['Họ tên', 'MSSV', 'Thời gian đăng ký', 'Trạng thái', 'Hình thức điểm danh', ...(showActions?['Thao tác']:[])].map(label => <th key={label} className="whitespace-nowrap bg-blue-800 px-4 py-3 text-left text-sm text-white">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={row.id}>
            <td className="px-4 py-3 text-center text-sm">{(page - 1) * pageSize + index + 1}</td>
            <td className="px-4 py-3 text-sm">{row.full_name}</td><td className="px-4 py-3 text-sm">{row.mssv}</td>
            <td className="whitespace-nowrap px-4 py-3 text-sm">{formatDateTimeVN(row.registered_at)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-sm">{row.status === 'attended' ? 'Đã điểm danh' : row.status === 'absent' ? 'Vắng' : 'Đã đăng ký'}</td>
            <td className="whitespace-nowrap px-4 py-3 text-sm">{row.status !== 'attended' ? '—' : row.import_batch_id != null ? 'Cập nhật từ danh sách' : row.attendance_note?.includes('thủ công') ? 'Thủ công' : row.attendance_note ? 'Quét mã' : '—'}</td>
            {showActions?<td className="px-4 py-3">{row.status !== 'attended' ? <CancelRegistrationControl registrationId={row.id} /> : null}</td>:null}
          </tr>)}{!rows.length ? <tr><td colSpan={showActions?7:6} className="px-4 py-8 text-center text-sm text-slate-500">Chưa có đăng ký.</td></tr> : null}</tbody>
        </DataTable>
      </div>
      <TableResultsFooter totalResults={total} resultLabel="đăng ký">
        <PaginationArrow href={'?registrationPage=' + (page - 1)} direction="left" disabled={page <= 1} />
        <span className="text-sm text-slate-500">Trang {page}/{totalPages}</span>
        <PaginationArrow href={'?registrationPage=' + (page + 1)} direction="right" disabled={page >= totalPages} />
      </TableResultsFooter>
    </div>
  </section>;
}
