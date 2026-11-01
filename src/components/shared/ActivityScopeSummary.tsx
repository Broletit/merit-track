import { getDatabase } from "@/server/db/mysql";
import { activityScopeLabel, type ScopeClass } from "@/lib/cohorts/activityScopeLabel";
export default async function ActivityScopeSummary({activityId,compact=false}:{activityId:number;compact?:boolean}) {
 const db=getDatabase();
 const classes=(await db.rows("SELECT c.id,c.code,c.cohort FROM activity_scopes sc JOIN classes c ON c.id=sc.class_id WHERE sc.activity_id=? ORDER BY c.code", [activityId])) as ScopeClass[];
 const cohorts=(await db.rows("SELECT cohort FROM activity_cohort_scopes WHERE activity_id=? ORDER BY cohort", [activityId])) as Array<{cohort:number}>;
 const available = (await db.rows("SELECT id,code,cohort FROM classes WHERE is_active=1 OR id IN (SELECT class_id FROM activity_scopes WHERE activity_id=?)", [activityId])) as ScopeClass[];
 return <div className={compact?"mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600":"rounded-2xl bg-white px-5 py-4 text-sm text-slate-600 ring-1 ring-slate-100"}><span className="font-semibold text-slate-800">Phạm vi tham gia: </span>{activityScopeLabel(classes,cohorts.map(item=>item.cohort),available)}</div>;
}
