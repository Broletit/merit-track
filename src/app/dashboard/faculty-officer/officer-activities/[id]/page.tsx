import { notFound } from "next/navigation";
import { requireOfficerParticipantContext } from "@/server/auth/requireOfficerParticipantContext";
import { getDb } from "@/server/db/sqlite";
import OfficerActivityDetailHeader from "@/components/faculty-officer/officer-activities/OfficerActivityDetailHeader";
import OfficerActivityDetailCard from "@/components/faculty-officer/officer-activities/OfficerActivityDetailCard";
import type { OfficerActivityDetail } from "@/components/faculty-officer/officer-activities/types";

type Row = {
  id: number;
  title: string;
  description: string | null;
  audience_type: string;
  status: string;
  start_at: string;
  end_at: string;
  registration_start_at: string;
  registration_end_at: string;
  conduct_score: number;
  qr_checkin_enabled: number;
  registration_status: string | null;
};

export default async function FacultyOfficerOfficerActivityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ termId?: string }>;
}) {
  const user = await requireOfficerParticipantContext();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const activityId = Number(id);

  if (!Number.isFinite(activityId) || activityId <= 0) notFound();

  const db = getDb();

  const row = db
    .prepare(
      `
      SELECT
        a.id,
        a.title,
        a.description,
        a.audience_type,
        a.status,
        a.start_at,
        a.end_at,
        a.registration_start_at,
        a.registration_end_at,
        a.conduct_score,
        a.qr_checkin_enabled,
        ar.status AS registration_status
      FROM activities a
      LEFT JOIN activity_registrations ar
        ON ar.activity_id = a.id
       AND ar.user_id = ?
      WHERE a.id = ?
        AND a.audience_type = 'officer'
        AND a.status = 'published'
      LIMIT 1
      `
    )
    .get(user.id, activityId) as Row | undefined;

  if (!row) notFound();

  const now = new Date();
  const regStart = new Date(row.registration_start_at);
  const regEnd = new Date(row.registration_end_at);

  const item: OfficerActivityDetail = {
    id: Number(row.id),
    title: String(row.title ?? ""),
    description: row.description ? String(row.description) : "",
    audienceType: String(row.audience_type ?? ""),
    status: String(row.status ?? ""),
    startAt: String(row.start_at ?? ""),
    endAt: String(row.end_at ?? ""),
    registrationStartAt: String(row.registration_start_at ?? ""),
    registrationEndAt: String(row.registration_end_at ?? ""),
    conductScore: Number(row.conduct_score ?? 0),
    registrationStatus: row.registration_status
      ? String(row.registration_status)
      : null,
    canRegister:
      now >= regStart &&
      now <= regEnd &&
      !row.registration_status,
    qrCheckinEnabled: Number(row.qr_checkin_enabled ?? 0) === 1,
  };
  const contextSegment = user.loginContext === "class_officer" ? "class-officer" : "faculty-officer";
  const backHref = `/dashboard/${contextSegment}/officer-activities${sp.termId ? `?termId=${encodeURIComponent(sp.termId)}` : ""}`;

  return (
    <main className="space-y-6">
      <OfficerActivityDetailHeader item={item} backHref={backHref} />
      <OfficerActivityDetailCard item={item} />
    </main>
  );
}
