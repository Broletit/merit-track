import * as XLSX from "xlsx";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { ensureActivityConductScores } from "@/server/conduct/ensureActivityConductScores";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdminContext();
  const { id } = await params;
  const activityId = Number(id);
  if (!Number.isFinite(activityId)) return new Response("Hoạt động không hợp lệ.", { status: 400 });
  const db = getDatabase();
  (await ensureActivityConductScores());
  const activity = (await db.first(`SELECT title FROM activities WHERE id=?`, [activityId])) as { title: string } | undefined;
  if (!activity) return new Response("Không tìm thấy hoạt động.", { status: 404 });
  const registrationCount = (await db.first(`
    SELECT COUNT(*) AS total
    FROM activity_registrations
    WHERE activity_id = ? AND status != 'cancelled'
  `, [activityId])) as { total: number };
  if (Number(registrationCount.total ?? 0) === 0) {
    return new Response("Hoạt động chưa có người đăng ký nên không thể xuất danh sách.", { status: 409 });
  }
  const rows = (await db.rows(`
    SELECT u.full_name, u.mssv, ar.status
    FROM activity_registrations ar
    JOIN activities a ON a.id=ar.activity_id
    JOIN users u ON u.id=ar.user_id
    LEFT JOIN classes c ON c.id=ar.class_id
    WHERE ar.activity_id=? AND ar.status != 'cancelled'
    ORDER BY c.code,u.full_name,u.mssv
  `, [activityId])) as {full_name:string;mssv:string;status:string}[];
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([
    [`Danh sách Đánh giá sinh viên tham gia hoạt động\n${activity.title}`],
    ["STT", "Họ tên", "MSSV", "Xem chỉ số đánh giá trong Phần mềm", "Ghi chú"],
    ...rows.map((row, index) => [index + 1, row.full_name, row.mssv,
      row.status === 'attended' ? 1 : row.status === 'absent' ? 0 : '',
      row.status === 'attended' ? 'Tham gia (+100%)' : row.status === 'absent' ? 'Không tham gia (-100%)' : 'Chưa xác định',
    ]),
  ]);
  worksheet["!merges"] = [{s:{r:0,c:0},e:{r:0,c:4}}];
  worksheet["!cols"] = [{wch:6},{wch:28},{wch:14},{wch:38},{wch:28}];
  worksheet["!rows"] = [{hpt:60},{hpt:30}];
  XLSX.utils.book_append_sheet(workbook, worksheet, "Đánh giá tham gia");
  const activitySlug = activity.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `hoat-dong-${activityId}`;
  const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new Response(output, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="DS_Danh_gia_${activitySlug}.xlsx"` } });
}
