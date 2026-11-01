import { requireFacultyOfficerContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import FacultyOfficerCheckinHeader from "@/components/faculty-officer/checkin/FacultyOfficerCheckinHeader";
import FacultyOfficerCheckinForm from "@/components/faculty-officer/checkin/FacultyOfficerCheckinForm";
import type { CheckinActivityOption } from "@/components/faculty-officer/checkin/types";

type Row = {
  id: number;
  title: string;
  audience_type: string;
  start_at: string;
  end_at: string;
  qr_checkin_enabled: number;
};

export default async function FacultyOfficerCheckinPage() {
  await requireFacultyOfficerContext();

  const db = getDatabase();


  const rows = (await db.rows(`
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
        AND EXISTS(SELECT 1 FROM academic_terms t WHERE t.id=activities.term_id AND t.is_active=1)
        AND CAST(start_at AS DATETIME(3))<=CURRENT_TIMESTAMP(3) AND CAST(end_at AS DATETIME(3))>CURRENT_TIMESTAMP(3)
      ORDER BY CAST(start_at AS DATETIME(3)) DESC, id DESC
      `, [])) as Row[];

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
      <FacultyOfficerCheckinHeader />

      <FacultyOfficerCheckinForm
        activities={activities}
      />
    </main>
  );
}
