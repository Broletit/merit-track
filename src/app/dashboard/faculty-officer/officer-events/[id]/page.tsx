import { notFound } from "next/navigation";
import { requireOfficerParticipantContext } from "@/server/auth/requireOfficerParticipantContext";
import { getDb } from "@/server/db/sqlite";
import OfficerEventDetailHeader from "@/components/faculty-officer/officer-events/OfficerEventDetailHeader";
import OfficerEventInfoCard from "@/components/faculty-officer/officer-events/OfficerEventInfoCard";
import OfficerEventApplyForm from "@/components/faculty-officer/officer-events/OfficerEventApplyForm";
import type {
  OfficerEventCriteriaItem,
  OfficerEventDetail,
  OfficerEventSubmissionItem,
} from "@/components/faculty-officer/officer-events/types";
import {
  getEventSubmissionPhase,
  getEventSubmissionPhaseError,
} from "@/lib/events/eventSubmissionPhase";

type EventRow = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  start_at: string;
  end_at: string;
  allow_late: number;
  published_at: string | null;
  created_at: string | null;
  template_name: string | null;
  template_description: string | null;
  criteria_template_id: number | null;
  groups_count: number;
  criteria_count: number;
};

type CriteriaRow = {
  code: string;
  title: string;
  description: string | null;
  group_code: string;
  group_title: string;
  score_max: number;
  is_required: number;
  matched_activity_count: number;
  matched_activity_score: number;
  matched_activity_titles: string | null;
};

type SubmissionRow = {
  id: number;
  status: string;
  score_total: number;
  submitted_at: string | null;
  updated_at: string;
};

function getSubmitState(event: OfficerEventDetail) {
  return getEventSubmissionPhaseError(getEventSubmissionPhase(event));
}

