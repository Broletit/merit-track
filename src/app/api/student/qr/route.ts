import { NextResponse } from "next/server";
import { requireLogin } from "@/server/auth/guards";
import { createStudentQrPayload, encodeStudentQr } from "@/server/auth/qr";

export async function GET() {
  const user = await requireLogin();
  if (user.role === "admin") {
    return NextResponse.json(
      { message: "Tài khoản không có mã QR sinh viên." },
      { status: 403 }
    );
  }

  return NextResponse.json({
    payload: encodeStudentQr(
      createStudentQrPayload(Number(user.id), String(user.mssv))
    ),
  });
}
