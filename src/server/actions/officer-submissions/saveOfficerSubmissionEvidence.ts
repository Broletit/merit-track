"use server";
import { revalidatePath } from "next/cache";
import { requireOfficerParticipantContext } from "@/server/auth/requireOfficerParticipantContext";
import { saveEvidence } from "@/server/storage/evidenceService";
export async function saveOfficerSubmissionEvidence(submissionId: number, formData: FormData) {
  const user = await requireOfficerParticipantContext();
  await saveEvidence(user, submissionId, formData, "officer");
  revalidatePath(`/dashboard/faculty-officer/officer-submissions/detail/${submissionId}`);
  revalidatePath(`/dashboard/class-officer/officer-submissions/detail/${submissionId}`);
  return {ok:true, message:"Đã lưu minh chứng."};
}
