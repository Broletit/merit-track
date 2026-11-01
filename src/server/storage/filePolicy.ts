import path from "node:path";

export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
const formats: Record<string, string> = { ".pdf": "application/pdf", ".png": "image/png" };
export function validateEvidenceMetadata(originalName: string, mimeType: string, size: number) {
  const extension = path.extname(originalName).toLowerCase();
  if (!originalName || originalName.length > 255 || /[\x00-\x1f\\/]/.test(originalName)) throw new Error("Tên tệp minh chứng không hợp lệ.");
  if (!mimeType) mimeType = formats[extension];
  if (!formats[extension] || mimeType !== formats[extension]) throw new Error("Minh chứng chỉ chấp nhận PDF hoặc PNG, đúng loại nội dung.");
  if (!Number.isSafeInteger(size) || size < 1 || size > MAX_EVIDENCE_BYTES) throw new Error("Dung lượng minh chứng phải từ 1 byte đến 10 MB.");
  return { extension, mimeType };
}
export function validateEvidenceContent(buffer: Buffer, mimeType: string) {
  const valid = mimeType === "application/pdf" ? buffer.subarray(0, 5).toString() === "%PDF-" : mimeType === "image/png" && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (!valid) throw new Error("Nội dung tệp không khớp định dạng PDF/PNG.");
}
export async function validateEvidenceFile(file: File) {
  const metadata = validateEvidenceMetadata(file.name, file.type, file.size);
  const buffer = Buffer.from(await file.arrayBuffer());
  validateEvidenceContent(buffer, metadata.mimeType);
  return { ...metadata, buffer };
}
