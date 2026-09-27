import fs from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import { getDb } from "@/server/db/sqlite";
import { requireLogin } from "@/server/auth/guards";

export async function GET(
  _: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const user = await requireLogin();
  const { id } = await context.params;
  const fileId = Number(id);

  if (!Number.isInteger(fileId) || fileId <= 0) {
    return NextResponse.json({ message: "ID file không hợp lệ." }, { status: 400 });
  }

  const db = getDb();

  const file = db
    .prepare(
      `
      SELECT
        sf.id,
        sf.file_name,
        sf.file_path,
        sf.mime_type,
        s.user_id,
        s.class_id
      FROM submission_files sf
      INNER JOIN submissions s ON s.id = sf.submission_id
      WHERE sf.id = ?
      LIMIT 1
      `
    )
    .get(fileId) as
    | {
        id: number;
        file_name: string;
        file_path: string;
        mime_type: string;
        user_id: number;
        class_id: number | null;
      }
    | undefined;

  if (!file) {
    return NextResponse.json(
      {
        message: "Không tìm thấy file.",
      },
      {
        status: 404,
      }
    );
  }

  const loginContext = String(user.loginContext ?? "student");
  let canAccess = Number(file.user_id) === Number(user.id) || user.role === "admin";

  if (!canAccess && user.role === "class_officer" && loginContext === "class_officer") {
    canAccess = Boolean(
      db.prepare(
        `
        SELECT 1
        FROM class_members
        WHERE user_id = ?
          AND class_id = ?
          AND left_at IS NULL
        LIMIT 1
        `
      ).get(user.id, file.class_id)
    );
  }

  if (!canAccess && user.role === "faculty_officer" && loginContext === "faculty_officer") {
    canAccess = Boolean(
      db.prepare(
        `
        SELECT 1
        FROM faculty_class_assignments
        WHERE faculty_officer_id = ?
          AND class_id = ?
        LIMIT 1
        `
      ).get(user.id, file.class_id)
    );
  }

  if (!canAccess) {
    return NextResponse.json({ message: "Bạn không có quyền xem file này." }, { status: 403 });
  }

  const uploadsRoot = path.join(process.cwd(), "public", "uploads", "submissions");
  const absolutePath = path.join(uploadsRoot, path.basename(file.file_path));

  const buffer = await fs.readFile(absolutePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": file.mime_type,
      "Content-Disposition": `inline; filename="${encodeURIComponent(
        file.file_name
      )}"`,
    },
  });
}
