import { getDatabase } from "@/server/db/mysql";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";

export default async function SubmissionSupportCard({ submissionId, isDraft = false }: { submissionId: number; isDraft?: boolean }) {
  const request = (await getDatabase().first("SELECT sr.note,sr.updated_at,s.status submission_status FROM submission_support_requests sr JOIN submissions s ON s.id=sr.submission_id WHERE sr.submission_id=? AND sr.status='open' LIMIT 1", [submissionId])) as {note:string;updated_at:string;submission_status:string}|undefined;
  if (!request) return null;
  return <section className="min-w-0 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 sm:p-6 shadow-md shadow-slate-200/60">
    <h2 className="text-lg font-semibold text-amber-900">Yêu cầu hỗ trợ</h2>
    {isDraft ? <p className="mt-1 text-sm text-amber-800">{request.submission_status === 'failed' ? 'Hồ sơ chưa nộp xét duyệt và đã được chốt không đạt khi đợt xét kết thúc.' : 'Đây là tin nhắn hỗ trợ, không phải lượt nộp xét duyệt. Bạn vẫn có thể tự chỉnh sửa khi đợt xét còn nhận hồ sơ.'}</p> : null}
    <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-800">{request.note}</p>
    <p className="mt-3 text-xs text-amber-800">Gửi yêu cầu: {formatDateTimeVN(request.updated_at)}</p>
  </section>;
}
