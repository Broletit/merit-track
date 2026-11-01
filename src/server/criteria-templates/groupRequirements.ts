import type { Database } from "@/server/db/mysql";
export async function syncGroupMinimum(db:Database,templateId:number,groupCode?:string,afterDeletion=false){
 const groups=(await db.rows("SELECT code,min_required FROM criteria_template_groups WHERE template_id=?"+(groupCode?" AND code=?":""), [...(groupCode?[templateId,groupCode]:[templateId])])) as Array<{code:string;min_required:number}>;
 for(const group of groups){
  const counts=(await db.first("SELECT COUNT(*) total,COALESCE(SUM(CASE WHEN is_required=1 THEN 1 ELSE 0 END),0) mandatory FROM criteria_template_items WHERE template_id=? AND group_code=?", [templateId, group.code])) as {total:number;mandatory:number};
  const minimum=Math.max(counts.mandatory,afterDeletion?Math.min(group.min_required,counts.total):group.min_required);
  if(minimum!==group.min_required)(await db.execute("UPDATE criteria_template_groups SET min_required=? WHERE template_id=? AND code=?", [minimum, templateId, group.code]));
 }
}
export async function assertTemplateReady(db:Database,templateId:number){
 const groups=(await db.rows("SELECT g.code,g.min_required,COUNT(i.code) total,COALESCE(SUM(CASE WHEN i.is_required=1 THEN 1 ELSE 0 END),0) mandatory FROM criteria_template_groups g LEFT JOIN criteria_template_items i ON i.template_id=g.template_id AND i.group_code=g.code WHERE g.template_id=? GROUP BY g.code,g.min_required", [templateId])) as Array<{code:string;min_required:number;total:number;mandatory:number}>;
 if(!groups.length)throw new Error("Bộ tiêu chuẩn chưa có tiêu chuẩn và tiêu chí để sử dụng.");
 for(const group of groups){
  if(!group.total)throw new Error("Tiêu chuẩn "+group.code+" chưa có tiêu chí.");
  if(!Number.isInteger(group.min_required)||group.min_required<0||group.min_required>group.total)throw new Error("Tiêu chuẩn "+group.code+" yêu cầu số tiêu chí tối thiểu không hợp lệ; hiện có "+group.total+" tiêu chí.");
 }
}
