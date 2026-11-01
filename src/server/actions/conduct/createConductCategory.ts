"use server";
import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { getExpectedConductCode, normalizeConductName } from "./conductCategoryRules";
export async function createConductCategory(termId: number, formData: FormData) {
  await requireAdminContext(); const db=getDatabase();
  const code=String(formData.get("code")??"").trim().toUpperCase(); const name=String(formData.get("name")??"").trim(); const max=Number(formData.get("scoreMax"));
  const parentId=Number(formData.get("parentId")??0)||null;
  if(!code||!name||!Number.isFinite(max)||max<=0) throw new Error("Vui lòng nhập đầy đủ mã, tên và điểm tối đa lớn hơn 0.");
  const parent=parentId?(await db.first(`SELECT id,code,parent_id FROM conduct_score_categories WHERE id=? AND term_id=?`, [parentId, termId])) as {id:number;code:string;parent_id:number|null}|undefined:null;
  if(parentId&&!parent)throw new Error("Mục cha không hợp lệ.");
  const targetDepth=parentId?Number(((await db.first(`WITH RECURSIVE ancestors AS (SELECT id,parent_id,0 depth FROM conduct_score_categories WHERE id=? UNION ALL SELECT c.id,c.parent_id,ancestors.depth+1 FROM conduct_score_categories c JOIN ancestors ON c.id=ancestors.parent_id) SELECT MAX(depth)+1 depth FROM ancestors`, [parentId])) as {depth:number}).depth):0;
  const names=(await db.rows(`WITH RECURSIVE tree AS (SELECT id,parent_id,name,0 depth FROM conduct_score_categories WHERE term_id=? AND parent_id IS NULL UNION ALL SELECT c.id,c.parent_id,c.name,tree.depth+1 FROM conduct_score_categories c JOIN tree ON c.parent_id=tree.id) SELECT name FROM tree WHERE depth=?`, [termId, targetDepth])) as Array<{name:string}>;
  if(names.some((item)=>normalizeConductName(item.name)===normalizeConductName(name)))throw new Error(`Tên mục điểm “${name}” đã tồn tại ở cấp ${targetDepth+1} trong học kỳ này. Các mục điểm cùng cấp không được trùng tên.`);
  const siblings=(await db.rows(`SELECT code FROM conduct_score_categories WHERE term_id=? AND COALESCE(parent_id,0)=COALESCE(?,0)`, [termId, parentId])) as Array<{code:string}>;
  const expectedCode=getExpectedConductCode(parent?{code:parent.code,parentId:parent.parent_id}:null,siblings.map((item)=>item.code));
  if(code!==expectedCode)throw new Error(`Mã mục tiếp theo phải là ${expectedCode}. Vui lòng kiểm tra lại thứ tự trong mục đã chọn.`);
  const duplicate=(await db.first(`SELECT id FROM conduct_score_categories WHERE term_id=? AND COALESCE(parent_id,0)=COALESCE(?,0) AND code=?`, [termId, parentId, code]));
  if(duplicate)throw new Error("Mã mục đã tồn tại trong cùng mục cha.");
  (await db.execute(`INSERT INTO conduct_score_categories(term_id,parent_id,code,name,score_max) VALUES(?,?,?,?,?)`, [termId, parentId, code, name, max]));
  revalidatePath("/dashboard/admin/conduct-score-frame"); revalidatePath("/dashboard/admin/activities/create"); return {ok:true,message:"Đã lưu mục điểm rèn luyện."};
}
