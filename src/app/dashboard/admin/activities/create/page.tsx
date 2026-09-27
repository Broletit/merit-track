import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import ActivityCreateForm from "@/components/admin/activities/ActivityCreateForm";
import ActivityFormHeader from "@/components/admin/activities/ActivityFormHeader";
import type {
  ActivityClassOption,
  ActivityCriteriaOption,
} from "@/components/admin/activities/types";
import { getRequiredActiveTerm } from "@/server/academic-terms/getRequiredActiveTerm";

type ClassRow = {
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

export default async function AdminCreateActivityPage() {
  await requireAdminContext();
  const db = getDb();
  const activeTerm = getRequiredActiveTerm();
  const categories = db.prepare(`WITH RECURSIVE tree AS (SELECT id,parent_id,code,name,score_max,sort_order,0 depth,printf('%08d',sort_order)||code path FROM conduct_score_categories WHERE term_id=? AND parent_id IS NULL UNION ALL SELECT c.id,c.parent_id,c.code,c.name,c.score_max,c.sort_order,tree.depth+1,tree.path||'/'||printf('%08d',c.sort_order)||c.code FROM conduct_score_categories c JOIN tree ON c.parent_id=tree.id) SELECT * FROM tree ORDER BY path`).all(activeTerm.id) as Array<{id:number;parent_id:number|null;code:string;name:string;score_max:number;depth:number}>;

  const classRows = db
    .prepare(
      `
      SELECT id, code, name
      FROM classes
      ORDER BY name ASC, id ASC
      `
    )
    .all() as ClassRow[];

  const criteriaRows = db
    .prepare(
      `
      SELECT
        cti.template_id,
        ct.name AS template_name,
        cti.group_code,
        cti.code AS criteria_code,
        cti.title
      FROM criteria_template_items cti
      INNER JOIN criteria_templates ct ON ct.id = cti.template_id
      ORDER BY ct.name ASC, cti.group_code ASC, cti.sort_order ASC, cti.id ASC
      `
    )
    .all() as CriteriaRow[];

  const classes: ActivityClassOption[] = classRows.map((item) => ({
    id: Number(item.id),
    code: String(item.code ?? ""),
    name: String(item.name ?? ""),
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
      <ActivityFormHeader />
      <ActivityCreateForm classes={classes} criteriaOptions={criteriaOptions} categories={categories.map((item) => ({ id: item.id, parentId:item.parent_id, depth:item.depth, code: item.code, name: item.name, scoreMax: Number(item.score_max) }))} />
    </main>
  );
}
