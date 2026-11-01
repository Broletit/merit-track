import { notFound } from "next/navigation";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import ReviewHeader from "@/components/shared/reviews/ReviewHeader";
import ReviewHistory from "@/components/shared/reviews/ReviewHistory";
import SubmissionViewOverview from "@/components/shared/submissions/SubmissionViewOverview";
import SubmissionCriteriaDetailList from "@/components/shared/submissions/SubmissionCriteriaDetailList";
import SubmissionSupportCard from "@/components/shared/submissions/SubmissionSupportCard";
import { getSubmissionTimeline } from "@/server/submissions/getSubmissionTimeline";

type SubmissionRow={id:number;status:string;submitted_at:string|null;updated_at:string|null;review_round:number;event_title:string;event_end_at:string|null;student_name:string;mssv:string;class_code:string};
type CriteriaRow={code:string;title:string;description:string|null;group_code:string;group_title:string;min_required:number;evidence_type:string;is_required:number;auto_passed:number|null;auto_message:string|null;content_text:string|null;file_count:number;review_decision:string|null};
type FileRow={id:number;criteria_code:string;file_name:string;mime_type:string};
type ReviewRow={round:number;decision:string;note:string|null;reviewer_name:string|null};

export default async function AdminStudentSubmissionDetailPage({params}:{params:Promise<{id:string}>}){
  await requireAdminContext();
  const {id}=await params;
  const submissionId=await getDatabase().resolveRouteRecordId(id);
  if(!Number.isFinite(submissionId)||submissionId<=0)notFound();
  const db=getDatabase();
  const submission=(await db.first(`
    SELECT s.id,s.status,s.submitted_at,s.updated_at,s.review_round,e.title event_title,e.end_at event_end_at,
      u.full_name student_name,u.mssv,COALESCE(c.code,'-') class_code
    FROM submissions s INNER JOIN events e ON e.id=s.event_id INNER JOIN users u ON u.id=s.user_id
    LEFT JOIN classes c ON c.id=s.class_id
    WHERE s.id=? AND e.type='student' AND (
      s.submitted_at IS NOT NULL OR EXISTS(SELECT 1 FROM submission_support_requests sr WHERE sr.submission_id=s.id AND sr.status='open')
    ) LIMIT 1
  `, [submissionId])) as SubmissionRow|undefined;
  if(!submission)notFound();

  const criteria=(await db.rows(`
    SELECT i.code,i.title,i.description,i.group_code,g.title group_title,g.min_required,i.evidence_type,i.is_required,
      ar.passed auto_passed,
      COALESCE(CASE WHEN ar.passed=1 AND TRIM(COALESCE(ar.matched_activity_titles,''))<>'' THEN CONCAT('Đạt tự động từ hoạt động: ', REPLACE(ar.matched_activity_titles,'||',', ')) END,ar.message) auto_message,
      si.content_text,
      (SELECT COUNT(*) FROM submission_ready_files sf WHERE sf.submission_id=s.id AND sf.criteria_code=i.code) file_count,
      (SELECT cr.decision FROM submission_criteria_reviews cr WHERE cr.submission_id=s.id AND cr.criteria_code=i.code AND cr.round=s.review_round LIMIT 1) review_decision
    FROM submissions s INNER JOIN event_criteria_items i ON i.event_id=s.event_id
    INNER JOIN event_criteria_groups g ON g.event_id=i.event_id AND g.code=i.group_code
    LEFT JOIN submission_auto_results ar ON ar.submission_id=s.id AND ar.criteria_code=i.code
    LEFT JOIN submission_items si ON si.submission_id=s.id AND si.criteria_code=i.code
    WHERE s.id=? ORDER BY g.sort_order,i.sort_order
  `, [submissionId])) as CriteriaRow[];
  const files=(await db.rows(`SELECT id,criteria_code,file_name,mime_type FROM submission_ready_files WHERE submission_id=? ORDER BY uploaded_at DESC,id DESC`, [submissionId])) as FileRow[];
  const reviews=(await db.rows(`SELECT r.round,r.decision,r.note,u.full_name reviewer_name FROM reviews r LEFT JOIN users u ON u.id=r.reviewer_id WHERE r.submission_id=? ORDER BY r.id`, [submissionId])) as ReviewRow[];
  const criteriaWithFiles=criteria.map(item=>({...item,evidence_files:files.filter(file=>file.criteria_code===item.code).map(file=>({id:Number(file.id),fileName:String(file.file_name??""),mimeType:String(file.mime_type??"")}))}));
  const achievedCriteria=criteria.filter(item=>Number(item.auto_passed)===1||item.review_decision==="pass").length;
  const reviewItems=reviews.map(item=>({round:Number(item.round),decision:String(item.decision??""),note:item.note?String(item.note):null,reviewerName:item.reviewer_name?String(item.reviewer_name):null}));
  const timeline=(await getSubmissionTimeline(submissionId));

  return <main className="space-y-6">
    <ReviewHeader title={submission.event_title} subtitle={`${submission.student_name} - ${submission.mssv} - ${submission.class_code}`} backHref="/dashboard/admin/submissions"/>
    <SubmissionSupportCard submissionId={submissionId} isDraft={!submission.submitted_at}/>
    {submission.submitted_at ? <SubmissionViewOverview status={submission.status} submittedAt={submission.submitted_at} updatedAt={submission.updated_at} closesAt={submission.event_end_at} currentRound={Number(submission.review_round??1)} achievedCriteria={achievedCriteria} totalCriteria={criteria.length}/> : null}
    {submission.submitted_at ? <ReviewHistory items={reviewItems} timeline={timeline}/> : null}
    <SubmissionCriteriaDetailList items={criteriaWithFiles}/>
  </main>;
}
