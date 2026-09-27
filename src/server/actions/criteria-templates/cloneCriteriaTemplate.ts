"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { writeAuditLog } from "@/server/audit/writeAuditLog";

export async function cloneCriteriaTemplate(sourceId:number,formData:FormData){
  const admin=await requireAdminContext();const db=getDb();
  const source=db.prepare(`SELECT * FROM criteria_templates WHERE id=?`).get(sourceId) as Record<string,unknown>|undefined;
  if(!source)throw new Error("Bộ tiêu chuẩn nguồn không tồn tại.");
  let name=String(formData.get("name")??"").trim();const description=String(formData.get("description")??"").trim();const forType=String(formData.get("forType")??"").trim();
  if(!name)throw new Error("Vui lòng nhập tên bộ tiêu chuẩn.");if(!["student","officer"].includes(forType))throw new Error("Đối tượng không hợp lệ.");
  if(name.toLocaleLowerCase("vi")===String(source.name??"").trim().toLocaleLowerCase("vi"))name=`${name} - Bản sao`;
  let newId=0;
  const tx=db.transaction(()=>{const created=db.prepare(`INSERT INTO criteria_templates(name,description,for_type,created_by) VALUES(?,?,?,?)`).run(name,description||null,forType,admin.id);newId=Number(created.lastInsertRowid);
    db.prepare(`INSERT INTO criteria_template_groups(template_id,code,title,description,min_required,sort_order,score_max) SELECT ?,code,title,description,min_required,sort_order,score_max FROM criteria_template_groups WHERE template_id=?`).run(newId,sourceId);
    db.prepare(`INSERT INTO criteria_template_items(template_id,group_code,code,title,description,score_max,evidence_type,is_required,sort_order) SELECT ?,group_code,code,title,description,score_max,evidence_type,is_required,sort_order FROM criteria_template_items WHERE template_id=?`).run(newId,sourceId);
    db.prepare(`INSERT INTO criteria_activity_rules(template_id,criteria_code,activity_id,score_value) SELECT ?,criteria_code,activity_id,score_value FROM criteria_activity_rules WHERE template_id=?`).run(newId,sourceId);
    db.prepare(`INSERT INTO criteria_conduct_rules(template_id,criteria_code,min_score,period_scope) SELECT ?,criteria_code,min_score,period_scope FROM criteria_conduct_rules WHERE template_id=?`).run(newId,sourceId);
    writeAuditLog({db,actorUserId:admin.id,action:"criteria_template.clone",entityType:"criteria_template",entityId:newId,reason:"Tạo bản sao từ bộ tiêu chuẩn có sẵn",before:null,after:{sourceId,name,description,forType}});
  });tx();revalidatePath("/dashboard/admin/criteria-templates");return{ok:true,message:"Đã tạo bản sao bộ tiêu chuẩn.",id:newId};
}
