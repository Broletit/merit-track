import type { Database } from "@/server/db/mysql";
import { evaluateSubmissionAuto } from "@/server/events/evaluateSubmissionAuto";
import { assertSubmissionRequirements, evaluateSubmissionRequirements } from "./evaluateSubmissionRequirements";

export async function getMissingSubmissionCriteria(db: Database, submissionId: number) {
  (await evaluateSubmissionAuto(submissionId));
  return (await evaluateSubmissionRequirements(db,submissionId,"approved")).missingCriteria;
}

export async function assertSubmissionCanBeApproved(db: Database, submissionId: number) {
  (await evaluateSubmissionAuto(submissionId));
  try { (await assertSubmissionRequirements(db,submissionId,"approved")); }
  catch(error) {
    const message=error instanceof Error?error.message:"Hồ sơ chưa đáp ứng điều kiện.";
    throw new Error(`Không thể duyệt đạt. ${message} Vui lòng chọn “Cần chỉnh sửa” hoặc “Không đạt”.`);
  }
}
