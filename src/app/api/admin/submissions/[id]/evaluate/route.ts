import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/guards";
import { evaluateSubmissionAuto } from "@/server/events/evaluateSubmissionAuto";

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(
  _: Request,
  context: { params: Promise<{ id: string }> }
) {
  await requireAdmin();

  const { id: rawId } = await context.params;
  const submissionId = parseId(rawId);

  if (!submissionId) {
    return NextResponse.json({ error: "ID hồ sơ không hợp lệ." }, { status: 400 });
  }

  try {
    const result = evaluateSubmissionAuto(submissionId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/admin/submissions/[id]/evaluate error:", error);
    return NextResponse.json({ error: "Không thể đánh giá tự động hồ sơ." }, { status: 500 });
  }
}
