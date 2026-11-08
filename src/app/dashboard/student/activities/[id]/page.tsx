import { activityVisibleSql } from "@/server/cohorts/sql";
import { notFound } from "next/navigation";
import { requireStudentContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
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
  absence_penalty: number;
  max_registrations:number|null;
  registration_count:number;
  qr_checkin_enabled: number;
  registration_status: "not_registered" | "registered" | "attended" | "cancelled";
  registration_locked: number;
  participation_source: string;
  category_label: string | null; category_parent_label: string | null;
  category_max: number | null;
  category_score: number;
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
  if(row.max_registrations!==null&&row.registration_count>=row.max_registrations)return {canRegister:false};
  if (regStart && now < regStart) return { canRegister: false };
  if (regEnd && now > regEnd) return { canRegister: false };

  return { canRegister: true };
}

export default async function StudentActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireStudentContext();
  const { id } = await params;
  const activityId = await getDatabase().resolveRouteRecordId(id);

  if (!Number.isFinite(activityId)) notFound();

  const db = getDatabase();

  const row = (await db.first(`
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
        a.absence_penalty,
        a.max_registrations,
        (SELECT COUNT(*) FROM activity_registrations capacity_ar WHERE capacity_ar.activity_id=a.id AND capacity_ar.status<>'cancelled') registration_count,
        a.qr_checkin_enabled,
        CASE WHEN category.id IS NULL THEN NULL ELSE CONCAT(CONCAT(category.code, ' · '), category.name) END AS category_label,
        CASE WHEN category_parent.id IS NULL THEN NULL ELSE CONCAT(CONCAT(category_parent.code, ' · '), category_parent.name) END AS category_parent_label,
        category.score_max AS category_max,
        COALESCE((
          SELECT GREATEST(0, LEAST(category.score_max, SUM(cs.score_value)))
          FROM conduct_scores cs
          INNER JOIN activities source_activity ON source_activity.id=cs.source_id
          WHERE cs.user_id=?
            AND cs.source_type='activity'
            AND source_activity.conduct_category_id=category.id
        ),0) AS category_score,
        COALESCE((
          SELECT ar.status
          FROM activity_registrations ar
          WHERE ar.activity_id = a.id
            AND ar.user_id = ?
          ORDER BY ar.id DESC
          LIMIT 1
        ), 'not_registered') AS registration_status
      FROM activities a
      LEFT JOIN conduct_score_categories category ON category.id=a.conduct_category_id
      LEFT JOIN conduct_score_categories category_parent ON category_parent.id=category.parent_id
      WHERE a.id = ?
        AND a.status = 'published'
        AND a.audience_type = 'student'
        AND ${activityVisibleSql("a", String(user.id))}
      LIMIT 1
      `, [user.id, user.id, activityId])) as ActivityRow | undefined;

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
    absencePenalty: Number(row.conduct_score ?? 0),
    registrationStatus: row.registration_status ?? "not_registered",
    qrCheckinEnabled: Number(row.qr_checkin_enabled ?? 0) === 1,
    canRegister: registerState.canRegister,
    maxRegistrations: row.max_registrations,
    capacityFull: row.max_registrations!==null&&row.registration_count>=row.max_registrations,
    participationSource: row.participation_source,
    categoryLabel: row.category_label ? String(row.category_label) : null,
    categoryParentLabel: row.category_parent_label ? String(row.category_parent_label) : null,
    categoryScore: Number(row.category_score ?? 0),
    categoryMax: Number(row.category_max ?? 0),
    projectedScore: Math.max(0, Math.min(Number(row.conduct_score ?? 0), Number(row.category_max ?? 0) - Number(row.category_score ?? 0))),
  };

  return (
    <main className="space-y-6">
      <StudentActivityDetailHeader item={item} />
      <StudentActivityDetailCard item={item} />
    </main>
  );
}
