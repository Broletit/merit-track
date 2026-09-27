import Link from "next/link";
import { Award, BarChart3, Trophy, Users } from "lucide-react";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import Pagination from "@/components/common/Pagination";
import ReportPageHeader from "@/components/admin/reports/ReportPageHeader";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import ReportProgressBar from "@/components/admin/reports/ReportProgressBar";
import DonutChart from "@/components/admin/reports/DonutChart";
import HorizontalBarChart from "@/components/admin/reports/HorizontalBarChart";
import OfficerAchievementFilter from "@/components/admin/reports/OfficerAchievementFilter";
import OfficerAchievementExportButton from "@/components/admin/reports/OfficerAchievementExportButton";
import { ensureActivityConductScores } from "@/server/conduct/ensureActivityConductScores";
import {
  getAcademicTermForView,
  getAcademicTermsForSelect,
} from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{
  termId?: string;
  eventId?: string;
  top?: string;
  keyword?: string;
  page?: string;
}>;

type EventRow = {
  id: number;
  title: string;
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

type ChartRow = {
  label: string;
  subLabel: string | null;
  value: number;
};

const PAGE_SIZE = 10;

export default async function OfficerAchievementsReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminContext();

  const params = await searchParams;
  const db = getDb();
  ensureActivityConductScores();
  
  const terms = getAcademicTermsForSelect();
  const selectedTerm = getAcademicTermForView(params.termId);

  const eventId = Number(params.eventId ?? 0);
  const top = Number(params.top ?? 20);
  const keyword = String(params.keyword ?? "").trim();
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const limitTotal = Number.isFinite(top) && top > 0 ? top : 20;

  const events = db
    .prepare(
      `
      SELECT id, title
      FROM events
      WHERE type = 'officer'
        AND term_id = ?
      ORDER BY datetime(start_at) DESC, id DESC
      `
    )
    .all(selectedTerm.id) as EventRow[];

  const where: string[] = ["e.type = 'officer'", "e.term_id = ?", "s.submitted_at IS NOT NULL"];
  const values: unknown[] = [selectedTerm.id];

  if (eventId > 0) {
    where.push("e.id = ?");
    values.push(eventId);
  }

  if (keyword) {
    where.push("(u.full_name LIKE ? OR u.mssv LIKE ? OR c.code LIKE ?)");
    values.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const summary = db
    .prepare(
      `
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
      `
    )
    .get(...values) as StatusSummary;

  const passedRate =
    Number(summary.total ?? 0) > 0
      ? Math.round((Number(summary.passed ?? 0) / Number(summary.total ?? 0)) * 100)
      : 0;

  const allRanked = db
    .prepare(
      `
      SELECT
        s.id,
        s.score_total,
        COALESCE((SELECT SUM(i.score_max) FROM event_criteria_items i WHERE i.event_id=e.id),0) AS score_max,
        ROUND(100.0*s.score_total/NULLIF((SELECT SUM(i.score_max) FROM event_criteria_items i WHERE i.event_id=e.id),0)) AS normalized_score,
        s.status,
        e.title AS event_title,
        u.full_name,
        u.mssv,
        GROUP_CONCAT(c.code, ', ') AS class_codes
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      LEFT JOIN class_members cm ON cm.user_id = u.id
      LEFT JOIN classes c ON c.id = cm.class_id
      ${whereSql}
        AND s.status = 'passed'
      GROUP BY s.id
      ORDER BY normalized_score DESC, s.score_total DESC, u.full_name ASC
      LIMIT ?
      `
    )
    .all(...values, limitTotal) as Omit<OfficerRow, "rank_no">[];

  const rankedRows: OfficerRow[] = allRanked.map((item, index) => ({
    ...item,
    rank_no: index + 1,
  }));

  const rows = rankedRows.slice(offset, offset + PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(rankedRows.length / PAGE_SIZE));

  const topScoreChart = rankedRows.slice(0, 10).map((item) => ({
    label: item.full_name,
    subLabel: item.class_codes || item.mssv,
    value: Number(item.normalized_score ?? 0),
  }));

  const classChart = db
    .prepare(
      `
      SELECT
        COALESCE(c.code, 'Chưa gán lớp') AS label,
        c.name AS subLabel,
        COUNT(DISTINCT s.id) AS value
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      LEFT JOIN class_members cm ON cm.user_id = u.id
      LEFT JOIN classes c ON c.id = cm.class_id
      ${whereSql}
        AND s.status = 'passed'
      GROUP BY c.id
      ORDER BY value DESC, label ASC
      LIMIT 10
      `
    )
    .all(...values) as ChartRow[];

  return (
    <main className="space-y-6">
      <ReportPageHeader
        title="Cán bộ đoàn tiêu biểu"
        description="Xếp hạng cán bộ theo điểm hồ sơ đạt, phục vụ báo cáo thành tích cấp khoa và cấp trường."
        termSelect={<AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />}
      />

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-xl font-semibold text-slate-900">Bộ lọc báo cáo</h2>
        <div className="mt-5">
          <OfficerAchievementFilter events={events} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<Users size={20} />} label="Tổng hồ sơ cán bộ" value={summary.total ?? 0} />
        <Stat icon={<Award size={20} />} label="Hồ sơ đạt" value={summary.passed ?? 0} />
        <Stat icon={<Trophy size={20} />} label="Top đang xem" value={limitTotal} />

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="text-sm font-medium text-slate-500">Tỉ lệ đạt</div>
          <div className="mt-3 text-3xl font-bold text-slate-900">{passedRate}%</div>
          <div className="mt-4">
            <ReportProgressBar value={passedRate} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ReportCard
          icon={<BarChart3 size={20} />}
          title="Top mức hoàn thành của cán bộ"
          description="Điểm được chuẩn hóa theo thang tối đa của từng đợt để so sánh công bằng."
        >
          <HorizontalBarChart items={topScoreChart} valueLabel="%" />
        </ReportCard>

        <ReportCard
          icon={<Award size={20} />}
          title="Cơ cấu trạng thái hồ sơ"
          description="Tỉ lệ hồ sơ đạt, chờ duyệt, cần chỉnh sửa và không đạt."
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

        <ReportCard
          icon={<Users size={20} />}
          title="Cán bộ đạt theo lớp"
          description="Lớp nào có nhiều cán bộ đạt tiêu chuẩn trong đợt xét."
        >
          <HorizontalBarChart
            items={classChart.map((item) => ({
              label: item.label,
              subLabel: item.subLabel ?? undefined,
              value: Number(item.value ?? 0),
            }))}
            valueLabel="CB"
          />
        </ReportCard>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Bảng xếp hạng cán bộ tiêu biểu
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Xếp hạng theo điểm hồ sơ từ cao xuống thấp.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <OfficerAchievementExportButton
              termId={selectedTerm.id}
              eventId={eventId}
              top={limitTotal}
            />

            <Link
              href="/dashboard/admin/officer-submissions"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Xem chi tiết
            </Link>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[860px] table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-[10%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
                  Hạng
                </th>
                <th className="w-[25%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Cán bộ
                </th>
                <th className="w-[14%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Lớp
                </th>
                <th className="w-[27%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Đợt xét
                </th>
                <th className="w-[12%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
                  Điểm
                </th>
                <th className="w-[12%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
                  Xem
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.length > 0 ? (
                rows.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-4 text-center">
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700">
                        #{item.rank_no}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="text-sm font-semibold text-slate-900">
                        {item.full_name}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{item.mssv}</div>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700">
                      {item.class_codes || "-"}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700">
                      {item.event_title}
                    </td>

                    <td className="px-4 py-4 text-center text-sm font-bold text-blue-700">
                      {Number(item.score_total ?? 0)}/{Number(item.score_max ?? 0)}
                      <div className="mt-1 text-xs font-medium text-slate-500">{Number(item.normalized_score ?? 0)}%</div>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <Link
                        href={`/dashboard/admin/officer-submissions/${item.id}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Xem
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    Chưa có cán bộ đạt trong điều kiện lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5">
          <Pagination
            page={page}
            totalPages={totalPages}
            searchParams={{
              termId: String(selectedTerm.id),
              eventId: eventId > 0 ? String(eventId) : "",
              top: String(limitTotal),
              keyword,
            }}
          />
        </div>
      </section>
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
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          {icon}
        </div>
      </div>
      <div className="mt-4 text-3xl font-bold text-slate-900">{value}</div>
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
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}
