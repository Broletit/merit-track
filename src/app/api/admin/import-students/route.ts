import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { getDb } from "@/server/db/sqlite";
import { requireAdmin } from "@/server/auth/guards";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Chưa chọn file" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    const db = getDb();

    const passwordHash = await bcrypt.hash("1111", 10);

    let inserted = 0;

    for (const row of data) {
      const mssv = String(row["MSSV"] || "").trim();
      const full_name = String(row["Họ tên"] || "").trim();
      const email = String(row["Email"] || "").trim();
      const classCode = String(row["Lớp"] || "").trim();

      if (!mssv || !full_name || !classCode) continue;

      // tìm lớp
      const cls = db
        .prepare(`SELECT id FROM classes WHERE code = ?`)
        .get(classCode) as { id: number } | undefined;

      if (!cls) continue;

      const exists = db
        .prepare(`SELECT id FROM users WHERE mssv = ?`)
        .get(mssv);

      if (exists) continue;

      const result = db.prepare(
        `
        INSERT INTO users (
          mssv, full_name, email,
          password_hash, role,
          qr_secret
        )
        VALUES (?, ?, ?, ?, 'student', ?)
        `
      ).run(
        mssv,
        full_name,
        email,
        passwordHash,
        crypto.randomUUID()
      );

      db.prepare(
        `
        INSERT INTO class_members (class_id, user_id, joined_at)
        VALUES (?, ?, datetime('now'))
        `
      ).run(cls.id, Number(result.lastInsertRowid));

      inserted++;
    }

    return NextResponse.json({
      ok: true,
      inserted,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Import thất bại" }, { status: 500 });
  }
}
