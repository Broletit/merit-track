import * as XLSX from "xlsx";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdminContext();
  const { id } = await params;
  const activityId = Number(id);
  if (!Number.isFinite(activityId)) return new Response("Hoạt động không hợp lệ.", { status: 400 });
  const db = getDb();
  const activity = db.prepare(`SELECT title FROM activities WHERE id=?`).get(activityId) as { title: string } | undefined;
  if (!activity) return new Response("Không tìm thấy hoạt động.", { status: 404 });
  const registrationCount = db.prepare(`
    SELECT COUNT(*) AS total
    FROM activity_registrations
    WHERE activity_id = ? AND status != 'cancelled'
  `).get(activityId) as { total: number };
  if (Number(registrationCount.total ?? 0) === 0) {
    return new Response("Hoạt động chưa có người đăng ký nên không thể xuất danh sách.", { status: 409 });
  }
  const rows = db.prepare(`
    SELECT u.mssv AS MSSV, u.full_name AS "Họ và tên", COALESCE(c.code,'') AS "Lớp",
      CASE ar.status WHEN 'attended' THEN 'Tham dự' WHEN 'absent' THEN 'Vắng' WHEN 'cancelled' THEN 'Đã hủy' ELSE 'Đã đăng ký' END AS "Trạng thái",
      COALESCE(ar.checked_in_at,'') AS "Thời gian điểm danh", COALESCE(checker.full_name,'') AS "Người xác nhận",
      a.conduct_score AS "Điểm hoạt động", COALESCE(cs.score_value,0) AS "Điểm đã ghi nhận", COALESCE(ar.note,'') AS "Ghi chú"
    FROM activity_registrations ar INNER JOIN activities a ON a.id=ar.activity_id INNER JOIN users u ON u.id=ar.user_id
    LEFT JOIN classes c ON c.id=ar.class_id LEFT JOIN users checker ON checker.id=ar.checked_in_by
    LEFT JOIN conduct_scores cs ON cs.user_id=ar.user_id AND cs.source_type='activity' AND cs.source_id=a.id
    WHERE ar.activity_id=? AND ar.status != 'cancelled' ORDER BY u.full_name
  `).all(activityId);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Danh sách tham gia");
  const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new Response(output, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="activity-${activityId}-attendance.xlsx"` } });
}
