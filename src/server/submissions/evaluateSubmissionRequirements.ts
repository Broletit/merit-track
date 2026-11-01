import type { Database } from "@/server/db/mysql";

type Mode="candidate"|"approved";
type Row={code:string;title:string;group_code:string;group_title:string;min_required:number;is_required:number;auto_passed:number;file_count:number;content_text:string|null;review_decision:string|null};

export async function evaluateSubmissionRequirements(db:Database,submissionId:number,mode:Mode="candidate"){
  const submission=(await db.first(`SELECT review_round FROM submissions WHERE id=?`, [submissionId])) as {review_round:number}|undefined;
  const round=Number(submission?.review_round)===2?2:1;
  const rows=(await db.rows(`
    SELECT i.code,i.title,i.group_code,g.title group_title,g.min_required,i.is_required,
      EXISTS(SELECT 1 FROM submission_auto_results ar WHERE ar.submission_id=s.id AND ar.criteria_code=i.code AND ar.passed=1) auto_passed,
      (SELECT COUNT(*) FROM submission_ready_files sf WHERE sf.submission_id=s.id AND sf.criteria_code=i.code) file_count,
      (SELECT si.content_text FROM submission_items si WHERE si.submission_id=s.id AND si.criteria_code=i.code LIMIT 1) content_text,
      (SELECT cr.decision FROM submission_criteria_reviews cr WHERE cr.submission_id=s.id AND cr.criteria_code=i.code AND cr.round=? LIMIT 1) review_decision
    FROM submissions s INNER JOIN event_criteria_items i ON i.event_id=s.event_id
    INNER JOIN event_criteria_groups g ON g.event_id=i.event_id AND g.code=i.group_code
    WHERE s.id=? ORDER BY g.sort_order,i.sort_order,i.id
  `, [round, submissionId])) as Row[];
  const missingCriteria:Array<{code:string;title:string}>=[];
  const configuredGroups=(await db.rows("SELECT g.code,g.title,g.min_required FROM event_criteria_groups g INNER JOIN submissions s ON s.event_id=g.event_id WHERE s.id=? ORDER BY g.sort_order", [submissionId])) as Array<{code:string;title:string;min_required:number}>;
  const groups=new Map(configuredGroups.map(group=>[group.code,{title:group.title,required:Number(group.min_required),achieved:0,mandatory:0,missingRequired:0,total:0}]));
  for(const item of rows){
    const auto=Number(item.auto_passed)===1;
    const evidence=Number(item.file_count)>0;
    const satisfied=mode==="candidate" ? auto||evidence : item.review_decision!=="fail"&&(auto||(evidence&&item.review_decision==="pass"));
    const group=groups.get(item.group_code)??{title:item.group_title,required:Number(item.min_required??0),achieved:0,mandatory:0,missingRequired:0,total:0};
    group.total+=1;
    if(Number(item.is_required)===1){ group.mandatory+=1; if(!satisfied)group.missingRequired+=1; }
    group.required=Math.max(group.required,group.mandatory);
    if(satisfied)group.achieved+=1;
    groups.set(item.group_code,group);
    if(Number(item.is_required)===1&&!satisfied)missingCriteria.push({code:item.code,title:item.title});
  }
  const deficientGroups=Array.from(groups,([code,g])=>({code,title:g.title,achieved:g.achieved,required:g.required})).filter(g=>g.achieved<g.required||groups.get(g.code)?.total===0);
  const groupResults=Array.from(groups,([code,g])=>({code,title:g.title,required:g.required,achieved:g.achieved,passed:g.total>0&&g.missingRequired===0&&g.achieved>=g.required}));
  return {valid:groupResults.length>0&&missingCriteria.length===0&&deficientGroups.length===0,missingCriteria,deficientGroups,groupResults};
}

export async function assertSubmissionRequirements(db:Database,submissionId:number,mode:Mode="candidate"){
  const result=(await evaluateSubmissionRequirements(db,submissionId,mode));
  if(result.valid)return result;
  const details:string[]=[];
  if(result.missingCriteria.length)details.push(`tiêu chí bắt buộc chưa đạt: ${result.missingCriteria.slice(0,5).map(i=>`${i.code} - ${i.title}`).join("; ")}`);
  if(result.deficientGroups.length)details.push(`chưa đủ số tiêu chí đạt: ${result.deficientGroups.map(g=>`${g.code} - ${g.title} (${g.achieved}/${g.required})`).join("; ")}`);
  throw new Error(`Hồ sơ chưa đáp ứng điều kiện xét: ${details.join(". ")}.`);
}
