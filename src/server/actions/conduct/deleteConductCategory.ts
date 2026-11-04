"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { requireChangeReason, writeAuditLog } from "@/server/audit/writeAuditLog";

export async function deleteConductCategory(categoryId:number,formData?:FormData){
  const admin=await requireAdminContext();const db=getDatabase();const reason=requireChangeReason(formData?.get("reason")??null);
  const item=(await db.first(`SELECT * FROM conduct_score_categories WHERE id=?`, [categoryId])) as Record<string,unknown>|undefined;
  if(!item)throw new Error("Mục điểm không tồn tại.");
  const children=Number(((await db.first(`SELECT COUNT(*) total FROM conduct_score_categories WHERE parent_id=?`, [categoryId])) as {total:number}).total);
  if(children>0)throw new Error("Mục này còn mục con. Hãy xóa hoặc chuyển các mục con trước.");
  const activities=Number(((await db.first(`SELECT COUNT(*) total FROM activities WHERE conduct_category_id=?`, [categoryId])) as {total:number}).total);
  if(activities>0)throw new Error(`Mục này đang được ${activities} hoạt động sử dụng. Hãy chuyển các hoạt động sang mục khác trước khi xóa.`);
  const tx=(async () => (await db.withTransaction(async ()=>{
    await db.execute(`DELETE FROM conduct_score_categories WHERE id=?`, [categoryId]);

    // Rebuild every sibling sequence in the term.  Codes are derived values, so
    // removing an item never leaves a gap such as 1.4. followed by 1.6.
    const categories = (await db.rows(`SELECT id,parent_id,sort_order FROM conduct_score_categories WHERE term_id=? ORDER BY sort_order,id`, [item.term_id])) as Array<{id:number;parent_id:number|null;sort_order:number}>;
    const byParent = new Map<number | null, typeof categories>();
    for (const category of categories) {
      const siblings = byParent.get(category.parent_id) ?? [];
      siblings.push(category);
      byParent.set(category.parent_id, siblings);
    }
    const normalized: Array<{id:number;code:string;sortOrder:number}> = [];
    const visit = (parentId: number | null, prefix: string | null) => {
      (byParent.get(parentId) ?? []).forEach((category, index) => {
        const code = prefix ? `${prefix}.${index + 1}` : String(index + 1);
        normalized.push({ id: category.id, code, sortOrder: index + 1 });
        visit(category.id, code);
      });
    };
    visit(null, null);
    // Avoid the unique sibling-code constraint while values swap places.
    for (const category of normalized) await db.execute(`UPDATE conduct_score_categories SET code=? WHERE id=?`, [`__reindex_${category.id}`, category.id]);
    for (const category of normalized) await db.execute(`UPDATE conduct_score_categories SET code=?,sort_order=? WHERE id=?`, [category.code, category.sortOrder, category.id]);

    await writeAuditLog({db,actorUserId:admin.id,action:"conduct.category.delete",entityType:"conduct_score_category",entityId:categoryId,reason,before:item,after:null});
  })));(await tx());
  revalidatePath("/dashboard/admin/conduct-score-frame");revalidatePath("/dashboard/admin/activities/create");revalidatePath("/dashboard/student/conduct-score");
  return {ok:true,message:"Đã xóa mục điểm và lưu lịch sử thao tác."};
}
