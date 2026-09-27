import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";

import { requireClassOfficerContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import { getSubmissionStatusLabel } from "@/lib/submissions/submissionStatus";

import FacultyOfficerReviewCriteriaList from "@/components/faculty-officer/reviews/FacultyOfficerReviewCriteriaList";
import ReviewHistory from "@/components/shared/reviews/ReviewHistory";
import { getSubmissionTimeline } from "@/server/submissions/getSubmissionTimeline";

type Params = Promise<{
  id: string;
}>;

type SubmissionRow = {
  id: number;
  status: string;
  submitted_at: string | null;
  updated_at: string;
  event_title: string;
  event_description: string | null;
  event_start_at: string;
  event_end_at: string;
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
  evidence_type: string;
  is_required: number;
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

export default async function ClassOfficerSubmissionDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ termId?: string }>;
}) {
  const user = await requireClassOfficerContext();

  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const submissionId = Number(id);

  if (!Number.isFinite(submissionId) || submissionId <= 0) {
    notFound();
  }

  const db = getDb();
  const officerClass = db.prepare(`
    SELECT class_id FROM class_members
    WHERE user_id=? AND left_at IS NULL
    ORDER BY rowid DESC LIMIT 1
  `).get(user.id) as { class_id: number } | undefined;
  if (!officerClass) notFound();

  const submission = db
    .prepare(
      `
      SELECT
        s.id,
        s.status,
        s.submitted_at,
        s.updated_at,
        e.title AS event_title,
        e.description AS event_description,
        e.start_at AS event_start_at,
        e.end_at AS event_end_at,
        u.full_name AS student_name,
        u.mssv,
        c.code AS class_code
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id=s.user_id
      INNER JOIN classes c ON c.id=s.class_id
      WHERE s.id = ?
        AND s.class_id = ?
        AND s.status<>'draft'
      LIMIT 1
      `
    )
    .get(submissionId, officerClass.class_id) as SubmissionRow | undefined;

  if (!submission) {
    notFound();
  }

  const criteria = db
    .prepare(
      `
      SELECT
        i.code,
        i.title,
        i.description,
        i.group_code,
        g.title AS group_title,
        i.evidence_type,
        i.is_required,
        ar.passed AS auto_passed,
        CASE WHEN ar.passed=1 THEN
          'Đạt tự động từ hoạt động: ' || COALESCE(
            NULLIF(REPLACE(ar.matched_activity_titles, '||', ', '), ''),
            (SELECT GROUP_CONCAT(a.title, ', ') FROM criteria_activity_rules car INNER JOIN activities a ON a.id=car.activity_id INNER JOIN activity_registrations reg ON reg.activity_id=a.id AND reg.user_id=s.user_id AND reg.status='attended' WHERE car.template_id=e.criteria_template_id AND car.criteria_code=i.code)
          )
        ELSE ar.message END AS auto_message,
        si.content_text,
        (SELECT sf.file_name
          FROM submission_files sf
          WHERE sf.submission_id = s.id
            AND sf.criteria_code = i.code
          ORDER BY sf.id DESC LIMIT 1) AS file_name,
        (SELECT sf.file_path FROM submission_files sf WHERE sf.submission_id=s.id AND sf.criteria_code=i.code ORDER BY sf.id DESC LIMIT 1) AS file_path
      FROM submissions s
      INNER JOIN events e ON e.id=s.event_id
      INNER JOIN event_criteria_items i
        ON i.event_id = s.event_id
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
      SELECT
        round,
        decision,
        note
      FROM reviews
      WHERE submission_id = ?
      ORDER BY id DESC
      `
    )
    .all(submissionId) as ReviewRow[];

  const timeline = getSubmissionTimeline(submissionId);
  const reviewItems = reviews.map((item) => ({ round: Number(item.round), decision: String(item.decision), note: item.note, reviewerName: null }));

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <FileText size={26} />
            </div>

            <div>
              <h1 className="text-2xl font-semibold">
                {submission.event_title}
              </h1>

              <p className="mt-1 text-sm text-blue-100/90">
                {submission.student_name} · {submission.mssv} · {submission.class_code}
              </p>
            </div>
          </div>

          <Link
            href={`/dashboard/class-officer/submissions${sp.termId ? `?termId=${encodeURIComponent(sp.termId)}` : ""}`}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Quay về
          </Link>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-xl font-semibold text-slate-900">
          Thông tin hồ sơ
        </h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Info label="Sinh viên" value={`${submission.student_name} - ${submission.mssv}`} />
          <Info
            label="Trạng thái"
            value={getSubmissionStatusLabel(submission.status)}
          />

          <Info
            label="Ngày nộp"
            value={
              submission.submitted_at
                ? formatDateTimeVN(submission.submitted_at)
                : "Chưa nộp"
            }
          />

          <Info
            label="Thời gian đợt xét"
            value={`${formatDateTimeVN(
              submission.event_start_at
            )} → ${formatDateTimeVN(
              submission.event_end_at
            )}`}
          />
        </div>

        {submission.event_description ? (
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">
            {submission.event_description}
          </div>
        ) : null}
      </section>

      <ReviewHistory items={reviewItems} timeline={timeline} title="Hành trình xét duyệt" emptyMessage="Chưa có phản hồi xét duyệt." />
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
      <div className="text-sm text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-sm font-semibold text-slate-900">
        {value}
      </div>
    </div>
  );
}
