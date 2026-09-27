import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/guards";
import { scanActivityQr } from "@/server/actions/activities/scanActivityQr";

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id: rawId } = await context.params;
  const activityId = parseId(rawId);

  if (!activityId) {
    return NextResponse.json({ error: "ID hoạt động không hợp lệ." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const qrRaw = String(body?.qrRaw ?? "").trim();

    if (!qrRaw) {
      return NextResponse.json({ error: "Thiếu dữ liệu QR." }, { status: 400 });
    }

    const result = await scanActivityQr(activityId, qrRaw, "qr");

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/admin/activities/[id]/checkin error:", error);
    return NextResponse.json({ error: "Không thể điểm danh hoạt động." }, { status: 500 });
  }
}
