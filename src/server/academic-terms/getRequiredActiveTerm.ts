import { getActiveAcademicTerm } from "./getActiveAcademicTerm";

export async function getRequiredActiveTerm() {
  const term = (await getActiveAcademicTerm());

  if (!term) {
    throw new Error("Chưa có học kỳ đang áp dụng. Vui lòng thiết lập học kỳ trước.");
  }

  return term;
}