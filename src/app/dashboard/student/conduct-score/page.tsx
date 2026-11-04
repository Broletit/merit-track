import { activityVisibleSql } from "@/server/cohorts/sql";
import { requireStudentContext } from "@/server/auth/guards";
import { Fragment } from "react";
import { getDatabase } from "@/server/db/mysql";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import StudentConductScoreHeader from "@/components/student/conduct-score/StudentConductScoreHeader";
import StudentConductScoreSummary from "@/components/student/conduct-score/StudentConductScoreSummary";
import StudentConductScoreTable from "@/components/student/conduct-score/StudentConductScoreTable";
import StudentConductScoreSection from "@/components/student/conduct-score/StudentConductScoreSection";
import { ensureActivityConductScores } from "@/server/conduct/ensureActivityConductScores";
import type {
  StudentConductScoreItem,
  StudentConductScoreSummaryData,
} from "@/components/student/conduct-score/types";
import {
  getAcademicTermForView,
  getAcademicTermsForSelect,
} from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{ scope?: string;
  keyword?: string;
  status?: string;
  score?: string;
  termId?: string;
}>;

type Row = {
  id: number;
  activity_id: number;
  title: string;
  start_at: string;
  end_at: string;
  registration_status: string;
  checked_in_at: string | null;
  conduct_score: number;
  absence_penalty: number;
  score_value: number | null;
};

