"use server";

import { classDraftErrors } from "@/lib/classes/classDraft";
import { assertImportCohort } from "@/lib/cohorts/cohorts";
import { getDatabase } from "@/server/db/mysql";
import { requireAdminContext } from "@/server/auth/guards";
import type {
  ImportPreviewResult,
  ParsedImportStudentRow,
} from "@/components/admin/students-import/types";

type PreviewPayload = {
  classMode: "existing" | "new";
  cohort: number;
  classId?: number | null;
  newClassCode?: string;
  newClassName?: string;
  newClassFaculty?: string;
  allowUpdateExisting?: boolean;
  allowTransferClass?: boolean;
  rows: ParsedImportStudentRow[];
};

async function resolvePreviewTargetClass(payload: PreviewPayload) {
  const db = getDatabase();

  if (payload.classMode === "existing") {
    const classId = Number(payload.classId ?? 0);

    if (!Number.isFinite(classId) || classId <= 0) {
      throw new Error("Vui lòng chọn lớp có sẵn.");
    }

    const found = (await db.first(`
        SELECT id, code, name, cohort
        FROM classes
        WHERE id = ?
        LIMIT 1
        `, [classId])) as { id: number; code: string; name: string; cohort: number | null } | undefined;

    if (!found) {
      throw new Error("Lớp đã chọn không tồn tại.");
    }

    if (found.cohort && found.cohort !== payload.cohort) throw new Error("Lớp đã chọn thuộc khóa khác.");
    return {
      id: Number(found.id),
      label: `${found.code} - ${found.name}`,
      exists: true,
    };
  }

  const code = String(payload.newClassCode ?? "").trim();
  const name = String(payload.newClassName ?? "").trim();

  if (!code || !name) {
    throw new Error("Vui lòng nhập mã lớp và tên lớp mới.");
  }


  const errors=classDraftErrors((await db.rows("SELECT code,name FROM classes", [])) as Array<{code:string;name:string}>,code,name,String(payload.newClassFaculty??""));
  const error=Object.values(errors).filter(Boolean).join("\n");
  if(error) throw new Error(error);

  return {
    id: null,
    label: `${code} - ${name}`,
    exists: false,
  };
}

