import { notFound } from "next/navigation";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { getRequiredActiveTerm } from "@/server/academic-terms/getRequiredActiveTerm";
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

  const term = getRequiredActiveTerm();

  const { id } = await params;
  const templateId = Number(id);

  if (!Number.isFinite(templateId) || templateId <= 0) {
    notFound();
  }

  const db = getDb();

  const templateRow = db
    .prepare(
      `
      SELECT ct.id, ct.name, ct.description, ct.for_type,
        (SELECT COUNT(*) FROM events e WHERE e.criteria_template_id = ct.id) AS used_events
      FROM criteria_templates ct
      WHERE ct.id = ?
      LIMIT 1
      `
    )
    .get(templateId) as TemplateRow | undefined;

  if (!templateRow) {
    notFound();
  }

  const groupRows = db
    .prepare(
      `
      SELECT
        g.id,
        g.code,
        g.title,
        g.description,
        g.min_required,
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
      `
    )
    .all(templateId) as GroupRow[];

  const criteriaRows = db
    .prepare(
      `
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
      `
    )
    .all(templateId) as CriteriaRow[];

  const activityRuleRows = db
    .prepare(
      `
      SELECT
        r.id,
        r.criteria_code,
        r.activity_id,
        a.title AS activity_title
      FROM criteria_activity_rules r
      INNER JOIN activities a ON a.id = r.activity_id
      WHERE r.template_id = ?
      ORDER BY a.title ASC
      `
    )
    .all(templateId) as ActivityRuleRow[];

  const conductRuleRows = db
    .prepare(
      `
      SELECT id, criteria_code, min_score, period_scope
      FROM criteria_conduct_rules
      WHERE template_id = ?
      `
    )
    .all(templateId) as ConductRuleRow[];

  const activityRows = db
    .prepare(
      `
      SELECT id, title
      FROM activities
      WHERE status = 'published'
        AND term_id = ?
      ORDER BY datetime(start_at) DESC, id DESC
      `
    )
    .all(term.id) as ActivityRow[];

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
    sortOrder: Number(item.sort_order ?? 0),
    criteriaCount: Number(item.criteria_count ?? 0),
  }));

  const activities: CriteriaTemplateActivityOption[] = activityRows.map((item) => ({
    id: Number(item.id),
    title: String(item.title ?? ""),
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

      <section className="rounded-2xl bg-blue-50 px-5 py-4 text-sm text-blue-800 ring-1 ring-blue-100">
        Hoạt động để gắn tiêu chí đang lấy theo học kỳ hiện hành:{" "}
        <span className="font-semibold">{term.name}</span>
      </section>

      {Number(templateRow.used_events ?? 0) > 0 ? (
        <>
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-amber-50 px-5 py-4 ring-1 ring-amber-200">
            <div>
              <h2 className="font-semibold text-amber-900">Cấu hình đã được khóa</h2>
              <p className="mt-1 text-sm text-amber-800">
                Bộ tiêu chuẩn đang được {templateRow.used_events} đợt xét sử dụng. Hãy tạo bản sao nếu cần thay đổi cấu hình.
              </p>
            </div>
            <CloneTemplateForConfigurationButton template={template} />
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Cấu hình hiện tại</h2>
            <div className="mt-5 space-y-4">
              {groups.map((group) => (
                <div key={group.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="font-semibold text-slate-900">{group.code}. {group.title}</div>
                  <div className="mt-3 space-y-2">
                    {criteria.filter((item) => item.groupCode === group.code).map((item) => (
                      <div key={item.id} className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        <span className="font-semibold">{item.code}</span> — {item.title}
                        <span className="ml-2 text-slate-500">({item.scoreMax} điểm{item.isRequired ? ", bắt buộc" : ""})</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
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
