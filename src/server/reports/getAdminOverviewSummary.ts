import { getDb } from "@/server/db/sqlite";

export type AdminOverviewSummary = {
  active_students: number;
  active_classes: number;
  term_activities: number;
  completed_activities: number;
  valid_attendance_records: number;
  attended: number;
  unresolved_attendance: number;
  unique_student_attendees: number;
  student_submitted: number;
  student_passed: number;
  student_failed: number;
  student_pending: number;
  student_revision: number;
  officer_submitted: number;
  officer_passed: number;
  officer_failed: number;
  officer_pending: number;
  officer_revision: number;
};

export function getAdminOverviewSummary(termId: number) {
  const db = getDb();

  return db
    .prepare(
      `
      SELECT
        (SELECT COUNT(*) FROM users WHERE role IN ('student', 'class_officer') AND is_active = 1)
          AS active_students,
        (SELECT COUNT(*) FROM classes WHERE is_active = 1)
          AS active_classes,

        (
          SELECT COUNT(*)
          FROM activities a
          WHERE a.term_id = ?
            AND a.status IN ('published', 'closed')
        ) AS term_activities,

        (
          SELECT COUNT(*)
          FROM activities a
          WHERE a.term_id = ?
            AND datetime(a.end_at) < datetime('now')
            AND a.status IN ('published', 'closed')
        ) AS completed_activities,
        (
          SELECT COUNT(*)
          FROM activity_registrations ar
          INNER JOIN activities a ON a.id = ar.activity_id
          WHERE a.term_id = ?
            AND datetime(a.end_at) < datetime('now')
            AND ar.status IN ('attended', 'absent')
        ) AS valid_attendance_records,
        (
          SELECT COUNT(*)
          FROM activity_registrations ar
          INNER JOIN activities a ON a.id = ar.activity_id
          WHERE a.term_id = ?
            AND datetime(a.end_at) < datetime('now')
            AND ar.status = 'attended'
        ) AS attended,
        (
          SELECT COUNT(*)
          FROM activity_registrations ar
          INNER JOIN activities a ON a.id = ar.activity_id
          WHERE a.term_id = ?
            AND datetime(a.end_at) < datetime('now')
            AND ar.status = 'registered'
        ) AS unresolved_attendance,
        (
          SELECT COUNT(DISTINCT ar.user_id)
          FROM activity_registrations ar
          INNER JOIN activities a ON a.id = ar.activity_id
          INNER JOIN users u ON u.id = ar.user_id
          WHERE a.term_id = ?
            AND ar.status = 'attended'
            AND u.role IN ('student', 'class_officer')
            AND u.is_active = 1
        ) AS unique_student_attendees,

        (
          SELECT COUNT(*) FROM submissions s
          INNER JOIN events e ON e.id = s.event_id
          WHERE e.type = 'student' AND e.term_id = ?
            AND s.status <> 'draft' AND s.submitted_at IS NOT NULL
        ) AS student_submitted,
        (
          SELECT COUNT(*) FROM submissions s
          INNER JOIN events e ON e.id = s.event_id
          WHERE e.type = 'student' AND e.term_id = ? AND s.status = 'passed'
        ) AS student_passed,
        (
          SELECT COUNT(*) FROM submissions s
          INNER JOIN events e ON e.id = s.event_id
          WHERE e.type = 'student' AND e.term_id = ? AND s.status = 'failed'
        ) AS student_failed,
        (
          SELECT COUNT(*) FROM submissions s
          INNER JOIN events e ON e.id = s.event_id
          WHERE e.type = 'student' AND e.term_id = ?
            AND s.status IN ('submitted_v1', 'submitted_v2')
        ) AS student_pending,
        (
          SELECT COUNT(*) FROM submissions s
          INNER JOIN events e ON e.id = s.event_id
          WHERE e.type = 'student' AND e.term_id = ?
            AND s.status IN ('needs_revision_v1', 'needs_revision_v2')
        ) AS student_revision,

        (
          SELECT COUNT(*) FROM submissions s
          INNER JOIN events e ON e.id = s.event_id
          WHERE e.type = 'officer' AND e.term_id = ?
            AND s.status <> 'draft' AND s.submitted_at IS NOT NULL
        ) AS officer_submitted,
        (
          SELECT COUNT(*) FROM submissions s
          INNER JOIN events e ON e.id = s.event_id
          WHERE e.type = 'officer' AND e.term_id = ? AND s.status = 'passed'
        ) AS officer_passed,
        (
          SELECT COUNT(*) FROM submissions s
          INNER JOIN events e ON e.id = s.event_id
          WHERE e.type = 'officer' AND e.term_id = ? AND s.status = 'failed'
        ) AS officer_failed,
        (
          SELECT COUNT(*) FROM submissions s
          INNER JOIN events e ON e.id = s.event_id
          WHERE e.type = 'officer' AND e.term_id = ?
            AND s.status IN ('submitted_v1', 'submitted_v2')
        ) AS officer_pending,
        (
          SELECT COUNT(*) FROM submissions s
          INNER JOIN events e ON e.id = s.event_id
          WHERE e.type = 'officer' AND e.term_id = ?
            AND s.status IN ('needs_revision_v1', 'needs_revision_v2')
        ) AS officer_revision
      `
    )
    .get(
      termId,
      termId,
      termId,
      termId,
      termId,
      termId,
      termId,
      termId,
      termId,
      termId,
      termId,
      termId,
      termId,
      termId,
      termId,
      termId
    ) as AdminOverviewSummary;
}

export function calculateOverviewRates(summary: AdminOverviewSummary) {
  const decidedAttendance = Number(summary.valid_attendance_records ?? 0);
  const finalizedStudent =
    Number(summary.student_passed ?? 0) + Number(summary.student_failed ?? 0);
  const finalizedOfficer =
    Number(summary.officer_passed ?? 0) + Number(summary.officer_failed ?? 0);

  return {
    attendanceRate:
      decidedAttendance > 0
        ? Math.round((Number(summary.attended ?? 0) / decidedAttendance) * 100)
        : 0,
    studentCoverageRate:
      Number(summary.active_students ?? 0) > 0
        ? Math.round(
            (Number(summary.unique_student_attendees ?? 0) /
              Number(summary.active_students ?? 0)) *
              100
          )
        : 0,
    studentPassRate:
      finalizedStudent > 0
        ? Math.round(
            (Number(summary.student_passed ?? 0) / finalizedStudent) * 100
          )
        : 0,
    officerPassRate:
      finalizedOfficer > 0
        ? Math.round(
            (Number(summary.officer_passed ?? 0) / finalizedOfficer) * 100
          )
        : 0,
    finalizedStudent,
    finalizedOfficer,
  };
}
