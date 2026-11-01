"use server";

import { revalidatePath } from "next/cache";
import { assertSameClassCohort } from "@/server/cohorts/classCohortIntegrity";
import { classDraftErrors } from "@/lib/classes/classDraft";
import { assertImportCohort } from "@/lib/cohorts/cohorts";
import { getDatabase } from "@/server/db/mysql";
import { requireAdminContext } from "@/server/auth/guards";
import { hashPasswordSync } from "@/server/auth/password";
import type {
  ImportPreviewRow,
  ParsedImportStudentRow,
} from "@/components/admin/students-import/types";

type ConfirmImportPayload = {
  classMode: "existing" | "new";
  cohort: number;
  classId?: number | null;
  newClassCode?: string;
  newClassName?: string;
  newClassFaculty?: string;
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

async function resolveClassId(payload: ConfirmImportPayload) {
  const db = getDatabase();

  if (payload.classMode === "existing") {
    const classId = Number(payload.classId ?? 0);

    const found = (await db.first(`
        SELECT id
        FROM classes
        WHERE id = ?
        LIMIT 1
        `, [classId])) as { id: number } | undefined;

    if (!found) {
      throw new Error("Lớp đã chọn không tồn tại.");
    }

    return Number(found.id);
  }

  const code = clean(payload.newClassCode);
  const name = clean(payload.newClassName);
  const faculty = clean(payload.newClassFaculty);

  if (!code || !name) {
    throw new Error("Thiếu thông tin lớp mới.");
  }


  const errors=classDraftErrors((await db.rows("SELECT code,name FROM classes", [])) as Array<{code:string;name:string}>,code,name,String(payload.newClassFaculty??""));
  const error=Object.values(errors).filter(Boolean).join("\n");
  if(error) throw new Error(error);

  const result = (await db.execute(`
      INSERT INTO classes (
        code,
        name,
        faculty,
        cohort,
        is_active,
        created_at
      )
      VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP(3))
      `, [code, name, faculty || "Chưa cập nhật", payload.cohort]));

  return Number(result.insertId);
}

export async function importStudents(payload: ConfirmImportPayload) {
  await requireAdminContext();

  const db = getDatabase();

  if (!payload.rows || payload.rows.length === 0) {
    throw new Error("Không có dữ liệu để import.");
  }

  if (!payload.previewRows || payload.previewRows.length === 0) {
    throw new Error("Bạn cần kiểm tra dữ liệu trước khi import.");
  }

  const cohort = assertImportCohort(payload.cohort, payload.rows);
  return (await (async () => (await db.withTransaction(async () => {
  // Validate all rows and class creation in one transaction: an error leaves no partial import.
  for (const row of payload.rows) {
    const existing = (await db.first("SELECT cohort FROM users WHERE mssv=?", [clean(row.mssv)])) as {cohort:number|null}|undefined;
    if (existing?.cohort != null && existing.cohort !== cohort) throw new Error(`MSSV ${clean(row.mssv)} đang được lưu ở Khóa ${existing.cohort}, không khớp Khóa ${cohort}. Vui lòng kiểm tra dữ liệu, không tự đổi khóa khi import.`);
  }
  const targetClassId = (await resolveClassId(payload));
  const targetClass = (await db.first("SELECT cohort FROM classes WHERE id=?", [targetClassId])) as {cohort:number|null};
  if (targetClass.cohort && targetClass.cohort !== cohort) throw new Error("Lớp đã chọn thuộc khóa khác.");
  (await db.execute("UPDATE classes SET cohort=? WHERE id=? AND cohort IS NULL", [cohort, targetClassId]));
  const passwordHash = hashPasswordSync("1111");

  const userColumns = (await db.rows(`SELECT COLUMN_NAME AS name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='users'`, [])) as Array<{
    name: string;
  }>;

  const columnNames = new Set(userColumns.map((item) => item.name));

  if (!columnNames.has("date_of_birth")) {
    throw new Error("Bảng users chưa có cột date_of_birth.");
  }

  

  

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

    const existingUser = (await db.first(`
    SELECT id
    FROM users
    WHERE mssv = ?
    LIMIT 1
    `, [mssv])) as UserRow | undefined;

    if (!existingUser) {
      continue;
    }

    const latestClass = (await db.first(`
    SELECT class_id
    FROM class_members
    WHERE user_id = ? AND left_at IS NULL
    ORDER BY id DESC
    LIMIT 1
    `, [existingUser.id])) as
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

  const tx = (async () => (await db.withTransaction(async () => {
    for (const rawRow of payload.rows) {
      const mssv = clean(rawRow.mssv);
      const fullName = getFullName(rawRow);

      const email = clean(rawRow.email);
      const phone = clean(rawRow.phone);
      const gender = clean(rawRow.gender);
      const dateOfBirth = clean(rawRow.date_of_birth);

      const existingUser = (await db.first(`
    SELECT id
    FROM users
    WHERE mssv = ?
    LIMIT 1
    `, [mssv])) as UserRow | undefined;

      /**
       * USER ĐÃ TỒN TẠI
       */
      if (existingUser) {
        (await db.execute("UPDATE users SET cohort=? WHERE id=? AND cohort IS NULL", [cohort, existingUser.id]));
        (await assertSameClassCohort(db,existingUser.id,targetClassId));
        const latestClass = (await db.first(`
    SELECT class_id
    FROM class_members
    WHERE user_id = ? AND left_at IS NULL
    ORDER BY id DESC
    LIMIT 1
    `, [existingUser.id])) as
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
            sets.push("updated_at = CURRENT_TIMESTAMP(3)");
          }

          values.push(existingUser.id);

          (await db.execute(`
            UPDATE users
            SET ${sets.join(", ")}
            WHERE id = ?
            `, [...values]));

          updated++;
          continue;
        }

        /**
         * CHUYỂN LỚP
         */
        if (isDifferentClass && payload.allowTransferClass) {
          (await db.execute(`
            UPDATE class_members SET left_at=CURRENT_TIMESTAMP(3)
            WHERE user_id = ? AND left_at IS NULL
            `, [existingUser.id]));

          (await db.execute(`
            INSERT INTO class_members (
              class_id,
              user_id,
              joined_at
            )
            VALUES (?, ?, CURRENT_TIMESTAMP(3))
            ON DUPLICATE KEY UPDATE joined_at=CURRENT_TIMESTAMP(3),left_at=NULL
            `, [targetClassId, existingUser.id]));

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

      insertColumns.push("cohort");
      placeholders.push("?");
      insertValues.push(cohort);

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
        placeholders.push("CURRENT_TIMESTAMP(3)");
      }

      if (columnNames.has("updated_at")) {
        insertColumns.push("updated_at");
        placeholders.push("CURRENT_TIMESTAMP(3)");
      }

      const result = (await db.execute(`
          INSERT INTO users (
            ${insertColumns.join(", ")}
          )
          VALUES (
            ${placeholders.join(", ")}
          )
          `, [...insertValues]));

      const newUserId = Number(result.insertId);

      (await db.execute(`
        INSERT INTO class_members (
          class_id,
          user_id,
          joined_at
        )
        VALUES (?, ?, CURRENT_TIMESTAMP(3))
        `, [targetClassId, newUserId]));

      inserted++;
      attachedToClass++;
    }
  })));

  (await tx());

  const conflicts = conflictMessages.length;

  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/students");
  revalidatePath("/dashboard/admin/students-import");
  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/classes");
  revalidatePath("/dashboard/student/activities");

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
  })))());
}
