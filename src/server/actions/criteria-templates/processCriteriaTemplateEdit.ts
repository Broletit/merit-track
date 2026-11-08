"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { evaluateSubmissionAuto } from "@/server/events/evaluateSubmissionAuto";
import { evaluateSubmission } from "@/server/submissions/evaluateSubmission";
import { evaluateSubmissionRequirements } from "@/server/submissions/evaluateSubmissionRequirements";
import { evaluateAutoCriteria } from "@/server/events/evaluateAutoCriteria";

type Draft={draft_template_id:number;status:string;stage:string;submission_cursor:number;cache_event_cursor:number;cache_user_cursor:number};
type Submission={id:number;event_id:number;status:string;event_status:string;event_type:string;end_at:string;user_id:number};
type CacheRow={event_id:number;user_id:number;assessment_type:"student"|"officer"};
type Criterion={code:string;group_code:string;group_title:string;is_required:number;min_required:number};

function assess(criteria:Criterion[],passed:Set<string>){
  const groups=new Map<string,{title:string;achieved:number;total:number;minimum:number;mandatory:number;missingMandatory:number}>();
  for(const item of criteria){
    const group=groups.get(item.group_code)??{title:item.group_title,achieved:0,total:0,minimum:Number(item.min_required),mandatory:0,missingMandatory:0};
    group.total++;
    if(Number(item.is_required)===1)group.mandatory++;
    if(passed.has(item.code))group.achieved++;
    else if(Number(item.is_required)===1)group.missingMandatory++;
    groups.set(item.group_code,group);
  }
  const standardProgress=Array.from(groups,([code,group])=>{
    const required=Math.max(group.minimum,group.mandatory);
    const credited=Math.min(group.achieved,required);
    return {code,title:group.title,achieved:group.achieved,total:group.total,required,credited,missingMandatory:group.missingMandatory,percent:required?Math.round(credited/required*100):100};
  });
  const requiredTotal=standardProgress.reduce((sum,g)=>sum+g.required,0);
  const creditedTotal=standardProgress.reduce((sum,g)=>sum+g.credited,0);
  const missingRequired=Array.from(groups.values()).reduce((sum,g)=>sum+g.missingMandatory+Math.max(0,g.minimum-g.achieved-g.missingMandatory),0);
  const progressPercent=requiredTotal?Math.round(creditedTotal/requiredTotal*10000)/100:0;
  return {achieved:passed.size,total:criteria.length,missingRequired,progressPercent,standardProgress,isEligible:criteria.length>0&&missingRequired===0&&progressPercent>=100};
}

