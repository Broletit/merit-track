"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";

export async function updateActivityRegistrationLock(activityId: number, locked: boolean) {
  await requireAdminContext();
  const db = getDb();
  const activity = db.prepare(`SELECT a.id,a.status,at.is_active FROM activities a INNER JOIN academic_terms at ON at.id=a.term_id WHERE a.id=? LIMIT 1`).get(activityId) as {id:number;status:string;is_active:number}|undefined;
  if(!activity) throw new Error("Hoạt động không tồn tại.");
  if(!activity.is_active) throw new Error("Không thể thay đổi đăng ký của hoạt động thuộc học kỳ không hiện hành.");
  if(activity.status!=="published") throw new Error("Chỉ có thể khóa hoặc mở đăng ký khi hoạt động đã công khai.");
  db.prepare(`UPDATE activities SET registration_locked=? WHERE id=?`).run(locked?1:0,activityId);
  revalidatePath("/dashboard/admin/activities");
  revalidatePath(`/dashboard/admin/activities/${activityId}`);
  revalidatePath("/dashboard/student/activities");
  return {ok:true,message:locked?"Đã khóa đăng ký hoạt động.":"Đã mở lại đăng ký hoạt động."};
}
