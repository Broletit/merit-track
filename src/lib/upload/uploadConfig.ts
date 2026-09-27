export const uploadConfig = {
  // 10MB
  maxFileSize: 10 * 1024 * 1024,

  allowedMimeTypes: [
    // PDF
    "application/pdf",

    // Images
    "image/jpeg",
    "image/png",
    "image/webp",

    // Word
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    // Excel
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],

  allowedExtensions: [
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
  ],
};