export type CandidateCriterion = {code:string;group_code:string|null;is_required:number;evidence_type?:string};
export function assessCandidateCriteria(criteria:CandidateCriterion[], groups:Array<{code:string;min_required:number}>, facts:{submitted:boolean;autoPassed:Set<string>;files:Set<string>;reviews:Map<string,string>}) {
 const passed=new Set<string>();
 const missing:Array<{code:string;reason:string}>=[];
 for(const criterion of criteria){
   const decision=facts.reviews.get(criterion.code);
   if(decision==='fail') {missing.push({code:criterion.code,reason:'Cán bộ đánh giá không đạt'});continue;}
   if(facts.autoPassed.has(criterion.code)){passed.add(criterion.code);continue;}
   if(!facts.files.has(criterion.code)){missing.push({code:criterion.code,reason:criterion.evidence_type==='auto'?'Chưa đạt điều kiện tự động':'Chưa nộp minh chứng'});continue;}
   if(decision==='pass'||!facts.submitted){passed.add(criterion.code);continue;}
   missing.push({code:criterion.code,reason:'Minh chứng chờ đánh giá'});
 }
 const deficientGroups=groups.filter(group=>criteria.filter(item=>item.group_code===group.code&&passed.has(item.code)).length<Math.max(Number(group.min_required),criteria.filter(item=>item.group_code===group.code&&Number(item.is_required)===1).length));
 const requiredMissing=criteria.filter(item=>Number(item.is_required)===1&&!passed.has(item.code)).length;
 return {passed:passed.size,total:criteria.length,missing,deficientGroups,blockingCount:requiredMissing+deficientGroups.length};
}