export default async function StudentConductScorePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireStudentContext();
  const params = await searchParams;
  const db = getDatabase();
  (await ensureActivityConductScores());

  const terms = (await getAcademicTermsForSelect());
  const selectedTerm = (await getAcademicTermForView(params.termId));
  const scoreFrame = (await db.rows(`WITH RECURSIVE tree AS (
    SELECT id,parent_id,code,name,score_max,sort_order,0 depth,CAST(CONCAT(LPAD(CAST(sort_order AS CHAR), 8, '0'), code) AS CHAR(4096)) path FROM conduct_score_categories WHERE term_id=? AND parent_id IS NULL
    UNION ALL SELECT c.id,c.parent_id,c.code,c.name,c.score_max,c.sort_order,tree.depth+1,CONCAT(CONCAT(CONCAT(tree.path, '/'), LPAD(CAST(c.sort_order AS CHAR), 8, '0')), c.code) FROM conduct_score_categories c JOIN tree ON c.parent_id=tree.id)
    SELECT tree.id,tree.parent_id,tree.code,tree.name,tree.score_max,tree.depth,tree.path,
      COALESCE(SUM(CASE WHEN cs.user_id=? THEN cs.score_value ELSE 0 END),0) AS raw_score
    FROM tree
    LEFT JOIN activities a ON a.conduct_category_id=tree.id
    LEFT JOIN conduct_scores cs ON cs.source_type='activity' AND cs.source_id=a.id
    GROUP BY tree.id,tree.parent_id,tree.code,tree.name,tree.score_max,tree.depth,tree.path ORDER BY tree.path
  `, [selectedTerm.id, user.id])) as Array<{id:number;parent_id:number|null;code:string;name:string;score_max:number;raw_score:number;depth:number}>;
  const frameActivities = (await db.rows(`SELECT a.id,a.title,a.conduct_category_id,a.conduct_score,a.absence_penalty,COALESCE(cs.score_value,0) earned FROM activities a LEFT JOIN conduct_scores cs ON cs.source_type='activity' AND cs.source_id=a.id AND cs.user_id=? WHERE a.term_id=? AND a.conduct_category_id IS NOT NULL AND a.status='published' AND a.audience_type='student' AND ${activityVisibleSql("a",String(user.id))} ORDER BY CAST(a.created_at AS DATETIME(3)),a.id`, [user.id, selectedTerm.id])) as Array<{id:number;title:string;conduct_category_id:number;conduct_score:number;absence_penalty:number;earned:number}>;
  const effectiveScores=new Map<number,number>();
  [...scoreFrame].sort((a,b)=>b.depth-a.depth).forEach((item)=>{
    const direct=frameActivities.filter((activity)=>activity.conduct_category_id===item.id).reduce((sum,activity)=>sum+Number(activity.earned),0);
    const children=scoreFrame.filter((child)=>child.parent_id===item.id).reduce((sum,child)=>sum+(effectiveScores.get(child.id)??0),0);
    effectiveScores.set(item.id,Math.max(0,Math.min(Number(item.score_max),direct+children)));
  });

  const keyword = String(params.keyword ?? "").trim();
  const status = String(params.status ?? "").trim();
  const score = String(params.score ?? "").trim();

  const where: string[] = [
    `ar.user_id = ?`,
    `a.term_id = ?`,
    `ar.status <> 'cancelled'`,
  ];
  const values: unknown[] = [user.id, selectedTerm.id];
  if(params.scope==="class"||params.scope==="faculty"){
    where.push("a.organizer_level = ?");
    values.push(params.scope);
  }

  if (keyword) {
    where.push(`a.title LIKE ?`);
    values.push(`%${keyword}%`);
  }

  if (status) {
    where.push(`ar.status = ?`);
    values.push(status);
  }

  const rows = (await db.rows(`
      SELECT
        ar.id,
        a.id AS activity_id,
        a.title,
        a.start_at,
        a.end_at,
        ar.status AS registration_status,
        ar.checked_in_at,
        a.conduct_score,
        a.absence_penalty,
        cs.score_value
      FROM activity_registrations ar
      INNER JOIN activities a ON a.id = ar.activity_id
      LEFT JOIN academic_terms activity_term ON activity_term.id = a.term_id
      LEFT JOIN conduct_periods cp ON cp.academic_year = activity_term.academic_year AND cp.semester = activity_term.semester
      LEFT JOIN conduct_scores cs
        ON cs.user_id = ar.user_id
       AND cs.source_type = 'activity'
       AND cs.source_id = a.id
       AND cs.period_id = cp.id
      WHERE ${where.join(" AND ")}
      ORDER BY CAST(a.start_at AS DATETIME(3)) DESC, ar.id DESC
      `, [...values])) as Row[];

  const allItems: StudentConductScoreItem[] = rows.map((item) => ({
    id: Number(item.id),
    activityId: Number(item.activity_id),
    title: String(item.title ?? ""),
    startAt: String(item.start_at ?? ""),
    endAt: String(item.end_at ?? ""),
    registrationStatus: String(item.registration_status ?? ""),
    checkedInAt: item.checked_in_at ? String(item.checked_in_at) : null,
    conductScore: Number(item.conduct_score ?? 0),
    absencePenalty: Number(item.conduct_score ?? 0),
    scoreAdded: item.score_value !== null && item.score_value !== undefined,
    scoreValue:
      item.score_value !== null && item.score_value !== undefined
        ? Number(item.score_value)
        : null,
  }));
  let items = allItems;

  if (score === "added") {
    items = items.filter((item) => item.scoreAdded && item.scoreValue !== null && item.scoreValue >= 0);
  }

  if (score === "deducted") {
    items = items.filter((item) => item.scoreValue !== null && item.scoreValue < 0);
  }

  if (score === "pending" || score === "none") {
    items = items.filter(
      (item) => !item.scoreAdded
    );
  }

  const summary: StudentConductScoreSummaryData = {
    totalScore: scoreFrame.filter((item)=>item.parent_id===null).reduce((sum,item)=>sum+(effectiveScores.get(item.id)??0),0),
    activityCount: allItems.filter((item) => item.registrationStatus === "attended")
      .length,
    pendingActivityCount: allItems.filter(
      (item) => !item.scoreAdded
    ).length,
    addedScore: allItems.reduce((sum, item) => sum + Math.max(0, item.scoreValue ?? 0), 0),
    deductedScore: allItems.reduce((sum, item) => sum + Math.abs(Math.min(0, item.scoreValue ?? 0)), 0),
  };
  const frameItemById = new Map(scoreFrame.map((item) => [item.id, item]));
  const belongsToSubtree = (candidate: (typeof scoreFrame)[number] | undefined, ancestor: (typeof scoreFrame)[number]) => {
    let current = candidate;
    while (current) {
      if (current.id === ancestor.id) return true;
      current = current.parent_id ? frameItemById.get(current.parent_id) : undefined;
    }
    return false;
  };

  return (
    <main className="space-y-6">
      <StudentConductScoreHeader termSelect={<AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />} />

      <StudentConductScoreSummary summary={summary} />
      <StudentConductScoreSection
        frame={<div className="overflow-hidden rounded-none border border-slate-200">
          {scoreFrame.map((item,index) => {
            const effective=effectiveScores.get(item.id)??0;
            const nextItem=scoreFrame[index+1];
            const closingItems=scoreFrame.slice(0,index+1).filter((candidate)=>frameActivities.some((activity)=>activity.conduct_category_id===candidate.id)&&belongsToSubtree(item,candidate)&&!belongsToSubtree(nextItem,candidate)).sort((a,b)=>b.depth-a.depth);
            return <Fragment key={item.id}>
              <div className={`flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 ${item.depth===0 ? "bg-blue-800 text-white" : "bg-slate-50"}`} style={{paddingLeft:`${16+item.depth*24}px`}}>
                <div className={item.depth===0?"font-semibold text-white":"text-sm font-medium text-slate-800"}>{item.code} {item.name}</div>
                <div className={`shrink-0 font-semibold ${item.depth===0 ? "text-white" : "text-blue-700"}`}>{effective}/{item.score_max} điểm</div>
              </div>
              {closingItems.flatMap((owner)=>{
                const lastChildIndex=scoreFrame.filter((candidate)=>candidate.parent_id===owner.id).reduce((highest,candidate)=>{const numericCode=Number(candidate.code);return Number.isInteger(numericCode)&&numericCode>highest?numericCode:highest;},0);
                return frameActivities.filter((activity)=>activity.conduct_category_id===owner.id).map((activity,activityIndex)=><div key={activity.id} className="flex justify-between gap-3 border-b border-slate-100 px-4 py-2 text-sm text-slate-600" style={{paddingLeft:`${40+(owner.depth+1)*24}px`}}><span>{owner.code}.{lastChildIndex+activityIndex+1}. {activity.title} ({activity.conduct_score} điểm)</span><span className={activity.earned>0?"font-semibold text-emerald-700":activity.earned<0?"font-semibold text-rose-700":"text-slate-400"}>{activity.earned>0?`Đã cộng ${activity.earned}đ`:activity.earned<0?`Đã trừ ${Math.abs(activity.earned)}đ`:"Chưa ghi nhận"}</span></div>);
              })}
            </Fragment>;
          })}
          {!scoreFrame.length ? <div className="p-4 text-sm text-slate-500">Học kỳ chưa cấu hình khung điểm.</div> : null}
        </div>}
        history={<StudentConductScoreTable items={items} />}
      />
    </main>
  );
}
