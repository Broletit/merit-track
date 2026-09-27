import { requireFacultyOfficerContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import FacultyOfficerCheckinHeader from "@/components/faculty-officer/checkin/FacultyOfficerCheckinHeader";
import FacultyOfficerCheckinForm from "@/components/faculty-officer/checkin/FacultyOfficerCheckinForm";
import type { CheckinActivityOption } from "@/components/faculty-officer/checkin/types";
import {
  getAcademicTermForView,
  getAcademicTermsForSelect,
} from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{
  termId?: string;
}>;

type Row = {
  id: number;
  title: string;
  audience_type: string;
  start_at: string;
  end_at: string;
  qr_checkin_enabled: number;
};

export default async function FacultyOfficerCheckinPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireFacultyOfficerContext();

  const params = await searchParams;
  const db = getDb();

  const terms = getAcademicTermsForSelect();
  const selectedTerm = getAcademicTermForView(params.termId);

  const rows = db
    .prepare(
      `
      SELECT
        id,
        title,
        audience_type,
        start_at,
        end_at,
        qr_checkin_enabled
      FROM activities
      WHERE status = 'published'
        AND qr_checkin_enabled = 1
        AND term_id = ?
      ORDER BY datetime(start_at) DESC, id DESC
      `
    )
    .all(selectedTerm.id) as Row[];

  const activities: CheckinActivityOption[] = rows.map((item) => ({
    id: Number(item.id),
    title: String(item.title ?? ""),
    audienceType: String(item.audience_type ?? ""),
    startAt: String(item.start_at ?? ""),
    endAt: String(item.end_at ?? ""),
    qrCheckinEnabled: Number(item.qr_checkin_enabled ?? 0) === 1,
  }));

  return (
    <main className="space-y-6">
      <FacultyOfficerCheckinHeader termSelect={<AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />} />

      {!selectedTerm.isActive ? (
        <section className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-700 ring-1 ring-amber-100">
          Bạn đang xem học kỳ cũ. Chỉ xem lại dữ liệu, không nên điểm danh.
        </section>
      ) : null}

      <FacultyOfficerCheckinForm
        activities={selectedTerm.isActive ? activities : []}
      />
    </main>
  );
}
