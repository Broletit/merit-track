"use server";

import { revalidatePath } from "next/cache";
import { getDatabase } from "@/server/db/mysql";
import { requireLogin } from "@/server/auth/guards";
import { assertSubmissionReviewAccess } from "@/server/auth/submissionReviewAccess";
import { assertSubmissionCanBeApproved } from "@/server/submissions/assertSubmissionCanBeApproved";
import { evaluateSubmissionRequirements } from "@/server/submissions/evaluateSubmissionRequirements";
import { evaluateSubmissionAuto } from "@/server/events/evaluateSubmissionAuto";
import { removeEvidenceObjects, type EvidenceObject } from "@/server/storage/evidenceService";

type SubmissionRow = {
  id: number;
  event_id: number;
  user_id: number;
  class_id: number;
  status: string;
  event_type: string;
  review_open: number;
};

type ReviewDecision = "approve" | "reject" | "revision";

function toStoredDecision(decision: ReviewDecision) {
  if (decision === "approve") return "pass";
  if (decision === "revision") return "revise";
  return "fail";
}

function nextStatusForV1(decision: ReviewDecision) {
  if (decision === "approve") return "submitted_v2";
  if (decision === "revision") return "needs_revision_v1";
  return "failed";
}

function nextStatusForV2(decision: ReviewDecision) {
  if (decision === "approve") return "passed";
  if (decision === "revision") return "needs_revision_v1";
  return "failed";
}

