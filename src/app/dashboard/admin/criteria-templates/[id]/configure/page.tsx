import CriteriaDefinitionTable from "@/components/shared/criteria/CriteriaDefinitionTable";
import { notFound } from "next/navigation";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import CriteriaTemplateConfigureHeader from "@/components/admin/criteria-templates/CriteriaTemplateConfigureHeader";
import CriteriaTemplateConfigureClient from "@/components/admin/criteria-templates/CriteriaTemplateConfigureClient";
import CloneTemplateForConfigurationButton from "@/components/admin/criteria-templates/CloneTemplateForConfigurationButton";
import CriteriaTemplateEditControls from "@/components/admin/criteria-templates/CriteriaTemplateEditControls";
import CriteriaTemplateEditNavigationGuard from "@/components/admin/criteria-templates/CriteriaTemplateEditNavigationGuard";
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
  required_count: number;
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  await requireAdminContext();

  const { id } = await params;
  const db = getDatabase();
  // Configure has a suffix, so resolve the public route against its exact
  // internal path as a defensive fallback for a freshly-created template.
  const resolvedId = await db.resolveRouteRecordId(id);
  const publicRouteId = resolvedId || (await db.first<{ id: number }>(`
    SELECT ct.id
    FROM public_page_routes pr
    INNER JOIN criteria_templates ct
      ON pr.internal_path = CONCAT('/dashboard/admin/criteria-templates/', ct.id, '/configure')
    WHERE pr.token = ?
    LIMIT 1
  `, [id]))?.id || 0;
  const templateId = Number(publicRouteId);

  if (!Number.isFinite(templateId) || templateId <= 0) {
    notFound();
  }

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

  const draft = Number(templateRow.used_events) > 0
    ? await db.first<{draft_template_id:number;status:string}>("SELECT draft_template_id,status FROM criteria_template_edit_drafts WHERE original_template_id=?",[templateId])
    : undefined;
  const isEditing = (await searchParams).mode === "edit" && draft?.status === "editing";
  const configurationId = isEditing ? draft.draft_template_id : templateId;
  const affectedEvents = Number(templateRow.used_events) > 0
    ? await db.rows<{id:number;title:string}>("SELECT id,title FROM events WHERE criteria_template_id=? ORDER BY title",[templateId])
    : [];

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
      `, [configurationId])) as GroupRow[];

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
        required_count,
        sort_order
FROM criteria_template_items
      WHERE template_id = ?
      ORDER BY sort_order ASC, code ASC
      `, [configurationId])) as CriteriaRow[];

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
      `, [configurationId])) as ActivityRuleRow[];

  const conductRuleRows = (await db.rows(`
      SELECT id, criteria_code, min_score, period_scope
      FROM criteria_conduct_rules
      WHERE template_id = ?
      `, [configurationId])) as ConductRuleRow[];

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
    requiredCount: Math.max(1, Number(item.required_count ?? 1)),
    sortOrder: Number(item.sort_order ?? 0),
    activityRules: activityRulesByCriteria.get(String(item.code ?? "")) ?? [],
    conductRule: conductRuleByCriteria.get(String(item.code ?? "")) ?? null,
  }));

  return (
    <main className="space-y-6">
      <CriteriaTemplateConfigureHeader template={template} />

      {Number(templateRow.used_events ?? 0) > 0 ? (
        <>
          {isEditing ? <>
            <CriteriaTemplateEditNavigationGuard templateId={template.id} />
            <CriteriaTemplateConfigureClient
              templateId={configurationId} templateForType={template.forType}
              groups={groups} criteria={criteria} activities={activities}
              saveControl={<CriteriaTemplateEditControls templateId={template.id} events={affectedEvents} draftStatus="editing"/>}
            />
          </> : <>
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-5 py-4 shadow-md ring-1 ring-amber-200 shadow-slate-200/60">
              <p className="text-sm font-medium text-amber-900">
                {draft?.status === "processing" ? "Đang cập nhật hồ sơ và báo cáo theo bộ tiêu chuẩn mới." : `Bộ tiêu chuẩn đang được ${templateRow.used_events} đợt xét sử dụng.`}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {draft?.status !== "processing" ? <CloneTemplateForConfigurationButton template={template} /> : null}
                <CriteriaTemplateEditControls templateId={template.id} events={affectedEvents} draftStatus={draft?.status === "processing" ? "processing" : null}/>
              </div>
            </section>
            <CriteriaDefinitionTable templateId={template.id} title="Cấu trúc tiêu chuẩn / tiêu chí"/>
          </>}
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
