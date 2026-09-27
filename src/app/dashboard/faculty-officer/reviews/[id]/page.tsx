import { notFound } from "next/navigation";
import { requireFacultyOfficerContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import ReviewHeader from "@/components/shared/reviews/ReviewHeader";
import ReviewHistory from "@/components/shared/reviews/ReviewHistory";
import FacultyOfficerReviewPanel from "@/components/faculty-officer/reviews/FacultyOfficerReviewPanel";
import { getSubmissionTimeline } from "@/server/submissions/getSubmissionTimeline";
import SubmissionCriteriaDetailList from "@/components/shared/submissions/SubmissionCriteriaDetailList";
import SubmissionEvidenceViewer from "@/components/shared/submissions/SubmissionEvidenceViewer";

type SubmissionRow = {
  id: number;
  status: string;
  event_title: string;
  student_name: string;
  mssv: string;
  class_code: string;
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
};

export default async function FacultyOfficerReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const officer = await requireFacultyOfficerContext();

  const { id } = await params;
  const submissionId = Number(id);

  if (!Number.isFinite(submissionId) || submissionId <= 0) notFound();

  const db = getDb();

  const submission = db
    .prepare(
      `
      SELECT
        s.id,
        s.status,
        e.title AS event_title,
        u.full_name AS student_name,
        u.mssv,
        c.code AS class_code
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      INNER JOIN classes c ON c.id = s.class_id
      WHERE s.id = ?
        AND EXISTS (
          SELECT 1
          FROM faculty_class_assignments fca
          WHERE fca.faculty_officer_id = ?
            AND fca.class_id = s.class_id
        )
      LIMIT 1
      `
    )
    .get(submissionId, officer.id) as SubmissionRow | undefined;

  if (!submission) notFound();

  const criteria = db
    .prepare(
      `
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
        COALESCE(CASE WHEN ar.passed=1 AND TRIM(COALESCE(ar.matched_activity_titles,''))<>'' THEN 'Đạt tự động từ hoạt động: ' || REPLACE(ar.matched_activity_titles,'||',', ') END, ar.message) AS auto_message,
        si.content_text,
        COALESCE((
          SELECT COUNT(*)
          FROM submission_files sf
          WHERE sf.submission_id = s.id
            AND sf.criteria_code = i.code
        ), 0) AS file_count,
        (SELECT cr.decision FROM submission_criteria_reviews cr WHERE cr.submission_id=s.id AND cr.criteria_code=i.code AND cr.round=2 LIMIT 1) AS review_decision
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
      `
    )
    .all(submissionId) as CriteriaRow[];

  const files = db
    .prepare(
      `
      SELECT id, file_name, mime_type
      FROM submission_files
      WHERE submission_id = ?
      ORDER BY uploaded_at DESC, id DESC
      `
    )
    .all(submissionId) as FileRow[];

  const reviews = db
    .prepare(
      `
      SELECT
        r.round,
        r.decision,
        r.note,
        u.full_name AS reviewer_name
      FROM reviews r
      LEFT JOIN users u ON u.id = r.reviewer_id
      WHERE r.submission_id = ?
      ORDER BY r.id ASC
      `
    )
    .all(submissionId) as ReviewRow[];

  const reviewItems = reviews.map((item) => ({
    round: Number(item.round),
    decision: String(item.decision ?? ""),
    note: item.note ? String(item.note) : null,
    reviewerName: item.reviewer_name ? String(item.reviewer_name) : null,
  }));
  const timeline = getSubmissionTimeline(submissionId);

  return (
    <main className="space-y-6">
      <ReviewHeader
        title={submission.event_title}
        subtitle={`${submission.student_name} - ${submission.mssv} - ${submission.class_code}`}
        backHref="/dashboard/faculty-officer/reviews"
      />

      <ReviewHistory items={reviewItems} timeline={timeline} />

      <SubmissionCriteriaDetailList items={criteria} submissionId={submission.id} canReview={submission.status === "submitted_v2"} />

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-lg font-semibold text-slate-900">
          File minh chứng
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Xem nhanh PDF/ảnh hoặc tải xuống file minh chứng.
        </p>

        <div className="mt-5">
          <SubmissionEvidenceViewer
            items={files.map((item) => ({
              id: Number(item.id),
              fileName: String(item.file_name ?? ""),
              mimeType: String(item.mime_type ?? ""),
            }))}
          />
        </div>
      </section>

      <FacultyOfficerReviewPanel
        submissionId={submission.id}
        canReview={submission.status === "submitted_v2"}
      />
    </main>
  );
}
