import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { getAcademicTermForView, getAcademicTermsForSelect } from "@/server/academic-terms/getAcademicTermForView";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import ConductCategoryManager from "@/components/admin/activities/ConductCategoryManager";

type SearchParams = Promise<{ termId?: string }>;

export default async function ConductScoreFramePage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminContext();
  const params = await searchParams;
  const term = (await getAcademicTermForView(params.termId));
  const terms = (await getAcademicTermsForSelect());
  const db = getDatabase();
  const rows = (await db.rows(`WITH RECURSIVE tree AS (SELECT id,parent_id,code,name,score_max,sort_order,0 depth,CAST(CONCAT(LPAD(CAST(sort_order AS CHAR), 8, '0'), code) AS CHAR(4096)) path FROM conduct_score_categories WHERE term_id=? AND parent_id IS NULL UNION ALL SELECT c.id,c.parent_id,c.code,c.name,c.score_max,c.sort_order,tree.depth+1,CONCAT(CONCAT(CONCAT(tree.path, '/'), LPAD(CAST(c.sort_order AS CHAR), 8, '0')), c.code) FROM conduct_score_categories c JOIN tree ON c.parent_id=tree.id) SELECT * FROM tree ORDER BY path`, [term.id])) as Array<{id:number;parent_id:number|null;code:string;name:string;score_max:number;depth:number}>;
  const activities=(await db.rows(`SELECT id,title,conduct_category_id,conduct_score FROM activities WHERE term_id=? AND conduct_category_id IS NOT NULL AND status='published' AND audience_type='student' ORDER BY CAST(created_at AS DATETIME(3)),id`, [term.id])) as Array<{id:number;title:string;conduct_category_id:number;conduct_score:number}>;
  const items=rows.map((row)=>{
    const lastChildIndex=rows
      .filter((candidate)=>candidate.parent_id===row.id)
      .reduce((highest,candidate)=>{
        const numericCode=Number(candidate.code);
        return Number.isInteger(numericCode)&&numericCode>highest?numericCode:highest;
      },0);
    return {id:row.id,parentId:row.parent_id,code:row.code,name:row.name,scoreMax:Number(row.score_max),depth:row.depth,activities:activities.filter((activity)=>activity.conduct_category_id===row.id).map((activity,index)=>({id:activity.id,title:activity.title,score:Number(activity.conduct_score),order:lastChildIndex+index+1}))};
  });
  return <main className="space-y-6">
    <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)] shadow-slate-200/60">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><h1 className="text-2xl font-semibold">Khung tiêu chuẩn ĐRL</h1><AcademicTermSelect variant="header" terms={terms} selectedTermId={term.id}/></div>
    </section>
    <ConductCategoryManager termId={term.id} items={items} canManage={term.isActive}/>
  </main>;
}
