import { getActiveAcademicTerm } from "@/server/academic-terms/getActiveAcademicTerm";

export default function ActiveTermBadge() {
  const term = getActiveAcademicTerm();

  if (!term) return null;

  return (
    <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 ring-1 ring-blue-100">
      Học kỳ hiện hành: {term.name}
    </div>
  );
}