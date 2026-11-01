import { parseCohort } from "@/lib/cohorts/cohorts";
export function userCohortSql(alias = "u") { return `${alias}.cohort`; }
export function classCohortSql(alias = "c") { return `${alias}.cohort`; }
export function addCohortFilter(where: string[], values: unknown[], value: unknown, expression: string) {
  const cohort = parseCohort(value);
  if (String(value ?? "").trim() && !cohort) { where.push("0=1"); return; }
  if (cohort) { where.push(`${expression} = ?`); values.push(cohort); }
}
export function activityVisibleSql(activity = "a", userId = "?") {
  return `((${activity}.organizer_level='faculty' AND NOT EXISTS(SELECT 1 FROM activity_scopes sc WHERE sc.activity_id=${activity}.id) AND NOT EXISTS(SELECT 1 FROM activity_cohort_scopes cs WHERE cs.activity_id=${activity}.id))
    OR EXISTS(SELECT 1 FROM activity_scopes sc JOIN class_members cm ON cm.class_id=sc.class_id WHERE sc.activity_id=${activity}.id AND cm.user_id=${userId} AND cm.left_at IS NULL)
    OR EXISTS(SELECT 1 FROM activity_cohort_scopes cs JOIN users cu ON cu.cohort=cs.cohort WHERE cs.activity_id=${activity}.id AND cu.id=${userId}))`;
}
export function activityCohortSql(activity = "a") {
 return `EXISTS(SELECT 1 FROM activity_cohort_scopes cs WHERE cs.activity_id=${activity}.id AND cs.cohort=?) OR EXISTS(SELECT 1 FROM activity_scopes sc JOIN classes cc ON cc.id=sc.class_id LEFT JOIN class_members cohort_cm ON cohort_cm.class_id=cc.id AND cohort_cm.left_at IS NULL LEFT JOIN users cohort_u ON cohort_u.id=cohort_cm.user_id WHERE sc.activity_id=${activity}.id AND ? IN (cc.cohort,cohort_u.cohort)) OR (${activity}.organizer_level='faculty' AND NOT EXISTS(SELECT 1 FROM activity_scopes sc WHERE sc.activity_id=${activity}.id) AND NOT EXISTS(SELECT 1 FROM activity_cohort_scopes cs WHERE cs.activity_id=${activity}.id))`;
}

export function classActivityVisibleSql(activity="a",classId="?") {
 return `((${activity}.organizer_level='faculty' AND NOT EXISTS(SELECT 1 FROM activity_scopes sc WHERE sc.activity_id=${activity}.id) AND NOT EXISTS(SELECT 1 FROM activity_cohort_scopes cs WHERE cs.activity_id=${activity}.id)) OR EXISTS(SELECT 1 FROM activity_scopes sc WHERE sc.activity_id=${activity}.id AND sc.class_id=${classId}) OR EXISTS(SELECT 1 FROM activity_cohort_scopes cs JOIN classes cc ON cc.cohort=cs.cohort WHERE cs.activity_id=${activity}.id AND cc.id=${classId}) OR EXISTS(SELECT 1 FROM activity_cohort_scopes cs JOIN users cu ON cu.cohort=cs.cohort JOIN class_members cm ON cm.user_id=cu.id WHERE cs.activity_id=${activity}.id AND cm.class_id=${classId} AND cm.left_at IS NULL))`;
}

export function cohortClause(value: unknown, expression: string) {
 if (!String(value ?? "").trim()) return "1=1";
 const cohort=parseCohort(value); return cohort ? `${expression}=${cohort}` : "0=1";
}
export function eventCohortClause(value: unknown, event="e") {
 if (!String(value ?? "").trim()) return "1=1";
 const cohort=parseCohort(value);
 return cohort ? `(NOT EXISTS(SELECT 1 FROM event_scopes es WHERE es.event_id=${event}.id) OR EXISTS(SELECT 1 FROM event_scopes es JOIN classes cc ON cc.id=es.class_id WHERE es.event_id=${event}.id AND cc.cohort=${cohort}))` : "0=1";
}

export function activityCohortClause(value: unknown, activity = "a") {
  if (!String(value ?? "").trim()) return "1=1";
  const cohort = parseCohort(value);
  return cohort ? `(${activityCohortSql(activity).replaceAll("?", String(cohort))})` : "0=1";
}
