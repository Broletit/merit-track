import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import Pagination from "@/components/common/Pagination";
import CriteriaTemplatesHeader from "@/components/admin/criteria-templates/CriteriaTemplatesHeader";
import CriteriaTemplatesTable from "@/components/admin/criteria-templates/CriteriaTemplatesTable";
import type { AdminCriteriaTemplateItem } from "@/components/admin/criteria-templates/types";

type SearchParams = Promise<{
  page?: string;
  keyword?: string;
  forType?: string;
}>;

type Row = {
  id: number;
  name: string;
  description: string | null;
  for_type: string;
  created_at: string;
  groups_count: number;
  criteria: number;
  used_events: number;
};

export default async function AdminCriteriaTemplatesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminContext();

  const params = await searchParams;
  const db = getDatabase();

  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const pageSize = 10;
  const offset = (page - 1) * pageSize;

  const keyword = String(params.keyword ?? "").trim();
  const forType = String(params.forType ?? "").trim();

  const where: string[] = [];
  const values: unknown[] = [];

  if (keyword) {
    where.push(`ct.name LIKE ?`);
    values.push(`%${keyword}%`);
  }

  if (forType) {
    where.push(`ct.for_type = ?`);
    values.push(forType);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = (await db.first(`
      SELECT COUNT(*) AS total
      FROM criteria_templates ct
      ${whereSql}
      `, [...values])) as { total: number };

  const rows = (await db.rows(`
      SELECT
        ct.id,
        ct.name,
        ct.description,
        ct.for_type,
        ct.created_at,
        (
          SELECT COUNT(*)
          FROM criteria_template_groups g
          WHERE g.template_id = ct.id
        ) AS groups_count,
        (
          SELECT COUNT(*)
          FROM criteria_template_items i
          WHERE i.template_id = ct.id
        ) AS criteria
        ,(
          SELECT COUNT(*)
          FROM events e
          WHERE e.criteria_template_id = ct.id
        ) AS used_events
      FROM criteria_templates ct
      ${whereSql}
      ORDER BY CAST(ct.created_at AS DATETIME(3)) DESC, ct.id DESC
      LIMIT ? OFFSET ?
      `, [...values, pageSize, offset])) as Row[];

  const items: AdminCriteriaTemplateItem[] = rows.map((item) => ({
    id: Number(item.id),
    name: String(item.name ?? ""),
    description: item.description ? String(item.description) : null,
    forType: String(item.for_type ?? ""),
    groups: Number(item.groups_count ?? 0),
    criteria: Number(item.criteria ?? 0),
    usedEvents: Number(item.used_events ?? 0),
    createdAt: String(item.created_at ?? ""),
  }));

  const total = Number(totalRow?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="space-y-6">
      <CriteriaTemplatesHeader />
      <div data-table-frame className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md shadow-slate-200/60">
<CriteriaTemplatesTable page={page} items={items} />
<Pagination totalResults={total} resultLabel="bộ tiêu chuẩn"
        page={page}
        totalPages={totalPages}
        searchParams={{
          keyword,
          forType,
        }}
      />
</div>
    </main>
  );
}
