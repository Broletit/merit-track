import { getDatabase } from "@/server/db/mysql";
import { getActiveAcademicTerm } from "./getActiveAcademicTerm";

export type AcademicTermView = {
  id: number;
  academicYear: string;
  semester: string;
  name: string;
  startAt: string;
  endAt: string;
  isActive: boolean;
};

type Row = {
  id: number;
  academic_year: string;
  semester: string;
  name: string;
  start_at: string;
  end_at: string;
  is_active: number;
};

export function assertDateRangeInsideTerm({
  startAt,
  endAt,
  termStartAt,
  termEndAt,
  label,
}: {
  startAt: string;
  endAt: string;
  termStartAt: string;
  termEndAt: string;
  label: string;
}) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const termStart = new Date(termStartAt);
  const termEnd = new Date(termEndAt);

  if ([start, end, termStart, termEnd].some((date) => Number.isNaN(date.getTime()))) {
    throw new Error(`${label} không hợp lệ.`);
  }

  if (start < termStart || end > termEnd) {
    throw new Error(`${label} phải nằm trong thời gian của học kỳ.`);
  }
}

export async function getAcademicTermsForSelect(): Promise<AcademicTermView[]> {
  const db = getDatabase();

  const rows = (await db.rows(`
      SELECT id, academic_year, semester, name, start_at, end_at, is_active
      FROM academic_terms
      ORDER BY CAST(start_at AS DATETIME(3)) DESC, id DESC
      `, [])) as Row[];

  return rows.map((item) => ({
    id: Number(item.id),
    academicYear: String(item.academic_year ?? ""),
    semester: String(item.semester ?? ""),
    name: String(item.name ?? ""),
    startAt: String(item.start_at ?? ""),
    endAt: String(item.end_at ?? ""),
    isActive: Number(item.is_active ?? 0) === 1,
  }));
}

export async function getAcademicTermForView(termId?: string | number | null) {
  const db = getDatabase();

  const id = Number(termId ?? 0);

  if (Number.isFinite(id) && id > 0) {
    const row = (await db.first(`
        SELECT id, academic_year, semester, name, start_at, end_at, is_active
        FROM academic_terms
        WHERE id = ?
        LIMIT 1
        `, [id])) as Row | undefined;

    if (row) {
      return {
        id: Number(row.id),
        academicYear: String(row.academic_year ?? ""),
        semester: String(row.semester ?? ""),
        name: String(row.name ?? ""),
        startAt: String(row.start_at ?? ""),
        endAt: String(row.end_at ?? ""),
        isActive: Number(row.is_active ?? 0) === 1,
      };
    }
  }

  const active = (await getActiveAcademicTerm());

  if (active) {
    return {
      ...active,
      isActive: true,
    };
  }

  // Trang xem dữ liệu (dashboard, danh sách, báo cáo) vẫn cần hoạt động sau
  // khi dữ liệu được chuyển sang hệ thống mới nhưng chưa chọn học kỳ hiện hành.
  // Các thao tác cần ghi dữ liệu vẫn dùng getRequiredActiveTerm() và tiếp tục
  // yêu cầu quản trị viên thiết lập học kỳ đang áp dụng.
  const latest = (await db.first(`
      SELECT id, academic_year, semester, name, start_at, end_at, is_active
      FROM academic_terms
      ORDER BY CAST(start_at AS DATETIME(3)) DESC, id DESC
      LIMIT 1
      `, [])) as Row | undefined;

  if (!latest) {
    throw new Error("Chưa có học kỳ trong hệ thống. Vui lòng tạo học kỳ trước.");
  }

  return {
    id: Number(latest.id),
    academicYear: String(latest.academic_year ?? ""),
    semester: String(latest.semester ?? ""),
    name: String(latest.name ?? ""),
    startAt: String(latest.start_at ?? ""),
    endAt: String(latest.end_at ?? ""),
    isActive: false,
  };
}
