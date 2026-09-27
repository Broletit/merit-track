"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/server/db/sqlite";
import { requireAdminContext } from "@/server/auth/guards";
import { hashPasswordSync } from "@/server/auth/password";
import type {
  ImportPreviewRow,
  ParsedImportStudentRow,
} from "@/components/admin/students-import/types";

type ConfirmImportPayload = {
  classMode: "existing" | "new";
  classId?: number | null;
  newClassCode?: string;
  newClassName?: string;
  newClassFaculty?: string;
  newClassIntakeYear?: number | null;
  allowUpdateExisting?: boolean;
  allowTransferClass?: boolean;
  rows: ParsedImportStudentRow[];
  previewRows: ImportPreviewRow[];
};

type UserRow = {
  id: number;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function getFullName(row: ParsedImportStudentRow) {
  const data = row as ParsedImportStudentRow & {
    full_name?: string;
    last_name?: string;
    first_name?: string;
  };

  const fullName = clean(data.full_name);

  if (fullName) return fullName;

  return [clean(data.last_name), clean(data.first_name)]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function resolveClassId(payload: ConfirmImportPayload) {
  const db = getDb();

  if (payload.classMode === "existing") {
    const classId = Number(payload.classId ?? 0);

    const found = db
      .prepare(
        `
        SELECT id
        FROM classes
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(classId) as { id: number } | undefined;

    if (!found) {
      throw new Error("Lớp đã chọn không tồn tại.");
    }

    return Number(found.id);
  }

  const code = clean(payload.newClassCode);
  const name = clean(payload.newClassName);
  const faculty = clean(payload.newClassFaculty);
  const intakeYear = Number(payload.newClassIntakeYear ?? 0);

  if (!code || !name) {
    throw new Error("Thiếu thông tin lớp mới.");
  }

  if (!Number.isFinite(intakeYear) || intakeYear <= 0) {
    throw new Error("Khóa lớp mới không hợp lệ.");
  }

  const existed = db
    .prepare(
      `
      SELECT id
      FROM classes
      WHERE code = ?
      LIMIT 1
      `
    )
    .get(code) as { id: number } | undefined;

  if (existed) {
    return Number(existed.id);
  }

  const result = db
    .prepare(
      `
      INSERT INTO classes (
        code,
        name,
        faculty,
        intake_year,
        is_active,
        created_at
      )
      VALUES (?, ?, ?, ?, 1, datetime('now'))
      `
    )
    .run(code, name, faculty || "Chưa cập nhật", intakeYear);

  return Number(result.lastInsertRowid);
}

export async function importStudents(payload: ConfirmImportPayload) {
  await requireAdminContext();

  const db = getDb();

  if (!payload.rows || payload.rows.length === 0) {
    throw new Error("Không có dữ liệu để import.");
  }

  if (!payload.previewRows || payload.previewRows.length === 0) {
    throw new Error("Bạn cần kiểm tra dữ liệu trước khi import.");
  }

  const targetClassId = resolveClassId(payload);
  const passwordHash = hashPasswordSync("1111");

  const userColumns = db.prepare(`PRAGMA table_info(users)`).all() as Array<{
    name: string;
  }>;

  const columnNames = new Set(userColumns.map((item) => item.name));

  if (!columnNames.has("date_of_birth")) {
    throw new Error("Bảng users chưa có cột date_of_birth.");
  }

  const findUserStmt = db.prepare(
    `
    SELECT id
    FROM users
    WHERE mssv = ?
    LIMIT 1
    `
  );

  const latestClassStmt = db.prepare(
    `
    SELECT class_id
    FROM class_members
    WHERE user_id = ?
    ORDER BY rowid DESC
    LIMIT 1
    `
  );

  const blockers: string[] = [];

  for (const [index, rawRow] of payload.rows.entries()) {
    const rowNumber = index + 1;

    const mssv = clean(rawRow.mssv);
    const fullName = getFullName(rawRow);

    if (!mssv) {
      blockers.push(`Dòng ${rowNumber}: thiếu MSSV.`);
      continue;
    }

    if (!fullName) {
      blockers.push(`Dòng ${rowNumber} (${mssv}): thiếu họ tên.`);
      continue;
    }

    const existingUser = findUserStmt.get(mssv) as UserRow | undefined;

    if (!existingUser) {
      continue;
    }

    const latestClass = latestClassStmt.get(existingUser.id) as
      | { class_id: number }
      | undefined;

    const currentClassId = latestClass
      ? Number(latestClass.class_id)
      : null;

    const isDifferentClass =
      currentClassId !== null &&
      currentClassId !== targetClassId;

    /**
     * KHÁC LỚP
     */
    if (
      isDifferentClass &&
      payload.allowUpdateExisting &&
      !payload.allowTransferClass
    ) {
      blockers.push(
        `Dòng ${rowNumber} (${mssv}): sinh viên đang thuộc lớp khác. Không thể chỉ cập nhật thông tin, vui lòng chọn “Cho phép chuyển lớp”.`
      );

      continue;
    }

    /**
     * ĐÚNG LỚP
     */
    if (
      !isDifferentClass &&
      payload.allowTransferClass
    ) {
      blockers.push(
        `Dòng ${rowNumber} (${mssv}): sinh viên đã thuộc đúng lớp. Không cần chuyển lớp, vui lòng chọn “Cập nhật thông tin sinh viên đã tồn tại”.`
      );

      continue;
    }

    /**
     * CHƯA CHỌN OPTION
     */
    if (
      !payload.allowUpdateExisting &&
      !payload.allowTransferClass
    ) {
      if (isDifferentClass) {
        blockers.push(
          `Dòng ${rowNumber} (${mssv}): sinh viên đang thuộc lớp khác. Vui lòng chọn “Cho phép chuyển lớp”.`
        );
      } else {
        blockers.push(
          `Dòng ${rowNumber} (${mssv}): sinh viên đã tồn tại trong lớp. Vui lòng chọn “Cập nhật thông tin sinh viên đã tồn tại”.`
        );
      }

      continue;
    }

    /**
     * KHÁC LỚP NHƯNG KHÔNG CHỌN CHUYỂN
     */
    if (
      isDifferentClass &&
      !payload.allowTransferClass
    ) {
      blockers.push(
        `Dòng ${rowNumber} (${mssv}): sinh viên đang thuộc lớp khác. Vui lòng chọn “Cho phép chuyển lớp”.`
      );

      continue;
    }

    /**
     * ĐÚNG LỚP NHƯNG KHÔNG CHỌN UPDATE
     */
    if (
      !isDifferentClass &&
      !payload.allowUpdateExisting
    ) {
      blockers.push(
        `Dòng ${rowNumber} (${mssv}): sinh viên đã thuộc đúng lớp. Vui lòng chọn “Cập nhật thông tin sinh viên đã tồn tại”.`
      );

      continue;
    }
  }

  if (blockers.length > 0) {
    throw new Error(blockers.slice(0, 8).join("\n"));
  }

  let inserted = 0;
  let updated = 0;
  let attachedToClass = 0;
  let transferred = 0;
  let skippedExisting = 0;

  const conflictMessages: string[] = [];

  const tx = db.transaction(() => {
    for (const rawRow of payload.rows) {
      const mssv = clean(rawRow.mssv);
      const fullName = getFullName(rawRow);

      const email = clean(rawRow.email);
      const phone = clean(rawRow.phone);
      const gender = clean(rawRow.gender);
      const dateOfBirth = clean(rawRow.date_of_birth);

      const existingUser = findUserStmt.get(mssv) as UserRow | undefined;

      /**
       * USER ĐÃ TỒN TẠI
       */
      if (existingUser) {
        const latestClass = latestClassStmt.get(existingUser.id) as
          | { class_id: number }
          | undefined;

        const currentClassId = latestClass
          ? Number(latestClass.class_id)
          : null;

        const isDifferentClass =
          currentClassId !== null &&
          currentClassId !== targetClassId;

        /**
         * UPDATE INFO
         */
        if (!isDifferentClass && payload.allowUpdateExisting) {
          const sets: string[] = [];
          const values: unknown[] = [];

          if (fullName) {
            sets.push("full_name = ?");
            values.push(fullName);
          }

          if (email) {
            sets.push("email = ?");
            values.push(email);
          }

          if (columnNames.has("phone")) {
            sets.push("phone = ?");
            values.push(phone || null);
          }

          if (columnNames.has("gender")) {
            sets.push("gender = ?");
            values.push(gender || null);
          }

          sets.push("date_of_birth = ?");
          values.push(dateOfBirth || null);

          if (columnNames.has("updated_at")) {
            sets.push("updated_at = datetime('now')");
          }

          values.push(existingUser.id);

          db.prepare(
            `
            UPDATE users
            SET ${sets.join(", ")}
            WHERE id = ?
            `
          ).run(...values);

          updated++;
          continue;
        }

        /**
         * CHUYỂN LỚP
         */
        if (isDifferentClass && payload.allowTransferClass) {
          db.prepare(
            `
            DELETE FROM class_members
            WHERE user_id = ?
            `
          ).run(existingUser.id);

          db.prepare(
            `
            INSERT INTO class_members (
              class_id,
              user_id,
              joined_at
            )
            VALUES (?, ?, datetime('now'))
            `
          ).run(targetClassId, existingUser.id);

          transferred++;

          continue;
        }

        skippedExisting++;
        continue;
      }

      /**
       * TẠO USER MỚI
       */
      const insertColumns = [
        "mssv",
        "full_name",
        "email",
        "password_hash",
        "role",
        "is_active",
        "must_change_pw",
        "qr_secret",
      ];

      const placeholders = [
        "?",
        "?",
        "?",
        "?",
        "'student'",
        "1",
        "1",
        "?",
      ];

      const insertValues: unknown[] = [
        mssv,
        fullName,
        email || null,
        passwordHash,
        `${mssv}-${Date.now()}`,
      ];

      if (columnNames.has("phone")) {
        insertColumns.push("phone");
        placeholders.push("?");
        insertValues.push(phone || null);
      }

      if (columnNames.has("gender")) {
        insertColumns.push("gender");
        placeholders.push("?");
        insertValues.push(gender || null);
      }

      insertColumns.push("date_of_birth");
      placeholders.push("?");
      insertValues.push(dateOfBirth || null);

      if (columnNames.has("created_at")) {
        insertColumns.push("created_at");
        placeholders.push("datetime('now')");
      }

      if (columnNames.has("updated_at")) {
        insertColumns.push("updated_at");
        placeholders.push("datetime('now')");
      }

      const result = db
        .prepare(
          `
          INSERT INTO users (
            ${insertColumns.join(", ")}
          )
          VALUES (
            ${placeholders.join(", ")}
          )
          `
        )
        .run(...insertValues);

      const newUserId = Number(result.lastInsertRowid);

      db.prepare(
        `
        INSERT INTO class_members (
          class_id,
          user_id,
          joined_at
        )
        VALUES (?, ?, datetime('now'))
        `
      ).run(targetClassId, newUserId);

      inserted++;
      attachedToClass++;
    }
  });

  tx();

  const conflicts = conflictMessages.length;

  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/students");
  revalidatePath("/dashboard/admin/students-import");

  const total =
    inserted +
    updated +
    attachedToClass +
    transferred +
    skippedExisting +
    conflicts;

  return {
    ok: true,
    message: `Import hoàn tất: thêm mới ${inserted}, cập nhật ${updated}, gán lớp ${attachedToClass}, chuyển lớp ${transferred}, bỏ qua ${skippedExisting}, lỗi ${conflicts}.`,
    inserted,
    updated,
    attachedToClass,
    transferred,
    skippedExisting,
    conflicts,
    total,
    conflictMessages,
  };
}
