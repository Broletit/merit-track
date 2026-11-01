"use server";
import { revalidatePath } from "next/cache";
import { requireStudentContext } from "@/server/auth/guards";
import { saveEvidence } from "@/server/storage/evidenceService";
export async function saveStudentSubmissionEvidence(submissionId: number, formData: FormData) {
  const user = await requireStudentContext();
  const submission = await saveEvidence(user, submissionId, formData, "student");
  revalidatePath(`/dashboard/student/submissions/${submissionId}`);
  revalidatePath(`/dashboard/student/events/${submission.event_id}`);
  revalidatePath("/dashboard/student/submissions");
  return {ok:true, message:"Đã lưu minh chứng."};
}
