"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { assertTemplateReady } from "@/server/criteria-templates/groupRequirements";
import { writeAuditLog } from "@/server/audit/writeAuditLog";

type Draft = { draft_template_id:number; status:string };
type Event = { id:number; title:string };

export async function applyCriteriaTemplateEdit(templateId:number) {
  const admin=await requireAdminContext();
  const db=getDatabase();
  if(!Number.isSafeInteger(templateId)||templateId<=0)throw new Error("Bộ tiêu chuẩn không hợp lệ.");
  const draft=await db.first<Draft>("SELECT draft_template_id,status FROM criteria_template_edit_drafts WHERE original_template_id=?",[templateId]);
  if(!draft)throw new Error("Chưa có bản chỉnh sửa để lưu.");
  if(draft.status==="processing")return {ok:true,message:"Đang cập nhật các hồ sơ và báo cáo."};
  await assertTemplateReady(db,draft.draft_template_id);
  const snapshot = async (id:number) => JSON.stringify(await Promise.all([
    db.rows("SELECT code,title,description,min_required,score_max,sort_order FROM criteria_template_groups WHERE template_id=? ORDER BY code",[id]),
    db.rows("SELECT group_code,code,title,description,score_max,evidence_type,is_required,required_count,sort_order FROM criteria_template_items WHERE template_id=? ORDER BY code",[id]),
    db.rows("SELECT criteria_code,activity_id,score_value FROM criteria_activity_rules WHERE template_id=? ORDER BY criteria_code,activity_id",[id]),
    db.rows("SELECT criteria_code,min_score,period_scope FROM criteria_conduct_rules WHERE template_id=? ORDER BY criteria_code",[id]),
  ]));
  if(await snapshot(templateId)===await snapshot(draft.draft_template_id))throw new Error("Chưa có thay đổi nào để lưu.");
  const events=await db.rows<Event>("SELECT id,title FROM events WHERE criteria_template_id=? ORDER BY id",[templateId]);
  await db.withTransaction(async()=>{
    const current=await db.first<Draft>("SELECT draft_template_id,status FROM criteria_template_edit_drafts WHERE original_template_id=? FOR UPDATE",[templateId]);
    if(!current||current.status!=="editing"||current.draft_template_id!==draft.draft_template_id)throw new Error("Bản chỉnh sửa đã được cập nhật. Vui lòng tải lại trang.");
    await db.execute("DELETE FROM criteria_activity_rules WHERE template_id=?",[templateId]);
    await db.execute("DELETE FROM criteria_conduct_rules WHERE template_id=?",[templateId]);
    await db.execute("DELETE FROM criteria_template_items WHERE template_id=?",[templateId]);
    await db.execute("DELETE FROM criteria_template_groups WHERE template_id=?",[templateId]);
    await db.execute("INSERT INTO criteria_template_groups(template_id,code,title,description,min_required,sort_order,score_max) SELECT ?,code,title,description,min_required,sort_order,score_max FROM criteria_template_groups WHERE template_id=?",[templateId,draft.draft_template_id]);
    await db.execute("INSERT INTO criteria_template_items(template_id,group_code,code,title,description,score_max,evidence_type,is_required,required_count,sort_order) SELECT ?,group_code,code,title,description,score_max,evidence_type,is_required,required_count,sort_order FROM criteria_template_items WHERE template_id=?",[templateId,draft.draft_template_id]);
    await db.execute("INSERT INTO criteria_activity_rules(template_id,criteria_code,activity_id,score_value) SELECT ?,criteria_code,activity_id,score_value FROM criteria_activity_rules WHERE template_id=?",[templateId,draft.draft_template_id]);
    await db.execute("INSERT INTO criteria_conduct_rules(template_id,criteria_code,min_score,period_scope) SELECT ?,criteria_code,min_score,period_scope FROM criteria_conduct_rules WHERE template_id=?",[templateId,draft.draft_template_id]);
    for(const event of events){
      await db.execute("DELETE FROM event_criteria_items WHERE event_id=?",[event.id]);
      await db.execute("DELETE FROM event_criteria_groups WHERE event_id=?",[event.id]);
      await db.execute(`INSERT INTO event_criteria_groups(event_id,code,title,description,min_required,score_max,sort_order)
        SELECT ?,code,title,description,min_required,score_max,sort_order FROM criteria_template_groups WHERE template_id=?`,[event.id,templateId]);
      await db.execute(`INSERT INTO event_criteria_items(event_id,group_code,code,title,description,score_max,evidence_type,is_required,required_count,sort_order)
        SELECT ?,group_code,code,title,description,score_max,evidence_type,is_required,required_count,sort_order FROM criteria_template_items WHERE template_id=?`,[event.id,templateId]);
      await db.execute("DELETE ar FROM submission_auto_results ar INNER JOIN submissions s ON s.id=ar.submission_id WHERE s.event_id=?",[event.id]);
    }
    await db.execute("UPDATE criteria_template_edit_drafts SET status='processing',stage='submissions',submission_cursor=0,cache_event_cursor=0,cache_user_cursor=0 WHERE original_template_id=?",[templateId]);
    await writeAuditLog({db,actorUserId:admin.id,action:"criteria_template.apply",entityType:"criteria_template",entityId:templateId,reason:"Xác nhận cập nhật bộ tiêu chuẩn cho các đợt xét và tính lại hồ sơ",before:null,after:{draftId:draft.draft_template_id,eventIds:events.map(event=>event.id)}});
  });
  revalidatePath(`/dashboard/admin/criteria-templates/${templateId}/configure`);
  revalidatePath("/dashboard/admin/events");
  for(const event of events)revalidatePath(`/dashboard/admin/events/${event.id}`);
  return {ok:true,message:`Đã cập nhật cấu hình cho ${events.length} đợt xét. Đang tính lại hồ sơ và báo cáo.`};
}
