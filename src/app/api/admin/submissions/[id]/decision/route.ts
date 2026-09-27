import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/guards";
import { reviewSubmission } from "@/server/actions/reviews/reviewSubmission";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();

  const { type } = await req.json();
  const { id: rawId } = await params;
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "ID hồ sơ không hợp lệ." }, { status: 400 });
  }

  if (type !== "approve" && type !== "reject") {
    return NextResponse.json({ error: "Quyết định không hợp lệ." }, { status: 400 });
  }

  await reviewSubmission(id, type, new FormData());

  return NextResponse.json({ ok: true });
}
