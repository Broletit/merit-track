"use server";
import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { getExpectedConductCode, normalizeConductName } from "./conductCategoryRules";
export async function createConductCategory(termId: number, formData: FormData) {
  await requireAdminContext(); const db=getDb();
  const code=String(formData.get("code")??"").trim().toUpperCase(); const name=String(formData.get("name")??"").trim(); const max=Number(formData.get("scoreMax"));
  const parentId=Number(formData.get("parentId")??0)||null;
  if(!code||!name||!Number.isFinite(max)||max<=0) throw new Error("Vui lòng nhập đầy đủ mã, tên và điểm tối đa lớn hơn 0.");
  const parent=parentId?db.prepare(`SELECT id,code,parent_id FROM conduct_score_categories WHERE id=? AND term_id=?`).get(parentId,termId) as {id:number;code:string;parent_id:number|null}|undefined:null;
  if(parentId&&!parent)throw new Error("Mục cha không hợp lệ.");
  const targetDepth=parentId?Number((db.prepare(`WITH RECURSIVE ancestors AS (SELECT id,parent_id,0 depth FROM conduct_score_categories WHERE id=? UNION ALL SELECT c.id,c.parent_id,ancestors.depth+1 FROM conduct_score_categories c JOIN ancestors ON c.id=ancestors.parent_id) SELECT MAX(depth)+1 depth FROM ancestors`).get(parentId) as {depth:number}).depth):0;
  const names=db.prepare(`WITH RECURSIVE tree AS (SELECT id,parent_id,name,0 depth FROM conduct_score_categories WHERE term_id=? AND parent_id IS NULL UNION ALL SELECT c.id,c.parent_id,c.name,tree.depth+1 FROM conduct_score_categories c JOIN tree ON c.parent_id=tree.id) SELECT name FROM tree WHERE depth=?`).all(termId,targetDepth) as Array<{name:string}>;
  if(names.some((item)=>normalizeConductName(item.name)===normalizeConductName(name)))throw new Error(`Tên mục điểm “${name}” đã tồn tại ở cấp ${targetDepth+1} trong học kỳ này. Các mục điểm cùng cấp không được trùng tên.`);
  const siblings=db.prepare(`SELECT code FROM conduct_score_categories WHERE term_id=? AND COALESCE(parent_id,0)=COALESCE(?,0)`).all(termId,parentId) as Array<{code:string}>;
  const expectedCode=getExpectedConductCode(parent?{code:parent.code,parentId:parent.parent_id}:null,siblings.map((item)=>item.code));
  if(code!==expectedCode)throw new Error(`Mã mục tiếp theo phải là ${expectedCode}. Vui lòng kiểm tra lại thứ tự trong mục đã chọn.`);
  const duplicate=db.prepare(`SELECT id FROM conduct_score_categories WHERE term_id=? AND COALESCE(parent_id,0)=COALESCE(?,0) AND code=?`).get(termId,parentId,code);
  if(duplicate)throw new Error("Mã mục đã tồn tại trong cùng mục cha.");
  db.prepare(`INSERT INTO conduct_score_categories(term_id,parent_id,code,name,score_max) VALUES(?,?,?,?,?)`).run(termId,parentId,code,name,max);
  revalidatePath("/dashboard/admin/conduct-score-frame"); revalidatePath("/dashboard/admin/activities/create"); return {ok:true,message:"Đã lưu mục điểm rèn luyện."};
}
