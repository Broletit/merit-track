import Link from "next/link";
import { FileText } from "lucide-react";

type Props = {
  contentText: string | null;
  fileName: string | null;
  filePath: string | null;
};

export default function FacultyOfficerReviewEvidenceCard({
  contentText,
  fileName,
  filePath,
}: Props) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Mô tả minh chứng
          </div>

          <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
            {contentText || "Chưa có mô tả minh chứng."}
          </div>
        </div>

        <div className="flex flex-col items-start gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tệp minh chứng
          </div>

          {filePath ? (
            <Link
              href={filePath}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <FileText size={16} />
              Xem minh chứng
            </Link>
          ) : (
            <div className="text-sm text-slate-500">Chưa tải lên</div>
          )}

          {fileName ? (
            <div className="max-w-55 truncate text-xs text-slate-500">
              {fileName}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
