import Link from "next/link";
import Pagination from "@/components/common/Pagination";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { getAcademicTermForView, getAcademicTermsForSelect } from "@/server/academic-terms/getAcademicTermForView";

const PAGE_SIZE = 20;
const actionLabels: Record<string, string> = {
  "activity.delete": "Xóa hoạt động", "event.delete": "Xóa đợt xét",
  "conduct.category.delete": "Xóa mục điểm rèn luyện", "criteria_template.delete": "Xóa bộ tiêu chuẩn",
  "criteria_group.delete": "Xóa nhóm tiêu chuẩn", "criteria_item.delete": "Xóa tiêu chí",
  "criteria_template.clone": "Tạo bản sao bộ tiêu chuẩn", "user.class.transfer": "Chuyển lớp người dùng",
  "user.access.update": "Thay đổi vai trò hoặc trạng thái tài khoản",
  "activity.attendance.import": "Nhập danh sách tham gia hoạt động",
};
const entityLabels: Record<string, string> = {
  activity: "Hoạt động", event: "Đợt xét", conduct_score_category: "Mục điểm rèn luyện",
  criteria_template: "Bộ tiêu chuẩn", criteria_group: "Nhóm tiêu chuẩn", criteria_item: "Tiêu chí", user: "Người dùng",
};
const roleLabels: Record<string, string> = { student: "Sinh viên", class_officer: "Cán bộ lớp", faculty_officer: "Cán bộ khoa", admin: "Quản trị viên" };

type SearchParams = Promise<{ page?: string; termId?: string; actor?: string; target?: string; action?: string; reason?: string; dateFrom?: string; dateTo?: string }>;
type Row = { id: number; action: string; entity_type: string | null; entity_id: string | null; reason: string | null; before_json: string | null; after_json: string | null; created_at: string; actor_full_name: string | null; actor_mssv: string | null; target_full_name: string | null; target_mssv: string | null };

