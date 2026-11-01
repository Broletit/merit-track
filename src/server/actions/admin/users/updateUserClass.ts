"use server";

import { assertSameClassCohort } from "@/server/cohorts/classCohortIntegrity";
import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { requireChangeReason, writeAuditLog } from "@/server/audit/writeAuditLog";

export async function updateUserClass(userId: number, formData: FormData) {
  const admin = await requireAdminContext();

  const classId = Number(formData.get("classId"));

  if (!Number.isSafeInteger(classId) || classId <= 0) {
    throw new Error("Lớp không hợp lệ.");
  }

  if (!Number.isSafeInteger(userId) || userId<=0) throw new Error("Người dùng không hợp lệ.");
  const db = getDatabase();
  (await assertSameClassCohort(db,userId,classId));

  const existedClass = (await db.first(`SELECT id FROM classes WHERE id = ? AND is_active=1 LIMIT 1`, [classId]));

  if (!existedClass) {
    throw new Error("Lớp không tồn tại.");
  }

  const targetUser = (await db.first(`SELECT id, role FROM users WHERE id=? AND role<>'admin' LIMIT 1`, [userId])) as { id: number; role: string } | undefined;
  if (!targetUser) throw new Error("Không tìm thấy người dùng.");

  const currentMembership = (await db.first(`
    SELECT cm.class_id, cm.joined_at, c.code class_code, c.name class_name
    FROM class_members cm
    INNER JOIN classes c ON c.id=cm.class_id
    WHERE cm.user_id=? AND cm.left_at IS NULL
    ORDER BY cm.joined_at DESC LIMIT 1
  `, [userId])) as { class_id: number; joined_at: string; class_code: string; class_name: string } | undefined;
  const endsClassOfficerRole = targetUser.role === "class_officer" && Boolean(currentMembership) && Number(currentMembership?.class_id) !== classId;
  if (currentMembership?.class_id === classId) throw new Error("Chưa chọn lớp khác lớp hiện tại.");
  const reason = requireChangeReason(formData.get("reason"));
  let oldClassBecameVacant = false;

  const tx = (async () => (await db.withTransaction(async () => {
    (await assertSameClassCohort(db,userId,classId));
    const before = (await db.rows(`SELECT class_id,joined_at FROM class_members WHERE user_id=? AND left_at IS NULL`, [userId]));
    (await db.execute(`UPDATE class_members SET left_at=CURRENT_TIMESTAMP(3) WHERE user_id=? AND left_at IS NULL`, [userId]));

    (await db.execute(`
      INSERT INTO class_members (class_id, user_id, joined_at, left_at)
      VALUES (?, ?, CURRENT_TIMESTAMP(3), NULL)
      ON DUPLICATE KEY UPDATE joined_at=CURRENT_TIMESTAMP(3),left_at=NULL
      `, [classId, userId]));

    if (endsClassOfficerRole && currentMembership) {
      (await db.execute(`UPDATE users SET role='student',updated_at=CURRENT_TIMESTAMP(3) WHERE id=?`, [userId]));
      
      const remainingOfficer = (await db.first(`SELECT 1 FROM class_members cm INNER JOIN users u ON u.id=cm.user_id WHERE cm.class_id=? AND cm.left_at IS NULL AND u.role='class_officer' AND u.is_active=1 LIMIT 1`, [currentMembership.class_id]));
      oldClassBecameVacant = !remainingOfficer;
      if (oldClassBecameVacant) {
        const admins = (await db.rows(`SELECT id FROM users WHERE role='admin' AND is_active=1`, [])) as Array<{ id: number }>;
        for (const recipient of admins) {
          (await db.execute(`INSERT INTO notifications(user_id,type,title,content,link) VALUES(?,?,?,?,?)`, [recipient.id, "class_officer_vacancy", `Lớp ${currentMembership.class_code} đang khuyết cán bộ lớp`, `Cán bộ lớp đã chuyển lớp sinh hoạt. Vui lòng phân công cán bộ mới cho ${currentMembership.class_code} - ${currentMembership.class_name}.`, `/dashboard/admin/classes?classId=${currentMembership.class_id}&keyword=${encodeURIComponent(currentMembership.class_code)}&officerStatus=vacant`]));
        }
      }
      (await db.execute(`INSERT INTO notifications(user_id,type,title,content,link) VALUES(?,?,?,?,?)`, [userId, "class_officer_role_ended", "Đã cập nhật lớp sinh hoạt", `Bạn đã chuyển sang lớp mới và quyền cán bộ lớp ${currentMembership.class_code} đã kết thúc.`, "/dashboard/student/profile"]));
    }

    (await writeAuditLog({db,actorUserId:admin.id,action:"user.class.transfer",entityType:"user",entityId:userId,reason,before:{ memberships: before, role: targetUser.role },after:{classId,role:endsClassOfficerRole?"student":targetUser.role}}));
  })));

  (await tx());

  revalidatePath("/dashboard","layout");
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
