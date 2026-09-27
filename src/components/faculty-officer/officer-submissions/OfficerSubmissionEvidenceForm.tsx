"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { saveOfficerSubmissionEvidence } from "@/server/actions/officer-submissions/saveOfficerSubmissionEvidence";
import { submitOfficerSubmission } from "@/server/actions/officer-submissions/submitOfficerSubmission";
import ActionFeedback from "@/components/shared/ActionFeedback";
import { AutoCriteriaMessage } from "@/components/shared/criteria/AutoCriteriaAchievement";
import { getUserFacingActionError } from "@/lib/errors/getUserFacingActionError";

type Item = {
  code: string;
  title: string;
  description: string | null;
  group_code: string;
  group_title: string;
  min_required: number;
  score_max: number;
  is_required: number;
  auto_passed: number | null;
  auto_message: string | null;
  content_text: string | null;
  file_name: string | null;
  file_path: string | null;
  file_count: number;
  auto_score: number;
  matched_activity_titles: string | null;
  review_decision: string | null;
};

const allowedFileExtensions = [".pdf", ".png"];
const maxFileSize = 10 * 1024 * 1024;
const maxRequestFileSize = 45 * 1024 * 1024;
type FileState = Record<string, { name: string; error: string }>;

export default function OfficerSubmissionEvidenceForm({
  submissionId,
  canEdit,
  items,
}: {
  submissionId: number;
  canEdit: boolean;
  items: Item[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const [fileStates, setFileStates] = useState<FileState>({});

  const groups = Array.from(
    new Map(
      items.map((item) => [
        item.group_code,
        { code: item.group_code, title: item.group_title, minRequired: Number(item.min_required) },
      ])
    ).values()
  );
  const evidenceNotNeeded=(item:Item)=>Number(item.is_required)!==1&&items.filter(candidate=>candidate.group_code===item.group_code&&Number(candidate.auto_passed)===1).length>=Number(item.min_required);

  function handleFileChange(criteriaCode: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      setFileStates((current) => ({ ...current, [criteriaCode]: { name: "", error: "" } }));
      return;
    }

    const extension = file.name.includes(".")
      ? `.${file.name.split(".").pop()?.toLowerCase()}`
      : "";
    let error = "";
    if (!allowedFileExtensions.includes(extension)) {
      error = "Định dạng không hợp lệ. Minh chứng chỉ chấp nhận tệp PDF hoặc PNG.";
    } else if (file.size > maxFileSize) {
      error = "Tệp vượt quá dung lượng tối đa 10 MB.";
    }

    if (error) {
      event.currentTarget.value = "";
      setFileStates((current) => ({ ...current, [criteriaCode]: { name: file.name, error } }));
      toast.error(error, { id: `officer-evidence-file-${criteriaCode}` });
      return;
    }

    setFileStates((current) => ({ ...current, [criteriaCode]: { name: file.name, error: "" } }));
  }

  function handleSave(formData: FormData) {
    setMessage("");

    const totalFileSize=[...formData.values()].reduce((total,value)=>total+(value instanceof File?value.size:0),0);
    if(totalFileSize>maxRequestFileSize){setOk(false);setMessage("Tổng dung lượng các tệp trong một lần lưu không được vượt quá 45 MB. Vui lòng lưu thành nhiều lần.");return;}

    startTransition(async () => {
      try {
        const result = await saveOfficerSubmissionEvidence(submissionId, formData);
        setOk(true);
        setMessage(result.message || "Đã lưu minh chứng.");
        setFileStates({});
        router.refresh();
      } catch (error) {
        setOk(false);
        setMessage(getUserFacingActionError(error, "Không thể lưu minh chứng."));
      }
    });
  }

  function handleSubmit() {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await submitOfficerSubmission(submissionId);
        setOk(true);
        setMessage(result.message || "Đã hoàn tất hồ sơ.");
        router.refresh();
      } catch (error) {
        setOk(false);
        setMessage(error instanceof Error ? error.message : "Không thể hoàn tất hồ sơ.");
      }
    });
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <ActionFeedback pending={pending} message={message} ok={ok} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Minh chứng hồ sơ</h2>

        {!canEdit ? (
          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
            Hồ sơ không ở trạng thái chỉnh sửa
          </span>
        ) : null}
      </div>

      <form action={handleSave} className="mt-5 space-y-5">
        {groups.map((group) => {
          const groupItems = items.filter((item) => item.group_code === group.code);

          return (
            <div key={group.code} className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-5 py-4">
                <h3 className="text-base font-semibold text-slate-900">
                  {group.code}. {group.title}
                </h3>
                <div className="flex flex-wrap items-center gap-3"><span className="text-xs font-semibold text-blue-700">Cần đạt tối thiểu {group.minRequired}/{groupItems.length} tiêu chí</span><span className="text-sm font-bold text-emerald-700">
                  Đã đạt {groupItems.reduce((total, item) => {
                    const passed = Number(item.auto_passed ?? 0) === 1 || Boolean(item.content_text?.trim()) || Number(item.file_count) > 0;
                    const awarded = Number(item.auto_passed ?? 0) === 1
                      ? Math.min(Number(item.score_max), Number(item.auto_score) || Number(item.score_max))
                      : Number(item.score_max);
                    return total + (passed ? awarded : 0);
                  }, 0)}/{groupItems.reduce((total, item) => total + Number(item.score_max), 0)} điểm
                </span></div>
              </div>

              <div className="divide-y divide-slate-100">
                {groupItems.map((item) => {
                  const autoPassed = Number(item.auto_passed ?? 0) === 1;
                  const hasEvidence = Boolean(item.content_text?.trim()) || Number(item.file_count) > 0;
                  const awardedScore = autoPassed
                    ? Math.min(Number(item.score_max), Number(item.auto_score) || Number(item.score_max))
                    : Number(item.score_max);
                  return (
                    <div key={item.code} className="p-5">
                      <input type="hidden" name="criteriaCode" value={item.code} />

                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900">
                            {item.code}. {item.title}
                          </div>

                          <div className="mt-1 text-sm text-slate-500">
                            {item.description || "Chưa có mô tả"}
                          </div>

                        </div>

                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-xs font-medium">
                            <span className={Number(item.is_required) === 1 ? "rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-700" : "rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600"}>
                              {Number(item.is_required) === 1 ? "Bắt buộc" : "Không bắt buộc"}
                            </span>
                            <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                              Tối đa {Number(item.score_max ?? 0)} điểm
                            </span>
                            {autoPassed ? (
                              <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                                +{awardedScore} điểm
                              </span>
                            ) : item.review_decision === "pass" ? (
                              <span className="rounded bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">Đạt</span>
                            ) : item.review_decision === "fail" ? (
                              <span className="rounded bg-rose-50 px-3 py-1 font-semibold text-rose-700">Chưa đạt</span>
                            ) : evidenceNotNeeded(item) ? (
                              <span className="rounded bg-slate-100 px-3 py-1 font-semibold text-slate-600">Không cần bổ sung</span>
                            ) : hasEvidence ? (
                              <span className="rounded bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                                Đã nộp minh chứng
                              </span>
                            ) : (
                              <span className="rounded bg-amber-50 px-3 py-1 font-semibold text-amber-700">
                                Cần minh chứng
                              </span>
                            )}
                          </div>
                      </div>

                      {autoPassed ? (
                        <AutoCriteriaMessage
                          message={item.auto_message || "Điểm rèn luyện đã được ghi nhận"}
                          matchedActivityTitles={item.matched_activity_titles}
                        />
                      ) : (
                        <div className="mt-4 space-y-3">
                          <textarea
                            name={`note_${item.code}`}
                            disabled={!canEdit || pending || evidenceNotNeeded(item)}
                            defaultValue={item.content_text ?? ""}
                            rows={3}
                            placeholder="Nhập mô tả minh chứng..."
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50"
                          />

                          <div className={`rounded-xl border p-3 ${fileStates[item.code]?.error ? "border-red-500 bg-red-50" : fileStates[item.code]?.name ? "border-emerald-500 bg-emerald-50" : item.file_name ? "border-blue-300 bg-blue-50/50" : "border-slate-200 bg-slate-50"}`}>
                            <div className="flex flex-wrap items-center gap-3">
                            <label className={`flex cursor-pointer items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold ${canEdit ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-400"}`}>
                              <Upload size={14} />
                              Tải tệp
                              <input
                                type="file"
                                name={`file_${item.code}`}
                                accept=".pdf,.png,application/pdf,image/png"
                                disabled={!canEdit || pending || evidenceNotNeeded(item)}
                                className="hidden"
                                aria-invalid={Boolean(fileStates[item.code]?.error)}
                                onChange={(event) => handleFileChange(item.code, event)}
                              />
                            </label>

                            <div className="min-w-0 flex-1 text-xs text-slate-600">
                              <span className="truncate">
                                {fileStates[item.code]?.name || item.file_name || "Chưa có tệp được chọn"}
                              </span>
                            </div>
                            </div>
                            {fileStates[item.code]?.error ? (
                              <p className="mt-2 text-xs font-medium text-red-700">{fileStates[item.code].error}</p>
                            ) : (
                              <p className="mt-2 text-xs text-slate-500">Chỉ nhận PDF hoặc PNG; dung lượng tối đa 10 MB.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}


        {canEdit ? <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
          >
            {pending ? "Đang lưu..." : "Lưu minh chứng"}
          </button>
        </div> : null}
      </form>

      {canEdit ? (
        <div className="mt-5 flex justify-end rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <button
            type="button"
            disabled={pending}
            onClick={handleSubmit}
            className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
          >
            {pending ? "Đang gửi..." : "Hoàn tất hồ sơ"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
