"use server";

import { revalidatePath } from "next/cache";
import { reviewSubmission } from "@/server/actions/reviews/reviewSubmission";

function emptyReviewFormData() {
  return new FormData();
}

export async function approveV1(id: number) {
  await reviewSubmission(id, "approve", emptyReviewFormData());

  revalidatePath("/dashboard/class-officer/submissions");
  revalidatePath(`/dashboard/class-officer/submissions/${id}`);
  revalidatePath("/dashboard/faculty-officer/submissions");
  revalidatePath("/dashboard/admin/submissions");
  revalidatePath(`/dashboard/admin/submissions/${id}`);
  revalidatePath(`/dashboard/student/submissions/${id}`);
}

export async function rejectV1(id: number) {
  await reviewSubmission(id, "revision", emptyReviewFormData());

  revalidatePath("/dashboard/class-officer/submissions");
  revalidatePath(`/dashboard/class-officer/submissions/${id}`);
  revalidatePath("/dashboard/admin/submissions");
  revalidatePath(`/dashboard/admin/submissions/${id}`);
  revalidatePath(`/dashboard/student/submissions/${id}`);
}

export async function approveV2(id: number) {
  await reviewSubmission(id, "approve", emptyReviewFormData());

  revalidatePath("/dashboard/faculty-officer/submissions");
  revalidatePath(`/dashboard/faculty-officer/submissions/${id}`);
  revalidatePath("/dashboard/admin/submissions");
  revalidatePath(`/dashboard/admin/submissions/${id}`);
  revalidatePath(`/dashboard/student/submissions/${id}`);
}

export async function rejectV2(id: number) {
  await reviewSubmission(id, "reject", emptyReviewFormData());

  revalidatePath("/dashboard/faculty-officer/submissions");
  revalidatePath(`/dashboard/faculty-officer/submissions/${id}`);
  revalidatePath("/dashboard/admin/submissions");
  revalidatePath(`/dashboard/admin/submissions/${id}`);
  revalidatePath(`/dashboard/student/submissions/${id}`);
}
