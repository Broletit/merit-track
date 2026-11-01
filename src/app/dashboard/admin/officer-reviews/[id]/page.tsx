import { notFound } from "next/navigation";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import ReviewHeader from "@/components/shared/reviews/ReviewHeader";
import ReviewHistory from "@/components/shared/reviews/ReviewHistory";
import AdminOfficerReviewPanel from "@/components/admin/officer-reviews/AdminOfficerReviewPanel";
import SubmissionCriteriaDetailList from "@/components/shared/submissions/SubmissionCriteriaDetailList";
import { getSubmissionTimeline } from "@/server/submissions/getSubmissionTimeline";
import { evaluateSubmissionRequirements } from "@/server/submissions/evaluateSubmissionRequirements";
import SubmissionStatusBadge from "@/components/shared/submissions/SubmissionStatusBadge";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";

type SubmissionRow = {
  id: number;
  event_id: number;
  status: string;
  event_title: string;
  applicant_name: string;
  applicant_code: string;
  class_code: string | null;
  score_total: number;
  event_score_max: number | null;
  submitted_at: string | null;
  updated_at: string;
};

type CriteriaRow = {
  code: string;
  title: string;
  description: string | null;
  group_code: string;
  group_title: string;
  min_required: number;
  evidence_type: string;
  is_required: number;
  auto_passed: number | null;
  auto_message: string | null;
  content_text: string | null;
  file_count: number;
  review_decision: string | null;
  group_score_max: number;
  score_max: number;
  auto_score: number;
  matched_activity_titles: string | null;
};

type ReviewRow = {
  round: number;
  decision: string;
  note: string | null;
  reviewer_name: string | null;
  created_at: string;
};

type FileRow = {
  id: number;
  event_id: number;
  file_name: string;
  mime_type: string;
  criteria_code: string;
};

