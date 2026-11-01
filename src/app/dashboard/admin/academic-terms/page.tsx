import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
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

  const db = getDatabase();

  const rows = (await db.rows(`
      SELECT
        id,
        academic_year,
        semester,
        name,
        start_at,
        end_at,
        is_active
      FROM academic_terms
      ORDER BY CAST(start_at AS DATETIME(3)) DESC, id DESC
      `, [])) as Row[];

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