function parseJson(value: string | null): unknown { if (!value) return null; try { return JSON.parse(value) as unknown; } catch { return null; } }
function record(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function changeSummary(row: Row, classNames: Map<number, string>) {
  const parsedBefore = parseJson(row.before_json); const before = record(parsedBefore); const after = record(parseJson(row.after_json));
  if (row.action === "user.class.transfer") { const old = Array.isArray(parsedBefore) ? record(parsedBefore[0]) : before; return `Chuyển từ ${classNames.get(Number(old?.class_id ?? 0)) ?? "lớp chưa xác định"} sang ${classNames.get(Number(after?.classId ?? 0)) ?? "lớp chưa xác định"}.`; }
  if (row.action === "user.access.update") return `Vai trò: ${roleLabels[String(before?.role ?? "")] ?? "chưa xác định"} → ${roleLabels[String(after?.role ?? "")] ?? "chưa xác định"}; trạng thái: ${Number(before?.isActive) ? "Đang hoạt động" : "Đã khóa"} → ${Number(after?.isActive) ? "Đang hoạt động" : "Đã khóa"}.`;
  if (row.action === "criteria_template.clone") return `Tạo bộ “${String(after?.name ?? "Bản sao")}” từ bộ tiêu chuẩn có sẵn.`;
  if (row.action === "activity.attendance.import") return `Đã xử lý ${Number(after?.total ?? 0)} dòng; hợp lệ ${Number(after?.success ?? 0) + Number(after?.duplicate ?? 0)}, không hợp lệ ${Number(after?.invalid ?? 0)}.`;
  if (row.action.endsWith(".delete")) { const name = String(before?.title ?? before?.name ?? before?.code ?? "").trim(); return name ? `Đã xóa “${name}”. Dữ liệu trước khi xóa được lưu để truy vết.` : "Đã xóa bản ghi. Thông tin trước khi xóa được lưu để truy vết."; }
  return "Thông tin đã được cập nhật và lưu vào lịch sử hệ thống.";
}

export default async function AuditLogsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminContext(); const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1); const actor = String(params.actor ?? "").trim(); const target = String(params.target ?? "").trim();
  const action = String(params.action ?? "").trim(); const reason = String(params.reason ?? "").trim();
  const dateFrom = String(params.dateFrom ?? "").trim(); const dateTo = String(params.dateTo ?? "").trim();
  const terms = getAcademicTermsForSelect(); const selectedTerm = getAcademicTermForView(params.termId); const termId = String(selectedTerm.id);
  const db = getDb(); const where: string[] = ["date(al.created_at) >= date(?)", "date(al.created_at) <= date(?)"]; const values: unknown[] = [selectedTerm.startAt, selectedTerm.endAt];
  if (actor) { where.push("(actor.mssv LIKE ? OR actor.full_name LIKE ?)"); values.push(`%${actor}%`, `%${actor}%`); }
  if (target) { where.push("(target.mssv LIKE ? OR target.full_name LIKE ? OR al.entity_id LIKE ? OR al.before_json LIKE ? OR al.after_json LIKE ?)"); values.push(...Array(5).fill(`%${target}%`)); }
  if (action) { where.push("al.action = ?"); values.push(action); }
  if (reason) { where.push("al.reason LIKE ?"); values.push(`%${reason}%`); } if (dateFrom) { where.push("date(al.created_at) >= date(?)"); values.push(dateFrom); } if (dateTo) { where.push("date(al.created_at) <= date(?)"); values.push(dateTo); }
  const joins = "LEFT JOIN users actor ON actor.id = al.actor_user_id LEFT JOIN users target ON al.entity_type = 'user' AND CAST(target.id AS TEXT) = al.entity_id";
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = Number((db.prepare(`SELECT COUNT(*) AS total FROM audit_logs al ${joins} ${whereSql}`).get(...values) as { total: number }).total); const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = db.prepare(`SELECT al.*, actor.full_name AS actor_full_name, actor.mssv AS actor_mssv, target.full_name AS target_full_name, target.mssv AS target_mssv FROM audit_logs al ${joins} ${whereSql} ORDER BY datetime(al.created_at) DESC, al.id DESC LIMIT ? OFFSET ?`).all(...values, PAGE_SIZE, (page - 1) * PAGE_SIZE) as Row[];
  const actionRows = db.prepare("SELECT DISTINCT action FROM audit_logs ORDER BY action").all() as Array<{ action: string }>;
  const classes = db.prepare("SELECT id, code, name FROM classes").all() as Array<{ id: number; code: string; name: string }>;
  const classNames = new Map(classes.map((item) => [item.id, `${item.code} - ${item.name}`])); const preserved = { termId, actor, target, action, reason, dateFrom, dateTo };
  const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 font-normal";

  return <main className="space-y-6">
    <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><h1 className="text-2xl font-semibold">Nhật ký hệ thống</h1><AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id}/></div></section>
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100"><div className="flex flex-wrap items-start justify-between gap-3"><h2 className="text-lg font-semibold text-slate-900">Bộ lọc truy xuất</h2><div className="flex flex-wrap gap-2"><button type="submit" form="audit-log-filter" className="h-10 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white">Áp dụng bộ lọc</button><Link href="/dashboard/admin/audit-logs" className="inline-flex h-10 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">Xóa bộ lọc</Link></div></div>
      <form id="audit-log-filter" className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <input type="hidden" name="termId" value={termId}/>
        <label className="text-sm font-medium text-slate-700">Người thực hiện<input name="actor" defaultValue={actor} placeholder="Nhập họ tên hoặc MSSV" className={inputClass}/></label>
        <label className="text-sm font-medium text-slate-700">Đối tượng bị tác động<input name="target" defaultValue={target} placeholder="Họ tên, MSSV hoặc mã bản ghi" className={inputClass}/></label>
        <label className="text-sm font-medium text-slate-700 xl:col-span-2">Loại thao tác<select name="action" defaultValue={action} className={inputClass}><option value="">Tất cả loại thao tác</option>{actionRows.map((item) => <option key={item.action} value={item.action}>{actionLabels[item.action] ?? "Thao tác hệ thống"}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-700 xl:col-span-2">Lý do thay đổi<input name="reason" defaultValue={reason} placeholder="Nhập từ khóa trong lý do" className={inputClass}/></label>
        <label className="text-sm font-medium text-slate-700">Từ ngày<input name="dateFrom" type="date" defaultValue={dateFrom} className={inputClass}/></label>
        <label className="text-sm font-medium text-slate-700">Đến ngày<input name="dateTo" type="date" defaultValue={dateTo} className={inputClass}/></label>
      </form>
    </section>
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100"><h2 className="text-lg font-semibold text-slate-900">Kết quả truy xuất</h2><p className="mt-1 text-sm text-slate-500">Tìm thấy {total} bản ghi.</p>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[1050px] divide-y divide-slate-200"><thead className="bg-slate-50"><tr>{["Thời gian", "Người thực hiện", "Thao tác", "Đối tượng bị tác động", "Lý do", "Nội dung thay đổi"].map((label) => <th key={label} className="px-4 py-3 text-left text-sm font-semibold text-slate-700">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id}><td className="whitespace-nowrap px-4 py-3 text-sm">{formatDateTimeVN(row.created_at)}</td><td className="px-4 py-3 text-sm"><div className="font-medium">{row.actor_full_name ?? "Hệ thống"}</div><div className="text-xs text-slate-500">{row.actor_mssv ? `MSSV: ${row.actor_mssv}` : "Không có MSSV"}</div></td><td className="px-4 py-3 text-sm font-medium text-blue-700">{actionLabels[row.action] ?? "Thao tác hệ thống"}</td><td className="px-4 py-3 text-sm"><div className="font-medium">{row.target_full_name ?? entityLabels[row.entity_type ?? ""] ?? "Đối tượng khác"}</div>{row.target_mssv ? <div className="text-xs text-slate-500">MSSV: {row.target_mssv}</div> : null}<div className="text-xs text-slate-500">Mã bản ghi: {row.entity_id ?? "Không có"}</div></td><td className="max-w-xs px-4 py-3 text-sm text-slate-700">{row.reason ?? "Không ghi nhận lý do"}</td><td className="max-w-md px-4 py-3 text-sm text-slate-700">{changeSummary(row, classNames)}</td></tr>)}{!rows.length ? <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">Không tìm thấy nhật ký phù hợp với bộ lọc.</td></tr> : null}</tbody>
      </table></div>
    </section>
    <Pagination page={page} totalPages={totalPages} searchParams={preserved}/>
  </main>;
}
