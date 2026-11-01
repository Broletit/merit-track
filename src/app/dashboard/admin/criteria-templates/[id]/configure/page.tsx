import CriteriaDefinitionTable from "@/components/shared/criteria/CriteriaDefinitionTable";
import { notFound } from "next/navigation";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import CriteriaTemplateConfigureHeader from "@/components/admin/criteria-templates/CriteriaTemplateConfigureHeader";
import CriteriaTemplateConfigureClient from "@/components/admin/criteria-templates/CriteriaTemplateConfigureClient";
import CloneTemplateForConfigurationButton from "@/components/admin/criteria-templates/CloneTemplateForConfigurationButton";
import type {
  AdminCriteriaTemplateDetail,
  CriteriaTemplateActivityOption,
  CriteriaTemplateActivityRule,
  CriteriaTemplateConductRule,
  CriteriaTemplateCriteriaItem,
  CriteriaTemplateGroupItem,
} from "@/components/admin/criteria-templates/types";

type TemplateRow = {
  id: number;
  name: string;
  description: string | null;
  for_type: string;
  used_events: number;
};

type GroupRow = {
  id: number;
  code: string;
  title: string;
  description: string | null;
  min_required: number;
  score_max: number;
  sort_order: number;
  criteria_count: number;
};

type CriteriaRow = {
  id: number;
  group_code: string | null;
  code: string;
  title: string;
  description: string | null;
  score_max: number;
  evidence_type: string;
  is_required: number;
  sort_order: number;
};

type ActivityRuleRow = {
  id: number;
  criteria_code: string;
  activity_id: number;
  activity_title: string;
};

type ConductRuleRow = {
  id: number;
  criteria_code: string;
  min_score: number;
  period_scope: string;
};

type ActivityRow = {
  id: number;
  title: string;
};

export default async function AdminConfigureCriteriaTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminContext();

  const { id } = await params;
  const templateId = await getDatabase().resolveRouteRecordId(id);

  if (!Number.isFinite(templateId) || templateId <= 0) {
    notFound();
  }

  const db = getDatabase();

  const templateRow = (await db.first(`
      SELECT ct.id, ct.name, ct.description, ct.for_type,
        (SELECT COUNT(*) FROM events e WHERE e.criteria_template_id = ct.id) AS used_events
      FROM criteria_templates ct
      WHERE ct.id = ?
      LIMIT 1
      `, [templateId])) as TemplateRow | undefined;

  if (!templateRow) {
    notFound();
  }

  const groupRows = (await db.rows(`
      SELECT
        g.id,
        g.code,
        g.title,
        g.description,
        g.min_required,
        g.score_max,
        g.sort_order,
        (
          SELECT COUNT(*)
          FROM criteria_template_items i
          WHERE i.template_id = g.template_id
            AND i.group_code = g.code
        ) AS criteria_count
      FROM criteria_template_groups g
      WHERE g.template_id = ?
      ORDER BY g.sort_order ASC, g.code ASC
      `, [templateId])) as GroupRow[];

  const criteriaRows = (await db.rows(`
      SELECT
        id,
        group_code,
        code,
        title,
        description,
        score_max,
        evidence_type,
        is_required,
        sort_order
FROM criteria_template_items
      WHERE template_id = ?
      ORDER BY sort_order ASC, code ASC
      `, [templateId])) as CriteriaRow[];

  const activityRuleRows = (await db.rows(`
      SELECT
        r.id,
        r.criteria_code,
        r.activity_id,
        a.title AS activity_title
      FROM criteria_activity_rules r
      INNER JOIN activities a ON a.id = r.activity_id
      WHERE r.template_id = ?
      ORDER BY a.title ASC
      `, [templateId])) as ActivityRuleRow[];

  const conductRuleRows = (await db.rows(`
      SELECT id, criteria_code, min_score, period_scope
      FROM criteria_conduct_rules
      WHERE template_id = ?
      `, [templateId])) as ConductRuleRow[];

  const activityRows = (await db.rows(`
      SELECT a.id, a.title, a.term_id, at.name AS term_name, at.is_active
      FROM activities a
      INNER JOIN academic_terms at ON at.id = a.term_id
      WHERE a.status = 'published'
      ORDER BY at.is_active DESC, CAST(at.start_at AS DATETIME(3)) DESC, CAST(a.start_at AS DATETIME(3)) DESC, a.id DESC
      `, [])) as Array<ActivityRow & { term_id:number; term_name:string; is_active:number }>;

  const template: AdminCriteriaTemplateDetail = {
    id: Number(templateRow.id),
    name: String(templateRow.name ?? ""),
    description: templateRow.description ? String(templateRow.description) : null,
    forType: String(templateRow.for_type ?? ""),
  };

  const groups: CriteriaTemplateGroupItem[] = groupRows.map((item) => ({
    id: Number(item.id),
    code: String(item.code ?? ""),
    title: String(item.title ?? ""),
    description: item.description ? String(item.description) : null,
    minRequired: Number(item.min_required ?? 0),
    scoreMax: Number(item.score_max ?? 0),
    sortOrder: Number(item.sort_order ?? 0),
    criteriaCount: Number(item.criteria_count ?? 0),
  }));

  const activities: CriteriaTemplateActivityOption[] = activityRows.map((item) => ({
    id: Number(item.id),
    title: String(item.title ?? ""),
    termId: Number(item.term_id),
    termName: String(item.term_name ?? ""),
    isCurrentTerm: Number(item.is_active) === 1,
  }));

  const activityRulesByCriteria = new Map<string, CriteriaTemplateActivityRule[]>();

  for (const row of activityRuleRows) {
    const key = String(row.criteria_code ?? "");
    const list = activityRulesByCriteria.get(key) ?? [];

    list.push({
      id: Number(row.id),
      activityId: Number(row.activity_id),
      activityTitle: String(row.activity_title ?? ""),
    });

    activityRulesByCriteria.set(key, list);
  }

  const conductRuleByCriteria = new Map<string, CriteriaTemplateConductRule>();

  for (const row of conductRuleRows) {
    conductRuleByCriteria.set(String(row.criteria_code ?? ""), {
      id: Number(row.id),
      minScore: Number(row.min_score ?? 0),
      periodScope: String(row.period_scope ?? "current"),
    });
  }

  const criteria: CriteriaTemplateCriteriaItem[] = criteriaRows.map((item) => ({
    id: Number(item.id),
    groupCode: item.group_code ? String(item.group_code) : null,
    code: String(item.code ?? ""),
    title: String(item.title ?? ""),
    description: item.description ? String(item.description) : null,
    scoreMax: Number(item.score_max ?? 0),
    evidenceType: String(item.evidence_type ?? "manual"),
isRequired: Number(item.is_required ?? 0) === 1,
    sortOrder: Number(item.sort_order ?? 0),
    activityRules: activityRulesByCriteria.get(String(item.code ?? "")) ?? [],
    conductRule: conductRuleByCriteria.get(String(item.code ?? "")) ?? null,
  }));

  return (
    <main className="space-y-6">
      <CriteriaTemplateConfigureHeader template={template} />

      {Number(templateRow.used_events ?? 0) > 0 ? (
        <>
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-amber-50 px-5 py-4 ring-1 ring-amber-200 shadow-md shadow-slate-200/60">
            <div>
              <h2 className="font-semibold text-amber-900">Cấu hình đã được khóa</h2>
              <p className="mt-1 text-sm text-amber-800">
                Bộ tiêu chuẩn đang được {templateRow.used_events} đợt xét sử dụng. Hãy tạo bản sao nếu cần thay đổi cấu hình.
              </p>
            </div>
            <CloneTemplateForConfigurationButton template={template} />
          </section>

          <CriteriaDefinitionTable templateId={template.id} title="Cấu hình hiện tại"/>
        </>
      ) : (
        <CriteriaTemplateConfigureClient
          templateId={template.id}
          templateForType={template.forType}
          groups={groups}
          criteria={criteria}
          activities={activities}
        />
      )}
    </main>
  );
}
