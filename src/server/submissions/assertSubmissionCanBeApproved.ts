import type Database from "better-sqlite3";
import { evaluateSubmissionAuto } from "@/server/events/evaluateSubmissionAuto";
import { assertSubmissionRequirements, evaluateSubmissionRequirements } from "./evaluateSubmissionRequirements";

export function getMissingSubmissionCriteria(db: Database.Database, submissionId: number) {
  evaluateSubmissionAuto(submissionId);
  return evaluateSubmissionRequirements(db,submissionId,"approved").missingCriteria;
}

export function assertSubmissionCanBeApproved(db: Database.Database, submissionId: number) {
  evaluateSubmissionAuto(submissionId);
  try { assertSubmissionRequirements(db,submissionId,"approved"); }
  catch(error) {
    const message=error instanceof Error?error.message:"Hồ sơ chưa đáp ứng điều kiện.";
    throw new Error(`Không thể duyệt đạt. ${message} Vui lòng chọn “Cần chỉnh sửa” hoặc “Không đạt”.`);
  }
}