export async function reviewSubmission(
  submissionId: number,
  decision: ReviewDecision,
  formData: FormData
) {
  const user = await requireLogin();
  const actingRole = user.loginContext ?? user.role;
  const db = getDatabase();

  const note = String(formData.get("note") ?? "").trim();

  if (!["approve", "reject", "revision"].includes(decision)) {
    throw new Error("Quyết định duyệt không hợp lệ.");
  }

  const submission = (await db.first(`
      SELECT
        s.id,
        s.event_id,
        s.user_id,
        s.class_id,
        s.status,
        e.type AS event_type,
        CASE WHEN e.status='published' AND CAST(e.end_at AS DATETIME(3))>=CURRENT_TIMESTAMP(3) THEN 1 ELSE 0 END AS review_open
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      WHERE s.id = ?
      LIMIT 1
      `, [submissionId])) as SubmissionRow | undefined;

  if (!submission) {
    throw new Error("Hồ sơ không tồn tại.");
  }
  (await assertSubmissionReviewAccess(db, user, submission));

  if (decision === "revision" && !note) {
    throw new Error("Vui lòng nhập phản hồi trước khi trả hồ sơ về chỉnh sửa.");
  }

  if (submission.event_type !== "student") {
    throw new Error("Hồ sơ cán bộ phải được duyệt trong luồng dành cho cán bộ.");
  }

  if (Number(submission.review_open) !== 1) {
    throw new Error("Đợt xét đã khóa hoặc đã kết thúc. Không thể tiếp tục duyệt hồ sơ.");
  }

  let nextStatus = "";

  if (submission.status === "submitted_v1") {
    if (!["class_officer", "faculty_officer", "admin"].includes(actingRole)) {
      throw new Error("Không có quyền duyệt vòng 1.");
    }

    if (actingRole === "class_officer") {
      const assignment = (await db.first(`
          SELECT id
          FROM class_members
          WHERE user_id = ?
            AND class_id = ?
            AND left_at IS NULL
          LIMIT 1
          `, [user.id, submission.class_id]));

      if (!assignment) {
        throw new Error("Không có quyền duyệt hồ sơ lớp này.");
      }
    }

    nextStatus = nextStatusForV1(decision);
  } else if (submission.status === "submitted_v2") {
    if (!["faculty_officer", "admin"].includes(actingRole)) {
      throw new Error("Không có quyền duyệt vòng 2.");
    }

    if (actingRole === "faculty_officer") {
      const assignment = (await db.first(`
          SELECT id
          FROM faculty_class_assignments
          WHERE faculty_officer_id = ?
            AND class_id = ?
          LIMIT 1
          `, [user.id, submission.class_id]));

      if (!assignment) {
        throw new Error("Không có quyền duyệt hồ sơ lớp này.");
      }
    }

    nextStatus = nextStatusForV2(decision);
  } else {
    throw new Error("Hồ sơ không ở trạng thái chờ duyệt.");
  }

  (await evaluateSubmissionAuto(submission.id));
  const requirements = (await evaluateSubmissionRequirements(db, submission.id, "approved"));

  if (decision === "approve") {
    (await assertSubmissionCanBeApproved(db, submission.id));
  } else if (requirements.valid) {
    throw new Error("Hồ sơ đã đáp ứng đầy đủ điều kiện. Vui lòng duyệt hoàn tất hồ sơ.");
  }

  const reviewRound=submission.status==="submitted_v1"?1:2;
  if (decision !== "approve") {
    const pendingCriteria = (await db.first<{ total: number }>(`
      SELECT COUNT(*) AS total
      FROM event_criteria_items i
      WHERE i.event_id = ?
        AND COALESCE((SELECT ar.passed FROM submission_auto_results ar WHERE ar.submission_id=? AND ar.criteria_code=i.code LIMIT 1), 0) <> 1
        AND (
          EXISTS(SELECT 1 FROM submission_ready_files sf WHERE sf.submission_id=? AND sf.criteria_code=i.code)
          OR EXISTS(SELECT 1 FROM submission_items si WHERE si.submission_id=? AND si.criteria_code=i.code AND TRIM(COALESCE(si.content_text,''))<>'')
        )
        AND NOT EXISTS(
          SELECT 1 FROM submission_criteria_reviews cr
          WHERE cr.submission_id=? AND cr.criteria_code=i.code AND cr.round=? AND cr.decision IN ('pass','fail')
        )
      `, [submission.event_id, submission.id, submission.id, submission.id, submission.id, reviewRound]))?.total ?? 0;
    if (Number(pendingCriteria) > 0) {
      throw new Error(`Còn ${pendingCriteria} tiêu chí có minh chứng chưa được đánh giá. Vui lòng chọn Đạt hoặc Chưa đạt trước khi trả hoặc đóng hồ sơ.`);
    }
  }
  const redundantEvidence=decision==="approve"?(await db.rows(`
    SELECT i.code
    FROM submissions s INNER JOIN event_criteria_items i ON i.event_id=s.event_id
    WHERE s.id=? AND NOT EXISTS(SELECT 1 FROM submission_auto_results ar WHERE ar.submission_id=s.id AND ar.criteria_code=i.code AND ar.passed=1)
      AND COALESCE((SELECT cr.decision FROM submission_criteria_reviews cr WHERE cr.submission_id=s.id AND cr.criteria_code=i.code AND cr.round=?),'fail')<>'pass'
  `, [submission.id, reviewRound])) as Array<{code:string}>:[];
  const discardedFiles: EvidenceObject[] = [];

  const tx = (async () => (await db.withTransaction(async () => {
    for(const item of redundantEvidence){
      discardedFiles.push(...await db.rows<EvidenceObject>("SELECT object_key,storage_provider FROM submission_ready_files WHERE submission_id=? AND criteria_code=? AND status='ready'", [submission.id,item.code]));
      await db.execute("UPDATE submission_files SET status='deleted',deleted_at=CURRENT_TIMESTAMP(3) WHERE submission_id=? AND criteria_code=? AND status='ready'", [submission.id,item.code]);
      (await db.execute(`DELETE FROM submission_items WHERE submission_id=? AND criteria_code=?`, [submission.id, item.code]));
    }
    if (actingRole === "faculty_officer") {
      const assignment = (await db.first(`SELECT id FROM faculty_class_assignments WHERE faculty_officer_id=? AND class_id=? LIMIT 1`, [user.id, submission.class_id]));
      if (!assignment) throw new Error("Không có quyền duyệt hồ sơ lớp này.");
    }
    (await db.execute(`
      INSERT INTO reviews (
        submission_id,
        reviewer_id,
        round,
        decision,
        note,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))
      ON DUPLICATE KEY UPDATE
        reviewer_id = VALUES(reviewer_id),
        decision = VALUES(decision),
        note = VALUES(note),
        created_at = CURRENT_TIMESTAMP(3)
      `, [submission.id, user.id, submission.status === "submitted_v1" ? 1 : 2, toStoredDecision(decision), note || null]));

    (await db.execute(`
      UPDATE submissions
      SET
        status = ?,
        review_round = ?,
        updated_at = CURRENT_TIMESTAMP(3)
      WHERE id = ?
      `, [nextStatus, submission.status === "submitted_v2" || nextStatus === "submitted_v2" || nextStatus === "passed" ? 2 : 1, submission.id]));

    (await db.execute(`
      INSERT INTO submission_timeline (
        submission_id,
        actor_user_id,
        action,
        from_status,
        to_status,
        message,
        created_at
      )
      VALUES (?, ?, 'review', ?, ?, ?, CURRENT_TIMESTAMP(3))
      `, [submission.id, user.id, submission.status, nextStatus, note || null]));

    const notificationTitle = decision === "approve"
      ? nextStatus === "passed" ? "Hồ sơ đã được duyệt đạt" : "Hồ sơ đã qua vòng duyệt"
      : decision === "revision" ? "Hồ sơ cần được điều chỉnh" : "Hồ sơ không đạt";
    (await db.execute(`INSERT INTO notifications(user_id,type,title,content,link) VALUES(?,?,?,?,?)`, [submission.user_id, "submission_review", notificationTitle, note || (decision === "revision" ? "Vui lòng xem phản hồi và bổ sung hồ sơ." : "Kết quả xét duyệt hồ sơ đã được cập nhật."), `/dashboard/student/submissions/${submission.id}`]));
  })));

  (await tx());

  await removeEvidenceObjects(discardedFiles);

  revalidatePath("/dashboard/class-officer/reviews");
  revalidatePath("/dashboard/faculty-officer/reviews");
  revalidatePath(`/dashboard/class-officer/reviews/${submission.id}`);
  revalidatePath(`/dashboard/faculty-officer/reviews/${submission.id}`);
  revalidatePath("/dashboard/student/notifications");
  revalidatePath(`/dashboard/student/submissions/${submission.id}`);

  return {
    ok: true,
    message: "Đã cập nhật kết quả xét duyệt.",
  };
}
