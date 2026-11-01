"use server";

import { requireFacultyOfficerContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { scanActivityQr } from "@/server/actions/activities/scanActivityQr";

export async function markActivityAttendance(registrationId: number) {
  await requireFacultyOfficerContext();
  if (!Number.isSafeInteger(registrationId) || registrationId <= 0) throw new Error("Lượt đăng ký không hợp lệ.");
  const registration = (await getDatabase().first("SELECT ar.activity_id,u.mssv FROM activity_registrations ar JOIN users u ON u.id=ar.user_id WHERE ar.id=?", [registrationId])) as {activity_id:number;mssv:string}|undefined;
  if (!registration) throw new Error("Không tìm thấy lượt đăng ký.");
  // Reuse the same status, registration and time-window checks as the scanner.
  const result = await scanActivityQr(registration.activity_id, registration.mssv, "manual");
  if (!result.ok) throw new Error(result.message);
  return result;
}
