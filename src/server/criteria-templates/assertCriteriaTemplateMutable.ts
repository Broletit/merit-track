import type { Database } from "@/server/db/mysql";

export async function assertCriteriaTemplateMutable(
  db: Database,
  templateId: number,
) {
  const usage = (await db.first(`
    SELECT COUNT(*) AS total
    FROM events
    WHERE criteria_template_id = ?
  `, [templateId])) as { total: number };

  if (Number(usage.total ?? 0) > 0) {
    throw new Error(
      "Bộ tiêu chuẩn đang được sử dụng nên không thể thay đổi trực tiếp. Vui lòng lưu thành bản sao để tiếp tục cấu hình.",
    );
  }
}

export async function isCriteriaTemplateInUse(
  db: Database,
  templateId: number,
) {
  const usage = (await db.first(`
    SELECT COUNT(*) AS total
    FROM events
    WHERE criteria_template_id = ?
  `, [templateId])) as { total: number };

  return Number(usage.total ?? 0) > 0;
}
