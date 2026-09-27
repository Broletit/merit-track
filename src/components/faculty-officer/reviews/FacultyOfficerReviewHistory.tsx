type ReviewRow = {
  round: number;
  decision: string;
  note: string | null;
  reviewerName: string | null;
};

export default function FacultyOfficerReviewHistory({
  items,
}: {
  items: ReviewRow[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-xl font-semibold text-slate-900">
        Lịch sử duyệt
      </h2>

      <div className="mt-4 space-y-3">
        {items.map((review, index) => (
          <div
            key={index}
            className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
          >
            <div className="text-sm font-semibold text-slate-900">
              Vòng {review.round} -{" "}
              {review.decision === "approved"
                ? "Đã duyệt"
                : "Trả về chỉnh sửa"}
            </div>

            <div className="mt-1 text-sm text-slate-600">
              {review.note || "Không có phản hồi."}
            </div>

            {review.reviewerName ? (
              <div className="mt-1 text-xs text-slate-500">
                Người duyệt: {review.reviewerName}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}