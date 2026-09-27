import path from "path";
import * as XLSX from "xlsx";

export type ParsedStudentRow = {
  mssv: string;
  fullName: string;
  email: string | null;
  classCode: string | null;
};

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .replace(/_/g, "");
}

function getCell(row: Record<string, unknown>, aliases: string[]) {
  const normalized = Object.entries(row).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      acc[normalizeHeader(key)] = value;
      return acc;
    },
    {}
  );

  for (const alias of aliases) {
    const found = normalized[normalizeHeader(alias)];

    if (found !== undefined && found !== null) {
      return String(found).trim();
    }
  }

  return "";
}

function parseCsvText(text: string) {
  const clean = text.replace(/^\uFEFF/, "");

  const lines = clean
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  const delimiter =
    (lines[0].match(/;/g) || []).length >
    (lines[0].match(/,/g) || []).length
      ? ";"
      : ",";

  const headers = lines[0]
    .split(delimiter)
    .map((item) => item.trim());

  return lines.slice(1).map((line) => {
    const cols = line.split(delimiter);

    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = String(cols[index] ?? "").trim();
    });

    return row;
  });
}

export async function parseStudentImportFile(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());

  const ext = path.extname(file.name).toLowerCase();

  let rows: Record<string, unknown>[] = [];

  // CSV
  if (ext === ".csv") {
    const text = buffer.toString("utf8");
    rows = parseCsvText(text);
  }

  // XLSX / XLS
  else if (ext === ".xlsx" || ext === ".xls") {
    const workbook = XLSX.read(buffer, {
      type: "buffer",
    });

    const firstSheet = workbook.SheetNames[0];

    if (!firstSheet) {
      throw new Error("File Excel không có sheet.");
    }

    rows = XLSX.utils.sheet_to_json(
      workbook.Sheets[firstSheet],
      {
        defval: "",
      }
    ) as Record<string, unknown>[];
  }

  else {
    throw new Error("Chỉ hỗ trợ CSV hoặc Excel.");
  }

  if (rows.length === 0) {
    throw new Error("File không có dữ liệu.");
  }

  const parsed: ParsedStudentRow[] = rows.map((row) => {
    const mssv = getCell(row, [
      "mssv",
      "ma_sv",
      "masv",
      "studentid",
    ]);

    const fullName =
      getCell(row, [
        "full_name",
        "fullname",
        "ho_ten",
        "hoten",
      ]) ||
      `${getCell(row, ["ho", "hodem"])} ${getCell(row, ["ten"])}`.trim();

    const email =
      getCell(row, ["email"]) || null;

    const classCode =
      getCell(row, [
        "class_code",
        "lop",
        "malop",
      ]) || null;

    return {
      mssv,
      fullName,
      email,
      classCode,
    };
  });

  const valid = parsed.filter(
    (item) =>
      item.mssv.trim().length > 0 &&
      item.fullName.trim().length > 0
  );

  if (valid.length === 0) {
    throw new Error(
      "Không đọc được dữ liệu sinh viên từ file."
    );
  }

  return valid;
}
