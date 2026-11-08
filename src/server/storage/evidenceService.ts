import { getDatabase } from "../db/mysql";
import { assertEvidenceEditable } from "../submissions/assertEvidenceEditable";
import { validateEvidenceCriteria } from "../submissions/validateEvidenceCriteria";
import { evaluateSubmissionAuto } from "../events/evaluateSubmissionAuto";
import { evaluateSubmission } from "../submissions/evaluateSubmission";
import { createEvidenceKey } from "./objectKey";
import { validateEvidenceFile } from "./filePolicy";
import { getStorageProvider } from "./storageFactory";
import type { StorageKind, ObjectMetadata } from "./types";

export type EvidenceUser = {id: number; role: string; loginContext?: string};
export type EvidenceSubmission = {id: number; user_id: number; event_id: number; type: "student" | "officer"};
export type EvidenceObject = {object_key: string; storage_provider: StorageKind};
export async function authorizeEvidenceWrite(user: EvidenceUser, submissionId: number, criteriaCodes: string[]) {
  const db = getDatabase();
  const row = await db.first<EvidenceSubmission>("SELECT s.id,s.user_id,s.event_id,e.type FROM submissions s JOIN events e ON e.id=s.event_id WHERE s.id=?", [submissionId]);
  if (!row || row.user_id !== user.id) throw new Error("Bạn không có quyền cập nhật minh chứng của hồ sơ này.");
  const context = user.loginContext || "student";
  if (row.type === "student" ? context !== "student" : !["admin", "class_officer", "faculty_officer"].includes(context) || !["admin", "class_officer", "faculty_officer"].includes(user.role)) throw new Error("Vai trò hiện tại không được phép cập nhật hồ sơ này.");
  await assertEvidenceEditable(db, submissionId, user.id, row.type);
  await validateEvidenceCriteria(db, row.event_id, criteriaCodes);
  return row;
}
export async function createEvidenceUnitWithFile(submissionId: number, criteriaCode: string, userId: number, claimedCount: number, note: string | null, file: {originalName: string; key: string; provider: StorageKind; metadata: ObjectMetadata}) {
  const db = getDatabase();
  const unit = await db.execute(`INSERT INTO submission_evidence_units(submission_id,criteria_code,source_type,note,claimed_count,created_by) VALUES(?,?,'manual',?,?,?)`, [submissionId, criteriaCode, note, claimedCount, userId]);
  const result = await db.execute(`INSERT INTO submission_files(submission_id,criteria_code,evidence_unit_id,file_name,original_name,object_key,storage_provider,mime_type,size_bytes,status,uploaded_by,etag,checksum_sha256) VALUES(?,?,?,?,?,?,?,?,?,'ready',?,?,?)`, [submissionId, criteriaCode, unit.insertId, file.originalName, file.originalName, file.key, file.provider, file.metadata.mimeType, file.metadata.size, userId, file.metadata.etag || null, file.metadata.checksumSha256 || null]);
  return {id: result.insertId, evidenceUnitId: unit.insertId};
}
export async function removeEvidenceObjects(objects: EvidenceObject[]) {
  for (const object of objects) {
    try {
      await getStorageProvider(object.storage_provider).delete(object.object_key);
      await getDatabase().execute("UPDATE submission_files SET object_deleted_at=CURRENT_TIMESTAMP(3) WHERE object_key=? AND storage_provider=? AND status='deleted'", [object.object_key, object.storage_provider]);
    }
    catch { console.warn("Evidence cleanup deferred; deleted metadata remains available for cleanup retry."); }
  }
}
export async function refreshEvidenceEvaluation(submissionId: number) {
  await evaluateSubmissionAuto(submissionId);
  await evaluateSubmission(submissionId);
}
export async function saveEvidence(user: EvidenceUser, submissionId: number, formData: FormData, kind: "student" | "officer") {
  const db = getDatabase();
  const codes = formData.getAll("criteriaCode").map(String).map(value => value.trim()).filter(Boolean);
  const submission = await authorizeEvidenceWrite(user, submissionId, codes);
  if (submission.type !== kind) throw new Error("Loại hồ sơ không hợp lệ.");
  const changed = codes.filter(code => String(formData.get(`note_${code}`) || "").trim().length > 0);
  const claimedCount=(code:string)=>{const value=Number(formData.get(`claimedCount_${code}`)??1);if(!Number.isInteger(value)||value<1||value>50)throw new Error(`Số lượt minh chứng của tiêu chí ${code} phải từ 1 đến 50.`);return value;};
  const provider = getStorageProvider();
  const prepared: {code: string; originalName: string; key: string; metadata: ObjectMetadata}[] = [];
  let committed = false;
  try {
    for (const code of codes) {
      const file = formData.get(`file_${code}`);
      if (!(file instanceof File) || !file.size) continue;
      const {extension, mimeType, buffer} = await validateEvidenceFile(file);
      const key = createEvidenceKey(submission.event_id, submissionId, code, extension);
      let metadata: ObjectMetadata;
      try { metadata = await provider.put(key, buffer, mimeType); }
      catch (error) { await provider.delete(key).catch(() => {}); throw error; }
      prepared.push({code, originalName: file.name, key, metadata});
    }
    if (!changed.length && !prepared.length) throw new Error("Bạn chưa thêm hoặc thay đổi minh chứng nào để lưu.");
    await db.withTransaction(async () => {
      await authorizeEvidenceWrite(user, submissionId, codes);
      const fileCodes=new Set(prepared.map(file=>file.code));
      for (const code of changed.filter(code=>!fileCodes.has(code))) {
        const text = String(formData.get(`note_${code}`) || "").trim();
        await db.execute("INSERT INTO submission_evidence_units(submission_id,criteria_code,source_type,note,claimed_count,created_by) VALUES(?,?,'manual',?,?,?)", [submissionId, code, text, claimedCount(code), user.id]);
      }
      for (const file of prepared) {
        const note=String(formData.get(`note_${file.code}`)||"").trim()||null;
        await createEvidenceUnitWithFile(submissionId, file.code, user.id, claimedCount(file.code), note, {originalName:file.originalName, key:file.key, provider:provider.kind, metadata:file.metadata});
      }
      await db.execute("UPDATE submissions SET updated_at=CURRENT_TIMESTAMP(3) WHERE id=?", [submissionId]);
      await refreshEvidenceEvaluation(submissionId);
    });
    committed = true;
    return submission;
  } finally {
    if (!committed) await removeEvidenceObjects(prepared.map(file => ({object_key:file.key, storage_provider:provider.kind})));
  }
}