export default async function AdminOfficerReviewDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  await requireAdminContext();

  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const submissionId = await getDatabase().resolveRouteRecordId(id);

  if (!Number.isFinite(submissionId) || submissionId <= 0) notFound();

  const db = getDatabase();

  const submission = (await db.first(`
      SELECT
        s.id,
        s.event_id,
        s.status,
        s.score_total,
        s.submitted_at,
        s.updated_at,
        e.title AS event_title,
        e.score_max AS event_score_max,
        u.full_name AS applicant_name,
        u.mssv AS applicant_code,
        COALESCE(
          c.code,
          (
            SELECT member_class.code
            FROM class_members membership
            INNER JOIN classes member_class ON member_class.id = membership.class_id
            WHERE membership.user_id = s.user_id
              AND membership.left_at IS NULL
            ORDER BY CAST(membership.joined_at AS DATETIME(3)) DESC, membership.id DESC
            LIMIT 1
          )
        ) AS class_code
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.id = ?
        AND e.type = 'officer'
        AND s.status <> 'draft'
        AND s.submitted_at IS NOT NULL
      LIMIT 1
      `, [submissionId])) as SubmissionRow | undefined;

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
        i.evidence_type,
        i.is_required,
        COALESCE(ar.passed, (
          SELECT MAX(CASE WHEN registration.status = 'attended' THEN 1 ELSE 0 END)
          FROM criteria_activity_rules rule
          LEFT JOIN activity_registrations registration
            ON registration.activity_id = rule.activity_id
           AND registration.user_id = s.user_id
          WHERE rule.template_id = e.criteria_template_id
            AND rule.criteria_code = i.code
        )) AS auto_passed,
        COALESCE(ar.message, (
          SELECT CONCAT('Đạt tự động từ hoạt động: ', GROUP_CONCAT(activity.title SEPARATOR ', '))
          FROM criteria_activity_rules rule
          INNER JOIN activities activity ON activity.id = rule.activity_id
          INNER JOIN activity_registrations registration
            ON registration.activity_id = rule.activity_id
           AND registration.user_id = s.user_id
           AND registration.status = 'attended'
          WHERE rule.template_id = e.criteria_template_id
            AND rule.criteria_code = i.code
        )) AS auto_message,
        ar.matched_activity_titles,
        (
          SELECT COALESCE(SUM(CASE WHEN rule.score_value > 0 THEN rule.score_value ELSE i.score_max END), 0)
          FROM criteria_activity_rules rule
          INNER JOIN activity_registrations registration
            ON registration.activity_id = rule.activity_id
           AND registration.user_id = s.user_id
           AND registration.status = 'attended'
          WHERE rule.template_id = e.criteria_template_id
            AND rule.criteria_code = i.code
        ) AS auto_score,
        si.content_text,
        COALESCE((
          SELECT COUNT(*)
          FROM submission_ready_files sf
          WHERE sf.submission_id = s.id
            AND sf.criteria_code = i.code
        ), 0) AS file_count,
        (SELECT cr.decision FROM submission_criteria_reviews cr WHERE cr.submission_id=s.id AND cr.criteria_code=i.code AND cr.round=1 LIMIT 1) AS review_decision
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
      `, [submissionId])) as CriteriaRow[];

  const files = (await db.rows(`
      SELECT id, file_name, mime_type, criteria_code
      FROM submission_ready_files
      WHERE submission_id = ?
      ORDER BY uploaded_at DESC, id DESC
      `, [submissionId])) as FileRow[];

  const reviews = (await db.rows(`
      SELECT
        r.round,
        r.decision,
        r.note,
        r.created_at,
        u.full_name AS reviewer_name
      FROM reviews r
      LEFT JOIN users u ON u.id = r.reviewer_id
      WHERE r.submission_id = ?
      ORDER BY r.id ASC
      `, [submissionId])) as ReviewRow[];

  const reviewItems = reviews.map((item) => ({
    round: Number(item.round),
    decision: String(item.decision ?? ""),
    note: item.note ? String(item.note) : null,
    reviewerName: item.reviewer_name ? String(item.reviewer_name) : null,
    createdAt: item.created_at ? String(item.created_at) : null,
  }));
  const timeline = (await getSubmissionTimeline(submissionId));
  const criteriaWithFiles = criteria.map((item) => ({
    ...item,
    evidence_files: files
      .filter((file) => file.criteria_code === item.code)
      .map((file) => ({
        id: Number(file.id),
        fileName: String(file.file_name ?? ""),
        mimeType: String(file.mime_type ?? ""),
      })),
  }));
  const requirements = (await evaluateSubmissionRequirements(db, submission.id, "approved"));
  const isReviewMode = sp.mode === "review";
  const groupMaximum = Array.from(new Map(criteria.map((item) => [item.group_code, Number(item.group_score_max ?? 0)])).values()).reduce((total, score) => total + score, 0);
  const scoreMaximum = Number(submission.event_score_max ?? 0) > 0
    ? Math.min(Number(submission.event_score_max), groupMaximum || Number(submission.event_score_max))
    : groupMaximum;
  const ranking = submission.status === "passed"
    ? Number(((await db.first(`SELECT 1 + COUNT(*) AS rank_no FROM submissions ranked WHERE ranked.event_id=? AND ranked.status='passed' AND ranked.submitted_at IS NOT NULL AND ranked.score_total>?`, [submission.event_id, submission.score_total])) as { rank_no: number }).rank_no)
    : null;

  return (
    <main className="space-y-6">
      <ReviewHeader
        title={submission.event_title}
        subtitle={`${submission.applicant_name} - ${submission.applicant_code}${
          submission.class_code ? ` - ${submission.class_code}` : ""
        }`}
        backHref="/dashboard/admin/officer-reviews"
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
          <Info label="Xếp hạng trong đợt" value={ranking ? `Hạng ${ranking}` : "Chỉ xếp hạng hồ sơ đạt"} />
        </div>
      </section>

      <ReviewHistory items={reviewItems} timeline={timeline} singleStage />

      <SubmissionCriteriaDetailList
        items={criteriaWithFiles}
        submissionId={isReviewMode ? submission.id : undefined}
        canReview={isReviewMode && submission.status === "submitted_v1"}
        reviewHref={!isReviewMode ? `/dashboard/admin/officer-reviews/${submission.id}?mode=review#review-panel` : undefined}
        canOpenReview={submission.status === "submitted_v1"}
      />

      {isReviewMode ? <AdminOfficerReviewPanel
        submissionId={submission.id}
        canReview={submission.status === "submitted_v1"}
        requirementsMet={requirements.valid}
      /> : null}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 shadow-md shadow-slate-200/60"><div className="text-sm text-slate-500">{label}</div><div className="mt-1 text-sm font-semibold text-slate-900">{value}</div></div>;
}
