# MySQL and private storage audit

Scanned 518 source/schema/style files. Live SQLite snapshot inspected read-only; 49 tables. No data modified.

## Current findings
- Runtime is synchronous better-sqlite3. Initialization applies DDL/data repairs, seeds, installs audit/cohort policies, and finalizes overdue submissions. These must become explicit versioned migrations and asynchronous services.
- Evidence actions store UUID files under uploads/submissions; historical metadata may reference public/uploads. Download route performs role/context/class/assignment authorization. File replacement and authorization must survive migration.
- Preserve student two-stage and officer one-stage review; required evidence and mandatory criteria; event snapshots; term isolation; cohort/class relationships; class-officer maximum eight; registration capacity; automatic absence deductions; QR HMAC; role-scoped notifications; admin reasoned audit.
- MySQL must use strict mode, UTF8MB4, FK constraints and dedicated transaction connections; OneDrive configuration must be lazy and optional for local.
- Docker CLI is currently unavailable. Live MySQL execution is pending infrastructure availability.

## Inventory (line numbers; get/all/run include non-database collection calls and require call-site review)
| File | SQLite | getDb | prepare | get | all | run | transactions | SQLite SQL | filesystem |
|---|---|---|---|---|---|---|---|---|---|
| src/app/(auth)/change-password/actions.ts | — | — | — | 14, 15, 16 | — | — | — | — | — | 
| src/app/(auth)/forgot-password/actions.ts | 5 | 17, 46 | 18, 28, 31 | 14, 15, 19, 23, 38, 39, 40, 41 | — | 28, 31 | — | — | — | 
| src/app/(auth)/forgot-password/ForgotPasswordForm.tsx | — | — | — | 27 | — | — | — | — | — | 
| src/app/(auth)/login/actions.ts | 4 | 42 | 45 | 31, 32, 53 | — | — | — | — | — | 
| src/app/api/admin/activities/options/route.ts | 3 | 7 | 9 | — | 13 | — | — | 12 | — | 
| src/app/api/admin/activities/route.ts | 3 | 9 | 11 | 31 | 34 | — | — | 33 | — | 
| src/app/api/admin/activities/[id]/export/route.ts | 3 | 11 | 13, 15, 23 | 13, 19 | 31 | — | — | — | — | 
| src/app/api/admin/classes/route.ts | 3 | 8 | 10 | 21 | 24 | — | — | — | — | 
| src/app/api/admin/events/create/route.ts | 3 | 15 | 36, 67, 86, 98 | — | — | 48, 76, 93, 106 | 35 | 47 | — | 
| src/app/api/admin/events/route.ts | 4 | 8 | 10 | 20 | 23 | — | — | 22 | — | 
| src/app/api/admin/import-students/route.ts | 5 | 27 | 44, 51, 56, 74 | 14, 26, 45, 52 | — | 65, 79 | 33 | 77 | — | 
| src/app/api/admin/submissions/route.ts | 4 | 8 | 10 | 22 | 24 | — | — | 23 | — | 
| src/app/api/admin/users/route.ts | 3 | 8 | 10 | 22 | 24 | — | — | — | — | 
| src/app/api/cohorts/route.ts | 2 | 7, 20, 22 | 7, 20, 22 | — | 7, 22 | 20 | — | 20 | — | 
| src/app/api/notifications/unread-count/route.ts | 2 | 5 | 5 | 5 | — | — | — | — | — | 
| src/app/api/submissions/files/[id]/route.ts | 6 | 26 | 29 | 46 | — | — | — | — | 1, 79, 83 | 
| src/app/dashboard/admin/academic-terms/page.tsx | 2 | 21 | 24 | — | 38 | — | — | 35 | — | 
| src/app/dashboard/admin/activities/create/page.tsx | 2 | 28 | 30, 33, 43 | — | 30, 40, 56 | — | — | — | — | 
| src/app/dashboard/admin/activities/page.tsx | 4 | 50 | 99, 109 | 106 | 142 | — | — | 88, 88, 91, 91, 91, 91, 94, 94, 138 | — | 
| src/app/dashboard/admin/activities/[id]/edit/page.tsx | 3 | 65 | 68, 126, 129, 161, 177, 181, 221, 222 | 106, 222 | 127, 145, 174, 178, 188, 221 | — | — | 99, 99 | — | 
| src/app/dashboard/admin/activities/[id]/page.tsx | 12 | 31 | 32 | 52 | — | — | — | 38, 38, 40, 40 | — | 
| src/app/dashboard/admin/audit-logs/page.tsx | 8 | 60 | 66, 67, 68, 69 | 45, 45, 66 | 67, 68, 69 | — | — | 67 | — | 
| src/app/dashboard/admin/classes/page.tsx | 9 | 30 | 58, 59, 70, 71 | 58, 70 | 68, 71 | — | — | — | — | 
| src/app/dashboard/admin/conduct-score-frame/page.tsx | 2 | 14 | 15, 16 | — | 15, 16 | — | — | 16 | — | 
| src/app/dashboard/admin/criteria-templates/page.tsx | 2 | 33 | 58, 68 | 65 | 97 | — | — | 93 | — | 
| src/app/dashboard/admin/criteria-templates/[id]/configure/page.tsx | 4 | 84 | 87, 103, 127, 147, 163, 173 | 96, 214, 245, 246 | 124, 144, 160, 170, 182 | — | — | 179, 179 | — | 
| src/app/dashboard/admin/events/create/page.tsx | 3 | 18 | 21 | — | 31 | — | — | — | — | 
| src/app/dashboard/admin/events/page.tsx | 3 | 45 | 77, 88 | 85 | 112 | — | — | 108 | — | 
| src/app/dashboard/admin/events/[id]/candidates/page.tsx | 13 | 59 | 60, 63, 64, 65, 66, 68, 69, 70, 75, 77, 79 | 60, 83, 90, 91, 94 | 63, 64, 65, 66, 68, 69, 70, 75, 77, 79 | — | — | — | — | 
| src/app/dashboard/admin/events/[id]/edit/page.tsx | 3 | 47 | 50, 83 | 75 | 93 | — | — | — | — | 
| src/app/dashboard/admin/events/[id]/page.tsx | 15 | 57 | 60 | 97 | — | — | — | — | — | 
| src/app/dashboard/admin/officer-reviews/page.tsx | 3 | 51 | 101, 114 | 111 | 210 | — | — | 79, 81, 83, 85, 89, 89, 91, 91, 95, 96, 129, 146, 154 | — | 
| src/app/dashboard/admin/officer-reviews/[id]/page.tsx | 3 | 77 | 80, 121, 192, 203, 244 | 116, 244 | 72, 189, 200, 217 | — | — | 101 | — | 
| src/app/dashboard/admin/page.tsx | 12 | 41 | 48 | — | 63 | — | — | 56, 56, 57, 57, 59 | — | 
| src/app/dashboard/admin/reports/officer-achievements/page.tsx | 7 | 87 | 102, 130, 176, 226, 265, 290, 378 | 146, 195, 311, 321, 327 | 111, 249, 274, 305, 408 | — | — | 108 | — | 
| src/app/dashboard/admin/reports/overview/page.tsx | 11 | 38 | 45, 82, 108 | — | 79, 106, 117 | — | — | 109, 115, 116 | — | 
| src/app/dashboard/admin/reports/student-activities/page.tsx | 5 | 44 | 54, 65, 84, 113, 146, 172 | 105 | 62, 73, 139, 166, 185 | — | — | 70 | — | 
| src/app/dashboard/admin/reports/student-awards/page.tsx | 6 | 54 | 64, 76, 103, 130, 156, 190 | 116 | 73, 84, 152, 183, 227 | — | — | 70, 182 | — | 
| src/app/dashboard/admin/students/[id]/page.tsx | 4 | 41 | 44 | 69 | — | — | — | 47, 63 | — | 
| src/app/dashboard/admin/students-import/page.tsx | 2 | 16 | 19 | — | 26 | — | — | — | — | 
| src/app/dashboard/admin/submissions/page.tsx | 7 | 51 | 66, 97, 110 | 107 | 66, 132 | — | — | 93, 94 | — | 
| src/app/dashboard/admin/submissions/[id]/page.tsx | 3 | 21 | 22, 33, 46, 47 | 30 | 45, 46, 47 | — | — | — | — | 
| src/app/dashboard/admin/users/page.tsx | 7 | 54 | 65, 106, 118, 143 | 115, 143 | 73, 139 | — | — | — | — | 
| src/app/dashboard/admin/users/[id]/page.tsx | 7 | 60 | 70, 87, 119, 131 | 112 | 71, 127, 139 | — | — | 70 | — | 
| src/app/dashboard/class-officer/activities/page.tsx | 8 | 24 | 27, 71, 96, 97 | 32, 94, 96 | 111 | — | — | 31, 74, 74, 108, 108, 108, 108, 108, 108, 109 | — | 
| src/app/dashboard/class-officer/activities/[id]/page.tsx | 9 | 36 | 37, 45, 61, 78, 79 | 42, 54, 70, 78 | 32, 84 | — | — | 41, 82 | — | 
| src/app/dashboard/class-officer/events/page.tsx | 4 | 45 | 50, 103, 113 | 58, 110 | 171 | — | — | 166 | — | 
| src/app/dashboard/class-officer/events/[id]/page.tsx | 8 | 46 | 49, 64, 88 | 57, 76 | 41, 103 | — | — | 100 | — | 
| src/app/dashboard/class-officer/officer-activities/page.tsx | 5 | 44 | 65, 99, 112 | 73, 109 | 136 | — | — | 67, 67, 84, 84, 85, 85, 89, 89, 90, 90, 92, 92, 92, 92, 94, 94, 131 | — | 
| src/app/dashboard/class-officer/page.tsx | 5 | 33 | 37, 47, 62, 75, 94 | 54, 150, 151, 152, 153 | 43, 73, 90, 102 | — | — | 71, 100 | — | 
| src/app/dashboard/class-officer/reviews/page.tsx | 3 | 37 | 42, 72, 97, 109 | 51, 106 | 72, 130 | — | — | 47, 72, 93, 94 | — | 
| src/app/dashboard/class-officer/reviews/[id]/page.tsx | 4 | 73 | 76, 90, 120, 159, 170 | 85, 115 | 68, 156, 167, 183 | — | — | 105, 105 | — | 
| src/app/dashboard/class-officer/submissions/[id]/page.tsx | 7 | 70 | 71, 79, 110, 156 | 75, 103 | 63, 153, 167 | — | — | 74 | — | 
| src/app/dashboard/faculty-officer/activities/page.tsx | 6 | 55 | 93, 103, 141, 142 | 100, 141, 142 | 138 | — | — | 77, 77, 82, 82, 82, 82, 87, 87, 133, 141, 141 | — | 
| src/app/dashboard/faculty-officer/activities/[id]/page.tsx | 8 | 79 | 91, 129, 168, 183 | 122, 180 | 144, 214 | — | — | 138, 161, 175, 199, 209 | — | 
| src/app/dashboard/faculty-officer/checkin/page.tsx | 2 | 19 | 23 | — | 40 | — | — | 36, 36, 36, 36, 37 | — | 
| src/app/dashboard/faculty-officer/events/page.tsx | 4 | 20 | 36, 37 | 36 | 45 | — | — | 44 | — | 
| src/app/dashboard/faculty-officer/events/[id]/page.tsx | 8 | 22 | 23, 32, 33 | 23 | 20, 32, 33 | — | — | — | — | 
| src/app/dashboard/faculty-officer/officer-activities/page.tsx | 5 | 44 | 65, 115, 128 | 73, 125 | 152 | — | — | 67, 67, 86, 86, 87, 87, 95, 95, 99, 99, 104, 104, 104, 104, 109, 109, 147 | — | 
| src/app/dashboard/faculty-officer/officer-activities/[id]/page.tsx | 5 | 38 | 41 | 67 | 33 | — | — | — | — | 
| src/app/dashboard/faculty-officer/officer-events/page.tsx | 4 | 44 | 76, 89 | 86 | 111 | — | — | 106 | — | 
| src/app/dashboard/faculty-officer/officer-events/[id]/page.tsx | 3 | 75 | 78, 137, 223 | 111 | 194, 237 | — | — | 234 | — | 
| src/app/dashboard/faculty-officer/officer-submissions/detail/[id]/page.tsx | 3 | 64 | 67, 93, 161, 165 | 88 | 159, 161, 173 | — | — | — | — | 
| src/app/dashboard/faculty-officer/officer-submissions/page.tsx | 4 | 43 | 73, 84 | 81 | 102 | — | — | 69, 70 | — | 
| src/app/dashboard/faculty-officer/page.tsx | 11 | 56 | 62, 80, 88, 193, 217 | 164, 224 | 72, 80, 214 | — | — | 80, 210 | — | 
| src/app/dashboard/faculty-officer/reviews/page.tsx | 4 | 40 | 53, 66, 109, 122 | 119 | 63, 66, 143 | — | — | 66, 105, 106 | — | 
| src/app/dashboard/faculty-officer/reviews/[id]/page.tsx | 4 | 70 | 73, 105, 144, 155 | 100 | 65, 141, 152, 168 | — | — | — | — | 
| src/app/dashboard/faculty-officer/submissions/[id]/page.tsx | 7 | 66 | 69, 95, 149 | 88 | 146, 160 | — | — | — | — | 
| src/app/dashboard/student/activities/page.tsx | 5 | 49 | 80 | — | 112 | — | — | 71, 71, 71, 71, 74, 74, 75, 75, 76, 76, 76, 76, 77, 77, 109 | — | 
| src/app/dashboard/student/activities/[id]/page.tsx | 4 | 61 | 65 | 113 | — | — | — | — | — | 
| src/app/dashboard/student/conduct-score/page.tsx | 4 | 47 | 52, 62, 96 | 66, 157, 171, 184 | 61, 62, 122 | — | — | 62, 119 | — | 
| src/app/dashboard/student/events/page.tsx | 2 | 40 | 78 | — | 98 | — | — | 95 | — | 
| src/app/dashboard/student/events/[id]/page.tsx | 3 | 57 | 61, 106, 236 | 86 | 197, 236 | — | — | — | — | 
| src/app/dashboard/student/notifications/page.tsx | 9 | 30 | 31, 36, 75 | 33, 75 | 42 | — | — | 40 | — | 
| src/app/dashboard/student/page.tsx | 18 | 90 | 96, 103, 110, 119, 136, 160, 180 | 101, 108, 117, 127 | 158, 178, 196 | — | — | 116, 116, 151, 151, 154, 154, 155, 172, 172, 174, 174, 175, 194 | — | 
| src/app/dashboard/student/submissions/page.tsx | 6 | 51 | 89, 100 | 97 | 115 | — | — | 110 | — | 
| src/app/dashboard/student/submissions/[id]/page.tsx | 8 | 81 | 84, 112, 159, 173 | 105 | 156, 170, 185 | — | — | — | — | 
| src/app/layout.tsx | 3 | — | — | — | — | — | — | — | — | 
| src/components/admin/activities/ActivityCreateForm.tsx | — | — | — | 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 45, 46, 47 | — | — | — | — | — | 
| src/components/admin/activities/AdminActivitiesFilters.tsx | — | — | — | 13, 26, 51, 60, 69, 78 | — | — | — | — | — | 
| src/components/admin/activities/AdminActivityRegistrations.tsx | 2 | 11 | 12, 14, 19 | 12, 14 | 19 | — | — | 12, 12 | — | 
| src/components/admin/activities/ConductCategoryManager.tsx | — | — | — | 39 | — | — | — | — | — | 
| src/components/admin/activities/FacultyAttendanceImport.tsx | — | — | — | 31 | — | — | — | — | — | 
| src/components/admin/audit-logs/AuditLogsFilter.tsx | — | — | — | 6, 12, 20, 29, 30, 31 | — | — | — | — | — | 
| src/components/admin/classes/AdminClassesFilter.tsx | — | — | — | 12, 25, 44, 54 | — | — | — | — | — | 
| src/components/admin/criteria-templates/CriteriaTemplateEditInlineForm.tsx | — | — | — | 34 | — | — | — | — | — | 
| src/components/admin/criteria-templates/CriteriaTemplatesFilter.tsx | — | — | — | 13, 56, 68 | — | — | — | — | — | 
| src/components/admin/events/CandidateFilters.tsx | — | — | — | 26, 33, 46 | — | — | — | — | — | 
| src/components/admin/events/EventCreateForm.tsx | — | — | — | 37, 38, 39, 40, 41, 42, 43, 44 | — | — | — | — | — | 
| src/components/admin/events/EventEditForm.tsx | — | — | — | 76, 77, 78, 79, 80, 81, 82, 83 | — | — | — | — | — | 
| src/components/admin/events/EventsFilter.tsx | — | — | — | 14, 18, 18, 40, 78 | — | — | — | — | — | 
| src/components/admin/officer-reviews/AdminOfficerReviewsFilter.tsx | — | — | — | 20, 58, 70, 80 | — | — | — | — | — | 
| src/components/admin/officer-submissions/AdminOfficerSubmissionsFilter.tsx | — | — | — | 13, 33, 59, 70 | — | — | — | — | — | 
| src/components/admin/reports/OfficerAchievementFilter.tsx | — | — | — | 21, 59, 71 | — | — | — | — | — | 
| src/components/admin/reports/OverviewReportFilter.tsx | — | — | — | 47 | — | — | — | — | — | 
| src/components/admin/reports/StudentActivityReportFilter.tsx | — | — | — | 41, 54, 54 | — | — | — | — | — | 
| src/components/admin/reports/StudentAwardReportFilter.tsx | — | — | — | 42, 55, 55 | — | — | — | — | — | 
| src/components/admin/students/StudentManagementCard.tsx | — | — | — | 23, 24, 46 | — | — | — | — | — | 
| src/components/admin/students/StudentsFilters.tsx | — | — | — | 18, 31, 56, 56, 69 | — | — | — | — | — | 
| src/components/admin/students-import/StudentsImportClassForm.tsx | — | — | — | 39 | — | — | — | — | — | 
| src/components/admin/students-import/StudentsImportForm.tsx | — | — | — | 124, 127, 128, 129, 130, 131 | — | — | — | — | — | 
| src/components/admin/submissions/AdminStudentSubmissionsFilter.tsx | — | — | — | 12, 43, 55 | — | — | — | — | — | 
| src/components/admin/users/AdminUsersFilter.tsx | — | — | — | 25, 27, 30, 50, 80, 90 | — | — | — | — | — | 
| src/components/class-officer/activities/ClassActivitiesFilter.tsx | — | — | — | 12, 23, 42, 51 | — | — | — | — | — | 
| src/components/class-officer/activities/ClassActivityParticipantsFilter.tsx | — | — | — | 12, 23, 36 | — | — | — | — | — | 
| src/components/class-officer/events/ClassEventsFilter.tsx | — | — | — | 11, 40, 52 | — | — | — | — | — | 
| src/components/faculty-officer/activities/FacultyOfficerActivitiesFilters.tsx | — | — | — | 13, 26, 52, 62 | — | — | — | — | — | 
| src/components/faculty-officer/activities/FacultyOfficerActivityRegistrationsFilter.tsx | — | — | — | 18, 31, 56, 66, 66 | — | — | — | — | — | 
| src/components/faculty-officer/checkin/FacultyOfficerAttendanceLogsFilter.tsx | — | — | — | 18, 57, 70, 84, 91 | — | — | — | — | — | 
| src/components/faculty-officer/checkin/FacultyOfficerManualScanForm.tsx | — | — | — | 26, 27 | — | — | — | — | — | 
| src/components/faculty-officer/officer-activities/OfficerActivitiesFilter.tsx | — | — | — | 13, 51, 62 | — | — | — | — | — | 
| src/components/faculty-officer/officer-events/OfficerEventsFilter.tsx | — | — | — | 11, 49, 58 | — | — | — | — | — | 
| src/components/faculty-officer/officer-submissions/OfficerSubmissionsFilter.tsx | — | — | — | 11, 49, 61 | — | — | — | — | — | 
| src/components/profile/ProfileContent.tsx | 6 | 30 | 33, 46 | — | 43, 46 | — | — | — | — | 
| src/components/shared/ActivityScopeSummary.tsx | 1 | 4 | 5, 6, 7 | — | 5, 6, 7 | — | — | — | — | 
| src/components/shared/CohortFilter.tsx | — | — | — | 7 | — | — | — | — | — | 
| src/components/shared/criteria/CriteriaDefinitionTable.tsx | 1 | 7 | 8, 8, 10, 11, 13, 14, 16, 17 | 8, 8 | 10, 11, 13, 14, 16, 17 | — | — | — | — | 
| src/components/shared/events/EventSubmissionFilters.tsx | — | — | — | 14, 23, 32, 33 | — | — | — | — | — | 
| src/components/shared/FormUxGuard.tsx | — | — | — | 12, 26 | — | — | — | — | — | 
| src/components/shared/reviews/ReviewFilters.tsx | — | — | — | 31, 68, 95, 102, 116, 127, 127, 140 | — | — | — | — | — | 
| src/components/shared/submissions/SubmissionSupportCard.tsx | 1 | 5 | 5 | 5 | — | — | — | — | — | 
| src/components/shared/submissions/SubmissionTableFilters.tsx | — | — | — | 10, 28, 33, 41 | — | — | — | — | — | 
| src/components/shared/useConfirmation.tsx | — | — | — | 35 | — | — | — | — | — | 
| src/components/student/activities/StudentActivitiesFilters.tsx | — | — | — | 13, 26, 51, 62 | — | — | — | — | — | 
| src/components/student/conduct-score/StudentConductScoreFilter.tsx | — | — | — | 13, 31, 55, 63, 73, 73 | — | — | — | — | — | 
| src/components/student/events/StudentEventsFilter.tsx | — | — | — | 12, 49, 61 | — | — | — | — | — | 
| src/lib/cohorts/activityScopeLabel.ts | — | — | — | 8, 13 | — | — | — | — | — | 
| src/lib/notifications/vacancyLink.ts | — | — | — | 3 | — | — | — | — | — | 
| src/lib/submissions/candidateAssessment.ts | — | — | — | 6 | — | — | — | — | — | 
| src/proxy.ts | 2 | 20 | 21, 28, 61 | 23, 23, 28, 61 | — | — | — | 22, 22 | — | 
| src/server/academic-terms/getAcademicTermForView.ts | 1 | 52, 76 | 55, 82 | 90 | 62 | — | — | 59 | — | 
| src/server/academic-terms/getActiveAcademicTerm.ts | 1 | 22 | 25 | 34 | — | — | — | — | — | 
| src/server/academic-terms/getReportTermFilter.ts | 1 | 4 | 7 | — | 18 | — | — | — | — | 
| src/server/actions/academic-terms/createAcademicTerm.ts | 5 | 16 | 40 | 18, 19, 20, 21, 22 | — | 53 | — | 51 | — | 
| src/server/actions/academic-terms/createCriteriaItem.ts | 5 | 14 | 32, 48, 62 | 17, 18, 19, 20, 21, 22, 41, 56 | — | 77 | — | — | — | 
| src/server/actions/academic-terms/setActiveAcademicTerm.ts | 5 | 10 | 13, 28, 29 | 21 | — | 28, 29 | 27 | — | — | 
| src/server/actions/activities/cancelRegistrationAdmin.ts | 4 | 9 | 11, 15, 16 | 9, 11 | — | 15, 16 | 10 | — | — | 
| src/server/actions/activities/createActivity.ts | 7 | 19 | 56, 61, 118, 154 | 21, 22, 23, 25, 26, 28, 29, 32, 34, 36, 37, 38, 39, 56, 61 | — | 132, 154 | 117 | 127, 128 | — | 
| src/server/actions/activities/deleteActivity.ts | 5 | 10 | 12, 16 | 11, 12 | — | 16 | 16 | — | — | 
| src/server/actions/activities/importFacultyAttendance.ts | 9 | 16 | 25, 30, 41, 53, 64, 66, 70, 71, 73, 83, 91, 97, 106, 111, 113, 118, 126, 129, 136 | 17, 18, 19, 20, 25, 30, 41, 48, 53, 64, 88, 111 | 136 | 66, 70, 71, 76, 84, 92, 98, 107, 117, 122, 127, 130 | 63 | 115, 116, 116, 121 | — | 
| src/server/actions/activities/manageActivityAttendance.ts | 4 | 10 | 10 | 12 | — | — | — | — | — | 
| src/server/actions/activities/registerActivity.ts | 6 | 10 | 13, 65, 88, 104, 105, 121 | 29, 75, 97 | — | 104, 119, 121 | — | 71, 104, 117 | — | 
| src/server/actions/activities/scanActivityQr.ts | 6 | 42, 76 | 46, 108, 222, 288, 341, 353, 377 | 123, 230, 297, 350 | — | 59, 362, 393 | 352 | 57, 346, 358, 389, 390 | — | 
| src/server/actions/activities/updateActivity.ts | 6 | 22 | 25, 116, 117, 126, 159, 180, 222, 225, 229 | 39, 70, 71, 72, 74, 75, 76, 77, 79, 80, 81, 95, 96, 100, 126, 164 | 116, 117 | 201, 222, 225, 246 | 179 | 28, 28, 198 | — | 
| src/server/actions/activities/updateActivityRegistrationLock.ts | 5 | 9 | 10, 14 | 10 | — | 14 | — | — | — | 
| src/server/actions/activities/updateActivityStatus.ts | 5 | 14 | 21, 37, 50 | 29, 44 | — | 62 | — | 56 | — | 
| src/server/actions/admin/officer-reviews/reviewOfficerSubmission.ts | 5 | 23 | 29, 76, 96, 110 | 25, 26, 41 | — | 94, 102, 112 | 75 | 32, 32, 86, 87, 92, 99 | — | 
| src/server/actions/admin/reports/exportOfficerAchievementReport.ts | 5 | 15 | 43 | 17, 18, 19, 20, 38 | 64 | — | — | — | — | 
| src/server/actions/admin/reports/exportStudentAwardReport.ts | 5 | 15 | 52 | 17, 18, 19, 20, 48 | 133 | — | — | — | — | 
| src/server/actions/admin/users/assignFacultyOfficerClasses.ts | 5 | 13 | 21, 46, 53, 69, 76 | 29 | 46, 55 | 74, 88 | 68 | 83 | — | 
| src/server/actions/admin/users/updateFacultyClassAssignments.ts | 5 | 18 | 21, 38, 45 | 29 | — | 43, 57 | 37 | 47, 52 | — | 
| src/server/actions/admin/users/updateUserAdmin.ts | 5 | 13 | 16, 39, 46, 52, 56, 69, 72, 75, 79, 82, 83 | 17, 27, 28, 35, 46, 52, 79 | 41, 62, 82 | 71, 72, 75, 85 | 50 | 70, 72 | — | 
| src/server/actions/admin/users/updateUserClass.ts | 6 | 19 | 23, 30, 33, 47, 48, 50, 59, 60, 61, 64 | 12, 24, 30, 39, 42, 61 | 47, 64 | 48, 56, 59, 66, 75 | 45 | 48, 53, 54, 54, 59 | — | 
| src/server/actions/auth/switchLoginContext.ts | — | — | — | 22 | — | — | — | — | — | 
| src/server/actions/conduct/createConductCategory.ts | 4 | 7 | 11, 13, 14, 16, 19, 21 | 8, 8, 8, 9, 11, 13, 19 | 14, 16 | 21 | — | — | — | 
| src/server/actions/conduct/deleteConductCategory.ts | 5 | 9 | 10, 12, 14, 16 | 9, 10, 12, 14 | — | 16 | 16 | — | — | 
| src/server/actions/conduct/updateConductCategory.ts | 5 | 10 | 11, 19, 21, 22, 24, 26, 30, 32 | 11, 13, 14, 15, 16, 19, 21, 24, 30 | 22, 26 | 32 | — | — | — | 
| src/server/actions/criteria-templates/addCriteriaActivityRule.ts | 5 | 15 | 31, 53, 67 | 18, 19, 40, 61 | — | 78 | — | 76 | — | 
| src/server/actions/criteria-templates/cloneCriteriaTemplate.ts | 6 | 10 | 11, 17, 18, 19, 20, 21 | 11, 13, 13, 13 | — | 17, 18, 19, 20, 21 | 17 | — | — | 
| src/server/actions/criteria-templates/createCriteriaGroup.ts | 5 | 19, 21 | 26, 40, 52 | 23, 24, 25, 26, 28, 47 | — | 65 | — | — | — | 
| src/server/actions/criteria-templates/createCriteriaItem.ts | 6 | 15 | 39, 55, 70, 100 | 18, 19, 20, 21, 22, 48, 63 | — | 85, 109 | 69 | 102 | — | 
| src/server/actions/criteria-templates/createCriteriaTemplate.ts | 5 | 9 | 24 | 11, 12, 13 | — | 36 | — | 33 | — | 
| src/server/actions/criteria-templates/deleteCriteriaGroup.ts | 5 | 16 | 24, 37, 48, 55, 63, 71 | 19, 32 | 44 | 53, 60, 68, 76 | 46 | — | — | 
| src/server/actions/criteria-templates/deleteCriteriaItem.ts | 6 | 17 | 25, 38, 46, 53 | 20, 33 | — | 43, 51, 58 | 37 | — | — | 
| src/server/actions/criteria-templates/deleteCriteriaTemplate.ts | 5 | 11 | 14, 19, 34, 38, 42, 46, 50 | 13, 14, 27 | — | 34, 38, 42, 46, 50 | 33 | — | — | 
| src/server/actions/criteria-templates/updateCriteriaGroup.ts | 5 | 15 | 22, 33, 45, 46, 53 | 19, 20, 21, 22, 24, 41, 45, 46 | — | 59 | — | — | — | 
| src/server/actions/criteria-templates/updateCriteriaItem.ts | 6 | 16 | 39, 52, 73, 83 | 20, 21, 22, 23, 47 | — | 63, 78, 92 | 51 | 85 | — | 
| src/server/actions/criteria-templates/updateCriteriaTemplate.ts | 5 | 14 | 26, 32, 44 | 16, 17, 18, 27 | — | 32, 50 | — | — | — | 
| src/server/actions/criteria-templates/upsertCriteriaConductRule.ts | 5 | 14 | 30 | 17, 18 | — | 44 | — | 39 | — | 
| src/server/actions/events/createEvent.ts | 6 | 17 | 65, 83 | 19, 20, 21, 22, 23, 25, 28, 29, 73 | — | 105 | — | 100, 101 | — | 
| src/server/actions/events/deleteEvent.ts | 5 | 10 | 12, 16 | 11, 12 | — | 16 | 16 | — | — | 
| src/server/actions/events/syncEventCriteriaFromTemplate.ts | 5 | 11 | 14, 39 | 22, 46 | — | — | — | — | — | 
| src/server/actions/events/updateEvent.ts | 7 | 36 | 39, 143, 170 | 64, 73, 74, 75, 76, 77, 79, 81, 82, 151 | — | 193 | 169 | 182, 186 | — | 
| src/server/actions/events/updateEventStatus.ts | 6 | 12 | 19, 35, 50 | 27, 42 | — | 65 | — | 56, 60 | — | 
| src/server/actions/notifications/markNotificationRead.ts | 5 | 9, 23 | 9, 23 | — | — | 13, 27 | — | 11, 25 | — | 
| src/server/actions/officer-activities/registerOfficerActivity.ts | 6 | 10 | 13, 60, 64, 81 | 27, 60 | — | 75, 81 | — | 60, 66, 73 | — | 
| src/server/actions/officer-submissions/createOfficerSubmission.ts | 5 | 12 | 15, 31, 64 | 24, 41 | — | 78 | — | 75 | — | 
| src/server/actions/officer-submissions/saveOfficerSubmissionEvidence.ts | 10 | 36 | 39, 89, 124, 130, 136, 156, 179 | 57, 93, 111, 111, 121, 126 | 89 | 132, 150, 169, 185 | 118 | 144, 145, 148, 167, 182 | 3, 17, 154 | 
| src/server/actions/officer-submissions/submitOfficerSubmission.ts | 5 | 13 | 16, 66 | 33 | — | 75 | — | 71, 72 | — | 
| src/server/actions/profile/updateProfileEmail.ts | 6 | 19 | 21, 25, 26 | 15, 21 | — | 25, 26 | 20 | 25 | — | 
| src/server/actions/reviews/reviewSubmission.ts | 4 | 49 | 58, 102, 127, 158, 167, 168, 171, 174, 200, 211, 235 | 51, 74, 112, 136, 171 | 163 | 167, 168, 192, 209, 224, 235 | 165 | 67, 67, 184, 185, 190, 206, 222 | 10, 250 | 
| src/server/actions/reviews/reviewSubmissionCriterion.ts | 5 | 11 | 13, 30, 31, 34, 37 | 21, 30, 31, 34 | — | 38 | — | 14, 14, 38, 38, 38 | — | 
| src/server/actions/students/importStudents.ts | 7 | 54, 112 | 60, 86, 91, 126, 130, 132, 135, 145, 154, 292, 342, 358, 365, 450, 464 | 68, 126, 130, 182, 188, 286, 294 | 86, 135 | 104, 132, 292, 348, 363, 375, 460, 473 | 123, 276 | 101, 135, 159, 337, 360, 372, 373, 373, 441, 446, 471 | — | 
| src/server/actions/students/manageStudent.ts | 5 | 12, 96 | 16, 35, 50, 66, 73, 99, 120, 130 | 24, 43, 58, 107 | — | 71, 79, 129, 130 | 64, 119 | 68, 76, 77, 77, 126, 130 | — | 
| src/server/actions/students/previewImportStudents.ts | 5 | 25, 85 | 35, 65, 133, 181 | 43, 141, 194 | 65 | — | — | 190 | — | 
| src/server/actions/submissions/ensureStudentSubmissionDraft.ts | 5 | 32 | 35, 50, 63, 90, 107 | 45, 52, 72, 100 | — | 121 | — | 118 | — | 
| src/server/actions/submissions/requestSubmissionSupport.ts | 6 | 26 | 27, 40 | 21, 32 | — | 47 | — | 43, 46 | — | 
| src/server/actions/submissions/saveStudentSubmissionEvidence.ts | 10 | 46 | 49, 104, 167, 184, 207 | 66, 116, 117, 123 | 111 | 178, 197, 213 | 164 | 172, 173, 176, 195, 210 | 3, 22, 182 | 
| src/server/actions/submissions/submitStudentSubmission.ts | 5 | 14 | 15, 37, 38 | 20 | — | 37, 41 | — | 37, 37, 40 | — | 
| src/server/activities/notifyActivityAttendance.ts | 1 | — | 4, 10 | 5 | — | 13 | — | — | — | 
| src/server/activities/publicActivityId.ts | 2 | — | 6, 7, 8 | 6, 8 | — | 7 | — | 7 | — | 
| src/server/activities/registrationCapacity.ts | 1 | — | 11 | — | 11 | — | — | 11 | — | 
| src/server/activities/scopes.ts | 1 | 8, 13, 20 | 9, 14, 15, 16, 17, 20 | 9, 20 | — | 14, 15, 16, 17 | — | — | — | 
| src/server/audit/writeAuditLog.ts | 1 | — | 14, 16, 19, 20, 27, 28, 31, 70, 72 | 14, 19, 70 | 20 | 16, 27, 29, 31, 79 | 12 | 77 | — | 
| src/server/auth/apiRequestGuard.ts | — | — | — | 3, 4, 4, 9, 12 | — | — | — | — | — | 
| src/server/auth/auth.ts | 1 | 14, 71 | 17, 79, 104, 114 | 25, 87 | — | 112, 114 | — | 109, 114 | — | 
| src/server/auth/canReadSubmissionFile.ts | 1 | — | 13, 16 | 13, 16 | — | — | — | — | — | 
| src/server/auth/getSessionUser.ts | 1 | 22 | 25 | 40 | — | — | — | — | — | 
| src/server/auth/passwordReset.ts | 2 | — | 13, 18, 21, 26, 28, 36, 42, 45, 47, 48 | 16, 19, 21, 36 | — | 27, 28, 42, 45, 47, 48 | 10, 35 | 45, 48 | — | 
| src/server/auth/publicPageRoute.ts | 2 | — | 26, 27, 28, 34 | 26, 28, 34 | — | 27 | — | 27 | — | 
| src/server/auth/publicUserId.ts | 2 | — | 6, 7, 9, 14 | 6, 9, 14 | — | 8 | — | 7 | — | 
| src/server/auth/scope.ts | 1 | 27 | 31, 53, 76 | — | 38, 62, 85 | — | — | — | — | 
| src/server/auth/session.ts | 3 | 23, 51, 83, 104 | 29, 52, 84, 105 | 47, 64, 79, 101 | — | 34, 93, 108 | — | 59, 59, 90, 90, 106 | — | 
| src/server/auth/submissionReviewAccess.ts | 1 | — | 19, 20 | 19, 20 | — | — | — | — | — | 
| src/server/cohorts/classCohortIntegrity.ts | 1 | — | 45, 53 | 46 | 54 | — | 5 | 11, 22 | — | 
| src/server/cohorts/migrateCohorts.ts | 1 | — | 5, 16, 21 | — | 5, 21 | 16 | 15 | 13, 18, 21, 26, 38, 39 | — | 
| src/server/conduct/ensureActivityConductScores.ts | 1 | 4 | 6, 13, 24, 25, 26 | 30 | 19 | 12, 31, 33 | 5 | 10, 10, 17, 17, 27, 28 | — | 
| src/server/conduct/migrateActivityPenalty.ts | 1 | — | — | — | — | — | 4 | — | — | 
| src/server/criteria-templates/assertCriteriaTemplateMutable.ts | 1 | — | 7, 24 | 11, 28 | — | — | — | — | — | 
| src/server/criteria-templates/groupRequirements.ts | 1 | — | 3, 5, 7, 11 | 5 | 3, 11 | 7 | — | — | — | 
| src/server/db/migratePlatformFeatures.ts | 1 | — | 5, 7 | — | 5, 7 | — | 4 | 5, 7, 33, 33 | — | 
| src/server/db/schema.sql | — | — | — | — | — | — | — | 1, 21, 22, 34, 53, 73, 82, 105, 119, 152, 183, 204, 228, 310, 388, 410, 411, 421, 435, 451, 468, 484, 504, 520, 536, 537, 594, 609, 642, 650, 678, 694 | — | 
| src/server/db/seed.ts | — | 17 | 23, 24, 25, 26, 27, 28, 29, 33, 96, 115, 126, 169, 184, 195, 212 | — | — | 23, 24, 25, 26, 27, 28, 29, 42, 51, 60, 69, 78, 87, 101, 108, 120, 121, 122, 123, 124, 139, 154, 175, 192, 193, 202, 218 | 20 | 21, 31, 39, 39, 98, 117, 136, 136, 174, 189, 201, 201, 217, 217 | — | 
| src/server/db/sqlite.ts | 9 | 345 | 44, 97, 123, 145, 309, 319, 331 | 145, 320, 331 | 45, 98, 123, 309 | — | — | 35, 44, 63, 81, 97, 123, 145, 147, 159, 170, 248, 249, 250, 266, 309, 319 | 10, 21, 38 | 
| src/server/db/unicodeSearch.ts | 1 | — | — | — | — | — | — | — | — | 
| src/server/events/cloneCriteriaTemplateToEvent.ts | 2 | 11 | 14, 30, 37, 44, 69 | 21 | — | 35, 42, 67, 96 | 29 | — | — | 
| src/server/events/evaluateAutoCriteria.ts | 1 | 32 | 35, 56, 69, 92, 106 | 43, 101, 122 | 65, 85 | — | — | 82 | — | 
| src/server/events/evaluateSubmissionAuto.ts | 1 | 11 | 13 | 21 | — | — | — | — | — | 
| src/server/events/eventSubmissionPhaseFilter.ts | — | — | — | — | — | — | — | 5, 5, 7, 7, 7, 7, 9, 9 | — | 
| src/server/events/saveAutoCriteriaResults.ts | 1 | 11 | 15 | — | — | 33 | 13 | 25, 26 | — | 
| src/server/reports/getAdminOverviewSummary.ts | 2 | 26 | 29 | 151 | — | — | — | 50, 50, 59, 59, 68, 68, 77, 77 | — | 
| src/server/submissions/assertEvidenceEditable.ts | 1 | — | 6 | 7 | — | — | — | — | — | 
| src/server/submissions/assertSubmissionCanBeApproved.ts | 1 | — | — | — | — | — | — | — | — | 
| src/server/submissions/auto-evaluate.ts | 1 | 45, 63, 82, 99 | 48, 66, 85, 102, 131, 147, 157, 223, 230 | 57, 76, 93, 117, 168, 175, 184, 185 | 144, 154, 164 | 228, 246 | 222 | 53, 241 | — | 
| src/server/submissions/evaluateSubmission.ts | 1 | 4 | 7, 39, 55, 75, 85, 88, 121 | 22, 107, 109 | 64, 82, 85, 97 | 45, 127 | — | 42, 124 | — | 
| src/server/submissions/evaluateSubmissionRequirements.ts | 1 | — | 7, 9, 20 | 7, 26, 34 | 18, 20 | — | — | — | — | 
| src/server/submissions/final-evaluate.ts | 1 | 4 | — | — | — | — | — | — | — | 
| src/server/submissions/finalizeExpiredSubmissions.ts | 1 | — | 5, 11, 12 | — | 7 | 15, 16 | 10 | 11 | — | 
| src/server/submissions/getSubmissionTimeline.ts | 2 | 15 | 15 | — | 28 | — | — | 27 | — | 
| src/server/submissions/migrateSubmissionReviewRounds.ts | 1 | — | 4 | — | — | 16 | — | 12 | — | 
| src/server/submissions/restoreDeadlineFinalizedSubmissions.ts | 1 | — | 5, 11, 12 | — | 10 | 14, 14 | — | 8, 8, 11 | — | 
| src/server/submissions/validateEvidenceCriteria.ts | 1 | — | 5 | — | 5 | — | — | — | — | 
| src/server/uploads/saveSubmissionFile.ts | — | — | — | — | — | — | — | — | 1, 35 | 

