import { cohortFromMssv, cohortLabel } from "@/lib/cohorts/cohorts";
export default function CohortBadge({mssv}:{mssv:string}) {
 const cohort=cohortFromMssv(mssv);
 return cohort ? <span className="ml-1 whitespace-nowrap text-xs font-medium text-blue-700">· {cohortLabel(cohort)}</span> : null;
}
