
import { asyncSome } from "@/server/db/asyncCollections";
import { getDatabase } from "@/server/db/mysql";
import { parseCohort } from "@/lib/cohorts/cohorts";
import { activityVisibleSql } from "@/server/cohorts/sql";
export async function readActivityScopes(formData: FormData) {
  const classIds = [...new Set(formData.getAll("classIds").map(Number))];
  const cohorts = [...new Set(formData.getAll("cohorts").map(Number))];
  if (classIds.some((id) => !Number.isInteger(id) || id <= 0) || cohorts.some((value) => !parseCohort(value))) throw new Error("Phạm vi lớp / khóa không hợp lệ.");
  const db = getDatabase();
  if ((await asyncSome(classIds, async (id) => !(await db.first("SELECT 1 FROM classes WHERE id=? AND is_active=1", [id]))))) throw new Error("Lớp được chọn không hợp lệ.");
  return {classIds, cohorts};
}
export async function saveActivityScopes(activityId: number, classIds: number[], cohorts: number[]) {
  const db=getDatabase();
  (await db.execute("DELETE FROM activity_scopes WHERE activity_id=?", [activityId]));
  (await db.execute("DELETE FROM activity_cohort_scopes WHERE activity_id=?", [activityId]));
  for(const id of classIds) (await db.execute("INSERT INTO activity_scopes(activity_id,class_id) VALUES(?,?)", [activityId, id]));
  for(const cohort of cohorts) (await db.execute("INSERT INTO activity_cohort_scopes(activity_id,cohort) VALUES(?,?)", [activityId, cohort]));
}
export async function assertActivityScope(activityId:number,userId:number) {
  if(!(await getDatabase().first(`SELECT 1 FROM activities a WHERE a.id=? AND ${activityVisibleSql("a", String(userId))}`, [activityId]))) throw new Error("Bạn không thuộc lớp hoặc khóa được tham gia hoạt động này.");
}