export async function processCriteriaTemplateEdit(templateId:number){
  await requireAdminContext();
  const db=getDatabase();
  const draft=await db.first<Draft>("SELECT * FROM criteria_template_edit_drafts WHERE original_template_id=?",[templateId]);
  if(!draft)return {done:true,processed:0};
  if(draft.status!=="processing")throw new Error("Chưa xác nhận lưu bộ tiêu chuẩn.");
  if(draft.stage==="submissions"){
    const rows=await db.rows<Submission>(`SELECT s.id,s.event_id,s.user_id,s.status,e.status event_status,e.type event_type,e.end_at
      FROM submissions s INNER JOIN events e ON e.id=s.event_id
      WHERE e.criteria_template_id=? AND s.id>? ORDER BY s.id LIMIT 20`,[templateId,draft.submission_cursor]);
    for(const row of rows){
      await evaluateSubmissionAuto(row.id);
      if(row.status!=="draft"){
        const requirements=await evaluateSubmissionRequirements(db,row.id,"approved");
        if(row.status==="passed"&&!requirements.valid){
          const nextStatus=row.event_status==="closed"||new Date(row.end_at).getTime()<Date.now()?"failed":"needs_revision_v2";
          await db.withTransaction(async()=>{
            await db.execute("UPDATE submissions SET status=?,updated_at=CURRENT_TIMESTAMP(3) WHERE id=? AND status='passed'",[nextStatus,row.id]);
            await db.execute("INSERT INTO submission_timeline(submission_id,action,from_status,to_status,message,created_at) VALUES(?,'criteria_update','passed',?,?,CURRENT_TIMESTAMP(3))",[row.id,nextStatus,"Bộ tiêu chuẩn thay đổi; hồ sơ không còn đáp ứng đủ điều kiện."]);
            await db.execute("UPDATE event_results SET result_code=?,result_label=?,updated_at=CURRENT_TIMESTAMP(3) WHERE submission_id=?",[nextStatus==="failed"?"FAIL":"PENDING",nextStatus==="failed"?"Không đạt":"Cần chỉnh sửa",row.id]);
          });
        }
      }
      if(row.event_type==="officer"){
        await evaluateSubmission(row.id);
        await db.execute("UPDATE event_results er INNER JOIN submissions s ON s.id=er.submission_id SET er.score_total=s.score_total,er.updated_at=CURRENT_TIMESTAMP(3) WHERE er.submission_id=?",[row.id]);
      }
      await db.execute("UPDATE criteria_template_edit_drafts SET submission_cursor=? WHERE original_template_id=? AND status='processing'",[row.id,templateId]);
    }
    if(rows.length===20)return {done:false,processed:rows.length};
    await db.execute("UPDATE criteria_template_edit_drafts SET stage='cache' WHERE original_template_id=?",[templateId]);
    return {done:false,processed:rows.length};
  }
  const cacheRows=await db.rows<CacheRow>(`SELECT rac.event_id,rac.user_id,rac.assessment_type FROM report_assessment_cache rac
    INNER JOIN events e ON e.id=rac.event_id WHERE e.criteria_template_id=?
    AND (rac.event_id>? OR (rac.event_id=? AND rac.user_id>?))
    ORDER BY rac.event_id,rac.user_id LIMIT 20`,[templateId,draft.cache_event_cursor,draft.cache_event_cursor,draft.cache_user_cursor]);
  let currentEvent=0;
  let criteria:Criterion[]=[];
  for(const row of cacheRows){
    if(row.event_id!==currentEvent){
      currentEvent=row.event_id;
      criteria=await db.rows<Criterion>(`SELECT i.code,i.group_code,g.title group_title,i.is_required,g.min_required FROM event_criteria_items i
        INNER JOIN event_criteria_groups g ON g.event_id=i.event_id AND g.code=i.group_code WHERE i.event_id=? ORDER BY g.sort_order,i.sort_order`,[row.event_id]);
    }
    const passed=new Set((await evaluateAutoCriteria({eventId:row.event_id,userId:row.user_id})).filter(item=>item.passed).map(item=>item.criteriaCode));
    const result=assess(criteria,passed);
    await db.execute(`UPDATE report_assessment_cache SET achieved_criteria=?,total_criteria=?,missing_required=?,is_eligible=?,progress_percent=?,standard_progress_json=?,refreshed_at=CURRENT_TIMESTAMP(3)
      WHERE event_id=? AND user_id=?`,[result.achieved,result.total,result.missingRequired,result.isEligible,result.progressPercent,JSON.stringify(result.standardProgress),row.event_id,row.user_id]);
    await db.execute("UPDATE criteria_template_edit_drafts SET cache_event_cursor=?,cache_user_cursor=? WHERE original_template_id=? AND status='processing'",[row.event_id,row.user_id,templateId]);
  }
  if(cacheRows.length===20)return {done:false,processed:cacheRows.length};
  await db.withTransaction(async()=>{
    const current=await db.first<Draft>("SELECT * FROM criteria_template_edit_drafts WHERE original_template_id=? FOR UPDATE",[templateId]);
    if(!current||current.status!=="processing")return;
    const events=await db.rows<{id:number}>("SELECT id FROM events WHERE criteria_template_id=?",[templateId]);
    for(const event of events){
      await db.execute("INSERT INTO report_cache_state(cache_key,revision,refreshed_at) VALUES(?,1,CURRENT_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE revision=revision+1,refreshed_at=CURRENT_TIMESTAMP(3)",[`event:${event.id}`]);
    }
    await db.execute(`INSERT INTO notifications(user_id,type,title,content,link,role_context)
      SELECT s.user_id,'criteria_template_updated','Đợt xét vừa được cập nhật lại bộ tiêu chuẩn',
        CONCAT('Đợt xét “',e.title,'” vừa được cập nhật lại bộ tiêu chuẩn. Vui lòng xem lại tiêu chí và kết quả hồ sơ của bạn.'),
        CASE WHEN e.type='student' THEN CONCAT('/dashboard/student/submissions/',s.id)
          WHEN u.role='faculty_officer' THEN CONCAT('/dashboard/faculty-officer/officer-submissions/detail/',s.id)
          ELSE CONCAT('/dashboard/class-officer/officer-submissions/detail/',s.id) END,
        CASE WHEN e.type='student' THEN 'student'
          WHEN u.role='faculty_officer' THEN 'faculty_officer' ELSE 'class_officer' END
      FROM submissions s INNER JOIN events e ON e.id=s.event_id INNER JOIN users u ON u.id=s.user_id
      WHERE e.criteria_template_id=?`,[templateId]);
    await db.execute("DELETE FROM criteria_template_edit_drafts WHERE original_template_id=?",[templateId]);
    await db.execute("DELETE FROM criteria_templates WHERE id=?",[current.draft_template_id]);
  });
  revalidatePath(`/dashboard/admin/criteria-templates/${templateId}/configure`);
  revalidatePath("/dashboard/admin/reports/student-awards");
  revalidatePath("/dashboard/admin/reports/officer-achievements");
  revalidatePath("/dashboard/admin/officer-reviews");
  revalidatePath("/dashboard/admin/submissions");
  revalidatePath("/dashboard/student/notifications");
  revalidatePath("/dashboard/class-officer/notifications");
  revalidatePath("/dashboard/faculty-officer/notifications");
  return {done:true,processed:cacheRows.length};
}
