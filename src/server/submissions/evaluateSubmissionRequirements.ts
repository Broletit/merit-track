import type Database from "better-sqlite3";

type Mode="candidate"|"approved";
type Row={code:string;title:string;group_code:string;group_title:string;min_required:number;is_required:number;auto_passed:number;file_count:number;content_text:string|null;review_decision:string|null};

export function evaluateSubmissionRequirements(db:Database.Database,submissionId:number,mode:Mode="candidate"){
  const submission=db.prepare(`SELECT status FROM submissions WHERE id=?`).get(submissionId) as {status:string}|undefined;
  const round=submission?.status==="submitted_v2"||submission?.status==="needs_revision_v2"?2:1;
  const rows=db.prepare(`
    SELECT i.code,i.title,i.group_code,g.title group_title,g.min_required,i.is_required,
      EXISTS(SELECT 1 FROM submission_auto_results ar WHERE ar.submission_id=s.id AND ar.criteria_code=i.code AND ar.passed=1) auto_passed,
      (SELECT COUNT(*) FROM submission_files sf WHERE sf.submission_id=s.id AND sf.criteria_code=i.code) file_count,
      (SELECT si.content_text FROM submission_items si WHERE si.submission_id=s.id AND si.criteria_code=i.code LIMIT 1) content_text,
      (SELECT cr.decision FROM submission_criteria_reviews cr WHERE cr.submission_id=s.id AND cr.criteria_code=i.code AND cr.round=? LIMIT 1) review_decision
    FROM submissions s INNER JOIN event_criteria_items i ON i.event_id=s.event_id
    INNER JOIN event_criteria_groups g ON g.event_id=i.event_id AND g.code=i.group_code
    WHERE s.id=? ORDER BY g.sort_order,i.sort_order,i.id
  `).all(round,submissionId) as Row[];
  const missingCriteria:Array<{code:string;title:string}>=[];
  const groups=new Map<string,{title:string;required:number;achieved:number}>();
  for(const item of rows){
    const auto=Number(item.auto_passed)===1;
    const evidence=Number(item.file_count)>0||Boolean(item.content_text?.trim());
    const satisfied=auto||(mode==="candidate"?evidence:item.review_decision==="pass");
    const group=groups.get(item.group_code)??{title:item.group_title,required:Number(item.min_required??0),achieved:0};
    if(satisfied)group.achieved+=1;
    groups.set(item.group_code,group);
    if(Number(item.is_required)===1&&!satisfied)missingCriteria.push({code:item.code,title:item.title});
  }
  const deficientGroups=Array.from(groups,([code,g])=>({code,title:g.title,achieved:g.achieved,required:g.required})).filter(g=>g.achieved<g.required);
  return {valid:missingCriteria.length===0&&deficientGroups.length===0,missingCriteria,deficientGroups};
}

export function assertSubmissionRequirements(db:Database.Database,submissionId:number,mode:Mode="candidate"){
  const result=evaluateSubmissionRequirements(db,submissionId,mode);
  if(result.valid)return result;
  const details:string[]=[];
  if(result.missingCriteria.length)details.push(`tiêu chí bắt buộc chưa đạt: ${result.missingCriteria.slice(0,5).map(i=>`${i.code} - ${i.title}`).join("; ")}`);
  if(result.deficientGroups.length)details.push(`chưa đủ số tiêu chí đạt: ${result.deficientGroups.map(g=>`${g.code} - ${g.title} (${g.achieved}/${g.required})`).join("; ")}`);
  throw new Error(`Hồ sơ chưa đáp ứng điều kiện xét: ${details.join(". ")}.`);
}
