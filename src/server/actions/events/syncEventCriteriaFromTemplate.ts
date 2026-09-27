"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { cloneCriteriaTemplateToEvent } from "@/server/events/cloneCriteriaTemplateToEvent";

export async function syncEventCriteriaFromTemplate(eventId: number) {
  await requireAdminContext();

  const db = getDb();

  const event = db
    .prepare(
      `
      SELECT id, criteria_template_id, status
      FROM events
      WHERE id = ?
      LIMIT 1
      `
    )
    .get(eventId) as
    | {
        id: number;
        criteria_template_id: number | null;
        status: string;
      }
    | undefined;

  if (!event) {
    throw new Error("Đợt xét không tồn tại.");
  }

  if (!event.criteria_template_id) {
    throw new Error("Đợt xét chưa gắn bộ tiêu chuẩn.");
  }

  const submissionCount = db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM submissions
      WHERE event_id = ?
      `
    )
    .get(eventId) as { total: number };

  if (Number(submissionCount.total ?? 0) > 0) {
    throw new Error("Không thể đồng bộ vì đợt xét đã có hồ sơ nộp.");
  }

  cloneCriteriaTemplateToEvent({
    eventId,
    templateId: Number(event.criteria_template_id),
  });

  revalidatePath("/dashboard/admin/events");
  revalidatePath(`/dashboard/admin/events/${eventId}`);

  return {
    ok: true,
    message: "Đã đồng bộ tiêu chuẩn từ bộ tiêu chuẩn gốc.",
  };
}