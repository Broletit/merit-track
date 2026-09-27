"use server";

import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { requireOfficerParticipantContext } from "@/server/auth/requireOfficerParticipantContext";
import { getDb } from "@/server/db/sqlite";
import { evaluateSubmissionAuto } from "@/server/events/evaluateSubmissionAuto";
import { evaluateSubmission } from "@/server/submissions/evaluateSubmission";

function getUploadDir() {
  const dir = path.join(process.cwd(), "public", "uploads", "submissions");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

type PreparedFile = {
  criteriaCode: string;
  originalName: string;
  mimeType: string;
  size: number;
  safeName: string;
  publicPath: string;
  buffer: Buffer;
};

export async function saveOfficerSubmissionEvidence(
  submissionId: number,
  formData: FormData
) {
  const user = await requireOfficerParticipantContext();
  const db = getDb();

  const submission = db
    .prepare(
      `
      SELECT
        s.id,
        s.user_id,
        s.status,
        s.event_id,
        e.end_at
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      WHERE s.id = ?
        AND e.type = 'officer'
      LIMIT 1
      `
    )
    .get(submissionId) as
    | {
        id: number;
        user_id: number;
        status: string;
        event_id: number;
        end_at: string;
      }
    | undefined;

  if (!submission) throw new Error("Hồ sơ không tồn tại.");

  if (Number(submission.user_id) !== Number(user.id)) {
    throw new Error("Bạn không có quyền chỉnh sửa hồ sơ này.");
  }

  if (!["draft", "needs_revision_v1"].includes(submission.status)) {
    throw new Error("Hồ sơ hiện không thể chỉnh sửa.");
  }

  if (new Date() > new Date(submission.end_at)) {
    throw new Error("Đợt xét đã hết hạn chỉnh sửa hồ sơ.");
  }

  const criteriaCodes = formData
    .getAll("criteriaCode")
    .map((value) => String(value).trim())
    .filter(Boolean);

  const preparedFiles: PreparedFile[] = [];

  for (const criteriaCode of criteriaCodes) {
    const file = formData.get(`file_${criteriaCode}`);

    if (file instanceof File && file.size > 0) {
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
      const safeName = `${submissionId}-${criteriaCode}-${Date.now()}.${ext}`;

      preparedFiles.push({
        criteriaCode,
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        safeName,
        publicPath: `/uploads/submissions/${safeName}`,
        buffer: Buffer.from(await file.arrayBuffer()),
      });
    }
  }

  const uploadDir = getUploadDir();

  const tx = db.transaction(() => {
    for (const criteriaCode of criteriaCodes) {
      const contentText = String(formData.get(`note_${criteriaCode}`) ?? "").trim();
      const hasNewFile = preparedFiles.some((file) => file.criteriaCode === criteriaCode);
      const hasStoredFile = Boolean(
        db.prepare(
          "SELECT 1 FROM submission_files WHERE submission_id = ? AND criteria_code = ? LIMIT 1"
        ).get(submissionId, criteriaCode)
      );

      if (!contentText && !hasNewFile && !hasStoredFile) {
        db.prepare(
          "DELETE FROM submission_items WHERE submission_id = ? AND criteria_code = ?"
        ).run(submissionId, criteriaCode);
        continue;
      }

      db.prepare(
        `
        INSERT INTO submission_items (
          submission_id,
          criteria_code,
          content_text,
          updated_at
        )
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(submission_id, criteria_code)
        DO UPDATE SET
          content_text = excluded.content_text,
          updated_at = datetime('now')
        `
      ).run(submissionId, criteriaCode, contentText);
    }

    for (const file of preparedFiles) {
      fs.writeFileSync(path.join(uploadDir, file.safeName), file.buffer);

      db.prepare(
        `
        INSERT INTO submission_files (
          submission_id,
          criteria_code,
          file_name,
          file_path,
          mime_type,
          size_bytes,
          uploaded_at
        )
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `
      ).run(
        submissionId,
        file.criteriaCode,
        file.originalName,
        file.publicPath,
        file.mimeType,
        file.size
      );
    }

    db.prepare(
      `
      UPDATE submissions
      SET updated_at = datetime('now')
      WHERE id = ?
      `
    ).run(submissionId);
  });

  tx();

  evaluateSubmissionAuto(submissionId);
  evaluateSubmission(submissionId);

  revalidatePath(`/dashboard/faculty-officer/officer-submissions/detail/${submissionId}`);

  return {
    ok: true,
    message: "Đã lưu minh chứng.",
  };
}
