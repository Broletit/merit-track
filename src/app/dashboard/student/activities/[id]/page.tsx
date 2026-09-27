import { notFound } from "next/navigation";
import { requireStudentContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import StudentActivityDetailCard from "@/components/student/activities/StudentActivityDetailCard";
import StudentActivityDetailHeader from "@/components/student/activities/StudentActivityDetailHeader";
import type { StudentActivityDetail } from "@/components/student/activities/types";

type ActivityRow = {
  id: number;
  title: string;
  description: string;
  audience_type: string;
  status: string;
  start_at: string;
  end_at: string;
  registration_start_at: string;
  registration_end_at: string;
  conduct_score: number;
  qr_checkin_enabled: number;
  registration_status: "not_registered" | "registered" | "attended" | "cancelled";
  registration_locked: number;
  participation_source: string;
};

function buildRegisterState(row: ActivityRow) {
  const now = new Date();
  const regStart = row.registration_start_at ? new Date(row.registration_start_at) : null;
  const regEnd = row.registration_end_at ? new Date(row.registration_end_at) : null;

  if (row.registration_status === "registered") return { canRegister: false };
  if (row.registration_status === "attended") return { canRegister: false };
  if (row.status !== "published") return { canRegister: false };
  if (row.participation_source === "external") return { canRegister: false };
  if (row.registration_locked) return { canRegister: false };
  if (regStart && now < regStart) return { canRegister: false };
  if (regEnd && now > regEnd) return { canRegister: false };

  return { canRegister: true };
}

function canCancelRegistration(row: ActivityRow) {
  const now = new Date();
  return (
    row.registration_status === "registered" &&
    now <= new Date(row.registration_end_at) &&
    now < new Date(row.start_at) &&
    !row.registration_locked
  );
}

export default async function StudentActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireStudentContext();
  const { id } = await params;
  const activityId = Number(id);

  if (!Number.isFinite(activityId)) notFound();

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
        a.registration_locked,
        a.participation_source,
        a.conduct_score,
        a.qr_checkin_enabled,
        COALESCE((
          SELECT ar.status
          FROM activity_registrations ar
          WHERE ar.activity_id = a.id
            AND ar.user_id = ?
          ORDER BY ar.id DESC
          LIMIT 1
        ), 'not_registered') AS registration_status
      FROM activities a
      WHERE a.id = ?
        AND a.status = 'published'
        AND a.audience_type = 'student'
        AND (
          NOT EXISTS (
            SELECT 1 FROM activity_scopes activity_scope
            WHERE activity_scope.activity_id = a.id
          )
          OR EXISTS (
            SELECT 1
            FROM activity_scopes activity_scope
            INNER JOIN class_members member
              ON member.class_id = activity_scope.class_id
            WHERE activity_scope.activity_id = a.id
              AND member.user_id = ?
              AND member.left_at IS NULL
          )
        )
      LIMIT 1
      `
    )
    .get(user.id, activityId, user.id) as ActivityRow | undefined;

  if (!row) notFound();

  const registerState = buildRegisterState(row);

  const item: StudentActivityDetail = {
    id: Number(row.id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    audienceType: String(row.audience_type ?? ""),
    startAt: String(row.start_at ?? ""),
    endAt: String(row.end_at ?? ""),
    registrationStartAt: String(row.registration_start_at ?? ""),
    registrationEndAt: String(row.registration_end_at ?? ""),
    conductScore: Number(row.conduct_score ?? 0),
    registrationStatus: row.registration_status ?? "not_registered",
    qrCheckinEnabled: Number(row.qr_checkin_enabled ?? 0) === 1,
    canRegister: registerState.canRegister,
    participationSource: row.participation_source,
    canCancel: canCancelRegistration(row),
  };

  return (
    <main className="space-y-6">
      <StudentActivityDetailHeader item={item} />
      <StudentActivityDetailCard item={item} />
    </main>
  );
}
