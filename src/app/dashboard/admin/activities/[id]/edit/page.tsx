import { notFound, redirect } from "next/navigation";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import ActivityEditForm from "@/components/admin/activities/ActivityEditForm";
import ActivityFormHeader from "@/components/admin/activities/ActivityFormHeader";
import type {
  ActivityClassOption,
  ActivityCriteriaOption,
  ActivityEditDetail,
  ConductCategoryOption,
} from "@/components/admin/activities/types";

type ActivityRow = {
  max_registrations: number | null;
  id: number;
  title: string;
  description: string;
  audience_type: string;
  status: string;
  start_at: string;
  end_at: string;
  registration_start_at: string;
  registration_end_at: string;
  conduct_score: number;
  absence_penalty: number;
  conduct_category_id: number | null;
  term_id: number;
  qr_checkin_enabled: number;
  attended_count: number;
  participant_count: number;
  has_started: number;
  term_is_active: number;
};

type ClassRow = {
  cohort: number | null; id: number; code: string; name: string };

type CriteriaRow = {
  template_id: number;
  template_name: string;
  group_code: string;
  criteria_code: string;
  title: string;
};

type ScopeRow = { class_id: number };

type RuleRow = {
  template_id: number;
  criteria_code: string;
};

export default async function AdminEditActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminContext();

  const { id } = await params;
  const activityId = await getDatabase().resolveRouteRecordId(id);

  if (!Number.isFinite(activityId)) notFound();

  const db = getDatabase();

  const activityRow = (await db.first(`
      SELECT
        a.id,
        a.max_registrations,
        a.title,
        a.description,
        a.audience_type,
        a.status,
        a.start_at,
        a.end_at,
        a.registration_start_at,
        a.registration_end_at,
        a.conduct_score,
        a.absence_penalty,
        a.conduct_category_id,
        a.term_id,
        a.qr_checkin_enabled,
        at.is_active AS term_is_active,
        (
          SELECT COUNT(*)
          FROM activity_registrations ar
          WHERE ar.activity_id = a.id
            AND ar.status = 'attended'
        ) AS attended_count
        ,(
          SELECT COUNT(*)
          FROM activity_registrations ar
          WHERE ar.activity_id = a.id
            AND ar.status != 'cancelled'
        ) AS participant_count
        ,CASE WHEN CAST(a.start_at AS DATETIME(3)) <= CURRENT_TIMESTAMP(3) THEN 1 ELSE 0 END AS has_started
      FROM activities a
      INNER JOIN academic_terms at ON at.id = a.term_id
      WHERE a.id = ?
      LIMIT 1
      `, [activityId])) as ActivityRow | undefined;

  if (!activityRow) notFound();
  if (!activityRow.term_is_active) notFound();
  if (activityRow.status === "closed") {
    redirect(`/dashboard/admin/activities/${activityId}`);
  }

  const participantCount = Number(activityRow.participant_count ?? 0);
  const attendedCount = Number(activityRow.attended_count ?? 0);
  const editMode: ActivityEditDetail["editMode"] =
    activityRow.status === "draft" && participantCount === 0
      ? "full"
      : participantCount === 0 && !activityRow.has_started
      ? "full"
      : !activityRow.has_started && attendedCount === 0
        ? "limited"
        : "extension";

  const classRows = (await db.rows(`SELECT id, code, name, cohort FROM classes ORDER BY name ASC, id ASC`, [])) as ClassRow[];

  const categoryRows = (await db.rows(`
    WITH RECURSIVE tree AS (
      SELECT id, parent_id, code, name, score_max, sort_order, 0 AS depth,
        CAST(CONCAT(LPAD(CAST(sort_order AS CHAR), 8, '0'), code) AS CHAR(4096)) AS path
      FROM conduct_score_categories
      WHERE term_id = ? AND parent_id IS NULL
      UNION ALL
      SELECT c.id, c.parent_id, c.code, c.name, c.score_max, c.sort_order,
        tree.depth + 1,
        CONCAT(CONCAT(CONCAT(tree.path, '/'), LPAD(CAST(c.sort_order AS CHAR), 8, '0')), c.code)
      FROM conduct_score_categories c
      INNER JOIN tree ON c.parent_id = tree.id
    )
    SELECT id, parent_id, code, name, score_max, depth
    FROM tree
    ORDER BY path
  `, [activityRow.term_id])) as Array<{
    id: number; parent_id: number | null; code: string; name: string;
    score_max: number; depth: number;
  }>;

  const categories: ConductCategoryOption[] = categoryRows.map((item) => ({
    id: Number(item.id),
    parentId: item.parent_id == null ? null : Number(item.parent_id),
    code: String(item.code),
    name: String(item.name),
    scoreMax: Number(item.score_max),
    depth: Number(item.depth),
    hasChildren: categoryRows.some((candidate) => candidate.parent_id === item.id),
  }));

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

  const scopeRows = (await db.rows(`SELECT class_id FROM activity_scopes WHERE activity_id = ?`, [activityId])) as ScopeRow[];

  const ruleRows = (await db.rows(`
      SELECT template_id, criteria_code
      FROM criteria_activity_rules
      WHERE activity_id = ?
      `, [activityId])) as RuleRow[];

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

  const activity: ActivityEditDetail = {
    maxRegistrations: activityRow.max_registrations,
    id: Number(activityRow.id),
    title: String(activityRow.title ?? ""),
    description: String(activityRow.description ?? ""),
    audienceType: String(activityRow.audience_type ?? ""),
    status: String(activityRow.status ?? ""),
    startAt: String(activityRow.start_at ?? ""),
    endAt: String(activityRow.end_at ?? ""),
    registrationStartAt: String(activityRow.registration_start_at ?? ""),
    registrationEndAt: String(activityRow.registration_end_at ?? ""),
    conductScore: Number(activityRow.conduct_score ?? 0),
    absencePenalty: Number(activityRow.absence_penalty ?? 0),
    conductCategoryId: activityRow.conduct_category_id == null ? null : Number(activityRow.conduct_category_id),
    qrCheckinEnabled: Number(activityRow.qr_checkin_enabled ?? 0) === 1,
    selectedClassIds: scopeRows.map((item) => Number(item.class_id)),
    selectedCohorts: ((await db.rows("SELECT cohort FROM activity_cohort_scopes WHERE activity_id=?", [activityId])) as Array<{cohort:number}>).map(item=>item.cohort),
    organizerLevel: ((await db.first("SELECT organizer_level FROM activities WHERE id=?", [activityId])) as {organizer_level:string}).organizer_level,
    selectedCriteriaBindings: ruleRows.map(
      (item) => `${Number(item.template_id)}::${String(item.criteria_code)}`
    ),
    attendedCount,
    participantCount,
    editMode,
  };

  return (
    <main className="space-y-6">
      <ActivityFormHeader title="Chỉnh sửa hoạt động" />

      <ActivityEditForm
        activity={activity}
        classes={classes}
        criteriaOptions={criteriaOptions}
        categories={categories}
      />
    </main>
  );
}
