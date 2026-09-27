import { requireStudentContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import StudentConductScoreHeader from "@/components/student/conduct-score/StudentConductScoreHeader";
import StudentConductScoreSummary from "@/components/student/conduct-score/StudentConductScoreSummary";
import StudentConductScoreTable from "@/components/student/conduct-score/StudentConductScoreTable";
import type {
  StudentConductScoreItem,
  StudentConductScoreSummaryData,
} from "@/components/student/conduct-score/types";
import {
  getAcademicTermForView,
  getAcademicTermsForSelect,
} from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{
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
  score_value: number | null;
};

export default async function StudentConductScorePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireStudentContext();
  const params = await searchParams;
  const db = getDb();

  const terms = getAcademicTermsForSelect();
  const selectedTerm = getAcademicTermForView(params.termId);
  const scoreFrame = db.prepare(`WITH RECURSIVE tree AS (
    SELECT id,parent_id,code,name,score_max,sort_order,0 depth,printf('%08d',sort_order)||code path FROM conduct_score_categories WHERE term_id=? AND parent_id IS NULL
    UNION ALL SELECT c.id,c.parent_id,c.code,c.name,c.score_max,c.sort_order,tree.depth+1,tree.path||'/'||printf('%08d',c.sort_order)||c.code FROM conduct_score_categories c JOIN tree ON c.parent_id=tree.id)
    SELECT tree.id,tree.parent_id,tree.code,tree.name,tree.score_max,tree.depth,tree.path,
      COALESCE(SUM(CASE WHEN cs.user_id=? THEN cs.score_value ELSE 0 END),0) AS raw_score
    FROM tree
    LEFT JOIN activities a ON a.conduct_category_id=tree.id
    LEFT JOIN conduct_scores cs ON cs.source_type='activity' AND cs.source_id=a.id
    GROUP BY tree.id ORDER BY tree.path
  `).all(selectedTerm.id,user.id) as Array<{id:number;parent_id:number|null;code:string;name:string;score_max:number;raw_score:number;depth:number}>;
  const frameActivities = db.prepare(`SELECT a.id,a.title,a.conduct_category_id,a.conduct_score,COALESCE(cs.score_value,0) earned FROM activities a LEFT JOIN conduct_scores cs ON cs.source_type='activity' AND cs.source_id=a.id AND cs.user_id=? WHERE a.term_id=? AND a.conduct_category_id IS NOT NULL AND a.status='published' AND a.audience_type='student' ORDER BY datetime(a.created_at),a.id`).all(user.id,selectedTerm.id) as Array<{id:number;title:string;conduct_category_id:number;conduct_score:number;earned:number}>;
  const effectiveScores=new Map<number,number>();
  [...scoreFrame].sort((a,b)=>b.depth-a.depth).forEach((item)=>{
    const direct=frameActivities.filter((activity)=>activity.conduct_category_id===item.id).reduce((sum,activity)=>sum+Number(activity.earned),0);
    const children=scoreFrame.filter((child)=>child.parent_id===item.id).reduce((sum,child)=>sum+(effectiveScores.get(child.id)??0),0);
    effectiveScores.set(item.id,Math.min(Number(item.score_max),direct+children));
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

  if (keyword) {
    where.push(`a.title LIKE ?`);
    values.push(`%${keyword}%`);
  }

  if (status) {
    where.push(`ar.status = ?`);
    values.push(status);
  }

  const rows = db
    .prepare(
      `
      SELECT
        ar.id,
        a.id AS activity_id,
        a.title,
        a.start_at,
        a.end_at,
        ar.status AS registration_status,
        ar.checked_in_at,
        a.conduct_score,
        cs.score_value
      FROM activity_registrations ar
      INNER JOIN activities a ON a.id = ar.activity_id
      LEFT JOIN conduct_periods cp ON cp.is_active = 1
      LEFT JOIN conduct_scores cs
        ON cs.user_id = ar.user_id
       AND cs.source_type = 'activity'
       AND cs.source_id = a.id
       AND cs.period_id = cp.id
      WHERE ${where.join(" AND ")}
      ORDER BY datetime(a.start_at) DESC, ar.id DESC
      `
    )
    .all(...values) as Row[];

  let items: StudentConductScoreItem[] = rows.map((item) => ({
    id: Number(item.id),
    activityId: Number(item.activity_id),
    title: String(item.title ?? ""),
    startAt: String(item.start_at ?? ""),
    endAt: String(item.end_at ?? ""),
    registrationStatus: String(item.registration_status ?? ""),
    checkedInAt: item.checked_in_at ? String(item.checked_in_at) : null,
    conductScore: Number(item.conduct_score ?? 0),
    scoreAdded: item.score_value !== null && item.score_value !== undefined,
    scoreValue:
      item.score_value !== null && item.score_value !== undefined
        ? Number(item.score_value)
        : null,
  }));

  if (score === "added") {
    items = items.filter((item) => item.scoreAdded);
  }

  if (score === "pending") {
    items = items.filter(
      (item) => item.registrationStatus === "attended" && !item.scoreAdded
    );
  }

  if (score === "none") {
    items = items.filter((item) => !item.scoreAdded);
  }

  const summary: StudentConductScoreSummaryData = {
    totalScore: scoreFrame.filter((item)=>item.parent_id===null).reduce((sum,item)=>sum+(effectiveScores.get(item.id)??0),0),
    activityCount: items.filter((item) => item.registrationStatus === "attended")
      .length,
    pendingActivityCount: items.filter(
      (item) => item.registrationStatus === "attended" && !item.scoreAdded
    ).length,
  };

  return (
    <main className="space-y-6">
      <StudentConductScoreHeader termSelect={<AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />} />

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-lg font-semibold text-slate-900">Khung điểm rèn luyện</h2>
        <p className="mt-1 text-sm text-slate-500">Điểm thực tế của mỗi mục không vượt quá mức tối đa.</p>
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          {scoreFrame.map((item) => { const effective=effectiveScores.get(item.id)??0; const activities=frameActivities.filter((activity)=>activity.conduct_category_id===item.id); return <div key={item.id} className="border-b border-slate-100 last:border-0"><div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3" style={{paddingLeft:`${16+item.depth*24}px`}}><div className={item.depth===0?"font-semibold text-slate-900":"text-sm font-medium text-slate-800"}>{item.code}. {item.name}</div><div className="shrink-0 font-semibold text-blue-700">{effective}/{item.score_max} điểm</div></div>{activities.map((activity,index)=><div key={activity.id} className="flex justify-between gap-3 px-4 py-2 text-sm text-slate-600" style={{paddingLeft:`${40+item.depth*24}px`}}><span>{item.code}.{index+1}. {activity.title} ({activity.conduct_score}đ)</span><span className={activity.earned>0?"font-semibold text-emerald-700":"text-slate-400"}>{activity.earned>0?`Đã nhận ${activity.earned}đ`:"Chưa ghi nhận"}</span></div>)}</div>; })}
          {!scoreFrame.length ? <div className="text-sm text-slate-500">Học kỳ chưa cấu hình khung điểm.</div> : null}
        </div>
      </section>

      <StudentConductScoreSummary summary={summary} />
      <StudentConductScoreTable items={items} />
    </main>
  );
}
