"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { requireChangeReason, writeAuditLog } from "@/server/audit/writeAuditLog";

const OFFICER_ROLES = ["class_officer", "faculty_officer"] as const;

export async function updateUserAdmin(userId: number, formData: FormData) {
  const admin = await requireAdminContext();
  const db = getDatabase();
  const target = await db.first("SELECT id,role,is_active FROM users WHERE id=? LIMIT 1", [userId]) as { id: number; role: string; is_active: number } | undefined;
  if (!target) throw new Error("Không tìm thấy tài khoản.");
  if (target.role === "admin") throw new Error("Không thể chỉnh sửa tài khoản quản trị viên.");
  const isActive = String(formData.get("isActive") ?? "0") === "1" ? 1 : 0;
  const officerRoles = [...new Set(formData.getAll("officerRoles").map(String).filter((role): role is typeof OFFICER_ROLES[number] => (OFFICER_ROLES as readonly string[]).includes(role)))];
  const nextRoles = ["student", ...officerRoles];
  const previousRoles = (await db.rows("SELECT role FROM user_role_assignments WHERE user_id=? ORDER BY role", [userId]) as Array<{role:string}>).map((row) => row.role);
  const sameRoles = previousRoles.length === nextRoles.length && previousRoles.every((role) => nextRoles.includes(role));
  if (sameRoles && isActive === Number(target.is_active)) throw new Error("Chưa chọn thông tin cần thay đổi.");
  const reason = requireChangeReason(formData.get("reason"));

  await db.withTransaction(async () => {
    if (officerRoles.includes("class_officer") && isActive === 1 && !previousRoles.includes("class_officer")) {
      const membership = await db.first("SELECT class_id FROM class_members WHERE user_id=? AND left_at IS NULL ORDER BY joined_at DESC LIMIT 1", [userId]) as {class_id:number} | undefined;
      if (!membership) throw new Error("Cần phân công lớp sinh hoạt trước khi cấp quyền Cán bộ lớp.");
      const count = await db.first("SELECT COUNT(*) total FROM class_members cm INNER JOIN user_role_assignments ura ON ura.user_id=cm.user_id AND ura.role='class_officer' INNER JOIN users u ON u.id=cm.user_id WHERE cm.class_id=? AND cm.left_at IS NULL AND u.is_active=1", [membership.class_id]) as {total:number};
      if (Number(count.total) >= 8) throw new Error("Lớp đã đạt số lượng CB tối đa (8 cán bộ lớp).");
    }
    await db.execute("DELETE FROM user_role_assignments WHERE user_id=?", [userId]);
    for (const role of nextRoles) await db.execute("INSERT INTO user_role_assignments(user_id,role) VALUES(?,?)", [userId, role]);
    // Kept only for compatibility with legacy data queries; permissions use assignments above.
    const legacyRole = officerRoles.includes("faculty_officer") ? "faculty_officer" : officerRoles.includes("class_officer") ? "class_officer" : "student";
    await db.execute("UPDATE users SET role=?,is_active=?,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?", [legacyRole, isActive, userId]);
    if (!officerRoles.includes("faculty_officer")) await db.execute("DELETE FROM faculty_class_assignments WHERE faculty_officer_id=?", [userId]);
    await db.execute("UPDATE sessions SET revoked_at=CURRENT_TIMESTAMP(3) WHERE user_id=? AND revoked_at IS NULL", [userId]);
    const before = { roles: previousRoles, isActive: target.is_active };
    const after = { roles: nextRoles, isActive };
    if (!sameRoles) await writeAuditLog({ db, actorUserId: admin.id, action: "user.role.update", entityType: "user", entityId: userId, reason, before, after });
    if (isActive !== Number(target.is_active)) await writeAuditLog({ db, actorUserId: admin.id, action: "user.status.update", entityType: "user", entityId: userId, reason, before, after });
  });
  revalidatePath("/dashboard/admin/users"); revalidatePath(`/dashboard/admin/users/${userId}`); revalidatePath("/dashboard/faculty-officer"); revalidatePath("/dashboard/class-officer");
  revalidatePath("/dashboard/admin/classes");
  return { ok: true, message: "Đã cập nhật quyền và trạng thái tài khoản." };
}
