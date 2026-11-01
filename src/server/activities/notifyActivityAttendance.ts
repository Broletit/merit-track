import type { Database } from "@/server/db/mysql";

export async function notifyActivityAttendance(db: Database, activityId: number, userId: number) {
  const row = (await db.first(`SELECT a.title,r.role_context FROM activity_registrations r
    JOIN activities a ON a.id=r.activity_id WHERE r.activity_id=? AND r.user_id=?`, [activityId, userId])) as {title:string;role_context:string}|undefined;
  if (!row) return;
  const context = row.role_context || "student";
  const section = ["student","admin"].includes(context) ? "activities" : "officer-activities";
  const link = `/dashboard/${context.replaceAll("_", "-")}/${section}/${activityId}`;
  (await db.execute(`INSERT INTO notifications(user_id,type,title,content,link,role_context)
    SELECT ?,'activity_attendance',?,?,?,? WHERE NOT EXISTS (
      SELECT 1 FROM notifications WHERE user_id=? AND type='activity_attendance' AND role_context=? AND link=?)`, [userId, "Điểm danh hoạt động thành công", `Bạn đã được ghi nhận tham gia “${row.title}”.`, link, context, userId, context, link]));
}
