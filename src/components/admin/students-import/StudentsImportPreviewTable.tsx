type PreviewRow = Record<string, string>;

export default function StudentsImportPreviewTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: PreviewRow[];
}) {
  if (!headers.length || !rows.length) {
    return null;
  }

  return (
    <div className="mt-5 rounded-2xl border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">
          Preview dữ liệu từ file
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Hiển thị tối đa 5 dòng đầu trong file CSV
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-white">
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="border-b border-slate-200 px-4 py-3 text-left font-semibold text-slate-700"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-slate-100 last:border-b-0">
                {headers.map((header) => (
                  <td
                    key={`${index}-${header}`}
                    className="px-4 py-3 text-slate-600"
                  >
                    {row[header] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}