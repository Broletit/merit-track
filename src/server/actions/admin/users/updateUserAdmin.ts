"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { requireChangeReason, writeAuditLog } from "@/server/audit/writeAuditLog";

const ROLES = ["student", "class_officer", "faculty_officer"];

export async function updateUserAdmin(userId: number, formData: FormData) {
  const admin = await requireAdminContext();

  const db = getDatabase();

  const target = (await db.first(`SELECT id, role, is_active FROM users WHERE id = ? LIMIT 1`, [userId])) as { id: number; role: string; is_active:number } | undefined;

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

  if (role === target.role && isActive === Number(target.is_active)) throw new Error("Chưa thay đổi vai trò hoặc trạng thái tài khoản.");
  const reason = requireChangeReason(formData.get("reason"));


  const removesActiveClassOfficer = target.role === "class_officer" && Number(target.is_active) === 1 && (role !== "class_officer" || isActive === 0);
  const facultyAssignmentIds = ((await db.rows(`SELECT class_id FROM faculty_class_assignments WHERE faculty_officer_id=? ORDER BY class_id`, [userId])) as Array<{ class_id: number }>).map((item) => Number(item.class_id));
  const revokedFacultyAssignmentIds = role !== "faculty_officer"
    ? facultyAssignmentIds
    : [];
  const currentClass = removesActiveClassOfficer
    ? (await db.first(`SELECT c.id,c.code,c.name FROM class_members cm INNER JOIN classes c ON c.id=cm.class_id WHERE cm.user_id=? AND cm.left_at IS NULL LIMIT 1`, [userId])) as { id: number; code: string; name: string } | undefined
    : undefined;
  let vacantClassCode = "";

  (await (async () => (await db.withTransaction(async () => {
    if (role === "class_officer" && isActive === 1) {
      const membership = (await db.first(`SELECT class_id FROM class_members WHERE user_id=? AND left_at IS NULL ORDER BY joined_at DESC LIMIT 1`, [userId])) as { class_id: number } | undefined;
      if (!membership) {
        throw new Error("Cần phân công lớp sinh hoạt trước khi cấp quyền cán bộ lớp.");
      }
      const currentOfficers = (await db.rows(`
        SELECT u.full_name, u.mssv
        FROM class_members cm
        INNER JOIN users u ON u.id=cm.user_id
        WHERE cm.class_id=? AND cm.left_at IS NULL AND u.role='class_officer' AND u.is_active=1 AND u.id<>?
        ORDER BY u.full_name, u.id
      `, [membership.class_id, userId])) as Array<{ full_name: string; mssv: string }>;
      if (currentOfficers.length >= 8) {
        const officerList = currentOfficers.map((item) => `${item.full_name} (${item.mssv})`).join(", ");
        throw new Error(`Lớp đã đủ tối đa 8 cán bộ lớp: ${officerList}. Hãy điều chỉnh một cán bộ hiện tại trước khi cấp thêm quyền.`);
      }
    }

    (await db.execute(`UPDATE users SET role=?,is_active=?,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?`, [role, isActive, userId]));
    (await db.execute("UPDATE sessions SET revoked_at=CURRENT_TIMESTAMP(3) WHERE user_id=? AND revoked_at IS NULL", [userId]));

    if (revokedFacultyAssignmentIds.length > 0) {
      (await db.execute(`DELETE FROM faculty_class_assignments WHERE faculty_officer_id=?`, [userId]));
    }

    if (currentClass) {
      const remaining = (await db.first(`SELECT COUNT(*) total FROM class_members cm INNER JOIN users u ON u.id=cm.user_id WHERE cm.class_id=? AND cm.left_at IS NULL AND u.role='class_officer' AND u.is_active=1`, [currentClass.id])) as { total: number };
      if (Number(remaining.total) === 0) {
        vacantClassCode = currentClass.code;
        const admins = (await db.rows(`SELECT id FROM users WHERE role='admin' AND is_active=1`, [])) as Array<{ id: number }>;
        
        for (const recipient of admins) {
          (await db.execute(`INSERT INTO notifications(user_id,type,title,content,link) VALUES(?,?,?,?,?)`, [recipient.id, "class_officer_vacancy", `Lớp ${currentClass.code} đang khuyết cán bộ lớp`, `Lớp ${currentClass.code} - ${currentClass.name} không còn cán bộ lớp đang hoạt động. Vui lòng phân công ít nhất một cán bộ.`, `/dashboard/admin/classes?classId=${currentClass.id}&keyword=${encodeURIComponent(currentClass.code)}&officerStatus=vacant`]));
        }
      }
    }

    const auditBefore={role:target.role,isActive:target.is_active,facultyClassAssignments:facultyAssignmentIds};
    const auditAfter={role,isActive,facultyClassAssignments:role === "faculty_officer" ? facultyAssignmentIds : []};
    if(role!==target.role)(await writeAuditLog({db,actorUserId:admin.id,action:"user.role.update",entityType:"user",entityId:userId,reason,before:auditBefore,after:auditAfter}));
    if(isActive!==Number(target.is_active))(await writeAuditLog({db,actorUserId:admin.id,action:"user.status.update",entityType:"user",entityId:userId,reason,before:auditBefore,after:auditAfter}));
  })))());

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