export async function previewImportStudents(
  payload: PreviewPayload
): Promise<ImportPreviewResult> {
  await requireAdminContext();
  if (!payload.rows || payload.rows.length === 0) {
    throw new Error("Không có dữ liệu sinh viên để kiểm tra.");
  }

  assertImportCohort(payload.cohort, payload.rows);
  const db = getDatabase();
  const targetClass = (await resolvePreviewTargetClass(payload));

  const seenMssv = new Set<string>();
  const rows = [];
  let creatable = 0;
  let sameClassUnchanged = 0;
  let sameClassDifferentInfo = 0;
  let differentClass = 0;
  let invalid = 0;
  let duplicateInFile = 0;

  for (const row of payload.rows) {
    const mssv = String(row.mssv ?? "").trim();
    const fullName = String(row.full_name ?? "").trim();
    const email = row.email ? String(row.email).trim() : null;

    if (!mssv || !fullName) {
      invalid += 1;
      rows.push({
        rowNumber: row.rowNumber,
        mssv,
        full_name: fullName,
        email,
        currentClass: null,
        status: "invalid" as const,
        message: "Thiếu MSSV hoặc họ tên.",
      });
      continue;
    }

    if (seenMssv.has(mssv)) {
      duplicateInFile += 1;
      rows.push({
        rowNumber: row.rowNumber,
        mssv,
        full_name: fullName,
        email,
        currentClass: null,
        status: "duplicate_in_file" as const,
        message: "MSSV bị trùng trong chính file import.",
      });
      continue;
    }

    seenMssv.add(mssv);

    const existingUser = (await db.first(`
        SELECT id, full_name, email, role, cohort
        FROM users
        WHERE mssv = ?
        LIMIT 1
        `, [mssv])) as
      | { id: number; full_name: string; email: string | null; role: string; cohort: number | null }
      | undefined;

    if (!existingUser) {
      creatable += 1;
      rows.push({
        rowNumber: row.rowNumber,
        mssv,
        full_name: fullName,
        email,
        currentClass: null,
        status: "create" as const,
        message: "Sẽ tạo mới tài khoản và gán vào lớp.",
      });
      continue;
    }

    if (existingUser.cohort != null && existingUser.cohort !== payload.cohort) {
      invalid += 1;
      rows.push({rowNumber:row.rowNumber,mssv,full_name:fullName,email,currentClass:null,status:"invalid" as const,
        message:`MSSV đang được lưu ở Khóa ${existingUser.cohort}, không khớp Khóa ${payload.cohort}. Cần kiểm tra dữ liệu trước khi import.`});
      continue;
    }

    if (existingUser.role !== "student") {
      invalid += 1;
      rows.push({
        rowNumber: row.rowNumber,
        mssv,
        full_name: fullName,
        email,
        currentClass: null,
        status: "invalid" as const,
        message: "MSSV đã tồn tại nhưng không phải tài khoản sinh viên.",
      });
      continue;
    }

    const membership = (await db.first(`
        SELECT
          cm.class_id,
          c.code AS class_code,
          c.name AS class_name
        FROM class_members cm
        INNER JOIN classes c ON c.id = cm.class_id
        WHERE cm.user_id = ? AND cm.left_at IS NULL
        ORDER BY cm.id DESC
        LIMIT 1
        `, [existingUser.id])) as
      | { class_id: number; class_code: string; class_name: string }
      | undefined;

    const sameInfo =
      String(existingUser.full_name ?? "") === fullName &&
      String(existingUser.email ?? "") === String(email ?? "");

    const currentClassLabel = membership
      ? `${membership.class_code} - ${membership.class_name}`
      : null;

    if (!membership) {
      if (sameInfo) {
        creatable += 1;
        rows.push({
          rowNumber: row.rowNumber,
          mssv,
          full_name: fullName,
          email,
          currentClass: null,
          status: "create" as const,
          message: "Sinh viên đã có tài khoản nhưng chưa gán lớp, sẽ gán vào lớp đích.",
        });
      } else {
        sameClassDifferentInfo += 1;
        rows.push({
          rowNumber: row.rowNumber,
          mssv,
          full_name: fullName,
          email,
          currentClass: null,
          status: "same_class_diff_info" as const,
          message:
            "Sinh viên đã có tài khoản nhưng khác thông tin. Chỉ cập nhật khi bật tùy chọn cập nhật thông tin.",
        });
      }
      continue;
    }

    if (targetClass.id && Number(membership.class_id) === Number(targetClass.id)) {
      if (sameInfo) {
        sameClassUnchanged += 1;
        rows.push({
          rowNumber: row.rowNumber,
          mssv,
          full_name: fullName,
          email,
          currentClass: currentClassLabel,
          status: "same_class_unchanged" as const,
          message: "Sinh viên đã tồn tại đúng lớp và không có thay đổi.",
        });
      } else {
        sameClassDifferentInfo += 1;
        rows.push({
          rowNumber: row.rowNumber,
          mssv,
          full_name: fullName,
          email,
          currentClass: currentClassLabel,
          status: "same_class_diff_info" as const,
          message:
            "Sinh viên đã ở đúng lớp nhưng khác thông tin. Chỉ cập nhật khi bật tùy chọn cập nhật thông tin.",
        });
      }
      continue;
    }

    differentClass += 1;
    rows.push({
      rowNumber: row.rowNumber,
      mssv,
      full_name: fullName,
      email,
      currentClass: currentClassLabel,
      status: "different_class" as const,
      message:
        "Sinh viên đang thuộc lớp khác. Chỉ chuyển lớp khi bật tùy chọn cho phép chuyển lớp.",
    });
  }

  return {
    ok: true,
    message: "Đã kiểm tra xong dữ liệu import.",
    targetClassId: targetClass.id,
    total: payload.rows.length,
    creatable,
    sameClassUnchanged,
    sameClassDifferentInfo,
    differentClass,
    invalid,
    duplicateInFile,
    rows,
  };
}
