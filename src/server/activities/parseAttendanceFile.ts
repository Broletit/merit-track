import * as XLSX from "xlsx";

function header(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d").toLowerCase().replace(/[^a-z0-9]/g, "");
}
const studentIdHeaders = ["mssv", "masv", "masinhvien", "studentid", "studentcode"];

export function parseAttendanceFile(buffer: Uint8Array, filename: string) {
  let workbook: XLSX.WorkBook;
  if (/\.csv$/i.test(filename)) {
    const text = new TextDecoder().decode(buffer).replace(/^\uFEFF/, "");
    const delimiters = [",", ";", "\t"];
    const delimiter = delimiters.find(separator => text.split(/\r?\n/).some(line =>
      line.split(separator).some(cell => studentIdHeaders.includes(header(cell))))) ?? ",";
    workbook = XLSX.read(text, { type: "string", FS: delimiter, raw: true });
  } else {
    workbook = XLSX.read(buffer, { type: "array" });
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("File không có sheet dữ liệu.");
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false, blankrows: true });
  const titleRow = matrix.findIndex(row => row.some(cell => studentIdHeaders.includes(header(cell))));
  if (titleRow < 0) throw new Error("Không tìm thấy cột MSSV hoặc Mã sinh viên trong file.");
  const columns = matrix[titleRow].map(header);
  const idColumn = columns.findIndex(cell => studentIdHeaders.includes(cell));
  const nameColumn = columns.findIndex(cell => ["hoten", "hovaten", "fullname", "name"].includes(cell));
  const orderColumn = columns.indexOf("stt");
  const firstDataRow = (sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]).s.r : 0) + titleRow + 2;
  const rows = matrix.slice(titleRow + 1).flatMap((row, index) => {
    const mssv = String(row[idColumn] ?? "").normalize("NFKC").trim();
    const fileName = String(row[nameColumn] ?? "").trim();
    const hasOrder = /^\d+$/.test(String(row[orderColumn] ?? "").trim());
    if (!mssv && !fileName && !hasOrder) return [];
    return [{ rowNumber: firstDataRow + index, mssv, fileName }];
  });
  if (!rows.length) throw new Error("File không có dữ liệu sinh viên.");
  return rows;
}
