"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { evaluateSubmissionAuto } from "@/server/events/evaluateSubmissionAuto";
import { evaluateSubmission } from "@/server/submissions/evaluateSubmission";
import { assertSubmissionCanBeApproved } from "@/server/submissions/assertSubmissionCanBeApproved";
import { evaluateSubmissionRequirements } from "@/server/submissions/evaluateSubmissionRequirements";

function normalizeDecision(value: string) {
  if (value === "pass") return "pass";
  if (value === "revise") return "revise";
  if (value === "fail") return "fail";
  throw new Error("Kết quả duyệt không hợp lệ.");
}

export async function reviewOfficerSubmission(
  submissionId: number,
  formData: FormData
) {
  const admin = await requireAdminContext();
  const db = getDatabase();

  const decision = normalizeDecision(String(formData.get("decision") ?? ""));
  const note = String(formData.get("note") ?? "").trim();

  const submission = (await db.first(`
      SELECT s.id, s.status, s.user_id, e.type, u.role AS owner_role,
        CASE WHEN e.status='published' AND CAST(e.end_at AS DATETIME(3))>=CURRENT_TIMESTAMP(3) THEN 1 ELSE 0 END review_open
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.id = ?
        AND e.type = 'officer'
      LIMIT 1
      `, [submissionId])) as
    | { id: number; status: string; user_id: number; type: string; owner_role: string; review_open:number }
    | undefined;

  if (!submission) throw new Error("Không tìm thấy hồ sơ cán bộ.");

  if (Number(submission.review_open) !== 1) throw new Error("Đợt xét đã khóa hoặc đã kết thúc.");

  if (submission.status !== "submitted_v1") {
    throw new Error("Hồ sơ không ở trạng thái chờ admin duyệt.");
  }

  if (decision === "revise" && !note) {
    throw new Error("Vui lòng nhập phản hồi trước khi trả hồ sơ về chỉnh sửa.");
  }

  (await evaluateSubmissionAuto(submissionId));
  const requirements = (await evaluateSubmissionRequirements(db, submissionId, "approved"));
  if (decision !== "pass" && requirements.valid) {
    throw new Error("Hồ sơ đã đáp ứng đầy đủ điều kiện. Vui lòng duyệt hoàn tất hồ sơ.");
  }

  const nextStatus =
    decision === "pass"
      ? "passed"
      : decision === "fail"
        ? "failed"
        : "needs_revision_v1";

  if(decision==="pass"){
    (await evaluateSubmissionAuto(submissionId));
    (await assertSubmissionCanBeApproved(db,submissionId));
  }

  const tx = (async () => (await db.withTransaction(async () => {
    (await db.execute(`
      INSERT INTO reviews (
        submission_id,
        reviewer_id,
        round,
        decision,
        note,
        created_at
      )
      VALUES (?, ?, 1, ?, ?, CURRENT_TIMESTAMP(3))
      ON DUPLICATE KEY UPDATE
        reviewer_id = VALUES(reviewer_id),
        decision = VALUES(decision),
        note = VALUES(note),
        created_at = CURRENT_TIMESTAMP(3)
      `, [submissionId, admin.id, decision, note || null]));

    (await db.execute(`
      UPDATE submissions
      SET status = ?, updated_at = CURRENT_TIMESTAMP(3)
      WHERE id = ?
      `, [nextStatus, submissionId]));

    const ownerContext = submission.owner_role === "faculty_officer" ? "faculty-officer" : "class-officer";
    const notificationTitle = decision === "pass"
      ? "Hồ sơ xét cán bộ đã được duyệt đạt"
      : decision === "fail"
        ? "Hồ sơ xét cán bộ không đạt"
        : "Hồ sơ xét cán bộ cần điều chỉnh";
    (await db.execute("INSERT INTO notifications(user_id, type, title, content, link) VALUES(?, ?, ?, ?, ?)", [submission.user_id, "officer_submission_review", notificationTitle, note || (decision === "revise" ? "Vui lòng xem phản hồi và bổ sung hồ sơ." : "Kết quả xét duyệt hồ sơ đã được cập nhật."), `/dashboard/${ownerContext}/officer-submissions/detail/${submission.id}`]));
  })));

  (await tx());

  // Chốt lại dữ liệu tự động và tổng điểm tại thời điểm duyệt. Điều này cũng
  // bảo đảm các hoạt động vừa được ghi nhận không để hồ sơ ở điểm cũ.
  (await evaluateSubmissionAuto(submissionId));
  (await evaluateSubmission(submissionId));

  revalidatePath("/dashboard/admin/officer-reviews");
  revalidatePath(`/dashboard/admin/officer-reviews/${submissionId}`);
  revalidatePath("/dashboard/admin/officer-submissions");
  revalidatePath("/dashboard/class-officer/notifications");
  revalidatePath("/dashboard/faculty-officer/notifications");

  return {
    ok: true,
    message:
      decision === "pass"
        ? "Đã duyệt đạt hồ sơ cán bộ."
        : decision === "fail"
          ? "Đã đánh dấu hồ sơ không đạt."
          : "Đã trả hồ sơ về để chỉnh sửa.",
  };
}
