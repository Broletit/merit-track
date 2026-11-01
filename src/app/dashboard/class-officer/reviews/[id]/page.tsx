import SubmissionSupportCard from "@/components/shared/submissions/SubmissionSupportCard";
import { notFound } from "next/navigation";
import { requireClassOfficerContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import ReviewHeader from "@/components/shared/reviews/ReviewHeader";
import ReviewHistory from "@/components/shared/reviews/ReviewHistory";
import ClassOfficerReviewPanel from "@/components/class-officer/reviews/ClassOfficerReviewPanel";
import { getSubmissionTimeline } from "@/server/submissions/getSubmissionTimeline";
import SubmissionCriteriaDetailList from "@/components/shared/submissions/SubmissionCriteriaDetailList";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import SubmissionViewOverview from "@/components/shared/submissions/SubmissionViewOverview";
import { evaluateSubmissionRequirements } from "@/server/submissions/evaluateSubmissionRequirements";

type SubmissionRow = {
  id: number;
  status: string;
  event_title: string;
  student_name: string;
  mssv: string;
  class_code: string;
  event_status: string;
  event_end_at: string;
  review_open: number;
  submitted_at: string | null;
  updated_at: string | null;
  closes_at: string | null;
  review_round: number;
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
};

type ReviewRow = {
  round: number;
  decision: string;
  note: string | null;
  reviewer_name: string | null;
};

type FileRow = {
  id: number;
  file_name: string;
  mime_type: string;
  criteria_code: string;
};

export default async function ClassOfficerReviewDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ termId?: string; mode?: string }>;
}) {
  const officer = await requireClassOfficerContext();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const submissionId = await getDatabase().resolveRouteRecordId(id);

  if (!Number.isFinite(submissionId) || submissionId <= 0) notFound();

  const db = getDatabase();

  const officerClass = (await db.first(`
      SELECT class_id
      FROM class_members
      WHERE user_id = ?
      ORDER BY joined_at DESC, id DESC
      LIMIT 1
      `, [officer.id])) as { class_id: number } | undefined;

  if (!officerClass) notFound();

  const submission = (await db.first(`
      SELECT
        s.id,
        s.status,
        e.title AS event_title,
        u.full_name AS student_name,
        u.mssv,
        c.code AS class_code,
        e.status AS event_status,
        e.end_at AS event_end_at,
        s.submitted_at,
        s.updated_at,
        e.end_at AS closes_at,
        s.review_round,
        CASE WHEN e.status='published' AND CAST(e.end_at AS DATETIME(3))>=CURRENT_TIMESTAMP(3) THEN 1 ELSE 0 END AS review_open
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      INNER JOIN classes c ON c.id = s.class_id
      WHERE s.id = ?
        AND s.class_id = ?
      LIMIT 1
      `, [submissionId, officerClass.class_id])) as SubmissionRow | undefined;

  if (!submission) notFound();

  const criteria = (await db.rows(`
      SELECT
        i.code,
        i.title,
        i.description,
        i.group_code,
        g.title AS group_title,
        g.min_required,
        i.evidence_type,
        i.is_required,
        ar.passed AS auto_passed,
        COALESCE(CASE WHEN ar.passed=1 AND TRIM(COALESCE(ar.matched_activity_titles,''))<>'' THEN CONCAT('Đạt tự động từ hoạt động: ', REPLACE(ar.matched_activity_titles,'||',', ')) END, ar.message) AS auto_message,
        si.content_text,
        COALESCE((
          SELECT COUNT(*)
          FROM submission_ready_files sf
          WHERE sf.submission_id = s.id
            AND sf.criteria_code = i.code
        ), 0) AS file_count,
        (SELECT cr.decision FROM submission_criteria_reviews cr WHERE cr.submission_id=s.id AND cr.criteria_code=i.code AND cr.round=s.review_round LIMIT 1) AS review_decision
      FROM submissions s
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
  }));
  const timeline = (await getSubmissionTimeline(submissionId));
  const isReviewMode = sp.mode === "review";
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
  const achievedCriteria = criteria.filter(
    (item) => Number(item.auto_passed) === 1 || item.review_decision === "pass",
  ).length;
  const requirements = (await evaluateSubmissionRequirements(db, submission.id, "approved"));
  const reviewUnavailableReason = submission.event_status !== "published"
    ? "Đợt xét đã khóa. Hồ sơ chỉ còn ở chế độ xem."
    : Number(submission.review_open) !== 1
      ? `Đợt xét đã kết thúc lúc ${formatDateTimeVN(submission.event_end_at)}. Hồ sơ chỉ còn ở chế độ xem.`
      : "";

  return (
    <main className="space-y-6">
      <ReviewHeader
        title={submission.event_title}
        subtitle={`${submission.student_name} - ${submission.mssv} - ${submission.class_code}`}
        backHref={`/dashboard/class-officer/reviews${sp.termId ? `?termId=${encodeURIComponent(sp.termId)}` : ""}`}
      />

      <SubmissionSupportCard submissionId={submissionId} isDraft={!submission.submitted_at}/>

      {!isReviewMode && submission.submitted_at ? (
        <SubmissionViewOverview
          status={submission.status}
          submittedAt={submission.submitted_at}
          updatedAt={submission.updated_at}
          closesAt={submission.closes_at}
          currentRound={Number(submission.review_round)}
          achievedCriteria={achievedCriteria}
          totalCriteria={criteria.length}
        />
      ) : null}

      {reviewUnavailableReason ? (
        <section className="rounded-2xl bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800 ring-1 ring-amber-100 shadow-md shadow-slate-200/60">
          {reviewUnavailableReason}
        </section>
      ) : null}

      {submission.submitted_at ? <ReviewHistory items={reviewItems} timeline={timeline} /> : null}

      <SubmissionCriteriaDetailList
        items={criteriaWithFiles}
        submissionId={isReviewMode ? submission.id : undefined}
        canReview={isReviewMode && submission.status === "submitted_v1" && !reviewUnavailableReason}
        reviewHref={!isReviewMode ? `/dashboard/class-officer/reviews/${submission.id}?mode=review${sp.termId ? `&termId=${encodeURIComponent(sp.termId)}` : ""}#review-panel` : undefined}
        canOpenReview={!reviewUnavailableReason && submission.status === "submitted_v1"}
      />

      {isReviewMode && !reviewUnavailableReason ? (
        <ClassOfficerReviewPanel
          submissionId={submission.id}
          canReview={submission.status === "submitted_v1"}
          requirementsMet={requirements.valid}
        />
      ) : null}
    </main>
  );
}
