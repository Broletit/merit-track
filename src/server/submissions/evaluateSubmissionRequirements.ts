import type { Database } from "@/server/db/mysql";

type Mode = "candidate" | "approved";
type CriterionRow = { code:string; title:string; group_code:string; group_title:string; min_required:number; is_required:number; evidence_type:"auto"|"manual"|"both"; required_count:number; matched_count:number|null; matched_activity_ids:string|null; legacy_review:string|null };
type ManualUnitRow = { criteria_code:string; related_activity_id:number|null; claimed_count:number; approved_count:number|null; decision:string|null };
export type CriterionProgress = { code:string; title:string; evidenceType:"auto"|"manual"|"both"; required:number; automatic:number; manual:number; confirmed:number; provided:number; satisfied:boolean };

function parseActivityIds(value:string|null) {
  try { const parsed=JSON.parse(value??"[]"); return new Set(Array.isArray(parsed)?parsed.map(Number).filter(Number.isFinite):[]); }
  catch { return new Set<number>(); }
}

export async function evaluateSubmissionRequirements(db:Database,submissionId:number,mode:Mode="candidate") {
  const submission=await db.first<{review_round:number}>("SELECT review_round FROM submissions WHERE id=?",[submissionId]);
  const round=Number(submission?.review_round)===2?2:1;
  const rows=await db.rows<CriterionRow>(`
    SELECT i.code,i.title,i.group_code,g.title group_title,g.min_required,i.is_required,i.evidence_type,
      GREATEST(1,COALESCE(i.required_count,1)) required_count,ar.matched_count,ar.matched_activity_ids,
      (SELECT cr.decision FROM submission_criteria_reviews cr WHERE cr.submission_id=s.id AND cr.criteria_code=i.code AND cr.round=? LIMIT 1) legacy_review
    FROM submissions s INNER JOIN event_criteria_items i ON i.event_id=s.event_id
    INNER JOIN event_criteria_groups g ON g.event_id=i.event_id AND g.code=i.group_code
    LEFT JOIN submission_auto_results ar ON ar.submission_id=s.id AND ar.criteria_code=i.code
    WHERE s.id=? ORDER BY g.sort_order,i.sort_order,i.id`,[round,submissionId]);
  const units=await db.rows<ManualUnitRow>(`SELECT eu.criteria_code,eu.related_activity_id,GREATEST(1,COALESCE(eu.claimed_count,1)) claimed_count,er.approved_count,er.decision
    FROM submission_evidence_units eu LEFT JOIN submission_evidence_reviews er ON er.evidence_unit_id=eu.id AND er.round=?
    WHERE eu.submission_id=?
      AND (eu.related_activity_id IS NOT NULL OR EXISTS(SELECT 1 FROM submission_files sf WHERE sf.evidence_unit_id=eu.id AND sf.status='ready'))`,[round,submissionId]);
  const unitsByCriterion=new Map<string,ManualUnitRow[]>();
  for(const unit of units)unitsByCriterion.set(unit.criteria_code,[...(unitsByCriterion.get(unit.criteria_code)??[]),unit]);
  const configuredGroups=await db.rows<{code:string;title:string;min_required:number}>("SELECT g.code,g.title,g.min_required FROM event_criteria_groups g INNER JOIN submissions s ON s.event_id=g.event_id WHERE s.id=? ORDER BY g.sort_order",[submissionId]);
  const groups=new Map(configuredGroups.map(group=>[group.code,{title:group.title,required:Number(group.min_required),achieved:0,mandatory:0,missingRequired:0,total:0}]));
  const missingCriteria:Array<{code:string;title:string}>=[];
  const criterionProgress:CriterionProgress[]=[];
  for(const item of rows){
    const automatic=item.evidence_type==="manual"?0:Number(item.matched_count??0);
    const autoActivities=parseActivityIds(item.matched_activity_ids);
    const rawUnits=item.evidence_type==="auto"?[]:(unitsByCriterion.get(item.code)??[]);
    const providedUnits=rawUnits.filter(unit=>!unit.related_activity_id||!autoActivities.has(Number(unit.related_activity_id)));
    const provided=providedUnits.reduce((sum,unit)=>sum+Math.max(1,Number(unit.claimed_count??1)),0);
    const confirmedManual=mode==="candidate"?provided:providedUnits.filter(unit=>unit.decision==="pass").reduce((sum,unit)=>sum+Math.max(1,Number(unit.approved_count??unit.claimed_count??1)),0);
    const legacyApproved=mode==="approved"&&item.legacy_review==="pass"&&confirmedManual===0?1:0;
    const manual=item.evidence_type==="auto"?0:confirmedManual+legacyApproved;
    const confirmed=automatic+manual;
    const satisfied=confirmed>=Number(item.required_count);
    criterionProgress.push({code:item.code,title:item.title,evidenceType:item.evidence_type,required:Number(item.required_count),automatic,manual,confirmed,provided,satisfied});
    const group=groups.get(item.group_code)??{title:item.group_title,required:Number(item.min_required),achieved:0,mandatory:0,missingRequired:0,total:0};
    group.total+=1;
    if(Number(item.is_required)===1){group.mandatory+=1;if(!satisfied)group.missingRequired+=1;}
    group.required=Math.max(group.required,group.mandatory);
    if(satisfied)group.achieved+=1;
    groups.set(item.group_code,group);
    if(Number(item.is_required)===1&&!satisfied)missingCriteria.push({code:item.code,title:item.title});
  }
  const groupResults=Array.from(groups,([code,group])=>({code,title:group.title,required:group.required,achieved:group.achieved,passed:group.total>0&&group.missingRequired===0&&group.achieved>=group.required}));
  const deficientGroups=groupResults.filter(group=>!group.passed).map(({code,title,achieved,required})=>({code,title,achieved,required}));
  return {valid:groupResults.length>0&&missingCriteria.length===0&&deficientGroups.length===0,missingCriteria,deficientGroups,groupResults,criterionProgress};
}

export async function assertSubmissionRequirements(db:Database,submissionId:number,mode:Mode="candidate"){
  const result=await evaluateSubmissionRequirements(db,submissionId,mode);
  if(result.valid)return result;
  const details:string[]=[];
  if(result.missingCriteria.length)details.push(`tiêu chí bắt buộc chưa đạt: ${result.missingCriteria.slice(0,5).map(item=>`${item.code} - ${item.title}`).join("; ")}`);
  if(result.deficientGroups.length)details.push(`chưa đủ số tiêu chí đạt: ${result.deficientGroups.map(group=>`${group.code} - ${group.title} (${group.achieved}/${group.required})`).join("; ")}`);
  throw new Error(`Hồ sơ chưa đáp ứng điều kiện xét: ${details.join(". ")}.`);
}
