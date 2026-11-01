import { randomUUID } from "node:crypto";

export function validateObjectKey(key: string) {
  if (!key || key.length > 768 || key.includes("\\") || key.startsWith("/") || key.split("/").some(part => !/^[a-zA-Z0-9_.-]+$/.test(part) || part === "." || part === "..")) {
    throw new Error("Invalid storage object key.");
  }
  return key;
}

export function createEvidenceKey(eventId: number, submissionId: number, criteriaCode: string, extension: string) {
  if (![eventId, submissionId].every(id => Number.isSafeInteger(id) && id > 0) || !/^[A-Za-z0-9_.-]{1,64}$/.test(criteriaCode) || !/^\.[a-z0-9]{1,8}$/.test(extension)) {
    throw new Error("Invalid evidence identity.");
  }
  return validateObjectKey(`submissions/${eventId}/${submissionId}/${criteriaCode}/${randomUUID()}${extension}`);
}
