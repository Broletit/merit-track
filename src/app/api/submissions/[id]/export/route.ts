import { requireLogin } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";

type ExportCriterion = { group_code: string; group_title: string; code: string; title: string; auto_passed: number | null; matched_activity_titles: string | null; auto_message: string | null; notes: string | null };
type ExportFile = { id: number; criteria_code: string; original_name: string; mime_type: string };

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const slug = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

function parseTitles(value: string | null) {
  if (!value) return [];
  try { const parsed: unknown = JSON.parse(value); if (Array.isArray(parsed)) return parsed.map(String).map((item) => item.trim()).filter(Boolean); } catch { /* Hỗ trợ dữ liệu cũ. */ }
  return value.split("||").map((item) => item.trim()).filter(Boolean);
}

export async function GET(request: Request, context: RouteContext<"/api/submissions/[id]/export">) {
  const user = await requireLogin();
  const { id } = await context.params;
  const db = getDatabase();
  const submissionId = await db.resolveRouteRecordId(id);
  const submission = await db.first<{ id: number; user_id: number; event_title: string; full_name: string; mssv: string; class_code: string | null }>(`
    SELECT s.id,s.user_id,e.title event_title,u.full_name,u.mssv,c.code class_code
    FROM submissions s JOIN events e ON e.id=s.event_id JOIN users u ON u.id=s.user_id LEFT JOIN classes c ON c.id=s.class_id
    WHERE s.id=? AND e.type='student' LIMIT 1
  `, [submissionId]);
  if (!submission || submission.user_id !== user.id) return new Response("Không tìm thấy hồ sơ hoặc bạn không có quyền xuất.", { status: 404 });

  const criteria = await db.rows<ExportCriterion>(`
    SELECT g.code group_code,g.title group_title,i.code,i.title,ar.passed auto_passed,ar.matched_activity_titles,ar.message auto_message,
      GROUP_CONCAT(DISTINCT NULLIF(TRIM(eu.note),'') ORDER BY eu.id SEPARATOR '\n') notes
    FROM submissions s
    JOIN event_criteria_groups g ON g.event_id=s.event_id
    JOIN event_criteria_items i ON i.event_id=s.event_id AND i.group_code=g.code
    LEFT JOIN submission_auto_results ar ON ar.submission_id=s.id AND ar.criteria_code=i.code
    LEFT JOIN submission_evidence_units eu ON eu.submission_id=s.id AND eu.criteria_code=i.code
    WHERE s.id=? AND (COALESCE(ar.passed,0)=1 OR eu.id IS NOT NULL)
    GROUP BY g.code,g.title,g.sort_order,i.code,i.title,i.sort_order,ar.passed,ar.matched_activity_titles,ar.message
    ORDER BY g.sort_order,i.sort_order
  `, [submissionId]);
  const files = await db.rows<ExportFile>(`SELECT id,criteria_code,original_name,mime_type FROM submission_files WHERE submission_id=? AND status='ready' AND deleted_at IS NULL ORDER BY criteria_code,id`, [submissionId]);
  const filesByCriterion = new Map<string, ExportFile[]>();
  for (const file of files) filesByCriterion.set(file.criteria_code, [...(filesByCriterion.get(file.criteria_code) ?? []), file]);
  const origin = new URL(request.url).origin;
  const groups = new Map<string, ExportCriterion[]>();
  for (const criterion of criteria) { const key = `${criterion.group_code}\u0000${criterion.group_title}`; groups.set(key, [...(groups.get(key) ?? []), criterion]); }

  const sections = Array.from(groups.values()).map((items) => {
    const group = items[0];
    const criteriaHtml = items.map((criterion) => {
      const criterionFiles = filesByCriterion.get(criterion.code) ?? [];
      const automatic = Number(criterion.auto_passed ?? 0) === 1;
      const titles = parseTitles(criterion.matched_activity_titles);
      const autoHtml = automatic ? `<p class="automatic"><b>${titles.length ? "Đã tham gia hoạt động:" : "Đã đáp ứng tự động:"}</b> ${escapeHtml(titles.join(", ") || criterion.auto_message || "Đủ điều kiện tự động")}</p><p class="source">(Cập nhật minh chứng từ trang Điểm rèn luyện sinh viên.)</p>` : "";
      const noteHtml = criterion.notes ? `<div class="note"><b>Mô tả minh chứng:</b><br>${escapeHtml(criterion.notes).replace(/\n/g, "<br>")}</div>` : "";
      const fileHtml = criterionFiles.map((file) => {
        const url = `${origin}/api/submissions/files/${file.id}`;
        return file.mime_type === "image/png" ? `<figure><img src="${escapeHtml(url)}" alt="Minh chứng ${escapeHtml(file.original_name)}"><figcaption>${escapeHtml(file.original_name)}</figcaption></figure>` : `<p class="file"><b>Tệp minh chứng:</b> <a href="${escapeHtml(url)}">${escapeHtml(file.original_name)}</a></p>`;
      }).join("");
      return `<article><h4>• Tiêu chí: ${escapeHtml(criterion.title)}</h4>${autoHtml}${noteHtml}${fileHtml}</article>`;
    }).join("");
    return `<section class="standard"><h3>Tiêu chuẩn: ${escapeHtml(group.group_title)}</h3>${criteriaHtml}</section>`;
  }).join("");

  const format = new URL(request.url).searchParams.get("format");
  const isWord = format === "word";
  const styles = isWord
    ? `@page{size:A4;margin:18mm}body{font-family:"Times New Roman",Times,serif;color:#000;font-size:12pt;line-height:1.5}h1,h2,h3,h4,p{font-family:"Times New Roman",Times,serif;font-size:12pt}h1{text-align:center;margin:0;font-weight:700}h2{text-align:center;margin:6px 0 18px;font-weight:700}.standard{margin-top:18px;border:1px solid #cbd5e1}.standard h3{margin:0;padding:9px 12px;background:#eaf2ff;font-weight:700}.standard article{padding:12px;border-top:1px solid #e2e8f0;break-inside:avoid}.standard h4{margin:0 0 8px;font-weight:700}.automatic{margin:5px 0}.source{margin:4px 0;font-style:italic}.note{margin-top:8px}.file{margin:8px 0}figure{margin:10px 0;max-width:100%}img{display:block;max-width:100%;max-height:560px;border:1px solid #cbd5e1}figcaption{margin-top:4px;font-size:11pt}a{color:#000;text-decoration:underline}`
    : `@page{size:A4;margin:18mm}body{font-family:Arial,sans-serif;color:#172033;font-size:12px;line-height:1.5}h1{text-align:center;color:#1746a2;font-size:20px;margin:0}h2{text-align:center;font-size:15px;margin:6px 0 18px}.toolbar{display:flex;justify-content:flex-end;margin-bottom:12px}.toolbar button{padding:9px 14px;background:#1746a2;color:white;border:0;border-radius:6px}.standard{margin-top:18px;border:1px solid #cbd5e1}.standard h3{margin:0;padding:9px 12px;background:#eaf2ff;color:#173d82;font-size:13px}.standard article{padding:12px;border-top:1px solid #e2e8f0;break-inside:avoid}.standard h4{margin:0 0 8px;font-size:12px}.automatic{margin:5px 0;color:#166534}.source{margin:4px 0;color:#475569;font-style:italic}.note{margin-top:8px}.file{margin:8px 0}figure{margin:10px 0;max-width:100%}img{display:block;max-width:100%;max-height:560px;border:1px solid #cbd5e1}figcaption{margin-top:4px;color:#475569;font-size:11px}a{color:#1d4ed8}@media print{.toolbar{display:none}}`;
  const toolbar = isWord ? "" : `<div class="toolbar"><button onclick="window.print()">In / Lưu PDF</button></div>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Hồ sơ ${escapeHtml(submission.mssv)}</title><style>${styles}</style></head><body>${toolbar}<h1>HỒ SƠ XÉT</h1><h2>${escapeHtml(submission.event_title)}</h2><p><b>Họ tên:</b> ${escapeHtml(submission.full_name)}</p><p><b>MSSV:</b> ${escapeHtml(submission.mssv)} &nbsp; <b>Lớp:</b> ${escapeHtml(submission.class_code || "—")}</p>${sections || "<p>Chưa có minh chứng để xuất.</p>"}</body></html>`;
  if (format === "word") return new Response(`\uFEFF${html}`, { headers: { "Content-Type": "application/msword; charset=utf-8", "Content-Disposition": `attachment; filename="${submission.mssv}_ho_so_${slug(submission.event_title) || "xet"}.doc"` } });
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
