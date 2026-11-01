import { assertImportCohort } from "@/lib/cohorts/cohorts";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { getDatabase } from "@/server/db/mysql";
import { requireAdminContext } from "@/server/auth/guards";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    await requireAdminContext();

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Chưa chọn file" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    const cohort = assertImportCohort(formData.get("cohort"),data.map(row=>({mssv:String(row["MSSV"] ?? "").trim()})));
    const db = getDatabase();

    const passwordHash = await bcrypt.hash("1111", 10);

    let inserted = 0;

    (await (async () => (await db.withTransaction(async () => {
    for (const row of data) {
      const mssv = String(row["MSSV"] || "").trim();
      const full_name = String(row["Họ tên"] || "").trim();
      const email = String(row["Email"] || "").trim();
      const classCode = String(row["Lớp"] || "").trim();

      if (!mssv || !full_name || !classCode) continue;

      // tìm lớp
      const cls = (await db.first(`SELECT id,cohort FROM classes WHERE code = ?`, [classCode])) as { id: number;cohort:number|null } | undefined;

      if (!cls) continue;
      if(cls.cohort!==cohort) throw new Error("Lớp trong file thuộc khóa khác.");

      const exists = (await db.first(`SELECT id FROM users WHERE mssv = ?`, [mssv]));

      if (exists) continue;

      const result = (await db.execute(`
        INSERT INTO users (
          mssv, full_name, email,
          password_hash, role,
          qr_secret, cohort
        )
        VALUES (?, ?, ?, ?, 'student', ?, ?)
        `, [mssv, full_name, email, passwordHash, crypto.randomUUID(), cohort]));

      (await db.execute(`
        INSERT INTO class_members (class_id, user_id, joined_at)
        VALUES (?, ?, CURRENT_TIMESTAMP(3))
        `, [cls.id, Number(result.insertId)]));

      inserted++;
    }

    })))());

    return NextResponse.json({
      ok: true,
      inserted,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Import thất bại" }, { status: 500 });
  }
}
