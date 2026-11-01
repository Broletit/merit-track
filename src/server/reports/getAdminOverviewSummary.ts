import { cohortClause, activityCohortClause } from "@/server/cohorts/sql";
import { getDatabase } from "@/server/db/mysql";

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

export async function getAdminOverviewSummary(termId: number, cohortValue?: unknown) {
  const db = getDatabase();

  return (await db.first(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role IN ('student', 'class_officer') AND is_active = 1 AND ${cohortClause(cohortValue,"users.cohort")})
          AS active_students,
        (SELECT COUNT(*) FROM classes WHERE is_active = 1 AND ${cohortClause(cohortValue,"classes.cohort")})
          AS active_classes,

        (
          SELECT COUNT(*)
          FROM activities a
          WHERE a.term_id = ?
            AND ${activityCohortClause(cohortValue)}
            AND a.status IN ('published', 'closed')
        ) AS term_activities,

        (
          SELECT COUNT(*)
          FROM activities a
          WHERE a.term_id = ?
            AND ${activityCohortClause(cohortValue)}
            AND CAST(a.end_at AS DATETIME(3)) < CURRENT_TIMESTAMP(3)
            AND a.status IN ('published', 'closed')
        ) AS completed_activities,
        (
          SELECT COUNT(*)
          FROM activity_registrations ar
          INNER JOIN activities a ON a.id = ar.activity_id
          WHERE a.term_id = ?
            AND ${cohortClause(cohortValue,"(SELECT cohort FROM users WHERE id=ar.user_id)")}
            AND CAST(a.end_at AS DATETIME(3)) < CURRENT_TIMESTAMP(3)
            AND ar.status IN ('attended', 'absent')
        ) AS valid_attendance_records,
        (
          SELECT COUNT(*)
          FROM activity_registrations ar
          INNER JOIN activities a ON a.id = ar.activity_id
          WHERE a.term_id = ?
            AND ${cohortClause(cohortValue,"(SELECT cohort FROM users WHERE id=ar.user_id)")}
            AND CAST(a.end_at AS DATETIME(3)) < CURRENT_TIMESTAMP(3)
            AND ar.status = 'attended'
        ) AS attended,
        (
          SELECT COUNT(*)
          FROM activity_registrations ar
          INNER JOIN activities a ON a.id = ar.activity_id
          WHERE a.term_id = ?
            AND ${cohortClause(cohortValue,"(SELECT cohort FROM users WHERE id=ar.user_id)")}
            AND CAST(a.end_at AS DATETIME(3)) < CURRENT_TIMESTAMP(3)
            AND ar.status = 'registered'
        ) AS unresolved_attendance,
        (
          SELECT COUNT(DISTINCT ar.user_id)
          FROM activity_registrations ar
          INNER JOIN activities a ON a.id = ar.activity_id
          INNER JOIN users u ON u.id = ar.user_id
          WHERE a.term_id = ?
            AND ${cohortClause(cohortValue,"(SELECT cohort FROM users WHERE id=ar.user_id)")}
            AND ar.status = 'attended'
            AND u.role IN ('student', 'class_officer')
            AND u.is_active = 1
        ) AS unique_student_attendees,

        (
          SELECT COUNT(*) FROM submissions s
          INNER JOIN events e ON e.id = s.event_id AND ${cohortClause(cohortValue,"(SELECT cohort FROM users WHERE id=s.user_id)")}
          WHERE e.type = 'student' AND e.term_id = ?
            AND s.status <> 'draft' AND s.submitted_at IS NOT NULL
        ) AS student_submitted,
        (
          SELECT COUNT(*) FROM submissions s
          INNER JOIN events e ON e.id = s.event_id AND ${cohortClause(cohortValue,"(SELECT cohort FROM users WHERE id=s.user_id)")}
          WHERE e.type = 'student' AND e.term_id = ? AND s.status = 'passed' AND s.submitted_at IS NOT NULL
        ) AS student_passed,
        (
          SELECT COUNT(*) FROM submissions s
          INNER JOIN events e ON e.id = s.event_id AND ${cohortClause(cohortValue,"(SELECT cohort FROM users WHERE id=s.user_id)")}
          WHERE e.type = 'student' AND e.term_id = ? AND s.status = 'failed' AND s.submitted_at IS NOT NULL
        ) AS student_failed,
        (
          SELECT COUNT(*) FROM submissions s
          INNER JOIN events e ON e.id = s.event_id AND ${cohortClause(cohortValue,"(SELECT cohort FROM users WHERE id=s.user_id)")}
          WHERE e.type = 'student' AND e.term_id = ? AND s.submitted_at IS NOT NULL
            AND s.status IN ('submitted_v1', 'submitted_v2')
        ) AS student_pending,
        (
          SELECT COUNT(*) FROM submissions s
          INNER JOIN events e ON e.id = s.event_id AND ${cohortClause(cohortValue,"(SELECT cohort FROM users WHERE id=s.user_id)")}
          WHERE e.type = 'student' AND e.term_id = ? AND s.submitted_at IS NOT NULL
            AND s.status IN ('needs_revision_v1', 'needs_revision_v2')
        ) AS student_revision,

        (
          SELECT COUNT(*) FROM submissions s
          INNER JOIN events e ON e.id = s.event_id AND ${cohortClause(cohortValue,"(SELECT cohort FROM users WHERE id=s.user_id)")}
          WHERE e.type = 'officer' AND e.term_id = ?
            AND s.status <> 'draft' AND s.submitted_at IS NOT NULL
        ) AS officer_submitted,
        (
          SELECT COUNT(*) FROM submissions s
          INNER JOIN events e ON e.id = s.event_id AND ${cohortClause(cohortValue,"(SELECT cohort FROM users WHERE id=s.user_id)")}
          WHERE e.type = 'officer' AND e.term_id = ? AND s.status = 'passed' AND s.submitted_at IS NOT NULL
        ) AS officer_passed,
        (
          SELECT COUNT(*) FROM submissions s
          INNER JOIN events e ON e.id = s.event_id AND ${cohortClause(cohortValue,"(SELECT cohort FROM users WHERE id=s.user_id)")}
          WHERE e.type = 'officer' AND e.term_id = ? AND s.status = 'failed' AND s.submitted_at IS NOT NULL
        ) AS officer_failed,
        (
          SELECT COUNT(*) FROM submissions s
          INNER JOIN events e ON e.id = s.event_id AND ${cohortClause(cohortValue,"(SELECT cohort FROM users WHERE id=s.user_id)")}
          WHERE e.type = 'officer' AND e.term_id = ? AND s.submitted_at IS NOT NULL
            AND s.status IN ('submitted_v1', 'submitted_v2')
        ) AS officer_pending,
        (
          SELECT COUNT(*) FROM submissions s
          INNER JOIN events e ON e.id = s.event_id AND ${cohortClause(cohortValue,"(SELECT cohort FROM users WHERE id=s.user_id)")}
          WHERE e.type = 'officer' AND e.term_id = ? AND s.submitted_at IS NOT NULL
            AND s.status IN ('needs_revision_v1', 'needs_revision_v2')
        ) AS officer_revision
      `, [termId, termId, termId, termId, termId, termId, termId, termId, termId, termId, termId, termId, termId, termId, termId, termId])) as AdminOverviewSummary;
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
