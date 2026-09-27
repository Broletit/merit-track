"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/server/db/sqlite";
import { requireLogin } from "@/server/auth/guards";
import { assertSubmissionCanBeApproved } from "@/server/submissions/assertSubmissionCanBeApproved";
import fs from "node:fs";
import path from "node:path";

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
  if (decision === "revision") return "needs_revision_v2";
  return "failed";
}

export async function reviewSubmission(
  submissionId: number,
  decision: ReviewDecision,
  formData: FormData
) {
  const user = await requireLogin();
  const db = getDb();

  const note = String(formData.get("note") ?? "").trim();

  if (!["approve", "reject", "revision"].includes(decision)) {
    throw new Error("Quyết định duyệt không hợp lệ.");
  }

  const submission = db
    .prepare(
      `
      SELECT
        s.id,
        s.event_id,
        s.user_id,
        s.class_id,
        s.status,
        e.type AS event_type,
        CASE WHEN e.status='published' AND datetime(e.end_at)>=datetime('now') THEN 1 ELSE 0 END AS review_open
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      WHERE s.id = ?
      LIMIT 1
      `
    )
    .get(submissionId) as SubmissionRow | undefined;

  if (!submission) {
    throw new Error("Hồ sơ không tồn tại.");
  }

  if (submission.event_type !== "student") {
    throw new Error("Hồ sơ cán bộ phải được duyệt trong luồng dành cho cán bộ.");
  }

  if (Number(submission.review_open) !== 1) {
    throw new Error("Đợt xét đã khóa hoặc đã kết thúc. Không thể tiếp tục duyệt hồ sơ.");
  }

  let nextStatus = "";

  if (submission.status === "submitted_v1") {
    if (user.role !== "class_officer" && user.role !== "admin") {
      throw new Error("Không có quyền duyệt vòng 1.");
    }

    if (user.role === "class_officer") {
      const assignment = db
        .prepare(
          `
          SELECT id
          FROM class_members
          WHERE user_id = ?
            AND class_id = ?
            AND left_at IS NULL
          LIMIT 1
          `
        )
        .get(user.id, submission.class_id);

      if (!assignment) {
        throw new Error("Không có quyền duyệt hồ sơ lớp này.");
      }
    }

    nextStatus = nextStatusForV1(decision);
  } else if (submission.status === "submitted_v2") {
    if (user.role !== "faculty_officer" && user.role !== "admin") {
      throw new Error("Không có quyền duyệt vòng 2.");
    }

    if (user.role === "faculty_officer") {
      const assignment = db
        .prepare(
          `
          SELECT id
          FROM faculty_class_assignments
          WHERE faculty_officer_id = ?
            AND class_id = ?
          LIMIT 1
          `
        )
        .get(user.id, submission.class_id);

      if (!assignment) {
        throw new Error("Không có quyền duyệt hồ sơ lớp này.");
      }
    }

    nextStatus = nextStatusForV2(decision);
  } else {
    throw new Error("Hồ sơ không ở trạng thái chờ duyệt.");
  }

  if (decision === "approve") {
    assertSubmissionCanBeApproved(db, submission.id);
  }

  const reviewRound=submission.status==="submitted_v1"?1:2;
  const redundantEvidence=decision==="approve"?db.prepare(`
    SELECT i.code,(SELECT group_concat(sf.file_path,'||') FROM submission_files sf WHERE sf.submission_id=s.id AND sf.criteria_code=i.code) file_paths
    FROM submissions s INNER JOIN event_criteria_items i ON i.event_id=s.event_id
    WHERE s.id=? AND NOT EXISTS(SELECT 1 FROM submission_auto_results ar WHERE ar.submission_id=s.id AND ar.criteria_code=i.code AND ar.passed=1)
      AND COALESCE((SELECT cr.decision FROM submission_criteria_reviews cr WHERE cr.submission_id=s.id AND cr.criteria_code=i.code AND cr.round=?),'fail')<>'pass'
  `).all(submission.id,reviewRound) as Array<{code:string;file_paths:string|null}>:[];

  const tx = db.transaction(() => {
    for(const item of redundantEvidence){
      db.prepare(`DELETE FROM submission_files WHERE submission_id=? AND criteria_code=?`).run(submission.id,item.code);
      db.prepare(`DELETE FROM submission_items WHERE submission_id=? AND criteria_code=?`).run(submission.id,item.code);
    }
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
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(submission_id, round)
      DO UPDATE SET
        reviewer_id = excluded.reviewer_id,
        decision = excluded.decision,
        note = excluded.note,
        created_at = datetime('now')
      `
    ).run(
      submission.id,
      user.id,
      submission.status === "submitted_v1" ? 1 : 2,
      toStoredDecision(decision),
      note || null
    );

    db.prepare(
      `
      UPDATE submissions
      SET
        status = ?,
        updated_at = datetime('now')
      WHERE id = ?
      `
    ).run(nextStatus, submission.id);

    db.prepare(
      `
      INSERT INTO submission_timeline (
        submission_id,
        actor_user_id,
        action,
        from_status,
        to_status,
        message,
        created_at
      )
      VALUES (?, ?, 'review', ?, ?, ?, datetime('now'))
      `
    ).run(
      submission.id,
      user.id,
      submission.status,
      nextStatus,
      note || "Cập nhật trạng thái xét duyệt."
    );

    const notificationTitle = decision === "approve"
      ? nextStatus === "passed" ? "Hồ sơ đã được duyệt đạt" : "Hồ sơ đã qua vòng duyệt"
      : decision === "revision" ? "Hồ sơ cần được điều chỉnh" : "Hồ sơ không đạt";
    db.prepare(`INSERT INTO notifications(user_id,type,title,content,link) VALUES(?,?,?,?,?)`).run(
      submission.user_id,
      "submission_review",
      notificationTitle,
      note || (decision === "revision" ? "Vui lòng xem phản hồi và bổ sung hồ sơ." : "Kết quả xét duyệt hồ sơ đã được cập nhật."),
      `/dashboard/student/submissions/${submission.id}`
    );
  });

  tx();

  for(const item of redundantEvidence){
    for(const storedPath of String(item.file_paths??"").split("||").filter(Boolean)){
      const absolutePath=path.join(process.cwd(),"public",storedPath.replace(/^[/\\]+/,""));
      try { if(fs.existsSync(absolutePath))fs.unlinkSync(absolutePath); } catch { /* Dữ liệu đã được loại khỏi hồ sơ; tệp mồ côi có thể được dọn nền. */ }
    }
  }

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
