"use server";

import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { requireStudentContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { evaluateSubmissionAuto } from "@/server/events/evaluateSubmissionAuto";
import { evaluateSubmission } from "@/server/submissions/evaluateSubmission";
import { uploadConfig } from "@/lib/upload/uploadConfig";
import { canEditSubmission } from "@/lib/submissions/submissionStatus";
import { assertEventAcceptsSubmissions } from "@/lib/events/eventSubmissionPhase";

const evidenceExtensions = [".pdf", ".png"];
const evidenceMimeTypes = ["application/pdf", "image/png"];

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

type PreparedNote = {
  criteriaCode: string;
  contentText: string;
};

export async function saveStudentSubmissionEvidence(
  submissionId: number,
  formData: FormData
) {
  const user = await requireStudentContext();
  const db = getDb();

  const submission = db
    .prepare(
      `
      SELECT
        s.id,
        s.user_id,
        s.status,
        s.event_id,
        e.status AS event_status,
        e.start_at,
        e.end_at,
        e.allow_late
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      WHERE s.id = ?
      LIMIT 1
      `
    )
    .get(submissionId) as
    | {
        id: number;
        user_id: number;
        status: string;
        event_id: number;
        event_status: string;
        start_at: string;
        end_at: string;
        allow_late: number;
      }
    | undefined;

  if (!submission) throw new Error("Hồ sơ không tồn tại.");

  if (Number(submission.user_id) !== Number(user.id)) {
    throw new Error("Bạn không có quyền chỉnh sửa hồ sơ này.");
  }

  if (!canEditSubmission(submission.status)) {
    throw new Error("Hồ sơ hiện không thể chỉnh sửa.");
  }

  assertEventAcceptsSubmissions({
    status: submission.event_status,
    startAt: submission.start_at,
    endAt: submission.end_at,
    allowLate: Number(submission.allow_late ?? 0) === 1,
  });

  const criteriaCodes = formData
    .getAll("criteriaCode")
    .map((value) => String(value).trim())
    .filter(Boolean);

  const preparedFiles: PreparedFile[] = [];
  const existingNotes = db
    .prepare(
      `
      SELECT criteria_code, COALESCE(content_text, '') AS content_text
      FROM submission_items
      WHERE submission_id = ?
      `
    )
    .all(submissionId) as Array<{ criteria_code: string; content_text: string }>;
  const existingNoteMap = new Map(
    existingNotes.map((item) => [String(item.criteria_code), String(item.content_text).trim()])
  );
  const preparedNotes: PreparedNote[] = criteriaCodes.flatMap((criteriaCode) => {
    const contentText = String(formData.get(`note_${criteriaCode}`) ?? "").trim();
    return contentText !== (existingNoteMap.get(criteriaCode) ?? "")
      ? [{ criteriaCode, contentText }]
      : [];
  });

  for (const criteriaCode of criteriaCodes) {
    const file = formData.get(`file_${criteriaCode}`);

    if (file instanceof File && file.size > 0) {
      const extension = path.extname(file.name).toLowerCase();

      if (!evidenceExtensions.includes(extension)) {
        throw new Error(
          `Tệp “${file.name}” không đúng định dạng. Minh chứng chỉ chấp nhận tệp PDF hoặc PNG.`
        );
      }

      if (file.size > uploadConfig.maxFileSize) {
        throw new Error(`Tệp “${file.name}” vượt quá dung lượng tối đa 10 MB.`);
      }

      if (file.type && !evidenceMimeTypes.includes(file.type)) {
        throw new Error(
          `Nội dung tệp “${file.name}” không khớp định dạng được hỗ trợ. Vui lòng chọn tệp khác.`
        );
      }

      const safeName = `${submissionId}-${criteriaCode}-${Date.now()}${extension}`;

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
    for (const note of preparedNotes) {
      db.prepare(
        `
        INSERT INTO submission_items (
          submission_id, criteria_code, content_text, updated_at
        )
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(submission_id, criteria_code)
        DO UPDATE SET
          content_text = excluded.content_text,
          updated_at = datetime('now')
        `
      ).run(submissionId, note.criteriaCode, note.contentText);
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

  revalidatePath(`/dashboard/student/submissions/${submissionId}`);
  revalidatePath(`/dashboard/student/events/${submission.event_id}`);
  revalidatePath("/dashboard/student/submissions");

  return {
    ok: true,
    message: "Đã lưu minh chứng.",
  };
}
