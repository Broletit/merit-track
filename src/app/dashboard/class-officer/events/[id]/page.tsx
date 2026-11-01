import CriteriaDefinitionTable from "@/components/shared/criteria/CriteriaDefinitionTable";
import PaginatedTable from "@/components/common/PaginatedTable";
import { addCohortFilter } from "@/server/cohorts/sql";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireClassOfficerContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import SubmissionStatusBadge from "@/components/shared/submissions/SubmissionStatusBadge";
import EventSubmissionPhaseBadge from "@/components/shared/EventSubmissionPhaseBadge";
import EventSubmissionFilters from "@/components/shared/events/EventSubmissionFilters";

type EventRow = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  start_at: string;
  end_at: string;
  allow_late: number;
};

type SubmissionRow = {
  id: number;
  status: string;
  updated_at: string;
  submitted_at: string | null;
  student_name: string;
  mssv: string;
};

export default async function ClassOfficerEventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ cohort?: string; id: string }>;
  searchParams: Promise<{ cohort?: string; termId?: string; keyword?: string; status?: string }>;
}) {
  const user = await requireClassOfficerContext();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const eventId = await getDatabase().resolveRouteRecordId(id);

  if (!Number.isFinite(eventId) || eventId <= 0) notFound();

  const db = getDatabase();

  const officerClass = (await db.first(`
      SELECT class_id
      FROM class_members
      WHERE user_id = ?
      LIMIT 1
      `, [user.id])) as { class_id: number } | undefined;

  if (!officerClass) {
    throw new Error("Tài khoản cán bộ lớp chưa được gán lớp.");
  }

  const event = (await db.first(`
      SELECT id, title, description, status, start_at, end_at, allow_late
      FROM events
      WHERE id = ?
        AND type = 'student'
        AND status = 'published'
        AND (NOT EXISTS (SELECT 1 FROM event_scopes es WHERE es.event_id=events.id)
          OR EXISTS (SELECT 1 FROM event_scopes es WHERE es.event_id=events.id AND es.class_id=?))
      LIMIT 1
      `, [eventId, officerClass.class_id])) as EventRow | undefined;

  if (!event) notFound();

  const keyword = String(sp.keyword ?? "").trim();
  const submissionStatus = String(sp.status ?? "").trim();
  const submissionWhere = ["s.event_id = ?", "s.class_id = ?", "s.submitted_at IS NOT NULL"];
  const submissionValues: unknown[] = [event.id, officerClass.class_id];
  addCohortFilter(submissionWhere,submissionValues,sp.cohort,"u.cohort");
  if (keyword) { submissionWhere.push("(u.full_name LIKE ? OR u.mssv LIKE ?)"); submissionValues.push(`%${keyword}%`, `%${keyword}%`); }
  if (submissionStatus) { submissionWhere.push("s.status = ?"); submissionValues.push(submissionStatus); }
  const submissions = (await db.rows(`
      SELECT
        s.id,
        s.status,
        s.submitted_at,
        s.updated_at,
        u.full_name AS student_name,
        u.mssv
      FROM submissions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE ${submissionWhere.join(" AND ")}
      ORDER BY CAST(s.updated_at AS DATETIME(3)) DESC, s.id DESC
      `, [...submissionValues])) as SubmissionRow[];

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)] shadow-slate-200/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{event.title}</h1>
            <p className="mt-1 text-sm text-blue-100/80">
              {formatDateTimeVN(event.start_at)} → {formatDateTimeVN(event.end_at)}
            </p>
          </div>

          <Link
            href={`/dashboard/class-officer/events${sp.termId ? `?termId=${encodeURIComponent(sp.termId)}` : ""}`}
            className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-50"
           data-back-link>
            <ArrowLeft size={16} />
            <span className="ml-2">Quay về</span>
          </Link>
        </div>
      </section>

<section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60"><h2 className="text-xl font-semibold">Thông tin đợt xét</h2><div className="mt-5 grid items-stretch gap-4 md:grid-cols-2"><div className="min-w-0 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 shadow-md shadow-slate-200/60"><h3 className="text-sm font-medium text-slate-600">Mô tả</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{event.description||"Chưa có mô tả."}</p></div><div className="min-w-0 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 shadow-md shadow-slate-200/60"><h3 className="mb-2 text-sm font-medium text-slate-600">Trạng thái tiếp nhận</h3><EventSubmissionPhaseBadge event={{status:event.status,startAt:event.start_at,endAt:event.end_at,allowLate:Boolean(event.allow_late)}}/></div></div></section>

      <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
        <div><EventSubmissionFilters /></div>

      <h2 className="mt-5 text-xl font-semibold text-slate-900">Hồ sơ sinh viên lớp</h2>

        <div data-table-frame className="mt-5 min-w-0 overflow-hidden rounded-none border border-slate-200 bg-white">
<PaginatedTable className="min-w-full table-fixed divide-y divide-slate-200" containerClassName="overflow-hidden rounded-none border border-slate-200" resultLabel="bản ghi">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-[30%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Sinh viên</th>
                <th className="w-[18%] px-4 py-3 text-left text-sm font-semibold text-slate-700">MSSV</th>
                <th className="w-[20%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Trạng thái</th>
                <th className="w-[22%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Cập nhật</th>
                <th className="w-[10%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Xem</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {submissions.length > 0 ? (
                submissions.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-4 text-sm font-semibold text-slate-900">{item.student_name}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{item.mssv}</td>
                    <td className="px-4 py-4">
                      <SubmissionStatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      {formatDateTimeVN(item.updated_at)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Link
                        href={`/dashboard/class-officer/reviews/${item.id}${sp.termId ? `?termId=${encodeURIComponent(sp.termId)}` : ""}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Xem
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                    Chưa có hồ sơ nào từ lớp.
                  </td>
                </tr>
              )}
            </tbody>
          </PaginatedTable>

</div>
    </section>
    <CriteriaDefinitionTable eventId={eventId}/>
</main>
  );
}
