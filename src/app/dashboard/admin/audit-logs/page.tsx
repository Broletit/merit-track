import DataTable from "@/components/common/DataTable";
import AuditLogsFilter from "@/components/admin/audit-logs/AuditLogsFilter";
import Pagination from "@/components/common/Pagination";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { getAcademicTermForView, getAcademicTermsForSelect } from "@/server/academic-terms/getAcademicTermForView";

const PAGE_SIZE = 10;
const actionLabels: Record<string, string> = {
  "activity.delete": "Xóa hoạt động", "event.delete": "Xóa đợt xét",
  "conduct.category.delete": "Xóa mục điểm rèn luyện", "criteria_template.delete": "Xóa bộ tiêu chuẩn",
  "criteria_group.delete": "Xóa nhóm tiêu chuẩn", "criteria_item.delete": "Xóa tiêu chí",
  "user.class.transfer": "Chuyển lớp người dùng",
  "user.role.update": "Thay đổi vai trò",
  "user.status.update": "Thay đổi trạng thái tài khoản",
  "activity.attendance.import": "Nhập danh sách tham gia hoạt động",
};
const entityLabels: Record<string, string> = {
  activity_registration: "Đăng ký hoạt động", activity: "Hoạt động", event: "Đợt xét", conduct_score_category: "Mục điểm rèn luyện",
  criteria_template: "Bộ tiêu chuẩn", criteria_group: "Nhóm tiêu chuẩn", criteria_item: "Tiêu chí", user: "Người dùng",
};
const roleLabels: Record<string, string> = { student: "Sinh viên", class_officer: "Cán bộ lớp", faculty_officer: "Cán bộ khoa", admin: "Quản trị viên" };

type SearchParams = Promise<{ page?: string; termId?: string; target?: string; action?: string; dateFrom?: string; dateTo?: string }>;
type Row = { id: number; action: string; entity_type: string | null; entity_id: string | null; reason: string | null; before_json: string | null; after_json: string | null; created_at: string; activity_title: string | null; target_full_name: string | null; target_mssv: string | null };

function parseJson(value: string | null): unknown { if (!value) return null; try { return JSON.parse(value) as unknown; } catch { return null; } }
function record(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function targetName(row: Row) {
  if (row.target_full_name) return row.target_full_name;
  const before = record(parseJson(row.before_json));
  const after = record(parseJson(row.after_json));
  const snapshot = before ?? after;
  const name = String(snapshot?.title ?? snapshot?.name ?? after?.title ?? row.activity_title ?? snapshot?.full_name ?? "").trim();
  const code = String(snapshot?.code ?? "").trim();
  const type = entityLabels[row.entity_type ?? ""] ?? "Đối tượng khác";
  const detail = name || code;
  return detail ? type + ": " + (code && name ? code + ". " + name : detail) : type;
}
function changeSummary(row: Row, classNames: Map<number, string>) {
  const parsedBefore = parseJson(row.before_json); const before = record(parsedBefore); const after = record(parseJson(row.after_json));
  if (row.action === "user.class.transfer") { const old = Array.isArray(parsedBefore) ? record(parsedBefore[0]) : before; return `Chuyển từ ${classNames.get(Number(old?.class_id ?? 0)) ?? "lớp chưa xác định"} sang ${classNames.get(Number(after?.classId ?? 0)) ?? "lớp chưa xác định"}.`; }
  if (row.action === "user.role.update") return `Vai trò: ${roleLabels[String(before?.role ?? "")] ?? "chưa xác định"} → ${roleLabels[String(after?.role ?? "")] ?? "chưa xác định"}.`;
  if (row.action === "user.status.update") return `Trạng thái: ${Number(before?.isActive) ? "Đang hoạt động" : "Đã khóa"} → ${Number(after?.isActive) ? "Đang hoạt động" : "Đã khóa"}.`;
  if (row.action === "criteria_template.clone") return `Tạo bộ “${String(after?.name ?? "Bản sao")}” từ bộ tiêu chuẩn có sẵn.`;
  if (row.action === "activity.attendance.import") return `Đã xử lý ${Number(after?.total ?? 0)} dòng; hợp lệ ${Number(after?.success ?? 0) + Number(after?.duplicate ?? 0)}, không hợp lệ ${Number(after?.invalid ?? 0)}.`;
  if (row.action.endsWith(".delete")) { const name = String(before?.title ?? before?.name ?? before?.code ?? "").trim(); return name ? `Đã xóa “${name}”. Dữ liệu trước khi xóa được lưu để truy vết.` : "Đã xóa bản ghi. Thông tin trước khi xóa được lưu để truy vết."; }
  return "Thông tin đã được cập nhật và lưu vào lịch sử hệ thống.";
}

export default async function AuditLogsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminContext(); const params = await searchParams;
  const requestedPage = Number(params.page ?? 1); const target = String(params.target ?? "").trim();
  const action = String(params.action ?? "").trim();
  const dateFrom = String(params.dateFrom ?? "").trim(); const dateTo = String(params.dateTo ?? "").trim();
  const terms = (await getAcademicTermsForSelect()); const selectedTerm = (await getAcademicTermForView(params.termId)); const termId = String(selectedTerm.id);
  const db = getDatabase();  const where: string[] = ["date(al.created_at) >= date(?)", "date(al.created_at) <= date(?)"]; const values: unknown[] = [selectedTerm.startAt, selectedTerm.endAt];
  if (target) { where.push("((LOCATE(LOWER(?), LOWER(target.mssv)) > 0) OR (LOCATE(LOWER(?), LOWER(target.full_name)) > 0))"); values.push(target,target); }
  if (action) { where.push("al.action = ?"); values.push(action); }
  if (dateFrom) { where.push("date(al.created_at) >= date(?)"); values.push(dateFrom); } if (dateTo) { where.push("date(al.created_at) <= date(?)"); values.push(dateTo); }
  const joins = "LEFT JOIN users target ON al.entity_type = 'user' AND CAST(target.id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_general_ci = al.entity_id COLLATE utf8mb4_general_ci";
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = Number(((await db.first(`SELECT COUNT(*) AS total FROM audit_logs al ${joins} ${whereSql}`, [...values])) as { total: number }).total); const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE)); const page = Math.min(totalPages, Number.isSafeInteger(requestedPage) ? Math.max(1, requestedPage) : 1);
  const rows = (await db.rows(`SELECT al.*, (SELECT a.title FROM activities a WHERE al.entity_type='activity' AND CAST(a.id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_general_ci = al.entity_id COLLATE utf8mb4_general_ci) AS activity_title, target.full_name AS target_full_name, target.mssv AS target_mssv FROM audit_logs al ${joins} ${whereSql} ORDER BY CAST(al.created_at AS DATETIME(3)) DESC, al.id DESC LIMIT ? OFFSET ?`, [...values, PAGE_SIZE, (page - 1) * PAGE_SIZE])) as Row[];
  const actionRows = (await db.rows("SELECT DISTINCT action FROM audit_logs ORDER BY action", [])) as Array<{ action: string }>;
  const classes = (await db.rows("SELECT id, code, name FROM classes", [])) as Array<{ id: number; code: string; name: string }>;
  const classNames = new Map(classes.map((item) => [item.id, `${item.code} - ${item.name}`])); const preserved = { termId, target, action, dateFrom, dateTo };

  return <main className="audit-logs-page min-w-0 space-y-6">
    <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-md shadow-slate-200/60"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><h1 className="text-2xl font-semibold">Nhật ký hệ thống</h1><AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id}/></div></section>
    <div data-table-frame className="min-w-0 overflow-hidden rounded-none border border-slate-200 bg-white">
