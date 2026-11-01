import PaginatedTable from "@/components/common/PaginatedTable";
type PreviewRow = string[];

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

  const columns = headers.map((header, columnIndex) => ({ header, columnIndex })).filter(({ header }) => {
    const label = header.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    return !["stt", "sothutu"].includes(label);
  });

  return (
    <div className="mt-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800">
          Preview dữ liệu từ file
        </h3>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
      <PaginatedTable data-no-row-number className="min-w-full text-sm" containerClassName="max-h-96 overflow-auto" resultLabel="dòng dữ liệu">
          <thead className="bg-white">
            <tr>
              {columns.map(({ header, columnIndex }) => (
                <th
                  key={columnIndex}
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
                {columns.map(({ columnIndex }) => (
                  <td
                    key={`${index}-${columnIndex}`}
                    className="px-4 py-3 text-slate-600"
                  >
                    {row[columnIndex] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </PaginatedTable>
      </div>
    </div>
  );
}