## Actual database schema and counts
| Table | Rows | Foreign keys |
|---|---:|---:|
| academic_terms | 7 | 0 |
| activities | 18 | 1 |
| activity_attendance_logs | 123 | 3 |
| activity_cohort_scopes | 0 | 1 |
| activity_import_batches | 3 | 2 |
| activity_import_rows | 12 | 2 |
| activity_public_ids | 6 | 1 |
| activity_registrations | 31 | 4 |
| activity_scopes | 65 | 2 |
| audit_log_policy_versions | 2 | 0 |
| audit_logs | 82 | 1 |
| auth_login_limits | 0 | 0 |
| banners | 0 | 3 |
| class_cohort_links | 17 | 2 |
| class_members | 1075 | 2 |
| classes | 17 | 0 |
| cohorts | 7 | 0 |
| conduct_periods | 2 | 0 |
| conduct_score_categories | 19 | 2 |
| conduct_scores | 26 | 3 |
| criteria_activity_rules | 13 | 2 |
| criteria_conduct_rules | 0 | 1 |
| criteria_template_groups | 11 | 1 |
| criteria_template_items | 14 | 1 |
| criteria_templates | 6 | 1 |
| event_assignments | 0 | 4 |
| event_criteria_groups | 19 | 1 |
| event_criteria_items | 25 | 1 |
| event_results | 0 | 3 |
| event_scopes | 0 | 2 |
| events | 11 | 2 |
| faculty_class_assignments | 9 | 2 |
| news_posts | 0 | 1 |
| notifications | 21 | 1 |
| password_reset_requests | 2 | 1 |
| public_page_routes | 17 | 0 |
| reviews | 16 | 2 |
| role_requests | 0 | 2 |
| sessions | 182 | 1 |
| submission_auto_results | 22 | 1 |
| submission_criteria_reviews | 11 | 2 |
| submission_files | 6 | 1 |
| submission_items | 1 | 1 |
| submission_selected_criteria | 0 | 1 |
| submission_support_requests | 2 | 2 |
| submission_timeline | 43 | 2 |
| submissions | 16 | 3 |
| user_public_ids | 81 | 1 |
| users | 1067 | 0 |

## Implementation / verification status
Audit complete. Implementation in progress. No MySQL migration or production cutover has been claimed.