import { notFound } from "next/navigation";
import { requireStudentContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import StudentEventDetailHeader from "@/components/student/events/StudentEventDetailHeader";
import StudentEventDetailCard from "@/components/student/events/StudentEventDetailCard";
import StudentEventApplyForm from "@/components/student/events/StudentEventApplyForm";
import StudentSubmissionEvidenceForm from "@/components/student/submissions/StudentSubmissionEvidenceForm";
import { ensureActivityConductScores } from "@/server/conduct/ensureActivityConductScores";
import type {
  StudentEventCriteriaItem,
  StudentEventDetail,
} from "@/components/student/events/types";
import { canSubmitToEvent } from "@/lib/events/eventSubmissionPhase";
import { canEditSubmission } from "@/lib/submissions/submissionStatus";

type EventRow = {
  id: number;
  title: string;
  description: string | null;
  type: string;
  status: string;
  start_at: string;
  end_at: string;
  allow_late: number;
  term_id: number | null;
  criteria_template_id: number | null;
  submission_id: number | null;
  submission_status: string | null;
};

type CriteriaRow = {
  code: string;
  title: string;
  description: string | null;
  group_code: string;
  group_title: string;
  is_required: number;
  auto_passed: number;
  auto_message: string | null;
};

export default async function StudentEventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{edit?:string}>;
}) {
  const user = await requireStudentContext();
  const { id } = await params;
  const query=await searchParams;
  const eventId = Number(id);

  if (!Number.isFinite(eventId) || eventId <= 0) notFound();

  const db = getDb();
  ensureActivityConductScores();
  
  const event = db
    .prepare(
      `
      SELECT
        e.id,
        e.title,
        e.description,
        e.type,
        e.status,
        e.start_at,
        e.end_at,
        e.allow_late,
        e.term_id,
        e.criteria_template_id,
        s.id AS submission_id,
        s.status AS submission_status
      FROM events e
      LEFT JOIN submissions s
        ON s.event_id = e.id
       AND s.user_id = ?
      WHERE e.id = ?
        AND e.status = 'published'
        AND e.type = 'student'
      LIMIT 1
      `
    )
    .get(user.id, eventId) as EventRow | undefined;

  if (!event) notFound();

  const allowLate = Number(event.allow_late ?? 0) === 1;

  const canSubmit =
    canSubmitToEvent({
      status: event.status,
      startAt: event.start_at,
      endAt: event.end_at,
      allowLate,
    }) &&
    (!event.submission_status || canEditSubmission(String(event.submission_status)));

  const templateId = Number(event.criteria_template_id ?? 0);

  const criteriaRows =
    templateId > 0
      ? (db
          .prepare(
            `
            SELECT
              cti.code,
              cti.title,
              cti.description,
              cti.group_code,
              ctg.title AS group_title,
              cti.is_required,

              CASE
                WHEN attended.activity_title IS NOT NULL THEN 1
                WHEN conduct_result.passed = 1 THEN 1
                ELSE 0
              END AS auto_passed,

              CASE
                WHEN attended.activity_title IS NOT NULL
                  THEN 'Đạt tự động từ hoạt động: ' || attended.activity_title

                WHEN conduct_result.passed = 1
                  THEN 'Đạt tự động từ điểm rèn luyện: ' || conduct_result.total_score || ' điểm'

                WHEN conduct_result.min_score IS NOT NULL
                  THEN 'Cần đạt tối thiểu ' || conduct_result.min_score || ' điểm rèn luyện. Hiện có ' || conduct_result.total_score || ' điểm.'

                WHEN EXISTS (
                  SELECT 1
                  FROM criteria_activity_rules car
                  WHERE car.template_id = ?
                    AND car.criteria_code = cti.code
                )
                  THEN 'Có hoạt động có thể đáp ứng tiêu chí này.'

                ELSE NULL
              END AS auto_message

            FROM criteria_template_items cti

            INNER JOIN criteria_template_groups ctg
              ON ctg.template_id = cti.template_id
             AND ctg.code = cti.group_code

            LEFT JOIN (
              SELECT
                car.criteria_code,
                MIN(a.title) AS activity_title
              FROM criteria_activity_rules car
              INNER JOIN activities a ON a.id = car.activity_id
              INNER JOIN activity_registrations ar
                ON ar.activity_id = a.id
               AND ar.user_id = ?
               AND ar.status = 'attended'
              WHERE car.template_id = ?
              GROUP BY car.criteria_code
            ) attended
              ON attended.criteria_code = cti.code

            LEFT JOIN (
              SELECT
                ccr.criteria_code,
                ccr.min_score,
                COALESCE(SUM(cs.score_value), 0) AS total_score,
                CASE
                  WHEN COALESCE(SUM(cs.score_value), 0) >= ccr.min_score THEN 1
                  ELSE 0
                END AS passed
              FROM criteria_conduct_rules ccr
              LEFT JOIN conduct_scores cs
                ON cs.user_id = ?
               AND cs.period_id IN (
                 SELECT cp.id
                 FROM conduct_periods cp
                 INNER JOIN academic_terms term
                   ON term.academic_year = cp.academic_year
                  AND term.semester = cp.semester
                 WHERE term.id = ?
               )
              WHERE ccr.template_id = ?
              GROUP BY ccr.criteria_code
            ) conduct_result
              ON conduct_result.criteria_code = cti.code

            WHERE cti.template_id = ?

            ORDER BY
              ctg.sort_order ASC,
              cti.sort_order ASC
            `
          )
          .all(
            templateId,
            user.id,
            templateId,
            user.id,
            event.term_id,
            templateId,
            templateId
          ) as CriteriaRow[])
      : [];

  const item: StudentEventDetail = {
    id: Number(event.id),
    title: String(event.title ?? ""),
    description: event.description ? String(event.description) : "",
    type: String(event.type ?? ""),
    status: String(event.status ?? ""),
    startAt: String(event.start_at ?? ""),
    endAt: String(event.end_at ?? ""),
    allowLate,
    submissionId: event.submission_id ? Number(event.submission_id) : null,
    submissionStatus: event.submission_status
      ? String(event.submission_status)
      : null,
    canSubmit,
  };

  const criteria: StudentEventCriteriaItem[] = criteriaRows.map((row) => ({
    code: String(row.code ?? ""),
    title: String(row.title ?? ""),
    description: row.description ? String(row.description) : null,
    groupCode: String(row.group_code ?? ""),
    groupTitle: String(row.group_title ?? ""),
    isRequired: Number(row.is_required ?? 0) === 1,
    autoPassed: Number(row.auto_passed ?? 0) === 1,
    autoMessage: row.auto_message ? String(row.auto_message) : null,
  }));
  const editing=query.edit==="1"&&Boolean(event.submission_id)&&canSubmit;
  const editCriteria=editing?db.prepare(`SELECT i.code,i.title,i.description,i.group_code,g.title group_title,g.min_required,i.is_required,ar.passed auto_passed,ar.message auto_message,si.content_text,(SELECT sf.file_name FROM submission_files sf WHERE sf.submission_id=? AND sf.criteria_code=i.code ORDER BY sf.uploaded_at DESC,sf.id DESC LIMIT 1) file_name FROM event_criteria_items i INNER JOIN event_criteria_groups g ON g.event_id=i.event_id AND g.code=i.group_code LEFT JOIN submission_auto_results ar ON ar.submission_id=? AND ar.criteria_code=i.code LEFT JOIN submission_items si ON si.submission_id=? AND si.criteria_code=i.code WHERE i.event_id=? ORDER BY g.sort_order,i.sort_order`).all(event.submission_id,event.submission_id,event.submission_id,event.id) as Array<{code:string;title:string;description:string|null;group_code:string;group_title:string;min_required:number;is_required:number;auto_passed:number|null;auto_message:string|null;content_text:string|null;file_name:string|null}>:[];

  return (
    <main className="space-y-6">
      <StudentEventDetailHeader item={item} />
      <StudentEventDetailCard item={item} showAction={!editing} />
      {editing?<div id="minh-chung-can-bo-sung" className="scroll-mt-24"><StudentSubmissionEvidenceForm submissionId={Number(event.submission_id)} canEdit criteria={editCriteria.map((row)=>{const preview=criteria.find((item)=>item.code===row.code);return {code:row.code,title:row.title,description:row.description,groupCode:row.group_code,groupTitle:row.group_title,minRequired:Number(row.min_required),isRequired:Number(row.is_required)===1,autoPassed:Number(row.auto_passed??0)===1||Boolean(preview?.autoPassed),autoMessage:row.auto_message??preview?.autoMessage??null,contentText:row.content_text,fileName:row.file_name};})}/></div>:<StudentEventApplyForm
        eventId={item.id}
        criteria={criteria}
        canSubmit={canSubmit}
      />}
    </main>
  );
}
