"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { requireChangeReason, writeAuditLog } from "@/server/audit/writeAuditLog";

const ROLES = ["student", "class_officer", "faculty_officer"];

export async function updateUserAdmin(userId: number, formData: FormData) {
  const admin = await requireAdminContext();
  const reason = requireChangeReason(formData.get("reason"));

  const db = getDb();

  const target = db
    .prepare(`SELECT id, role, is_active FROM users WHERE id = ? LIMIT 1`)
    .get(userId) as { id: number; role: string; is_active:number } | undefined;

  if (!target) {
    throw new Error("Không tìm thấy tài khoản.");
  }

  if (target.role === "admin") {
    throw new Error("Không thể chỉnh sửa tài khoản admin mặc định.");
  }

  const role = String(formData.get("role") ?? "");
  const isActive = String(formData.get("isActive") ?? "0") === "1" ? 1 : 0;

  if (!ROLES.includes(role)) {
    throw new Error("Vai trò không hợp lệ.");
  }

  if (role === "class_officer" && isActive === 1) {
    const membership = db.prepare(`SELECT class_id FROM class_members WHERE user_id=? AND left_at IS NULL ORDER BY joined_at DESC LIMIT 1`).get(userId) as { class_id: number } | undefined;
    if (!membership) {
      throw new Error("Cần phân công lớp sinh hoạt trước khi cấp quyền cán bộ lớp.");
    }
    const currentOfficers = db.prepare(`
      SELECT u.full_name, u.mssv
      FROM class_members cm
      INNER JOIN users u ON u.id=cm.user_id
      WHERE cm.class_id=? AND cm.left_at IS NULL AND u.role='class_officer' AND u.is_active=1 AND u.id<>?
      ORDER BY u.full_name, u.id
    `).all(membership.class_id, userId) as Array<{ full_name: string; mssv: string }>;
    if (currentOfficers.length >= 4) {
      const officerList = currentOfficers.map((item) => `${item.full_name} (${item.mssv})`).join(", ");
      throw new Error(`Lớp đã đủ tối đa 4 cán bộ lớp: ${officerList}. Hãy điều chỉnh một cán bộ hiện tại trước khi cấp thêm quyền.`);
    }
  }

  const removesActiveClassOfficer = target.role === "class_officer" && Number(target.is_active) === 1 && (role !== "class_officer" || isActive === 0);
  const facultyAssignmentIds = (db.prepare(
    `SELECT class_id FROM faculty_class_assignments WHERE faculty_officer_id=? ORDER BY class_id`
  ).all(userId) as Array<{ class_id: number }>).map((item) => Number(item.class_id));
  const revokedFacultyAssignmentIds = role !== "faculty_officer"
    ? facultyAssignmentIds
    : [];
  const currentClass = removesActiveClassOfficer
    ? db.prepare(`SELECT c.id,c.code,c.name FROM class_members cm INNER JOIN classes c ON c.id=cm.class_id WHERE cm.user_id=? AND cm.left_at IS NULL LIMIT 1`).get(userId) as { id: number; code: string; name: string } | undefined
    : undefined;
  let vacantClassCode = "";

  db.transaction(() => {
    db.prepare(
      `UPDATE users SET role=?,is_active=?,updated_at=datetime('now') WHERE id=?`
    ).run(role, isActive, userId);

    if (revokedFacultyAssignmentIds.length > 0) {
      db.prepare(`DELETE FROM faculty_class_assignments WHERE faculty_officer_id=?`).run(userId);
    }

    if (currentClass) {
      const remaining = db.prepare(`SELECT COUNT(*) total FROM class_members cm INNER JOIN users u ON u.id=cm.user_id WHERE cm.class_id=? AND cm.left_at IS NULL AND u.role='class_officer' AND u.is_active=1`).get(currentClass.id) as { total: number };
      if (Number(remaining.total) === 0) {
        vacantClassCode = currentClass.code;
        const admins = db.prepare(`SELECT id FROM users WHERE role='admin' AND is_active=1`).all() as Array<{ id: number }>;
        const notify = db.prepare(`INSERT INTO notifications(user_id,type,title,content,link) VALUES(?,?,?,?,?)`);
        for (const recipient of admins) {
          notify.run(recipient.id, "class_officer_vacancy", `Lớp ${currentClass.code} đang khuyết cán bộ lớp`, `Lớp ${currentClass.code} - ${currentClass.name} không còn cán bộ lớp đang hoạt động. Vui lòng phân công ít nhất một cán bộ.`, "/dashboard/admin/users");
        }
      }
    }

    writeAuditLog({
      db,
      actorUserId: admin.id,
      action: "user.access.update",
      entityType: "user",
      entityId: userId,
      reason,
      before: {
        role: target.role,
        isActive: target.is_active,
        facultyClassAssignments: facultyAssignmentIds,
      },
      after: {
        role,
        isActive,
        facultyClassAssignments: role === "faculty_officer" ? facultyAssignmentIds : [],
      },
    });
  })();

  revalidatePath("/dashboard/admin/users");
  revalidatePath(`/dashboard/admin/users/${userId}`);
  revalidatePath("/dashboard/admin/notifications");
  revalidatePath("/dashboard/faculty-officer");

  return {
    ok: true,
    message: vacantClassCode
      ? `Đã cập nhật tài khoản. Lớp ${vacantClassCode} hiện đang khuyết cán bộ lớp.${revokedFacultyAssignmentIds.length > 0 ? ` Đã thu hồi phân công tại ${revokedFacultyAssignmentIds.length} lớp.` : ""}`
      : revokedFacultyAssignmentIds.length > 0
        ? `Đã cập nhật tài khoản và thu hồi phân công tại ${revokedFacultyAssignmentIds.length} lớp.`
        : "Đã cập nhật tài khoản.",
  };
}
