import type { Database } from "@/server/db/mysql";

export async function assertSubmissionReviewAccess(
  db: Database,
  user: {id:number;role:string;roles?:string[];loginContext?:string},
  submission: {status:string;class_id:number;event_type:string;review_open:number},
  allowOfficerCriteria = false,
) {
  const context = user.loginContext ?? "student";
  const assignedRoles = new Set(user.roles?.length ? user.roles : [user.role]);
  if (!["admin", "class_officer", "faculty_officer"].includes(context) || !assignedRoles.has(context)) throw new Error("Bạn không có quyền duyệt hồ sơ trong giao diện này.");
  if (Number(submission.review_open) !== 1) throw new Error("Đợt xét đã khóa hoặc đã kết thúc. Không thể tiếp tục duyệt hồ sơ.");
  if (submission.event_type === "officer" && allowOfficerCriteria && context === "admin" && submission.status === "submitted_v1") return;
  if (submission.event_type !== "student") throw new Error("Hồ sơ cán bộ phải được duyệt trong luồng dành cho cán bộ.");
  const round = submission.status === "submitted_v1" ? 1 : submission.status === "submitted_v2" ? 2 : 0;
  if (!round) throw new Error("Hồ sơ không ở trạng thái chờ duyệt.");
  if (context === "admin") return;
  if (round === 2 && context !== "faculty_officer") throw new Error("Không có quyền duyệt vòng 2.");
  const allowed = context === "class_officer"
    ? (await db.first("SELECT 1 FROM class_members WHERE user_id=? AND class_id=? AND left_at IS NULL LIMIT 1", [user.id, submission.class_id]))
    : (await db.first("SELECT 1 FROM faculty_class_assignments WHERE faculty_officer_id=? AND class_id=? LIMIT 1", [user.id, submission.class_id]));
  if (!allowed) throw new Error("Không có quyền duyệt hồ sơ lớp này.");
}
