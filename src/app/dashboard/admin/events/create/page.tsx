import { requireAdminContext } from "@/server/auth/guards";
import { getRequiredActiveTerm } from "@/server/academic-terms/getRequiredActiveTerm";
import { getDb } from "@/server/db/sqlite";
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

  const term = getRequiredActiveTerm();
  const db = getDb();

  const templateRows = db
    .prepare(
      `
      SELECT
        id,
        name,
        for_type
      FROM criteria_templates
      ORDER BY id DESC
      `
    )
    .all() as TemplateRow[];

  const templates: AdminCriteriaTemplateOption[] = templateRows.map((item) => ({
    id: Number(item.id),
    name: String(item.name ?? ""),
    forType: String(item.for_type ?? ""),
  }));

  return (
    <main className="space-y-6">
      <EventFormHeader />

      <section className="rounded-2xl bg-blue-50 px-5 py-4 text-sm text-blue-800 ring-1 ring-blue-100">
        Đợt xét sẽ được tạo cho học kỳ hiện hành:{" "}
        <span className="font-semibold">{term.name}</span>
      </section>

      <EventCreateForm templates={templates} />
    </main>
  );
}