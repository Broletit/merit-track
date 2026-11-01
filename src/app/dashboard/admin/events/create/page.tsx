import { requireAdminContext } from "@/server/auth/guards";
import { getRequiredActiveTerm } from "@/server/academic-terms/getRequiredActiveTerm";
import { getDatabase } from "@/server/db/mysql";
import EventCreateForm from "@/components/admin/events/EventCreateForm";
import EventFormHeader from "@/components/admin/events/EventFormHeader";
import type { AdminCriteriaTemplateOption } from "@/components/admin/events/types";

type TemplateRow = {
  id: number;
  name: string;
  for_type: string;
};

export default async function AdminCreateEventPage() {
  await requireAdminContext();

  (await getRequiredActiveTerm());
  const db = getDatabase();

  const templateRows = (await db.rows(`
      SELECT
        id,
        name,
        for_type
      FROM criteria_templates
      ORDER BY id DESC
      `, [])) as TemplateRow[];

  const templates: AdminCriteriaTemplateOption[] = templateRows.map((item) => ({
    id: Number(item.id),
    name: String(item.name ?? ""),
    forType: String(item.for_type ?? ""),
  }));

  return (
    <main className="space-y-6">
      <EventFormHeader />

      <EventCreateForm templates={templates} />
    </main>
  );
}