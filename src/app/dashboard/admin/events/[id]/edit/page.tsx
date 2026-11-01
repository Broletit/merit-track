import { notFound } from "next/navigation";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import EventEditHeader from "@/components/admin/events/EventEditHeader";
import EventEditForm from "@/components/admin/events/EventEditForm";
import type { AdminCriteriaTemplateOption } from "@/components/admin/events/types";

type Params = Promise<{
  id: string;
}>;

type EventRow = {
  id: number;
  title: string;
  description: string | null;
  type: string;
  status: string;
  start_at: string;
  end_at: string;
  allow_late: number;
  criteria_template_id: number | null;
  submissions: number;
  term_is_active: number;
  score_max: number | null;
};

type TemplateRow = {
  id: number;
  name: string;
  for_type: string;
};

export default async function AdminEditEventPage({
  params,
}: {
  params: Params;
}) {
  await requireAdminContext();

  const { id } = await params;
  const eventId = await getDatabase().resolveRouteRecordId(id);

  if (!Number.isFinite(eventId) || eventId <= 0) {
    notFound();
  }

  const db = getDatabase();

  const event = (await db.first(`
      SELECT
        e.id,
        e.title,
        e.description,
        e.type,
        e.status,
        e.start_at,
        e.end_at,
        e.allow_late,
        e.criteria_template_id,
        e.score_max,
        at.is_active AS term_is_active,
        (
          SELECT COUNT(*)
          FROM submissions s
          WHERE s.event_id = e.id
        ) AS submissions
      FROM events e
      INNER JOIN academic_terms at ON at.id = e.term_id
      WHERE e.id = ?
      LIMIT 1
      `, [eventId])) as EventRow | undefined;

  if (!event) {
    notFound();
  }
  if (!event.term_is_active) notFound();

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
      <EventEditHeader />

      <EventEditForm
        event={{
          id: Number(event.id),
          title: String(event.title ?? ""),
          description: event.description
            ? String(event.description)
            : "",
          type: String(event.type ?? ""),
          status: String(event.status ?? ""),
          startAt: String(event.start_at ?? ""),
          endAt: String(event.end_at ?? ""),
          allowLate: Number(event.allow_late ?? 0) === 1,
          criteriaTemplateId: event.criteria_template_id
            ? Number(event.criteria_template_id)
            : null,
          submissions: Number(event.submissions ?? 0),
          scoreMax: event.score_max === null ? null : Number(event.score_max),
        }}
        templates={templates}
      />
    </main>
  );
}
