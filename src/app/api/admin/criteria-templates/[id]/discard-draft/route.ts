import { NextRequest, NextResponse } from "next/server";
import { discardCriteriaTemplateEdit } from "@/server/actions/criteria-templates/discardCriteriaTemplateEdit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  if (!origin || new URL(origin).host !== host) {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  }
  const templateId = Number((await params).id);
  try {
    await discardCriteriaTemplateEdit(templateId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Không thể hủy bản chỉnh sửa." }, { status: 400 });
  }
}
