import NumberedTable from "@/components/common/NumberedTable";
import Link from "next/link";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import ReviewFilters from "@/components/shared/reviews/ReviewFilters";
import ReviewPagination from "@/components/shared/reviews/ReviewPagination";
import SubmissionStatusBadge from "@/components/shared/submissions/SubmissionStatusBadge";

export type ReviewRow = {
  id: number;
  eventTitle: string;
  studentName: string;
  studentCode: string;
  classCode: string;
  status: string;
  submittedAt: string | null;
  reviewRound: number;
};

export default function ClassOfficerReviewsTable({
  items,
  totalResults,
  page,
  totalPages,
  searchParams,
  eventOptions,
}: {
  items: ReviewRow[];
  totalResults: number;
  page: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
  eventOptions: Array<{ id: number; title: string }>;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <div>
        <ReviewFilters showSort={false} eventOptions={eventOptions} />
      </div>

      <div className="mt-5">
        <h2 className="text-xl font-semibold text-slate-900">
          Danh sách hồ sơ
        </h2>
        
      </div>

      <div data-table-frame className="mt-5 min-w-0 overflow-hidden rounded-none border border-slate-200 bg-white">
<div className="overflow-x-auto rounded-none border border-slate-200">
        <NumberedTable page={page} className="w-full min-w-0 table-fixed divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-[24%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Đợt xét
              </th>
              <th className="w-[19%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Sinh viên
              </th>
              <th data-column-align="left" className="w-[10%] px-4 py-3  text-sm font-semibold text-slate-700 text-left">
                Lớp
              </th>
              <th className="w-[11%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Vòng xét duyệt
              </th>
              <th className="w-[14%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Trạng thái
              </th>
              <th className="w-[12%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Cập nhật
              </th>
              <th className="w-[10%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
                Thao tác
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-4 align-top text-sm font-semibold text-slate-900">
                    {item.eventTitle}
                  </td>

                  <td className="px-4 py-4 align-top">
                    <div className="text-sm font-medium text-slate-800">
                      {item.studentName}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.studentCode}
                    </div>
                  </td>

                  <td data-column-align="left" className="px-4 py-4 align-top text-sm text-slate-700 text-left">
                    {item.classCode}
                  </td>

                  <td className="px-4 py-4 align-top">
                    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      Vòng {item.reviewRound}
                    </span>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <SubmissionStatusBadge status={item.status} reviewRound={item.reviewRound} />
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {item.submittedAt ? formatDateTimeVN(item.submittedAt) : "-"}
                  </td>

                  <td className="px-4 py-4 text-center align-top">
                    <div className="flex justify-center gap-2">
                      <Link
                        href={`/dashboard/class-officer/reviews/${item.id}?mode=view${searchParams.termId ? `&termId=${encodeURIComponent(searchParams.termId)}` : ""}`}
                        className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Xem
                      </Link>
                      {item.status === "submitted_v1" ? (
                        <Link
                          href={`/dashboard/class-officer/reviews/${item.id}?mode=review${searchParams.termId ? `&termId=${encodeURIComponent(searchParams.termId)}` : ""}#review-panel`}
                          className="inline-flex items-center rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          Duyệt
                        </Link>
                      ) : (
                        <button type="button" disabled className="inline-flex cursor-not-allowed items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-300 opacity-40">
                          Duyệt
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  Không có hồ sơ phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </NumberedTable>
      </div>
<div className="mt-5">
        <ReviewPagination totalResults={totalResults} resultLabel="hồ sơ"
          page={page}
          totalPages={totalPages}
          basePath="/dashboard/class-officer/reviews"
          searchParams={searchParams}
        />
      </div>
</div>
    </section>
  );
}
