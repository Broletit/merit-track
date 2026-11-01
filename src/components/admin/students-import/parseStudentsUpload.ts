import * as XLSX from "xlsx";
import type { ParsedImportStudentRow } from "./types";

export type StudentsUploadPreview = { headers: string[]; rows: string[][]; parsedRows: ParsedImportStudentRow[]; error: string; };

function normalizeHeader(value: string) {
  const key = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const aliases: Record<string,string> = { ma_sv:"mssv", ma_sinh_vien:"mssv", ho_dem:"last_name", ho_lot:"last_name", ho_va_ten_dem:"last_name", ten:"first_name", ho_ten:"full_name", ho_va_ten:"full_name", gioi_tinh:"gender", ngay_sinh:"date_of_birth", so_dt:"phone", so_dien_thoai:"phone", dien_thoai:"phone", email:"email" };
  return aliases[key] || key;
}
function hasStudentHeaders(row: string[]) {
  const names = row.map(normalizeHeader);
  return names.includes("mssv") && (names.includes("full_name") || (names.includes("last_name") && names.includes("first_name")));
}
function normalizeBirthDate(value: string) {
  const match = value.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  return match ? `${match[3]}-${match[2].padStart(2,"0")}-${match[1].padStart(2,"0")}` : value;
}

function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/).find(line => [",", ";", "\t"].some(delimiter => hasStudentHeaders(line.split(delimiter)))) ?? text.split(/\r?\n/).find(line => line.trim()) ?? "";
  return [",", ";", "\t"].map((delimiter) => ({ delimiter, score: firstLine.split(delimiter).length })).sort((a, b) => b.score - a.score)[0].delimiter;
}

export async function parseStudentsUpload(file: File): Promise<StudentsUploadPreview> {
  const fileName = file.name.toLowerCase();
  let workbook: XLSX.WorkBook;
  if (fileName.endsWith(".csv")) {
    const text = (await file.text()).replace(/^\uFEFF/, "");
    workbook = XLSX.read(text, { type: "string", raw: true, FS: detectDelimiter(text) });
  } else if (fileName.endsWith(".xls") || fileName.endsWith(".xlsx")) {
    workbook = XLSX.read(await file.arrayBuffer(), { type: "array", dateNF: "dd/mm/yyyy" });
  } else { throw new Error("Chỉ hỗ trợ file CSV, XLS hoặc XLSX."); }
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("File không có sheet dữ liệu.");
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "", raw: false, blankrows: true, dateNF: "dd/mm/yyyy" });
  const headerIndex = matrix.findIndex(row => hasStudentHeaders(row.map(value => String(value ?? ""))));
  const headers = (matrix[headerIndex] ?? []).map((value) => String(value ?? ""));
  const sheetStartRow = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]).s.r : 0;
  const sheetStartColumn = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]).s.c : 0;
  const rows = matrix.slice(headerIndex + 1).map((row, rowIndex) => headers.map((header, index) => {
    if (normalizeHeader(header) === "date_of_birth") {
      const cell = sheet[XLSX.utils.encode_cell({r:sheetStartRow + headerIndex + 1 + rowIndex,c:sheetStartColumn + index})];
      if (cell?.t === "n" && typeof cell.v === "number") {
        // Format the Excel date value directly, independent of short/custom workbook display formats.
        return XLSX.SSF.format("dd/mm/yyyy", cell.v, {date1904:workbook.Workbook?.WBProps?.date1904});
      }
      const value = String(row[index] ?? "");
      const date = normalizeBirthDate(value);
      const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
      if (iso) return iso[3]+"/"+iso[2]+"/"+iso[1];
    }
    return String(row[index] ?? "");
  }));
  const normalizedHeaders = headers.map(normalizeHeader);
  const getValue = (row: string[], name: string) => (row[normalizedHeaders.indexOf(name)] ?? "").trim();
  const firstRowNumber = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]).s.r + headerIndex + 2 : headerIndex + 2;
  const parsedRows = rows.flatMap((row, index): ParsedImportStudentRow[] => {
    if (row.every((value) => !value.trim())) return [];
    const hasStudentNumber = /^\d+$/.test(getValue(row, "mssv")) || /^\d+$/.test(getValue(row, "stt"));
    const isFooter = row.some(value => /^(si_so(?:_|$)|sy_so(?:_|$)|tong_so(?:_|$)|tp_.*_ngay_|truong_khoa$)/.test(normalizeHeader(value)));
    if (isFooter && !hasStudentNumber) return [];
    const studentFields = ["mssv", "full_name", "last_name", "first_name", "email", "phone", "gender", "date_of_birth"];
    if (!studentFields.some(field => getValue(row, field))) return [];
    return [{ rowNumber: firstRowNumber + index, mssv: getValue(row, "mssv"),
      full_name: getValue(row, "full_name") || [getValue(row, "last_name"), getValue(row, "first_name")].filter(Boolean).join(" "),
      email: getValue(row, "email") || null, phone: getValue(row, "phone") || null,
      gender: getValue(row, "gender") || null, date_of_birth: normalizeBirthDate(getValue(row, "date_of_birth")) || null }];
  });
  let error = "";
  if (headerIndex < 0) { error = "Không tìm thấy hàng tiêu đề Mã SV, Họ đệm, Tên (hoặc MSSV, Họ tên).";
  } else if (!headers.some((header) => header.trim()) || !parsedRows.length) { error = "File không có dữ liệu sinh viên.";
  } else if (!normalizedHeaders.includes("mssv") || !(normalizedHeaders.includes("full_name") || (normalizedHeaders.includes("last_name") && normalizedHeaders.includes("first_name")))) {
    error = "Không tìm thấy hàng tiêu đề Mã SV, Họ đệm, Tên (hoặc MSSV, Họ tên).";
  } else {
    const invalidRows = parsedRows.filter((row) => !row.mssv || !row.full_name);
    if (invalidRows.length) error = invalidRows.slice(0, 5).map(row => `Dòng ${row.rowNumber}: thiếu ${[!row.mssv && "MSSV", !row.full_name && "họ tên"].filter(Boolean).join(" và ")}`).join("; ") + (invalidRows.length > 5 ? `; còn ${invalidRows.length - 5} dòng thiếu thông tin.` : ".");
  }
  return { headers, rows, parsedRows, error };
}
