"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { getExpectedConductCode, normalizeConductName } from "./conductCategoryRules";

export async function updateConductCategory(categoryId: number, formData: FormData) {
  await requireAdminContext();
  const db=getDatabase();
  const current=(await db.first(`SELECT id,term_id FROM conduct_score_categories WHERE id=?`, [categoryId])) as {id:number;term_id:number}|undefined;
  if(!current) throw new Error("Mục điểm không tồn tại.");
  const name=String(formData.get("name")??"").trim();
  const scoreMax=Number(formData.get("scoreMax"));
  const parentId=Number(formData.get("parentId")??0)||null;
  if(!name||!Number.isFinite(scoreMax)||scoreMax<=0) throw new Error("Vui lòng nhập đầy đủ thông tin hợp lệ.");
  if(parentId===categoryId) throw new Error("Một mục không thể là mục cha của chính nó.");
  const parent=parentId?(await db.first(`SELECT id,code,parent_id FROM conduct_score_categories WHERE id=? AND term_id=?`, [parentId, current.term_id])) as {id:number;code:string;parent_id:number|null}|undefined:null;
  if(parentId&&!parent)throw new Error("Mục cha không hợp lệ.");
  const targetDepth=parentId?Number(((await db.first(`WITH RECURSIVE ancestors AS (SELECT id,parent_id,0 depth FROM conduct_score_categories WHERE id=? UNION ALL SELECT c.id,c.parent_id,ancestors.depth+1 FROM conduct_score_categories c JOIN ancestors ON c.id=ancestors.parent_id) SELECT MAX(depth)+1 depth FROM ancestors`, [parentId])) as {depth:number}).depth):0;
  const names=(await db.rows(`WITH RECURSIVE tree AS (SELECT id,parent_id,name,0 depth FROM conduct_score_categories WHERE term_id=? AND parent_id IS NULL UNION ALL SELECT c.id,c.parent_id,c.name,tree.depth+1 FROM conduct_score_categories c JOIN tree ON c.parent_id=tree.id) SELECT id,name FROM tree WHERE depth=? AND id<>?`, [current.term_id, targetDepth, categoryId])) as Array<{id:number;name:string}>;
  if(names.some((item)=>normalizeConductName(item.name)===normalizeConductName(name)))throw new Error(`Tên mục điểm “${name}” đã tồn tại ở cấp ${targetDepth+1} trong học kỳ này. Các mục điểm cùng cấp không được trùng tên.`);
  const original=(await db.first(`SELECT code,parent_id FROM conduct_score_categories WHERE id=?`, [categoryId])) as {code:string;parent_id:number|null};
  let code=original.code;
  if(parentId!==original.parent_id){
    const childCount=Number(((await db.first(`SELECT COUNT(*) total FROM conduct_score_categories WHERE parent_id=?`, [categoryId])) as {total:number}).total);
    if(childCount>0) throw new Error("Không thể đổi mục cha của mục đã có mục con. Hãy di chuyển hoặc xóa các mục con trước.");
    const siblings=(await db.rows(`SELECT code FROM conduct_score_categories WHERE term_id=? AND COALESCE(parent_id,0)=COALESCE(?,0) AND id<>?`, [current.term_id, parentId, categoryId])) as Array<{code:string}>;
    const expectedCode=getExpectedConductCode(parent?{code:parent.code,parentId:parent.parent_id}:null,siblings.map((item)=>item.code));
    code=expectedCode;
  }
  const duplicate=(await db.first(`SELECT id FROM conduct_score_categories WHERE term_id=? AND COALESCE(parent_id,0)=COALESCE(?,0) AND code=? AND id<>?`, [current.term_id, parentId, code, categoryId]));
  if(duplicate)throw new Error("Mã mục đã tồn tại trong cùng mục cha.");
  (await db.execute(`UPDATE conduct_score_categories SET parent_id=?,code=?,name=?,score_max=? WHERE id=?`, [parentId, code, name, scoreMax, categoryId]));
  revalidatePath("/dashboard/admin/conduct-score-frame");
  revalidatePath("/dashboard/admin/activities/create");
  revalidatePath("/dashboard/student/conduct-score");
  return {ok:true,message:"Đã cập nhật mục điểm."};
}
