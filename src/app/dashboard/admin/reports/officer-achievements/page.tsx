import NumberedTable from "@/components/common/NumberedTable";
import statCardStyles from "@/components/shared/statistics/StatCard.module.css";
import { addCohortFilter, cohortClause } from "@/server/cohorts/sql";
import Link from "next/link";
import { Award, BarChart3, Trophy, Users } from "lucide-react";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import Pagination from "@/components/common/Pagination";
import ReportPageHeader from "@/components/admin/reports/ReportPageHeader";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import ReportProgressBar from "@/components/admin/reports/ReportProgressBar";
import DonutChart from "@/components/admin/reports/DonutChart";
import OfficerAchievementFilter from "@/components/admin/reports/OfficerAchievementFilter";
import OfficerAchievementExportButton from "@/components/admin/reports/OfficerAchievementExportButton";
import PotentialOfficerExportButton from "@/components/admin/reports/PotentialOfficerExportButton";
import CriteriaAchievementComparisonChart from "@/components/admin/reports/CriteriaAchievementComparisonChart";
import ReportTabs from "@/components/admin/reports/ReportTabs";
import SubmissionReportTableFilter from "@/components/admin/reports/SubmissionReportTableFilter";
import FilteredListExportButton from "@/components/admin/reports/FilteredListExportButton";
import { evaluateAutoCriteria } from "@/server/events/evaluateAutoCriteria";
import {
  getAcademicTermForView,
  getAcademicTermsForSelect,
} from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{ cohort?: string;
  termId?: string;
  eventId?: string;
  classId?: string;
  keyword?: string;
  page?: string;
  potentialPage?: string;
  criteriaPage?: string;
  assessment?: string;
  potentialStatus?: string;
  participantStatus?: string;
  participantPage?: string;
  tab?: string;
}>;

type EventRow = {
  id: number;
  title: string;
  score_max: number | null;
};

type PotentialOfficerRow = {
  id: number;
  full_name: string;
  mssv: string;
  class_codes: string | null;
  event_title: string;
  potential_score: number;
  score_max: number;
  achieved_criteria: number;
  total_criteria: number;
  missing_required: number;
};

type OfficerRow = {
  id: number;
  rank_no: number;
  score_total: number;
  score_max: number;
  normalized_score: number;
  status: string;
  event_title: string;
  full_name: string;
  mssv: string;
  class_codes: string | null;
};

type StatusSummary = {
  total: number;
  passed: number;
  failed: number;
  pending: number;
  needs_revision: number;
};

type ParticipationSummary = {
  eligible: number;
  participated: number;
};

const PAGE_SIZE = 10;

