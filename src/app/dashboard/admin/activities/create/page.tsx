import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import ActivityCreateForm from "@/components/admin/activities/ActivityCreateForm";
import ActivityFormHeader from "@/components/admin/activities/ActivityFormHeader";
import type {
  ActivityClassOption,
  ActivityCriteriaOption,
} from "@/components/admin/activities/types";
import { getRequiredActiveTerm } from "@/server/academic-terms/getRequiredActiveTerm";
import { getAcademicTermsForSelect } from "@/server/academic-terms/getAcademicTermForView";

type ClassRow = {
  cohort: number | null;
  id: number;
  code: string;
  name: string;
};

type CriteriaRow = {
  template_id: number;
  template_name: string;
  group_code: string;
  criteria_code: string;
  title: string;
};

export default async function AdminCreateActivityPage({ searchParams }: { searchParams: Promise<{ historical?: string }> }) {
  await requireAdminContext();
  const historical = (await searchParams).historical === "1";
  const db = getDatabase();
  const terms = historical ? await getAcademicTermsForSelect() : [];
  const activeTerm = historical ? terms.find((term) => term.isActive) ?? terms[0] : await getRequiredActiveTerm();
  if (!activeTerm) throw new Error("Chưa có học kỳ trong hệ thống. Vui lòng tạo học kỳ trước.");
  const categories = (await db.rows(`WITH RECURSIVE tree AS (SELECT id,parent_id,term_id,code,name,score_max,sort_order,0 depth,CAST(CONCAT(LPAD(CAST(sort_order AS CHAR), 8, '0'), code) AS CHAR(4096)) path FROM conduct_score_categories WHERE parent_id IS NULL ${historical ? "" : "AND term_id=?"} UNION ALL SELECT c.id,c.parent_id,c.term_id,c.code,c.name,c.score_max,c.sort_order,tree.depth+1,CONCAT(CONCAT(CONCAT(tree.path, '/'), LPAD(CAST(c.sort_order AS CHAR), 8, '0')), c.code) FROM conduct_score_categories c JOIN tree ON c.parent_id=tree.id) SELECT * FROM tree ORDER BY term_id DESC,path`, historical ? [] : [activeTerm.id])) as Array<{id:number;parent_id:number|null;term_id:number;code:string;name:string;score_max:number;depth:number}>;

  const classRows = (await db.rows(`
      SELECT id, code, name, cohort
      FROM classes
      ORDER BY name ASC, id ASC
      `, [])) as ClassRow[];

  const criteriaRows = (await db.rows(`
      SELECT
        cti.template_id,
        ct.name AS template_name,
        cti.group_code,
        cti.code AS criteria_code,
        cti.title
      FROM criteria_template_items cti
      INNER JOIN criteria_templates ct ON ct.id = cti.template_id
      ORDER BY ct.name ASC, cti.group_code ASC, cti.sort_order ASC, cti.id ASC
      `, [])) as CriteriaRow[];

  const classes: ActivityClassOption[] = classRows.map((item) => ({
    id: Number(item.id),
    code: String(item.code ?? ""),
    name: String(item.name ?? ""),
    cohort: item.cohort,
  }));

  const criteriaOptions: ActivityCriteriaOption[] = criteriaRows.map((item) => ({
    templateId: Number(item.template_id),
    templateName: String(item.template_name ?? ""),
    groupCode: String(item.group_code ?? ""),
    criteriaCode: String(item.criteria_code ?? ""),
    title: String(item.title ?? ""),
  }));

  return (
    <main className="space-y-6">
      <ActivityFormHeader title={historical ? "Nhập hoạt động quá khứ" : "Tạo hoạt động"} />
      {historical ? <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">Chức năng tạm để nhập dữ liệu lịch sử. Sau khi tạo, vào chi tiết hoạt động để nhập file danh sách tham gia.</section> : null}
      <ActivityCreateForm historical={historical} terms={terms} defaultTermId={activeTerm.id} classes={classes} criteriaOptions={criteriaOptions} categories={categories.map((item) => ({ id: item.id, termId:item.term_id, parentId:item.parent_id, depth:item.depth, code: item.code, name: item.name, scoreMax: Number(item.score_max), hasChildren: categories.some((candidate)=>candidate.parent_id===item.id) }))} />
    </main>
  );
}
