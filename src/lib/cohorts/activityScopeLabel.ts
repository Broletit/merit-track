import { cohortLabel } from "./cohorts";
export type ScopeClass = { id: number; code: string; cohort: number | null };
export function activityScopeLabel(selected: ScopeClass[], wholeCohorts: number[], available: ScopeClass[]) {
  const whole = new Set(wholeCohorts);
  const groups = new Map<number, ScopeClass[]>();
  for (const item of selected) {
    if (item.cohort === null || whole.has(item.cohort)) continue;
    const group = groups.get(item.cohort) ?? [];
    group.push(item); groups.set(item.cohort, group);
  }
  const labels = [...new Set([...whole, ...groups.keys()])].sort((a,b)=>a-b).map(cohort => {
    if (whole.has(cohort)) return cohortLabel(cohort);
    const classes = groups.get(cohort) ?? [];
    const ids = new Set(classes.map(item=>item.id));
    const all = available.filter(item=>item.cohort === cohort);
    if (all.length && all.every(item=>ids.has(item.id))) return cohortLabel(cohort);
    return cohortLabel(cohort) + " (" + classes.map(item=>item.code).sort().join(", ") + ")";
  });
  labels.push(...selected.filter(item=>item.cohort === null).map(item=>item.code).sort());
  return labels.join("; ") || "Toàn khoa";
}
