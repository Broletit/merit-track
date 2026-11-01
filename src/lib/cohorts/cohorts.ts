export const COHORTS = [17, 18, 19, 20, 21] as const;
export function parseCohort(value: unknown): number | null {
  const cohort = Number(value);
  return Number.isInteger(cohort) && cohort >= 17 && cohort <= 95 ? cohort : null;
}
export function cohortFromMssv(value: unknown): number | null {
  const mssv = String(value ?? "").trim();
  return /^\d{8}$/.test(mssv) ? parseCohort(Number(mssv.slice(0, 2)) - 4) : null;
}
export function cohortLabel(value: unknown) { const cohort = parseCohort(value); return cohort ? `Khóa ${cohort}` : "Chưa xác định khóa"; }
export function assertImportCohort(cohortValue: unknown, rows: Array<{mssv: string; rowNumber?: number}>) {
  const cohort = parseCohort(cohortValue);
  if (!cohort) throw new Error("Vui lòng chọn khóa hợp lệ.");
  const errors: string[] = [];
  for (const [index, row] of rows.entries()) {
    const mssv = String(row.mssv ?? "").trim();
    const detected = cohortFromMssv(mssv);
    const line = row.rowNumber ?? index + 1;
    if (detected === null) errors.push(`Dòng ${line}: MSSV “${mssv || "trống"}” không hợp lệ; cần đủ 8 chữ số và có tiền tố xác định được khóa.`);
    else if (detected !== cohort) errors.push(`Dòng ${line}: MSSV ${mssv} thuộc Khóa ${detected}, không khớp Khóa ${cohort} đã chọn.`);
  }
  if (errors.length) throw new Error(`Không thể import: có ${errors.length} dòng sai MSSV hoặc sai khóa. Khóa ${cohort} yêu cầu MSSV bắt đầu bằng ${cohort + 4}, gồm 8 chữ số.\n${errors.slice(0, 8).join("\n")}${errors.length > 8 ? "\nVui lòng kiểm tra thêm các dòng còn lại trong file." : ""}`);
  return cohort;
}