export default async function OfficerAchievementsReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminContext();

  const params = await searchParams;
  const db = getDatabase();
  
  const terms = (await getAcademicTermsForSelect());
  const selectedTerm = (await getAcademicTermForView(params.termId));

  const eventId = Number(params.eventId ?? 0);
  const classId = Number(params.classId ?? 0);
  const keyword = String(params.keyword ?? "").trim();
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const potentialPage = Math.max(1, Number(params.potentialPage ?? "1") || 1);
  const participantPage = Math.max(1, Number(params.participantPage ?? "1") || 1);
  const criteriaPage = Math.max(1, Number(params.criteriaPage ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const activeTab = params.tab === "tables" ? "tables" : "analysis";

  const events = (await db.rows(`
      SELECT id, title, score_max
      FROM events
      WHERE type = 'officer'
        AND term_id = ?
      ORDER BY CAST(start_at AS DATETIME(3)) DESC, id DESC
      `, [selectedTerm.id])) as EventRow[];
  const classes = (await db.rows(`SELECT id,code,name FROM classes WHERE is_active=1 AND ${cohortClause(params.cohort,"cohort")} ORDER BY code,id`, [])) as Array<{id:number;code:string;name:string}>;

  const where: string[] = ["e.type = 'officer'", "e.term_id = ?", "s.submitted_at IS NOT NULL"];
  const values: unknown[] = [selectedTerm.id];

  if (eventId > 0) {
    where.push("e.id = ?");
    values.push(eventId);
  }
  if (classId > 0) { where.push("s.class_id = ?"); values.push(classId); }

  if (keyword) {
    where.push("(u.full_name LIKE ? OR u.mssv LIKE ?)");
    values.push(`%${keyword}%`, `%${keyword}%`);
  }

  addCohortFilter(where,values,params.cohort,"u.cohort");
  const whereSql = `WHERE ${where.join(" AND ")}`;

  const summary = (await db.first(`
      SELECT
        COUNT(DISTINCT s.id) AS total,
        COUNT(DISTINCT CASE WHEN s.status = 'passed' THEN s.id END) AS passed,
        COUNT(DISTINCT CASE WHEN s.status = 'failed' THEN s.id END) AS failed,
        COUNT(DISTINCT CASE WHEN s.status IN ('submitted_v1','submitted_v2') THEN s.id END) AS pending,
        COUNT(DISTINCT CASE WHEN s.status IN ('needs_revision_v1','needs_revision_v2') THEN s.id END) AS needs_revision
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      LEFT JOIN class_members cm ON cm.user_id = u.id
      LEFT JOIN classes c ON c.id = cm.class_id
      ${whereSql}
      `, [...values])) as StatusSummary;

  const criteriaAchievementRows = (await db.rows(`
      SELECT
        e.id AS event_id,
        e.title AS event_title,
        g.code AS standard_code,
        i.code,
        i.title AS label,
        i.is_required,
        g.title AS standard_label,
        COUNT(DISTINCT s.id) AS total,
        COUNT(DISTINCT CASE WHEN ar.passed = 1 OR review.decision = 'pass' THEN s.id END) AS passed
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      LEFT JOIN class_members cm ON cm.user_id = u.id
      LEFT JOIN classes c ON c.id = cm.class_id
      INNER JOIN event_criteria_items i ON i.event_id = e.id
      INNER JOIN event_criteria_groups g ON g.event_id = i.event_id AND g.code = i.group_code
      LEFT JOIN submission_auto_results ar ON ar.submission_id = s.id AND ar.criteria_code = i.code
      LEFT JOIN submission_criteria_reviews review
        ON review.submission_id = s.id
       AND review.criteria_code = i.code
       AND review.round = s.review_round
      ${whereSql}
      GROUP BY e.id, e.title, g.code, g.title, i.code, i.title, i.is_required, g.sort_order, i.sort_order
      ORDER BY e.id, g.sort_order, i.sort_order
      `, [...values])) as Array<{ event_id: number; event_title: string; standard_code: string; standard_label: string; code: string; label: string; is_required: number; total: number; passed: number }>;

  const participationWhere: string[] = [
    "u.is_active = 1",
    "u.role IN ('class_officer', 'faculty_officer')",
  ];
  const participationValues: unknown[] = [selectedTerm.id];

  if (eventId > 0) {
    participationValues.push(eventId);
  }

  if (keyword) {
    participationWhere.push(`(
      u.full_name LIKE ? OR u.mssv LIKE ?
    )`);
    participationValues.push(`%${keyword}%`, `%${keyword}%`);
  }

  addCohortFilter(participationWhere,participationValues,params.cohort,"u.cohort");
  const participation = (await db.first(`
      SELECT
        COUNT(DISTINCT u.id) AS eligible,
        COUNT(DISTINCT CASE WHEN EXISTS (
          SELECT 1
          FROM submissions participation_submission
          INNER JOIN events participation_event
            ON participation_event.id = participation_submission.event_id
          WHERE participation_submission.user_id = u.id
            AND participation_submission.submitted_at IS NOT NULL
            AND participation_event.type = 'officer'
            AND participation_event.term_id = ?
            ${eventId > 0 ? "AND participation_event.id = ?" : ""}
        ) THEN u.id END) AS participated
      FROM users u
      WHERE ${participationWhere.join(" AND ")}
      `, [...participationValues])) as ParticipationSummary;

  const eligibleOfficers = Number(participation.eligible ?? 0);
  const participatedOfficers = Number(participation.participated ?? 0);
  const nonParticipatedOfficers = Math.max(0, eligibleOfficers - participatedOfficers);
  const participationRate = eligibleOfficers > 0 ? Math.round((participatedOfficers / eligibleOfficers) * 100) : 0;

  const eligibleOfficerValues: unknown[] = [];
  const eligibleOfficerWhere = [
    "u.is_active = 1",
    "u.role IN ('class_officer', 'faculty_officer')",
  ];

  if (keyword) {
    eligibleOfficerWhere.push(`(
      u.full_name LIKE ? OR u.mssv LIKE ?
    )`);
    eligibleOfficerValues.push(`%${keyword}%`, `%${keyword}%`);
  }

  addCohortFilter(eligibleOfficerWhere,eligibleOfficerValues,params.cohort,"u.cohort");
  if (classId > 0) { eligibleOfficerWhere.push("active_class.id = ?"); eligibleOfficerValues.push(classId); }
  const eligibleOfficersForPotential = (await db.rows(`
    SELECT
      u.id,
      u.full_name,
      u.mssv,
      GROUP_CONCAT(DISTINCT active_class.code) AS class_codes
    FROM users u
    LEFT JOIN class_members active_membership
      ON active_membership.user_id = u.id
     AND active_membership.left_at IS NULL
    LEFT JOIN classes active_class ON active_class.id = active_membership.class_id
    WHERE ${eligibleOfficerWhere.join(" AND ")}
      AND NOT EXISTS (
        SELECT 1
        FROM submissions existing_submission
        INNER JOIN events existing_event ON existing_event.id = existing_submission.event_id
        WHERE existing_submission.user_id = u.id
          AND existing_submission.submitted_at IS NOT NULL
          AND existing_event.type = 'officer'
          AND existing_event.term_id = ?
          ${eventId > 0 ? "AND existing_event.id = ?" : ""}
      )
    GROUP BY u.id
  `, [...eligibleOfficerValues, selectedTerm.id, ...(eventId > 0 ? [eventId] : [])])) as Array<{
    id: number;
    full_name: string;
    mssv: string;
    class_codes: string | null;
  }>;

  const potentialEvents = eventId > 0
    ? events.filter((event) => event.id === eventId)
    : events;

  const potentialRows: PotentialOfficerRow[] = activeTab === "tables" ? (await Promise.all(eligibleOfficersForPotential
    .map(async (officer) => {
      let best: PotentialOfficerRow | null = null;

      for (const event of potentialEvents) {
        const criteria = (await db.rows(`
          SELECT i.code, i.title, i.group_code, i.score_max, i.is_required,
            g.score_max AS group_score_max, g.min_required
          FROM event_criteria_items i
          INNER JOIN event_criteria_groups g
            ON g.event_id = i.event_id
           AND g.code = i.group_code
          WHERE i.event_id = ?
          ORDER BY g.sort_order, i.sort_order, i.id
        `, [event.id])) as Array<{
          code: string;
          title: string;
          group_code: string;
          score_max: number;
          is_required: number;
          group_score_max: number;
          min_required: number;
        }>;

        const passedCodes = new Set(
          (await evaluateAutoCriteria({ eventId: event.id, userId: officer.id }))
            .filter((item) => item.passed)
            .map((item) => item.criteriaCode)
        );

        const activityScores = (await db.rows(`
          SELECT rule.criteria_code,
            SUM(CASE WHEN rule.score_value > 0 THEN rule.score_value ELSE item.score_max END) AS score
          FROM criteria_activity_rules rule
          INNER JOIN criteria_template_items item
            ON item.template_id = rule.template_id
           AND item.code = rule.criteria_code
          INNER JOIN activity_registrations registration
            ON registration.activity_id = rule.activity_id
           AND registration.user_id = ?
           AND registration.status = 'attended'
          INNER JOIN events score_event
            ON score_event.id = ?
           AND score_event.criteria_template_id = rule.template_id
          GROUP BY rule.criteria_code
        `, [officer.id, event.id])) as Array<{ criteria_code: string; score: number }>;
        const activityScoreMap = new Map(activityScores.map((item) => [item.criteria_code, Number(item.score)]));
        const groupScores = new Map<string, { score: number; max: number }>();
        const groupRequirements = new Map<string, { achieved: number; required: number; missingMandatory: number }>();

        for (const criterion of criteria) {
          const requirement = groupRequirements.get(criterion.group_code) ?? {
            achieved: 0,
            required: Number(criterion.min_required ?? 0),
            missingMandatory: 0,
          };
          if (passedCodes.has(criterion.code)) requirement.achieved += 1;
          else if (Number(criterion.is_required) === 1) requirement.missingMandatory += 1;
          groupRequirements.set(criterion.group_code, requirement);

          if (!passedCodes.has(criterion.code)) continue;
          const current = groupScores.get(criterion.group_code) ?? {
            score: 0,
            max: Number(criterion.group_score_max ?? 0),
          };
          const criterionScore = Math.min(
            Number(criterion.score_max ?? 0),
            activityScoreMap.get(criterion.code) ?? Number(criterion.score_max ?? 0)
          );
          current.score = current.max > 0
            ? Math.min(current.max, current.score + criterionScore)
            : current.score + criterionScore;
          groupScores.set(criterion.group_code, current);
        }

        const uncappedScore = Array.from(groupScores.values()).reduce((total, group) => total + group.score, 0);
        const eventMaximum = Number(event.score_max ?? 0) > 0
          ? Number(event.score_max)
          : criteria.reduce((total, criterion, index) => {
              if (criteria.findIndex((item) => item.group_code === criterion.group_code) !== index) return total;
              return total + Number(criterion.group_score_max ?? 0);
            }, 0);
        const potentialScore = eventMaximum > 0 ? Math.min(eventMaximum, uncappedScore) : uncappedScore;
        const missingRequired = Array.from(groupRequirements.values()).reduce((total, group) => {
          const remainingAfterMandatory = Math.max(
            0,
            group.required - group.achieved - group.missingMandatory
          );
          return total + group.missingMandatory + remainingAfterMandatory;
        }, 0);

        if (
          !best
          || missingRequired < best.missing_required
          || (missingRequired === best.missing_required && potentialScore > best.potential_score)
        ) {
          best = {
            ...officer,
            event_title: event.title,
            potential_score: potentialScore,
            score_max: eventMaximum,
            achieved_criteria: passedCodes.size,
            total_criteria: criteria.length,
            missing_required: missingRequired,
          };
        }
      }

      return best;
    })))
    .filter((item): item is PotentialOfficerRow => Boolean(item))
    .sort((a, b) =>
      a.missing_required - b.missing_required
      || b.potential_score - a.potential_score
      || a.full_name.localeCompare(b.full_name, "vi")
    ) : [];
  const assessment = ["ready", "potential"].includes(String(params.potentialStatus))
    ? String(params.potentialStatus)
    : ["ready", "potential"].includes(String(params.assessment))
      ? String(params.assessment)
      : "";
  const filteredPotentialRows = assessment === "ready"
    ? potentialRows.filter((item) => item.missing_required === 0)
    : assessment === "potential"
      ? potentialRows.filter((item) => item.missing_required > 0 && item.missing_required <= 2)
      : potentialRows;

  const allRanked = (await db.rows(`
      SELECT
        s.id,
        s.score_total,
        CASE WHEN e.score_max > 0
          THEN LEAST(e.score_max, COALESCE(NULLIF((SELECT SUM(g.score_max) FROM event_criteria_groups g WHERE g.event_id=e.id),0),e.score_max))
          ELSE COALESCE((SELECT SUM(g.score_max) FROM event_criteria_groups g WHERE g.event_id=e.id),0)
        END AS score_max,
        ROUND(100.0*s.score_total/NULLIF(CASE WHEN e.score_max > 0
          THEN LEAST(e.score_max, COALESCE(NULLIF((SELECT SUM(g.score_max) FROM event_criteria_groups g WHERE g.event_id=e.id),0),e.score_max))
          ELSE COALESCE((SELECT SUM(g.score_max) FROM event_criteria_groups g WHERE g.event_id=e.id),0)
        END,0)) AS normalized_score,
        s.status,
        e.title AS event_title,
        u.full_name,
        u.mssv,
        GROUP_CONCAT(c.code SEPARATOR ', ') AS class_codes
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      LEFT JOIN class_members cm ON cm.user_id = u.id
      LEFT JOIN classes c ON c.id = cm.class_id
      ${whereSql}
        AND s.status = 'passed'
      GROUP BY s.id
      ORDER BY s.score_total DESC, normalized_score DESC, u.full_name ASC
      `, [...values])) as Omit<OfficerRow, "rank_no">[];

  const rankedRows: OfficerRow[] = allRanked.map((item, index) => ({
    ...item,
    rank_no: index + 1,
  }));

  const participantWhere = [...where];
  const participantValues = [...values];
  if (params.participantStatus) { participantWhere.push("s.status=?"); participantValues.push(params.participantStatus); }
  const participantRows = (await db.rows(`SELECT s.id,u.full_name,u.mssv,GROUP_CONCAT(c.code SEPARATOR ', ') class_codes,e.title event_title,s.status FROM submissions s INNER JOIN events e ON e.id=s.event_id INNER JOIN users u ON u.id=s.user_id LEFT JOIN class_members cm ON cm.user_id=u.id AND cm.left_at IS NULL LEFT JOIN classes c ON c.id=cm.class_id WHERE ${participantWhere.join(" AND ")} GROUP BY s.id ORDER BY CAST(s.submitted_at AS DATETIME(3)) DESC,u.full_name`, participantValues)) as Array<{id:number;full_name:string;mssv:string;class_codes:string|null;event_title:string;status:string}>;
  const participantTotalPages = Math.max(1, Math.ceil(participantRows.length / PAGE_SIZE));
  const participantTableRows = participantRows.slice((participantPage - 1) * PAGE_SIZE, participantPage * PAGE_SIZE);


  const rows = rankedRows.slice(offset, offset + PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(rankedRows.length / PAGE_SIZE));
  const potentialOffset = (potentialPage - 1) * PAGE_SIZE;
  const potentialTableRows = filteredPotentialRows.slice(potentialOffset, potentialOffset + PAGE_SIZE);
  const potentialTotalPages = Math.max(1, Math.ceil(filteredPotentialRows.length / PAGE_SIZE));

  if (activeTab === "tables") return <main className="space-y-6"><ReportPageHeader title="Phân tích hồ sơ và xếp hạng cán bộ" compact termSelect={<AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />} /><ReportTabs activeTab="tables" /><section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60"><h2 className="text-xl font-semibold text-slate-900">Danh sách cán bộ tiềm năng</h2><div className="mt-5"><SubmissionReportTableFilter mode="potential" events={events} classes={classes} /></div><div className="mt-5 flex justify-end"><FilteredListExportButton rows={filteredPotentialRows.map((row)=>({name:row.full_name,mssv:row.mssv,class:row.class_codes,event:row.event_title,status:row.missing_required===0?"Đủ điều kiện":"Tiềm năng"}))} columns={[{key:"name",label:"Họ tên"},{key:"mssv",label:"MSSV"},{key:"class",label:"Lớp"},{key:"event",label:"Đợt xét"},{key:"status",label:"Tình trạng"}]} fileName="danh-sach-can-bo-tiem-nang.csv" /></div><div data-table-frame className="mt-5 overflow-hidden rounded-none border border-slate-200"><NumberedTable className="w-full table-fixed"><thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left text-sm font-semibold">Cán bộ</th><th className="px-4 py-3 text-left text-sm font-semibold">Lớp</th><th className="px-4 py-3 text-left text-sm font-semibold">Đợt xét</th><th className="px-4 py-3 text-center text-sm font-semibold">Tình trạng</th></tr></thead><tbody>{potentialTableRows.map(row=><tr key={`${row.id}-${row.event_title}`} className="border-t border-slate-100"><td className="px-4 py-3"><div className="font-semibold">{row.full_name}</div><div className="text-xs text-slate-500">{row.mssv}</div></td><td className="px-4 py-3">{row.class_codes??"—"}</td><td className="px-4 py-3">{row.event_title}</td><td className="px-4 py-3 text-center">{row.missing_required===0?"Đủ điều kiện":"Tiềm năng"}</td></tr>)}</tbody></NumberedTable></div><Pagination totalResults={filteredPotentialRows.length} resultLabel="cán bộ" page={potentialPage} totalPages={potentialTotalPages} paramName="potentialPage" searchParams={{cohort:params.cohort,termId:String(selectedTerm.id),eventId:eventId>0?String(eventId):"",classId:classId>0?String(classId):"",keyword,participantStatus:params.participantStatus,potentialStatus:params.potentialStatus,tab:"tables"}} /></section><section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60"><h2 className="text-xl font-semibold text-slate-900">Danh sách cán bộ tham gia xét</h2><div className="mt-5"><SubmissionReportTableFilter mode="participant" events={events} classes={classes} /></div><div className="mt-5 flex justify-end"><FilteredListExportButton rows={participantRows.map((row)=>({name:row.full_name,mssv:row.mssv,class:row.class_codes,event:row.event_title,status:row.status}))} columns={[{key:"name",label:"Họ tên"},{key:"mssv",label:"MSSV"},{key:"class",label:"Lớp"},{key:"event",label:"Đợt xét"},{key:"status",label:"Trạng thái"}]} fileName="danh-sach-can-bo-tham-gia-xet.csv" /></div><div data-table-frame className="mt-5 overflow-hidden rounded-none border border-slate-200"><NumberedTable className="w-full table-fixed"><thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left text-sm font-semibold">Cán bộ</th><th className="px-4 py-3 text-left text-sm font-semibold">Lớp</th><th className="px-4 py-3 text-left text-sm font-semibold">Đợt xét</th><th className="px-4 py-3 text-center text-sm font-semibold">Trạng thái</th></tr></thead><tbody>{participantTableRows.map(row=><tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-3"><div className="font-semibold">{row.full_name}</div><div className="text-xs text-slate-500">{row.mssv}</div></td><td className="px-4 py-3">{row.class_codes??"—"}</td><td className="px-4 py-3">{row.event_title}</td><td className="px-4 py-3 text-center">{row.status}</td></tr>)}</tbody></NumberedTable></div><Pagination totalResults={participantRows.length} resultLabel="cán bộ" page={participantPage} totalPages={participantTotalPages} paramName="participantPage" searchParams={{cohort:params.cohort,termId:String(selectedTerm.id),eventId:eventId>0?String(eventId):"",classId:classId>0?String(classId):"",keyword,participantStatus:params.participantStatus,potentialStatus:params.potentialStatus,tab:"tables"}} /></section></main>;
  return (
    <main className="space-y-6">
      <ReportPageHeader
        title="Phân tích hồ sơ và xếp hạng cán bộ"
        compact
        termSelect={<AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />}
      />

      <div className="hidden">
      <section className="order-2 rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
        <h2 className="text-xl font-semibold text-slate-900">Bộ lọc báo cáo</h2>
        <div className="mt-4">
          <OfficerAchievementFilter events={events} />
        </div>
      </section>

      <section className="order-1 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<Users size={20} />} label="Cán bộ thuộc đối tượng" value={eligibleOfficers} />
        <Stat icon={<Award size={20} />} label="Đã tham gia xét" value={participatedOfficers} />
        <Stat icon={<Trophy size={20} />} label="Chưa tham gia xét" value={nonParticipatedOfficers} />

        <div className={[statCardStyles.card, "min-w-0"].join(" ")}>
          <div className="flex items-center justify-between gap-3"><div className={statCardStyles.label}>Tỉ lệ tham gia xét</div><div className={[statCardStyles.icon, "flex items-center justify-center"].join(" ")}><BarChart3 size={20} /></div></div>
          <div className={[statCardStyles.value, "text-slate-900"].join(" ")}>{participationRate}%</div>
          <div className="mt-4">
            <ReportProgressBar value={participationRate} />
          </div>
        </div>
      </section>

      </div>

      <ReportTabs activeTab={activeTab} />
      <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
        <OfficerAchievementFilter events={events} />
      </section>

      {activeTab === "analysis" ? <>
      <section className="officer-report-charts grid gap-6 xl:grid-cols-2">
        <ReportCard
          icon={<Users size={20} />}
          title="Mức độ tham gia đợt xét"
        >
          <DonutChart
            centerLabel="cán bộ"
            items={[
              { label: "Đã tham gia xét", value: participatedOfficers, className: "#2563eb" },
              { label: "Chưa tham gia xét", value: nonParticipatedOfficers, className: "#cbd5e1" },
            ]}
          />
        </ReportCard>

        <ReportCard
          icon={<Award size={20} />}
          title="Cơ cấu trạng thái hồ sơ"
        >
          <DonutChart
            items={[
              { label: "Đạt", value: Number(summary.passed ?? 0), className: "#16a34a" },
              { label: "Chờ duyệt", value: Number(summary.pending ?? 0), className: "#2563eb" },
              { label: "Cần chỉnh sửa", value: Number(summary.needs_revision ?? 0), className: "#f59e0b" },
              { label: "Không đạt", value: Number(summary.failed ?? 0), className: "#e11d48" },
            ]}
          />
        </ReportCard>

      </section>

      <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><BarChart3 size={20} /></div>
          <div><h2 className="text-xl font-semibold text-slate-900">Phân tích mức độ đạt tiêu chí</h2></div>
        </div>
        <div className="mt-6">
          <CriteriaAchievementComparisonChart items={criteriaAchievementRows.map((item) => ({
            label: `${item.code}. ${item.label}`,
            standardKey: `${item.event_id}:${item.standard_code}`,
            standardLabel: item.standard_label,
            eventTitle: item.event_title,
            isRequired: Number(item.is_required) === 1,
            passed: Number(item.passed ?? 0),
            total: Number(item.total ?? 0),
          }))} page={criteriaPage} searchParams={{
            cohort: params.cohort,
            termId: String(selectedTerm.id),
            eventId: eventId > 0 ? String(eventId) : "",
            keyword,
            assessment,
            tab: "analysis",
          }} />
        </div>
      </section>

      </> : <>
      <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Phân tích cán bộ chưa tham gia xét</h2>
            
          </div>
          <PotentialOfficerExportButton rows={filteredPotentialRows} />
        </div>

        <div data-table-frame className="mt-5 min-w-0 overflow-hidden rounded-none border border-slate-200 bg-white">
<div className="overflow-x-auto rounded-none border border-slate-200">
          <NumberedTable page={potentialPage} className="w-full min-w-0 table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-[26%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Cán bộ</th>
                <th data-column-align="left" className="w-[12%] px-4 py-3  text-sm font-semibold text-slate-700 text-left">Lớp</th>
                <th className="w-[23%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Đợt xét phù hợp</th>
                <th className="w-[14%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Tiêu chí tự động đạt</th>
                <th className="w-[12%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Điểm tiềm năng</th>
                <th className="w-[13%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Đánh giá</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {potentialTableRows.length ? potentialTableRows.map((item) => {
                const ready = item.missing_required === 0;
                const potential = item.missing_required > 0 && item.missing_required <= 2;
                return (
                  <tr key={`${item.id}-${item.event_title}`} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-4">
                      <div className="text-sm font-semibold text-slate-900">{item.full_name}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.mssv}</div>
                    </td>
                    <td data-column-align="left" className="px-4 py-4 text-sm text-slate-700 text-left">{item.class_codes || "—"}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{item.event_title}</td>
                    <td className="px-4 py-4 text-center">
                      <div className="text-sm font-semibold text-slate-800">{item.achieved_criteria}/{item.total_criteria}</div>
                      <div className="mt-1 text-xs text-slate-500">Còn thiếu tối thiểu {item.missing_required}</div>
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-bold text-blue-700">
                      {item.potential_score}/{item.score_max}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        ready
                          ? "bg-emerald-50 text-emerald-700"
                          : potential
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                      }`}>
                        {ready ? "Có thể tham gia ngay" : potential ? "Tiềm năng" : "Cần bổ sung"}
                      </span>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">Không có cán bộ chưa tham gia trong điều kiện lọc.</td>
                </tr>
              )}
            </tbody>
          </NumberedTable>
        </div>
<div className="mt-5">
          <Pagination totalResults={filteredPotentialRows.length} resultLabel="cán bộ"
            page={potentialPage}
            totalPages={potentialTotalPages}
            paramName="potentialPage"
            searchParams={{ cohort: params.cohort,
              termId: String(selectedTerm.id),
              eventId: eventId > 0 ? String(eventId) : "",
              keyword,
              assessment,
              page,
              tab: "tables",
            }}
          />
        </div>
</div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-900">Bảng xếp hạng cán bộ</h2>
          <OfficerAchievementExportButton cohort={params.cohort} termId={selectedTerm.id} eventId={eventId} />
        </div>

        <div data-table-frame className="mt-5 min-w-0 overflow-hidden rounded-none border border-slate-200 bg-white">
<div className="overflow-x-auto rounded-none border border-slate-200">
          <NumberedTable page={page} className="w-full min-w-0 table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50"><tr>
              <th className="w-[10%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Hạng</th>
              <th className="w-[25%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Cán bộ</th>
              <th data-column-align="left" className="w-[14%] px-4 py-3  text-sm font-semibold text-slate-700 text-left">Lớp</th>
              <th className="w-[27%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Đợt xét</th>
              <th className="w-[12%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Điểm</th>
              <th className="w-[12%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Thao tác</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.length ? rows.map((item) => <tr key={item.id} className="transition hover:bg-slate-50/70">
                <td className="px-4 py-4 text-center"><span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700">#{item.rank_no}</span></td>
                <td className="px-4 py-4"><div className="text-sm font-semibold text-slate-900">{item.full_name}</div><div className="mt-1 text-xs text-slate-500">{item.mssv}</div></td>
                <td data-column-align="left" className="px-4 py-4 text-sm text-slate-700 text-left">{item.class_codes || "—"}</td>
                <td className="px-4 py-4 text-sm text-slate-700">{item.event_title}</td>
                <td className="px-4 py-4 text-center text-sm font-bold text-blue-700">{Number(item.score_total ?? 0)}/{Number(item.score_max ?? 0)}<div className="mt-1 text-xs font-medium text-slate-500">{Number(item.normalized_score ?? 0)}%</div></td>
                <td className="px-4 py-4 text-center"><Link href={`/dashboard/admin/officer-reviews/${item.id}?mode=view`} className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Xem</Link></td>
              </tr>) : <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">Chưa có hồ sơ cán bộ đạt trong điều kiện lọc.</td></tr>}
            </tbody>
          </NumberedTable>
        </div>
<div className="mt-5"><Pagination totalResults={rankedRows.length} resultLabel="cán bộ" page={page} totalPages={totalPages} searchParams={{ cohort: params.cohort, termId: String(selectedTerm.id), eventId: eventId > 0 ? String(eventId) : "", keyword, assessment, tab: "tables" }} /></div>
</div>
      </section>

      </>}

    </main>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className={[statCardStyles.card, "min-w-0"].join(" ")}>
      <div className="flex items-center justify-between gap-3">
        <div className={statCardStyles.label}>{label}</div>
        <div className={[statCardStyles.icon, "flex items-center justify-center"].join(" ")}>
          {icon}
        </div>
      </div>
      <div className={[statCardStyles.value, "text-slate-900"].join(" ")}>{value}</div>
    </div>
  );
}

function ReportCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}
