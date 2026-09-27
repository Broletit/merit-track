import { notFound } from "next/navigation";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import ReviewHeader from "@/components/shared/reviews/ReviewHeader";
import ReviewHistory from "@/components/shared/reviews/ReviewHistory";
import FacultyOfficerReviewCriteriaList from "@/components/faculty-officer/reviews/FacultyOfficerReviewCriteriaList";
import SubmissionStatusBadge from "@/components/shared/submissions/SubmissionStatusBadge";
import { getSubmissionTimeline } from "@/server/submissions/getSubmissionTimeline";

type SubmissionRow = {
  id: number;
  status: string;
  score_total: number;
  submitted_at: string | null;
  updated_at: string;
  event_title: string;
  officer_name: string;
  mssv: string;
};

type CriteriaRow = {
  code: string;
  title: string;
  description: string | null;
  group_code: string;
  group_title: string;
  auto_passed: number | null;
  auto_message: string | null;
  content_text: string | null;
  file_name: string | null;
  file_path: string | null;
};

type ReviewRow = {
  round: number;
  decision: string;
  note: string | null;
};

export default async function AdminOfficerSubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminContext();

  const { id } = await params;
  const submissionId = Number(id);

  if (!Number.isFinite(submissionId) || submissionId <= 0) {
    notFound();
  }

  const db = getDb();

  const submission = db
    .prepare(
      `
      SELECT
        s.id,
        s.status,
        s.score_total,
        s.submitted_at,
        s.updated_at,
        e.title AS event_title,
        u.full_name AS officer_name,
        u.mssv
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.id = ?
        AND e.type = 'officer'
        AND s.status <> 'draft'
        AND s.submitted_at IS NOT NULL
      LIMIT 1
      `
    )
    .get(submissionId) as SubmissionRow | undefined;

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
          SELECT 'Đạt tự động từ hoạt động: ' || GROUP_CONCAT(activity.title, ', ')
          FROM criteria_activity_rules rule
          INNER JOIN activities activity ON activity.id = rule.activity_id
          INNER JOIN activity_registrations registration
            ON registration.activity_id = rule.activity_id
           AND registration.user_id = s.user_id
           AND registration.status = 'attended'
          WHERE rule.template_id = e.criteria_template_id
            AND rule.criteria_code = i.code
        )) AS auto_message,
        si.content_text,
        (
          SELECT sf.file_name
          FROM submission_files sf
          WHERE sf.submission_id = s.id
            AND sf.criteria_code = i.code
          ORDER BY sf.id DESC
          LIMIT 1
        ) AS file_name,
        (
          SELECT sf.file_path
          FROM submission_files sf
          WHERE sf.submission_id = s.id
            AND sf.criteria_code = i.code
          ORDER BY sf.id DESC
          LIMIT 1
        ) AS file_path
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
      `
    )
    .all(submissionId) as CriteriaRow[];

  const reviews = db
    .prepare(
      `
      SELECT round, decision, note
      FROM reviews
      WHERE submission_id = ?
      ORDER BY id ASC
      `
    )
    .all(submissionId) as ReviewRow[];

  const reviewItems = reviews.map((item) => ({
    round: Number(item.round),
    decision: String(item.decision ?? ""),
    note: item.note ? String(item.note) : null,
    reviewerName: null,
  }));
  const timeline = getSubmissionTimeline(submissionId);

  return (
    <main className="space-y-6">
      <ReviewHeader
        title={submission.event_title}
        subtitle={`${submission.officer_name} - ${submission.mssv}`}
        backHref="/dashboard/admin/officer-submissions"
      />

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Thông tin hồ sơ
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Theo dõi trạng thái xử lý hồ sơ cán bộ.
            </p>
          </div>

          <SubmissionStatusBadge status={submission.status} />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Info label="Điểm hiện tại" value={String(Number(submission.score_total ?? 0))} />
          <Info label="Ngày gửi" value={submission.submitted_at || "-"} />
          <Info label="Cập nhật" value={submission.updated_at || "-"} />
          <Info label="Mã hồ sơ" value={`#${submission.id}`} />
        </div>
      </section>

      <ReviewHistory items={reviewItems} timeline={timeline} />

      <FacultyOfficerReviewCriteriaList items={criteria} />
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
