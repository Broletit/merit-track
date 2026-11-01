"use server";

import { requireStudentContext } from "@/server/auth/guards";

export async function cancelActivityRegistration(activityId: number) {
  await requireStudentContext();
  void activityId;
  throw new Error("Sinh viên không được hủy đăng ký. Vui lòng liên hệ quản trị viên để được hỗ trợ.");
}
