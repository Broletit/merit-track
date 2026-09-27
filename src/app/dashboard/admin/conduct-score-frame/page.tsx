import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { getAcademicTermForView, getAcademicTermsForSelect } from "@/server/academic-terms/getAcademicTermForView";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import ConductCategoryManager from "@/components/admin/activities/ConductCategoryManager";

type SearchParams = Promise<{ termId?: string }>;

export default async function ConductScoreFramePage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminContext();
  const params = await searchParams;
  const term = getAcademicTermForView(params.termId);
  const terms = getAcademicTermsForSelect();
  const db = getDb();
  const rows = db.prepare(`WITH RECURSIVE tree AS (SELECT id,parent_id,code,name,score_max,sort_order,0 depth,printf('%08d',sort_order)||code path FROM conduct_score_categories WHERE term_id=? AND parent_id IS NULL UNION ALL SELECT c.id,c.parent_id,c.code,c.name,c.score_max,c.sort_order,tree.depth+1,tree.path||'/'||printf('%08d',c.sort_order)||c.code FROM conduct_score_categories c JOIN tree ON c.parent_id=tree.id) SELECT * FROM tree ORDER BY path`).all(term.id) as Array<{id:number;parent_id:number|null;code:string;name:string;score_max:number;depth:number}>;
  const activities=db.prepare(`SELECT id,title,conduct_category_id,conduct_score FROM activities WHERE term_id=? AND conduct_category_id IS NOT NULL AND status='published' AND audience_type='student' ORDER BY datetime(created_at),id`).all(term.id) as Array<{id:number;title:string;conduct_category_id:number;conduct_score:number}>;
  const items=rows.map((row)=>({id:row.id,parentId:row.parent_id,code:row.code,name:row.name,scoreMax:Number(row.score_max),depth:row.depth,activities:activities.filter((activity)=>activity.conduct_category_id===row.id).map((activity,index)=>({id:activity.id,title:activity.title,score:Number(activity.conduct_score),order:index+1}))}));
  return <main className="space-y-6">
    <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><h1 className="text-2xl font-semibold">Khung tiêu chuẩn ĐRL</h1><AcademicTermSelect variant="header" terms={terms} selectedTermId={term.id}/></div>
    </section>
    <ConductCategoryManager termId={term.id} items={items} canManage={term.isActive}/>
  </main>;
}
