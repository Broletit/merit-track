import FacultyOfficerReviewEvidenceCard from "./FacultyOfficerReviewEvidenceCard";
import { AutoCriteriaBadge, AutoCriteriaMessage } from "@/components/shared/criteria/AutoCriteriaAchievement";

type Props = {
  code: string;
  title: string;
  description: string | null;
  autoPassed: boolean;
  autoMessage: string | null;
  contentText: string | null;
  fileName: string | null;
  filePath: string | null;
};

export default function FacultyOfficerReviewCriteriaItem({
  code,
  title,
  description,
  autoPassed,
  autoMessage,
  contentText,
  fileName,
  filePath,
}: Props) {
  const hasManualEvidence = Boolean(contentText?.trim() || filePath);

  return (
    <div className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900">
            {code}. {title}
          </div>

          <div className="mt-1 text-sm text-slate-500">
            {description || "Chưa có mô tả."}
          </div>
          {autoPassed ? <AutoCriteriaMessage message={autoMessage} /> : null}
        </div>

        {autoPassed ? (
          <AutoCriteriaBadge />
        ) : hasManualEvidence ? (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
            Có minh chứng
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
            Đã ghi nhận trong hồ sơ
          </span>
        )}
      </div>

      {autoPassed ? null : hasManualEvidence ? (
        <FacultyOfficerReviewEvidenceCard
          contentText={contentText}
          fileName={fileName}
          filePath={filePath}
        />
      ) : (
        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-100">
          <div className="font-semibold">Không có tệp minh chứng riêng</div>
          <p className="mt-1">
            {autoMessage || "Tiêu chí thuộc hồ sơ đã nộp nhưng dữ liệu cũ chưa lưu chi tiết nguồn đáp ứng. Người duyệt cần đối chiếu điều kiện và lịch sử hoạt động trước khi kết luận."}
          </p>
        </div>
      )}
    </div>
  );
}
