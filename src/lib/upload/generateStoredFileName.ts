import crypto from "crypto";
import path from "path";

export function generateStoredFileName(
  originalName: string
) {
  const ext = path.extname(originalName);

  return `${Date.now()}-${crypto
    .randomBytes(8)
    .toString("hex")}${ext}`;
}