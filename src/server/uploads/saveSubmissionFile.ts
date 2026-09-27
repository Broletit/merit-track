import fs from "fs/promises";
import path from "path";

import { validateUploadFile } from "@/lib/upload/validateUploadFile";
import { generateStoredFileName } from "@/lib/upload/generateStoredFileName";

const UPLOAD_DIR = path.join(
  process.cwd(),
  "uploads",
  "submissions"
);

export async function saveSubmissionFile(
  file: File
) {
  validateUploadFile(file);

  await fs.mkdir(UPLOAD_DIR, {
    recursive: true,
  });

  const storedName = generateStoredFileName(
    file.name
  );

  const filePath = path.join(
    UPLOAD_DIR,
    storedName
  );

  const buffer = Buffer.from(
    await file.arrayBuffer()
  );

  await fs.writeFile(filePath, buffer);

  return {
    originalName: file.name,
    storedName,
    mimeType: file.type,
    sizeBytes: file.size,
    filePath: `/uploads/submissions/${storedName}`,
  };
}