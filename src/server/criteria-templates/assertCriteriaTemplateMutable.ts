import type Database from "better-sqlite3";

export function assertCriteriaTemplateMutable(
  db: Database.Database,
  templateId: number,
) {
  const usage = db.prepare(`
    SELECT COUNT(*) AS total
    FROM events
    WHERE criteria_template_id = ?
  `).get(templateId) as { total: number };

  if (Number(usage.total ?? 0) > 0) {
    throw new Error(
      "Bộ tiêu chuẩn đang được sử dụng nên không thể thay đổi trực tiếp. Vui lòng lưu thành bản sao để tiếp tục cấu hình.",
    );
  }
}

export function isCriteriaTemplateInUse(
  db: Database.Database,
  templateId: number,
) {
  const usage = db.prepare(`
    SELECT COUNT(*) AS total
    FROM events
    WHERE criteria_template_id = ?
  `).get(templateId) as { total: number };

  return Number(usage.total ?? 0) > 0;
}
