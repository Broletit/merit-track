import { notFound } from "next/navigation";
import { requireOfficerParticipantContext } from "@/server/auth/requireOfficerParticipantContext";
import { getDatabase } from "@/server/db/mysql";
import ReviewHeader from "@/components/shared/reviews/ReviewHeader";
import ReviewHistory from "@/components/shared/reviews/ReviewHistory";
import { getSubmissionTimeline } from "@/server/submissions/getSubmissionTimeline";
import OfficerSubmissionCriteriaPanel from "@/components/faculty-officer/officer-submissions/OfficerSubmissionCriteriaPanel";
import SubmissionStatusBadge from "@/components/shared/submissions/SubmissionStatusBadge";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";

type SubmissionRow = {
  id: number;
  status: string;
  score_total: number;
  submitted_at: string | null;
  updated_at: string;
  event_title: string;
  event_description: string | null;
  event_start_at: string;
  event_end_at: string;
  event_score_max: number | null;
};

type CriteriaRow = {
  code: string;
  title: string;
  description: string | null;
  group_code: string;
  group_title: string;
  min_required: number;
  group_score_max: number;
  score_max: number;
  is_required: number;
  auto_passed: number | null;
  auto_message: string | null;
  content_text: string | null;
  file_name: string | null;
  file_path: string | null;
  file_count: number;
  auto_score: number;
  matched_activity_titles: string | null;
  review_decision: string | null;
};

type ReviewRow = {
  round: number;
  decision: string;
  note: string | null;
};

export async function OfficerSubmissionDetailPageView({
  params,
  basePath,
}: {
  params: Promise<{ id: string }>;
  basePath: string;
}) {
  const user = await requireOfficerParticipantContext();
  const { id } = await params;
  const submissionId = await getDatabase().resolveRouteRecordId(id);

  if (!Number.isFinite(submissionId) || submissionId <= 0) notFound();

  const db = getDatabase();

  const submission = (await db.first(`
      SELECT
        s.id,
        s.status,
        s.score_total,
        s.submitted_at,
        s.updated_at,
        e.title AS event_title,
        e.description AS event_description,
        e.start_at AS event_start_at,
        e.end_at AS event_end_at,
        e.score_max AS event_score_max
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      WHERE s.id = ?
        AND s.user_id = ?
        AND e.type = 'officer'
      LIMIT 1
      `, [submissionId, user.id])) as SubmissionRow | undefined;

  if (!submission) notFound();

  const criteria = (await db.rows(`
      SELECT
        i.code,
        i.title,
        i.description,
        i.group_code,
        g.title AS group_title,
        g.min_required,
        g.score_max AS group_score_max,
        i.score_max,
        i.is_required,
        ar.passed AS auto_passed,
        ar.message AS auto_message,
        ar.matched_activity_titles,
        (SELECT cr.decision FROM submission_criteria_reviews cr WHERE cr.submission_id=s.id AND cr.criteria_code=i.code ORDER BY cr.round DESC LIMIT 1) AS review_decision,
        si.content_text,
        (
          SELECT sf.file_name
          FROM submission_ready_files sf
          WHERE sf.submission_id = s.id
            AND sf.criteria_code = i.code
          ORDER BY sf.id DESC
          LIMIT 1
        ) AS file_name,
        (
          SELECT sf.file_path
          FROM submission_ready_files sf
          WHERE sf.submission_id = s.id
            AND sf.criteria_code = i.code
          ORDER BY sf.id DESC
          LIMIT 1
        ) AS file_path
        ,(
          SELECT COUNT(*)
          FROM submission_ready_files sf
          WHERE sf.submission_id = s.id
            AND sf.criteria_code = i.code
        ) AS file_count
        ,(
          SELECT COALESCE(SUM(CASE WHEN car.score_value > 0 THEN car.score_value ELSE i.score_max END), 0)
          FROM criteria_activity_rules car
          INNER JOIN activities a ON a.id = car.activity_id
          INNER JOIN activity_registrations activity_registration
            ON activity_registration.activity_id = a.id
           AND activity_registration.user_id = ?
           AND activity_registration.status = 'attended'
          WHERE car.template_id = e.criteria_template_id
            AND car.criteria_code = i.code
        ) AS auto_score
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN event_criteria_items i ON i.event_id = s.event_id
      INNER JOIN event_criteria_groups g
        ON g.event_id = i.event_id
       AND g.code = i.group_code
      LEFT JOIN submission_auto_results ar
        ON ar.submission_id = s.id
       AND ar.criteria_code = i.code
      LEFT JOIN submission_items si
        ON si.submission_id = s.id
       AND si.criteria_code = i.code
      WHERE s.id = ?
      ORDER BY g.sort_order ASC, i.sort_order ASC
      `, [user.id, submissionId])) as CriteriaRow[];

  const evidenceFiles = (await db.rows("SELECT id,criteria_code,file_name,mime_type FROM submission_ready_files WHERE submission_id=? ORDER BY id DESC", [submissionId])) as Array<{id:number;criteria_code:string;file_name:string;mime_type:string}>;
  const criteriaWithFiles = criteria.map(item=>({...item,evidence_type:"manual",evidence_files:evidenceFiles.filter(file=>file.criteria_code===item.code).map(file=>({id:file.id,fileName:file.file_name,mimeType:file.mime_type}))}));

  const reviews = (await db.rows(`
      SELECT round, decision, note
      FROM reviews
      WHERE submission_id = ?
      ORDER BY id ASC
      `, [submissionId])) as ReviewRow[];

  const reviewItems = reviews.map((item) => ({
    round: Number(item.round),
    decision: String(item.decision ?? ""),
    note: item.note ? String(item.note) : null,
    reviewerName: null,
  }));
  const timeline = (await getSubmissionTimeline(submissionId));

  const canEdit = ["draft", "needs_revision_v1"].includes(submission.status);
  const groupMaximum = Array.from(
    new Map(criteria.map((item) => [item.group_code, Number(item.group_score_max ?? 0)])).values()
  ).reduce((total, score) => total + score, 0);
  const scoreMaximum = Number(submission.event_score_max ?? 0) > 0
    ? Math.min(Number(submission.event_score_max), groupMaximum || Number(submission.event_score_max))
    : groupMaximum;

  return (
    <main className="space-y-6">
      <ReviewHeader
        title={submission.event_title}
        backHref={basePath}
      />

      <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-900">Thông tin hồ sơ</h2>

          <SubmissionStatusBadge status={submission.status} />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Info label="Điểm hiện tại" value={`${Number(submission.score_total ?? 0)}/${scoreMaximum} điểm`} />
          <Info label="Ngày gửi" value={submission.submitted_at ? formatDateTimeVN(submission.submitted_at) : "Chưa gửi"} />
          <Info label="Cập nhật" value={formatDateTimeVN(submission.updated_at)} />
          <Info label="Trạng thái sửa" value={canEdit ? "Có thể chỉnh sửa" : "Không thể chỉnh sửa"} />
        </div>
      </section>

      <ReviewHistory
        items={reviewItems}
        timeline={timeline}
        title="Phản hồi đợt xét"
        emptyMessage="Chưa có phản hồi xét duyệt."
        singleStage
      />

      <OfficerSubmissionCriteriaPanel submissionId={submission.id} canEdit={canEdit} items={criteriaWithFiles}/>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 shadow-md shadow-slate-200/60">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

export default async function OfficerSubmissionDetailPage(props: { params: Promise<{ id: string }> }) {
  return <OfficerSubmissionDetailPageView {...props} basePath="/dashboard/faculty-officer/officer-submissions" />;
}
