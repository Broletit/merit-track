"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { requireChangeReason, writeAuditLog } from "@/server/audit/writeAuditLog";

export async function updateUserClass(userId: number, formData: FormData) {
  const admin = await requireAdminContext();
  const reason = requireChangeReason(formData.get("reason"));

  const classId = Number(formData.get("classId"));

  if (!Number.isFinite(classId) || classId <= 0) {
    throw new Error("Lớp không hợp lệ.");
  }

  const db = getDb();

  const existedClass = db
    .prepare(`SELECT id FROM classes WHERE id = ? AND is_active=1 LIMIT 1`)
    .get(classId);

  if (!existedClass) {
    throw new Error("Lớp không tồn tại.");
  }

  const targetUser = db.prepare(`SELECT id, role FROM users WHERE id=? AND role<>'admin' LIMIT 1`).get(userId) as { id: number; role: string } | undefined;
  if (!targetUser) throw new Error("Không tìm thấy người dùng.");

  const currentMembership = db.prepare(`
    SELECT cm.class_id, cm.joined_at, c.code class_code, c.name class_name
    FROM class_members cm
    INNER JOIN classes c ON c.id=cm.class_id
    WHERE cm.user_id=? AND cm.left_at IS NULL
    ORDER BY cm.joined_at DESC LIMIT 1
  `).get(userId) as { class_id: number; joined_at: string; class_code: string; class_name: string } | undefined;
  const endsClassOfficerRole = targetUser.role === "class_officer" && Boolean(currentMembership) && Number(currentMembership?.class_id) !== classId;
  let oldClassBecameVacant = false;

  const tx = db.transaction(() => {
    const before = db.prepare(`SELECT class_id,joined_at FROM class_members WHERE user_id=? AND left_at IS NULL`).all(userId);
    db.prepare(`UPDATE class_members SET left_at=datetime('now') WHERE user_id=? AND left_at IS NULL`).run(userId);

    db.prepare(
      `
      INSERT INTO class_members (class_id, user_id, joined_at, left_at)
      VALUES (?, ?, datetime('now'), NULL)
      ON CONFLICT(class_id,user_id) DO UPDATE SET joined_at=datetime('now'),left_at=NULL
      `
    ).run(classId, userId);

    if (endsClassOfficerRole && currentMembership) {
      db.prepare(`UPDATE users SET role='student',updated_at=datetime('now') WHERE id=?`).run(userId);
      const insertNotification = db.prepare(`INSERT INTO notifications(user_id,type,title,content,link) VALUES(?,?,?,?,?)`);
      const remainingOfficer = db.prepare(`SELECT 1 FROM class_members cm INNER JOIN users u ON u.id=cm.user_id WHERE cm.class_id=? AND cm.left_at IS NULL AND u.role='class_officer' AND u.is_active=1 LIMIT 1`).get(currentMembership.class_id);
      oldClassBecameVacant = !remainingOfficer;
      if (oldClassBecameVacant) {
        const admins = db.prepare(`SELECT id FROM users WHERE role='admin' AND is_active=1`).all() as Array<{ id: number }>;
        for (const recipient of admins) {
          insertNotification.run(
            recipient.id,
            "class_officer_vacancy",
            `Lớp ${currentMembership.class_code} đang khuyết cán bộ lớp`,
            `Cán bộ lớp đã chuyển lớp sinh hoạt. Vui lòng phân công cán bộ mới cho ${currentMembership.class_code} - ${currentMembership.class_name}.`,
            "/dashboard/admin/users"
          );
        }
      }
      insertNotification.run(userId, "class_officer_role_ended", "Đã cập nhật lớp sinh hoạt", `Bạn đã chuyển sang lớp mới và quyền cán bộ lớp ${currentMembership.class_code} đã kết thúc.`, "/dashboard/student/profile");
    }

    writeAuditLog({db,actorUserId:admin.id,action:"user.class.transfer",entityType:"user",entityId:userId,reason,before:{ memberships: before, role: targetUser.role },after:{classId,role:endsClassOfficerRole?"student":targetUser.role}});
  });

  tx();

  revalidatePath("/dashboard/admin/users");
  revalidatePath(`/dashboard/admin/users/${userId}`);
  revalidatePath("/dashboard/admin/notifications");
  revalidatePath("/dashboard/student/notifications");

  return {
    ok: true,
    message: oldClassBecameVacant
      ? `Đã chuyển lớp và đưa người dùng về vai trò sinh viên. Lớp ${currentMembership?.class_code} hiện đang khuyết cán bộ lớp.`
      : endsClassOfficerRole
        ? "Đã chuyển lớp và đưa người dùng về vai trò sinh viên."
        : "Đã chuyển lớp.",
  };
}
