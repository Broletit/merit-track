import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import AcademicTermsHeader from "@/components/admin/academic-terms/AcademicTermsHeader";
import AcademicTermCreateForm from "@/components/admin/academic-terms/AcademicTermCreateForm";
import AcademicTermsTable from "@/components/admin/academic-terms/AcademicTermsTable";
import type { AcademicTermItem } from "@/components/admin/academic-terms/types";

type Row = {
  id: number;
  academic_year: string;
  semester: string;
  name: string;
  start_at: string;
  end_at: string;
  is_active: number;
};

export default async function AdminAcademicTermsPage() {
  await requireAdminContext();

  const db = getDb();

  const rows = db
    .prepare(
      `
      SELECT
        id,
        academic_year,
        semester,
        name,
        start_at,
        end_at,
        is_active
      FROM academic_terms
      ORDER BY datetime(start_at) DESC, id DESC
      `
    )
    .all() as Row[];

  const items: AcademicTermItem[] = rows.map((item) => ({
    id: Number(item.id),
    academicYear: String(item.academic_year ?? ""),
    semester: String(item.semester ?? ""),
    name: String(item.name ?? ""),
    startAt: String(item.start_at ?? ""),
    endAt: String(item.end_at ?? ""),
    isActive: Number(item.is_active ?? 0) === 1,
  }));

  return (
    <main className="space-y-6">
      <AcademicTermsHeader />
      <AcademicTermCreateForm />
      <AcademicTermsTable items={items} />
    </main>
  );
}