import { NextResponse } from "next/server";
import { getDb } from "@/server/db/sqlite";
import { requireAdmin } from "@/server/auth/guards";
import { getRequiredActiveTerm } from "@/server/academic-terms/getRequiredActiveTerm";

export async function GET() {
  await requireAdmin();
  const db = getDb();

  const items = db.prepare(`
    SELECT
      a.id,
      a.title,
      a.description,
      a.audience_type,
      a.status,
      a.start_at,
      a.end_at,
      a.registration_start_at,
      a.registration_end_at,
      a.checkin_start_at,
      a.checkin_end_at,
      a.conduct_score,
      a.created_at,
      COUNT(ar.id) AS registered_count,
      SUM(CASE WHEN ar.status = 'attended' THEN 1 ELSE 0 END) AS attended_count
    FROM activities a
    LEFT JOIN activity_registrations ar ON ar.activity_id = a.id
    GROUP BY a.id
    ORDER BY datetime(a.created_at) DESC, a.id DESC
  `).all();

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  const db = getDb();
  const term=getRequiredActiveTerm();

  try {
    const body = await req.json();

    const title = String(body?.title ?? "").trim();
    const description = String(body?.description ?? "").trim();
    const audienceType = String(body?.audience_type ?? "student").trim();
    const startAt = String(body?.start_at ?? "").trim();
    const endAt = String(body?.end_at ?? "").trim();
    const registrationStartAt = String(body?.registration_start_at ?? "").trim();
    const registrationEndAt = String(body?.registration_end_at ?? "").trim();
    const checkinStartAt = String(body?.checkin_start_at ?? "").trim();
    const checkinEndAt = String(body?.checkin_end_at ?? "").trim();
    const conductScore = Number(body?.conduct_score ?? 0);
    const status = String(body?.status ?? "draft").trim();

    if (!title || !startAt || !endAt) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc của hoạt động." }, { status: 400 });
    }
    if (!["student", "officer"].includes(audienceType)) {
      return NextResponse.json({ error: "Đối tượng tham gia không hợp lệ." }, { status: 400 });
    }
    if (!["draft", "published"].includes(status)) {
      return NextResponse.json({ error: "Trạng thái hoạt động không hợp lệ." }, { status: 400 });
    }

    const duplicate=db.prepare(`SELECT a.id,c.code category_code,c.name category_name,at.name term_name FROM activities a LEFT JOIN conduct_score_categories c ON c.id=a.conduct_category_id LEFT JOIN academic_terms at ON at.id=a.term_id WHERE a.term_id=? AND LOWER(TRIM(a.title))=LOWER(TRIM(?)) LIMIT 1`).get(term.id,title) as {id:number;category_code:string|null;category_name:string|null;term_name:string|null}|undefined;
    if(duplicate){const category=duplicate.category_name?`${duplicate.category_code}. ${duplicate.category_name}`:"Không thuộc khung điểm";return NextResponse.json({error:`Tên hoạt động đã tồn tại tại mục “${category}” — ${duplicate.term_name??"không rõ học kỳ"}. Không được phép tạo hoạt động trùng tên.`},{status:409});}

    const result = db.prepare(`
      INSERT INTO activities (
        title,
        description,
        audience_type,
        status,
        start_at,
        end_at,
        registration_start_at,
        registration_end_at,
        checkin_start_at,
        checkin_end_at,
        conduct_score,
        attendance_mode,
        qr_checkin_enabled,
        term_id,
        created_by,
        created_at,
        published_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'qr', 1, ?, ?, datetime('now'),
        CASE WHEN ? = 'published' THEN datetime('now') ELSE NULL END
      )
    `).run(
      title,
      description || null,
      audienceType,
      status,
      startAt,
      endAt,
      registrationStartAt || null,
      registrationEndAt || null,
      checkinStartAt || null,
      checkinEndAt || null,
      conductScore,
      term.id,
      admin.id,
      status
    );

    return NextResponse.json({
      ok: true,
      id: Number(result.lastInsertRowid),
    });
  } catch (error) {
    console.error("POST /api/admin/activities error:", error);
    return NextResponse.json({ error: "Không thể tạo hoạt động." }, { status: 500 });
  }
}
