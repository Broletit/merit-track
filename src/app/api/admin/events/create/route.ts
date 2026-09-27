import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";

type CriteriaInput = {
  code: string;
  title: string;
  evidence_type: "manual" | "auto" | "both";
  min_score?: number;
  activity_ids?: number[];
};

export async function POST(req: Request) {
  const admin = await requireAdmin();
  const db = getDb();

  try {
    const body = await req.json();

    const title = String(body?.title ?? "").trim();
    const description = String(body?.description ?? "").trim();
    const startAt = String(body?.start_at ?? "").trim();
    const endAt = String(body?.end_at ?? "").trim();
    const status = String(body?.status ?? "draft").trim();
    const criteria = (body?.criteria ?? []) as CriteriaInput[];

    if (!title || !startAt || !endAt) {
      return NextResponse.json({ error: "Thiếu thông tin đợt xét." }, { status: 400 });
    }

    if (!Array.isArray(criteria) || criteria.length === 0) {
      return NextResponse.json({ error: "Cần ít nhất một tiêu chí." }, { status: 400 });
    }

    const tx = db.transaction(() => {
      const eventRes = db.prepare(`
        INSERT INTO events (
          title,
          description,
          status,
          start_at,
          end_at,
          type,
          created_by,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, 'recognition', ?, datetime('now'))
      `).run(
        title,
        description || null,
        status,
        startAt,
        endAt,
        admin.id
      );

      const eventId = Number(eventRes.lastInsertRowid);

      for (let i = 0; i < criteria.length; i += 1) {
        const item = criteria[i];
        const code = String(item.code ?? "").trim();
        const itemTitle = String(item.title ?? "").trim();
        const evidenceType = String(item.evidence_type ?? "manual").trim();

        if (!code || !itemTitle) continue;

        db.prepare(`
          INSERT INTO event_criteria_items (
            event_id,
            code,
            title,
            evidence_type,
            sort_order
          )
          VALUES (?, ?, ?, ?, ?)
        `).run(
          eventId,
          code,
          itemTitle,
          evidenceType,
          i + 1
        );

        if (Array.isArray(item.activity_ids) && item.activity_ids.length > 0) {
          for (const activityId of item.activity_ids) {
            db.prepare(`
              INSERT INTO criteria_activity_rules (
                template_id,
                criteria_code,
                activity_id
              )
              VALUES (?, ?, ?)
            `).run(eventId, code, Number(activityId));
          }
        }

        if (typeof item.min_score === "number" && Number(item.min_score) > 0) {
          db.prepare(`
            INSERT INTO criteria_conduct_rules (
              template_id,
              criteria_code,
              min_score,
              period_scope
            )
            VALUES (?, ?, ?, 'active')
          `).run(eventId, code, Number(item.min_score));
        }
      }

      return eventId;
    });

    const eventId = tx();

    return NextResponse.json({
      ok: true,
      eventId,
    });
  } catch (error) {
    console.error("POST /api/admin/events/create error:", error);
    return NextResponse.json({ error: "Không thể tạo đợt xét." }, { status: 500 });
  }
}