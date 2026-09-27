import FacultyOfficerReviewCriteriaItem from "./FacultyOfficerReviewCriteriaItem";

type Item = {
  code: string;
  title: string;
  description: string | null;
  group_code: string;
  group_title: string;
  auto_passed: number | null;
  auto_message: string | null;
  content_text: string | null;
  file_name: string | null;
  file_path: string | null;
};

export default function FacultyOfficerReviewCriteriaList({
  items,
}: {
  items: Item[];
}) {
  const grouped = items.reduce<Record<string, Item[]>>((acc, item) => {
    const key = `${item.group_code}. ${item.group_title}`;
    acc[key] = acc[key] ?? [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Nội dung hồ sơ</h2>
        <p className="mt-1 text-sm text-slate-500">
          Danh sách tiêu chuẩn và minh chứng sinh viên đã nộp.
        </p>
      </div>

      <div className="mt-5 space-y-5">
        {Object.entries(grouped).map(([groupTitle, groupItems]) => (
          <div
            key={groupTitle}
            className="overflow-hidden rounded-2xl border border-slate-200"
          >
            <div className="bg-slate-50 px-5 py-4 font-semibold text-slate-900">
              {groupTitle}
            </div>

            <div className="divide-y divide-slate-100">
              {groupItems.map((item) => (
                <FacultyOfficerReviewCriteriaItem
                  key={item.code}
                  code={item.code}
                  title={item.title}
                  description={item.description}
                  autoPassed={Number(item.auto_passed ?? 0) === 1}
                  autoMessage={item.auto_message}
                  contentText={item.content_text}
                  fileName={item.file_name}
                  filePath={item.file_path}
                />
              ))}
            </div>
          </div>
        ))}

        {items.length === 0 ? (
          <div className="rounded-xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            Không thể tải cấu trúc tiêu chí của đợt xét. Vui lòng kiểm tra bộ tiêu chuẩn được gắn với đợt xét này.
          </div>
        ) : null}
      </div>
    </section>
  );
}