<section className="flex min-w-0 flex-col bg-white p-4 sm:p-6"><h2 className="order-1 text-xl font-semibold text-slate-900">Kết quả truy xuất</h2><div className="order-2 mt-5"><AuditLogsFilter actions={actionRows.map(item=>({value:item.action,label:actionLabels[item.action] ?? "Thao tác hệ thống"}))}/></div>

      <div className="order-3 mt-5 overflow-x-auto rounded-none border border-slate-200"><DataTable className="audit-logs-table w-full divide-y divide-slate-200"><colgroup><col style={{width:"3.75rem"}}/><col/><col/><col style={{width:"12rem"}}/><col/><col/></colgroup>
        <thead className="bg-blue-800 text-white"><tr>
          <th className="px-4 py-3 text-center text-sm font-semibold">STT</th>
          <th data-column-align="left" className="px-4 py-3 text-left text-sm font-semibold">Đối tượng bị tác động</th>
          <th data-column-align="left" className="px-4 py-3 text-left text-sm font-semibold">Thao tác</th>
          <th className="px-4 py-3 text-center text-sm font-semibold">Thời gian</th>
          <th className="px-4 py-3 text-left text-sm font-semibold">Lý do</th>
          <th className="px-4 py-3 text-left text-sm font-semibold">Nội dung thay đổi</th>
        </tr></thead>
        <tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={row.id}>
          <td className="px-4 py-3 text-center text-sm">{(page - 1) * PAGE_SIZE + index + 1}</td>
          <td data-column-align="left" className="px-4 py-3 text-left text-sm"><div className="font-medium">{targetName(row)}</div>{row.target_mssv ? <div className="text-xs text-slate-500">MSSV: {row.target_mssv}</div> : null}</td>
          <td data-column-align="left" className="px-4 py-3 text-left text-sm font-medium text-black">{actionLabels[row.action] ?? "Thao tác hệ thống"}</td>
          <td className="whitespace-nowrap px-4 py-3 text-center text-sm">{formatDateTimeVN(row.created_at)}</td>
          <td className="max-w-xs px-4 py-3 text-sm text-slate-700">{row.reason ?? "Không ghi nhận lý do"}</td>
          <td className="max-w-md px-4 py-3 text-sm text-slate-700">{changeSummary(row, classNames)}</td>
        </tr>)}{!rows.length ? <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">Không tìm thấy nhật ký phù hợp với bộ lọc.</td></tr> : null}</tbody>
      </DataTable></div>
    </section>
<Pagination totalResults={total} resultLabel="bản ghi" page={page} totalPages={totalPages} searchParams={preserved}/>
</div>
  </main>;
}
