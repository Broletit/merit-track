import { getActiveAcademicTerm } from "./getActiveAcademicTerm";

export function getRequiredActiveTerm() {
  const term = getActiveAcademicTerm();

  if (!term) {
    throw new Error("Chưa có học kỳ đang áp dụng. Vui lòng thiết lập học kỳ trước.");
  }

  return term;
}