export async function OfficerEventDetailPageView({
  params,
  basePath,
  submissionBasePath,
}: {
  params: Promise<{ id: string }>;
  basePath: string;
  submissionBasePath: string;
}) {
  const user = await requireOfficerParticipantContext();
  const { id } = await params;
  const eventId = Number(id);

  if (!Number.isFinite(eventId) || eventId <= 0) notFound();

  const db = getDb();

  const eventRow = db
    .prepare(
      `
      SELECT
        e.id,
        e.title,
        e.description,
        e.status,
        e.start_at,
        e.end_at,
        e.allow_late,
        e.published_at,
        e.created_at,
        e.criteria_template_id,
        ct.name AS template_name,
        ct.description AS template_description,
        (
          SELECT COUNT(*)
          FROM criteria_template_groups g
          WHERE g.template_id = e.criteria_template_id
        ) AS groups_count,
        (
          SELECT COUNT(*)
          FROM criteria_template_items i
          WHERE i.template_id = e.criteria_template_id
        ) AS criteria_count
      FROM events e
      LEFT JOIN criteria_templates ct ON ct.id = e.criteria_template_id
      WHERE e.id = ?
        AND e.type = 'officer'
        AND e.status = 'published'
      LIMIT 1
      `
    )
    .get(eventId) as EventRow | undefined;

  if (!eventRow) notFound();

  const event: OfficerEventDetail = {
    id: Number(eventRow.id),
    title: String(eventRow.title ?? ""),
    description: eventRow.description ? String(eventRow.description) : null,
    status: String(eventRow.status ?? ""),
    startAt: String(eventRow.start_at ?? ""),
    endAt: String(eventRow.end_at ?? ""),
    allowLate: Number(eventRow.allow_late ?? 0) === 1,
    publishedAt: eventRow.published_at ? String(eventRow.published_at) : null,
    createdAt: eventRow.created_at ? String(eventRow.created_at) : null,
    templateName: eventRow.template_name ? String(eventRow.template_name) : null,
    templateDescription: eventRow.template_description
      ? String(eventRow.template_description)
      : null,
    criteriaTemplateId: eventRow.criteria_template_id
      ? Number(eventRow.criteria_template_id)
      : null,
    groupsCount: Number(eventRow.groups_count ?? 0),
    criteriaCount: Number(eventRow.criteria_count ?? 0),
  };

  const criteriaRows = db
    .prepare(
      `
      SELECT
        i.code,
        i.title,
        i.description,
        i.group_code,
        g.title AS group_title,
        i.score_max,
        i.is_required,
        (
          SELECT COUNT(*)
          FROM criteria_activity_rules car
          INNER JOIN activity_registrations ar
            ON ar.activity_id = car.activity_id
           AND ar.user_id = ?
           AND ar.status = 'attended'
          WHERE car.template_id = e.criteria_template_id
            AND car.criteria_code = i.code
        ) AS matched_activity_count,
        (
          SELECT COALESCE(SUM(a.conduct_score), 0)
          FROM criteria_activity_rules car
          INNER JOIN activities a ON a.id = car.activity_id
          INNER JOIN activity_registrations ar
            ON ar.activity_id = car.activity_id
           AND ar.user_id = ?
           AND ar.status = 'attended'
          WHERE car.template_id = e.criteria_template_id
            AND car.criteria_code = i.code
        ) AS matched_activity_score
        ,(
          SELECT GROUP_CONCAT(matched.title, '||')
          FROM (
            SELECT DISTINCT a.title
            FROM criteria_activity_rules car
            INNER JOIN activities a ON a.id = car.activity_id
            INNER JOIN activity_registrations ar
              ON ar.activity_id = car.activity_id
             AND ar.user_id = ?
             AND ar.status = 'attended'
            WHERE car.template_id = e.criteria_template_id
              AND car.criteria_code = i.code
            ORDER BY a.title
          ) matched
        ) AS matched_activity_titles
      FROM events e
      INNER JOIN criteria_template_items i
        ON i.template_id = e.criteria_template_id
      INNER JOIN criteria_template_groups g
        ON g.template_id = e.criteria_template_id
       AND g.code = i.group_code
      WHERE e.id = ?
      ORDER BY g.sort_order ASC, i.sort_order ASC
      `
    )
    .all(user.id, user.id, user.id, eventId) as CriteriaRow[];

  const criteria: OfficerEventCriteriaItem[] = criteriaRows.map((item) => {
    const matchedActivityCount = Number(item.matched_activity_count ?? 0);
    const matchedActivityScore = Number(item.matched_activity_score ?? 0);
    const autoPassed = matchedActivityCount > 0;

    return {
      code: String(item.code ?? ""),
      title: String(item.title ?? ""),
      description: item.description ? String(item.description) : null,
      groupCode: String(item.group_code ?? ""),
      groupTitle: String(item.group_title ?? ""),
      scoreMax: Number(item.score_max ?? 0),
      isRequired: Number(item.is_required ?? 0) === 1,
      autoPassed,
      autoMessage: autoPassed
        ? `Đã đạt tự động nhờ ${matchedActivityCount} hoạt động phù hợp.`
        : null,
      matchedActivityCount,
      matchedActivityScore,
      matchedActivityTitles: item.matched_activity_titles
        ? String(item.matched_activity_titles).split("||")
        : [],
    };
  });

  const submissionRows = db
    .prepare(
      `
      SELECT
        id,
        status,
        score_total,
        submitted_at,
        updated_at
      FROM submissions
      WHERE event_id = ?
        AND user_id = ?
      ORDER BY datetime(updated_at) DESC, id DESC
      `
    )
    .all(eventId, user.id) as SubmissionRow[];

  const submissions: OfficerEventSubmissionItem[] = submissionRows.map((item) => ({
    id: Number(item.id),
    status: String(item.status ?? ""),
    scoreTotal: Number(item.score_total ?? 0),
    submittedAt: item.submitted_at ? String(item.submitted_at) : null,
    updatedAt: String(item.updated_at ?? ""),
  }));

  const existingSubmission = submissions[0] ?? null;
  const disabledReason = getSubmitState(event);
  const canSubmit = !disabledReason;

  return (
    <main className="space-y-6">
      <OfficerEventDetailHeader event={event} backHref={basePath} />

      <OfficerEventInfoCard
        event={event}
        existingSubmission={existingSubmission}
        disabledReason={disabledReason}
        submissionBasePath={submissionBasePath}
      />

      <OfficerEventApplyForm
        eventId={event.id}
        criteria={criteria}
        canSubmit={canSubmit}
      />

    </main>
  );
}

export default async function OfficerEventDetailPage(props: { params: Promise<{ id: string }> }) {
  return <OfficerEventDetailPageView {...props} basePath="/dashboard/faculty-officer/officer-events" submissionBasePath="/dashboard/faculty-officer/officer-submissions" />;
}
