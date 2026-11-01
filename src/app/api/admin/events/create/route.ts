import { NextResponse } from "next/server";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";

type CriteriaInput = {
  code: string;
  title: string;
  evidence_type: "manual" | "auto" | "both";
  min_score?: number;
  activity_ids?: number[];
};

export async function POST(req: Request) {
  const admin = await requireAdminContext();
  const db = getDatabase();

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

    const tx = (async () => (await db.withTransaction(async () => {
      const eventRes = (await db.execute(`
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
        VALUES (?, ?, ?, ?, ?, 'recognition', ?, CURRENT_TIMESTAMP(3))
      `, [title, description || null, status, startAt, endAt, admin.id]));

      const eventId = Number(eventRes.insertId);

      for (let i = 0; i < criteria.length; i += 1) {
        const item = criteria[i];
        const code = String(item.code ?? "").trim();
        const itemTitle = String(item.title ?? "").trim();
        const evidenceType = String(item.evidence_type ?? "manual").trim();

        if (!code || !itemTitle) continue;

        (await db.execute(`
          INSERT INTO event_criteria_items (
            event_id,
            code,
            title,
            evidence_type,
            sort_order
          )
          VALUES (?, ?, ?, ?, ?)
        `, [eventId, code, itemTitle, evidenceType, i + 1]));

        if (Array.isArray(item.activity_ids) && item.activity_ids.length > 0) {
          for (const activityId of item.activity_ids) {
            (await db.execute(`
              INSERT INTO criteria_activity_rules (
                template_id,
                criteria_code,
                activity_id
              )
              VALUES (?, ?, ?)
            `, [eventId, code, Number(activityId)]));
          }
        }

        if (typeof item.min_score === "number" && Number(item.min_score) > 0) {
          (await db.execute(`
            INSERT INTO criteria_conduct_rules (
              template_id,
              criteria_code,
              min_score,
              period_scope
            )
            VALUES (?, ?, ?, 'active')
          `, [eventId, code, Number(item.min_score)]));
        }
      }

      return eventId;
    })));

    const eventId = (await tx());

    return NextResponse.json({
      ok: true,
      eventId,
    });
  } catch (error) {
    console.error("POST /api/admin/events/create error:", error);
    return NextResponse.json({ error: "Không thể tạo đợt xét." }, { status: 500 });
  }
}