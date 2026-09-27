import path from "path";
import { uploadConfig } from "./uploadConfig";

export function validateUploadFile(file: File) {
  if (!file || file.size <= 0) {
    throw new Error("File upload không hợp lệ.");
  }

  if (file.size > uploadConfig.maxFileSize) {
    throw new Error("File vượt quá dung lượng 10MB.");
  }

  if (
    !uploadConfig.allowedMimeTypes.includes(file.type)
  ) {
    throw new Error(
      "Định dạng file không được hỗ trợ."
    );
  }

  const ext = path.extname(file.name).toLowerCase();

  if (
    !uploadConfig.allowedExtensions.includes(ext)
  ) {
    throw new Error(
      "Phần mở rộng file không hợp lệ."
    );
  }
}