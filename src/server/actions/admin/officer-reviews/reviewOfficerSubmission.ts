"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { evaluateSubmissionAuto } from "@/server/events/evaluateSubmissionAuto";
import { evaluateSubmission } from "@/server/submissions/evaluateSubmission";
import { assertSubmissionCanBeApproved } from "@/server/submissions/assertSubmissionCanBeApproved";

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
  const db = getDb();

  const decision = normalizeDecision(String(formData.get("decision") ?? ""));
  const note = String(formData.get("note") ?? "").trim();

  const submission = db
    .prepare(
      `
      SELECT s.id, s.status, s.user_id, e.type, u.role AS owner_role
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.id = ?
        AND e.type = 'officer'
      LIMIT 1
      `
    )
    .get(submissionId) as
    | { id: number; status: string; user_id: number; type: string; owner_role: string }
    | undefined;

  if (!submission) throw new Error("Không tìm thấy hồ sơ cán bộ.");

  if (submission.status !== "submitted_v1") {
    throw new Error("Hồ sơ không ở trạng thái chờ admin duyệt.");
  }

  const nextStatus =
    decision === "pass"
      ? "passed"
      : decision === "fail"
        ? "failed"
        : "needs_revision_v1";

  if(decision==="pass"){
    evaluateSubmissionAuto(submissionId);
    assertSubmissionCanBeApproved(db,submissionId);
  }

  const tx = db.transaction(() => {
    db.prepare(
      `
      INSERT INTO reviews (
        submission_id,
        reviewer_id,
        round,
        decision,
        note,
        created_at
      )
      VALUES (?, ?, 1, ?, ?, datetime('now'))
      ON CONFLICT(submission_id, round)
      DO UPDATE SET
        reviewer_id = excluded.reviewer_id,
        decision = excluded.decision,
        note = excluded.note,
        created_at = datetime('now')
      `
    ).run(submissionId, admin.id, decision, note || null);

    db.prepare(
      `
      UPDATE submissions
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
      `
    ).run(nextStatus, submissionId);

    const ownerContext = submission.owner_role === "faculty_officer" ? "faculty-officer" : "class-officer";
    const notificationTitle = decision === "pass"
      ? "Hồ sơ xét cán bộ đã được duyệt đạt"
      : decision === "fail"
        ? "Hồ sơ xét cán bộ không đạt"
        : "Hồ sơ xét cán bộ cần điều chỉnh";
    db.prepare(
      "INSERT INTO notifications(user_id, type, title, content, link) VALUES(?, ?, ?, ?, ?)"
    ).run(
      submission.user_id,
      "officer_submission_review",
      notificationTitle,
      note || (decision === "revise" ? "Vui lòng xem phản hồi và bổ sung hồ sơ." : "Kết quả xét duyệt hồ sơ đã được cập nhật."),
      `/dashboard/${ownerContext}/officer-submissions/detail/${submission.id}`
    );
  });

  tx();

  // Chốt lại dữ liệu tự động và tổng điểm tại thời điểm duyệt. Điều này cũng
  // bảo đảm các hoạt động vừa được ghi nhận không để hồ sơ ở điểm cũ.
  evaluateSubmissionAuto(submissionId);
  evaluateSubmission(submissionId);

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
