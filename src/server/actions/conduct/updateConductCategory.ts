"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { getExpectedConductCode, normalizeConductName } from "./conductCategoryRules";

export async function updateConductCategory(categoryId: number, formData: FormData) {
  await requireAdminContext();
  const db=getDb();
  const current=db.prepare(`SELECT id,term_id FROM conduct_score_categories WHERE id=?`).get(categoryId) as {id:number;term_id:number}|undefined;
  if(!current) throw new Error("Mục điểm không tồn tại.");
  const code=String(formData.get("code")??"").trim().toUpperCase();
  const name=String(formData.get("name")??"").trim();
  const scoreMax=Number(formData.get("scoreMax"));
  const parentId=Number(formData.get("parentId")??0)||null;
  if(!code||!name||!Number.isFinite(scoreMax)||scoreMax<=0) throw new Error("Vui lòng nhập đầy đủ thông tin hợp lệ.");
  if(parentId===categoryId) throw new Error("Một mục không thể là mục cha của chính nó.");
  const parent=parentId?db.prepare(`SELECT id,code,parent_id FROM conduct_score_categories WHERE id=? AND term_id=?`).get(parentId,current.term_id) as {id:number;code:string;parent_id:number|null}|undefined:null;
  if(parentId&&!parent)throw new Error("Mục cha không hợp lệ.");
  const targetDepth=parentId?Number((db.prepare(`WITH RECURSIVE ancestors AS (SELECT id,parent_id,0 depth FROM conduct_score_categories WHERE id=? UNION ALL SELECT c.id,c.parent_id,ancestors.depth+1 FROM conduct_score_categories c JOIN ancestors ON c.id=ancestors.parent_id) SELECT MAX(depth)+1 depth FROM ancestors`).get(parentId) as {depth:number}).depth):0;
  const names=db.prepare(`WITH RECURSIVE tree AS (SELECT id,parent_id,name,0 depth FROM conduct_score_categories WHERE term_id=? AND parent_id IS NULL UNION ALL SELECT c.id,c.parent_id,c.name,tree.depth+1 FROM conduct_score_categories c JOIN tree ON c.parent_id=tree.id) SELECT id,name FROM tree WHERE depth=? AND id<>?`).all(current.term_id,targetDepth,categoryId) as Array<{id:number;name:string}>;
  if(names.some((item)=>normalizeConductName(item.name)===normalizeConductName(name)))throw new Error(`Tên mục điểm “${name}” đã tồn tại ở cấp ${targetDepth+1} trong học kỳ này. Các mục điểm cùng cấp không được trùng tên.`);
  const original=db.prepare(`SELECT code,parent_id FROM conduct_score_categories WHERE id=?`).get(categoryId) as {code:string;parent_id:number|null};
  if(code!==original.code||parentId!==original.parent_id){
    const siblings=db.prepare(`SELECT code FROM conduct_score_categories WHERE term_id=? AND COALESCE(parent_id,0)=COALESCE(?,0) AND id<>?`).all(current.term_id,parentId,categoryId) as Array<{code:string}>;
    const expectedCode=getExpectedConductCode(parent?{code:parent.code,parentId:parent.parent_id}:null,siblings.map((item)=>item.code));
    if(code!==expectedCode)throw new Error(`Mã mục tại vị trí mới phải là ${expectedCode}. Vui lòng kiểm tra lại thứ tự.`);
  }
  const duplicate=db.prepare(`SELECT id FROM conduct_score_categories WHERE term_id=? AND COALESCE(parent_id,0)=COALESCE(?,0) AND code=? AND id<>?`).get(current.term_id,parentId,code,categoryId);
  if(duplicate)throw new Error("Mã mục đã tồn tại trong cùng mục cha.");
  db.prepare(`UPDATE conduct_score_categories SET parent_id=?,code=?,name=?,score_max=? WHERE id=?`).run(parentId,code,name,scoreMax,categoryId);
  revalidatePath("/dashboard/admin/conduct-score-frame");
  revalidatePath("/dashboard/admin/activities/create");
  revalidatePath("/dashboard/student/conduct-score");
  return {ok:true,message:"Đã cập nhật mục điểm."};
}
