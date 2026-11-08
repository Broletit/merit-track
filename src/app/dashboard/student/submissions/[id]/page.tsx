import SubmissionStatusBadge from "@/components/shared/submissions/SubmissionStatusBadge";
import SubmissionSupportCard from "@/components/shared/submissions/SubmissionSupportCard";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";

import { requireStudentContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import {
  canEditSubmission,
} from "@/lib/submissions/submissionStatus";

import StudentSubmissionCriteriaList from "@/components/student/submissions/StudentSubmissionCriteriaList";
import ReviewHistory from "@/components/shared/reviews/ReviewHistory";
import { getSubmissionTimeline } from "@/server/submissions/getSubmissionTimeline";
import { formatAutoCriteriaMessage } from "@/components/shared/criteria/AutoCriteriaAchievement";
import { getPagePublicId } from "@/server/auth/publicPageRoute";
import SubmissionExportButtons from "@/components/student/submissions/SubmissionExportButtons";

type Params = Promise<{
  id: string;
}>;

type SubmissionRow = {
  id: number;
  status: string;
  submitted_at: string | null;
  updated_at: string;
  event_title: string;
  event_id: number;
  event_start_at: string;
  event_end_at: string;
  event_status: string;
  event_allow_late: number;
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
  matched_activity_titles: string | null;
  content_text: string | null;
  file_count: number;
  file_name: string | null;
  review_decision: string | null;
  review_round: number | null;
};

type ReviewRow = {
  round: number;
  decision: string;
  note: string | null;
};

type FileRow = {
  id: number;
  criteria_code: string;
  file_name: string;
  mime_type: string;
};

export default async function StudentSubmissionDetailPage({
  params,
}: {
  params: Params;
}) {
  const user = await requireStudentContext();
  const { id } = await params;
  const submissionId = await getDatabase().resolveRouteRecordId(id);

  if (!Number.isFinite(submissionId) || submissionId <= 0) {
    notFound();
  }

  const db = getDatabase();

  const submission = (await db.first(`
      SELECT
        s.id,
        s.status,
        e.status AS event_status, e.allow_late AS event_allow_late,
        s.submitted_at,
        s.updated_at,
        e.title AS event_title,
        e.id AS event_id,
        e.start_at AS event_start_at,
        e.end_at AS event_end_at
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      WHERE s.id = ?
        AND s.user_id = ?
        AND e.type = 'student'

      LIMIT 1
      `, [submissionId, user.id])) as SubmissionRow | undefined;

  if (!submission) {
    notFound();
  }
  const exportToken=await getPagePublicId(db,`/api/submissions/${submission.id}/export`);

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
        ar.message AS auto_message,
        ar.matched_activity_titles,
        si.content_text,
        COALESCE((
          SELECT COUNT(*)
          FROM submission_ready_files sf
          WHERE sf.submission_id = s.id
            AND sf.criteria_code = i.code
        ), 0) AS file_count
        ,(
          SELECT sf.file_name FROM submission_ready_files sf
          WHERE sf.submission_id=s.id AND sf.criteria_code=i.code
          ORDER BY sf.uploaded_at DESC,sf.id DESC LIMIT 1
        ) AS file_name,
        (SELECT cr.decision FROM submission_criteria_reviews cr WHERE cr.submission_id=s.id AND cr.criteria_code=i.code AND cr.round=s.review_round LIMIT 1) AS review_decision,
        (SELECT cr.round FROM submission_criteria_reviews cr WHERE cr.submission_id=s.id AND cr.criteria_code=i.code AND cr.round=s.review_round LIMIT 1) AS review_round
      FROM submissions s
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
      `, [submissionId])) as CriteriaRow[];

  const reviews = (await db.rows(`
      SELECT
        round,
        decision,
        note
      FROM reviews
      WHERE submission_id = ?
      ORDER BY id DESC
      `, [submissionId])) as ReviewRow[];

  const files = (await db.rows(`
      SELECT
        id,
        criteria_code,
        file_name,
        mime_type
      FROM submission_ready_files
      WHERE submission_id = ?
      ORDER BY uploaded_at DESC, id DESC
      `, [submissionId])) as FileRow[];

  const editable = canEditSubmission(submission.status, {status:submission.event_status,startAt:submission.event_start_at,endAt:submission.event_end_at,allowLate:Number(submission.event_allow_late)===1});
  const timeline = (await getSubmissionTimeline(submissionId)).map((item) => ({
    ...item,
    actorName: null,
  }));
  const reviewItems = reviews.map((item) => ({
    round: Number(item.round),
    decision: String(item.decision ?? ""),
    note: item.note ? String(item.note) : null,
    reviewerName: null,
  }));
  const firstMissingCriterion=criteria.find((item)=>Number(item.auto_passed??0)!==1&&!String(item.content_text??"").trim()&&Number(item.file_count??0)===0);
  const editHref=`/dashboard/student/events/${submission.event_id}?edit=1${firstMissingCriterion?`#criterion-${firstMissingCriterion.code}`:"#minh-chung-can-bo-sung"}`;
  const detailItems=criteria.map((criterion) => ({
    ...criterion,
    auto_message: formatAutoCriteriaMessage(criterion.auto_message,criterion.matched_activity_titles),
    files: files.filter((file) => file.criteria_code === criterion.code).map((file) => ({id:Number(file.id),fileName:String(file.file_name ?? ""),mimeType:String(file.mime_type ?? "")})),
  })).filter((criterion) => Number(criterion.is_required) === 1 || Number(criterion.auto_passed ?? 0) === 1 || Boolean(criterion.content_text?.trim()) || criterion.files.length > 0);

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)] shadow-slate-200/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <FileText size={26} />
            </div>

            <div>
              <h1 className="text-2xl font-semibold">
                {submission.event_title}
              </h1>
            </div>
          </div>

          <Link
            href="/dashboard/student/submissions"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
           data-back-link>
            <ArrowLeft size={16} />
            Quay về
          </Link>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold text-slate-900">Thông tin hồ sơ</h2><SubmissionStatusBadge status={submission.status}/></div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Info
            label="Ngày nộp"
            value={
              submission.submitted_at
                ? formatDateTimeVN(submission.submitted_at)
                : "Chưa nộp"
            }
          />
          <Info label="Cập nhật gần nhất" value={formatDateTimeVN(submission.updated_at)} />
          <Info
            label="Thời gian đợt xét"
            value={`${formatDateTimeVN(submission.event_start_at)} → ${formatDateTimeVN(
              submission.event_end_at
            )}`}
          />
        </div>

      </section>

      <SubmissionSupportCard submissionId={submissionId} isDraft={!submission.submitted_at}/>


      <ReviewHistory
        items={reviewItems}
        timeline={timeline}
        title="Kết quả xét duyệt"
        emptyMessage="Chưa có phản hồi xét duyệt."
        resultsOnly
      />

      <StudentSubmissionCriteriaList
        items={detailItems}
        editable={editable}
        editHref={editable ? editHref : undefined}
        headerAction={exportToken?<SubmissionExportButtons url={`/api/submissions/${exportToken}/export`}/>:null}
      />

    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 shadow-md shadow-slate-200/60">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

