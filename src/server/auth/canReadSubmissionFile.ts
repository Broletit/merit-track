import type { Database } from "@/server/db/mysql";

export async function canReadSubmissionFile(
  db: Database,
  user: {id:number;role:string;loginContext?:string},
  file: {user_id:number;class_id:number|null;submitted_at:string|null;has_support:number},
) {
  const context = user.loginContext ?? "student";
  if (Number(file.user_id) === Number(user.id)) return true;
  if (user.role === "admin" && context === "admin") return true;
  if (!file.submitted_at && !file.has_support) return false;
  if (user.role === "class_officer" && context === "class_officer") {
    return Boolean((await db.first("SELECT 1 FROM class_members WHERE user_id=? AND class_id=? AND left_at IS NULL LIMIT 1", [user.id, file.class_id])));
  }
  if (user.role === "faculty_officer" && context === "faculty_officer") {
    return Boolean((await db.first("SELECT 1 FROM faculty_class_assignments WHERE faculty_officer_id=? AND class_id=? LIMIT 1", [user.id, file.class_id])));
  }
  return false;
}
