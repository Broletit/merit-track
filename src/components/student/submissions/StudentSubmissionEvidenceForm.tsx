"use client";
import RequiredMark from "@/components/common/RequiredMark";


import { useActionState, useState, type ChangeEvent } from "react";
import { Upload } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { saveStudentSubmissionEvidence } from "@/server/actions/submissions/saveStudentSubmissionEvidence";
import { submitStudentSubmission } from "@/server/actions/submissions/submitStudentSubmission";
import { requestSubmissionSupport } from "@/server/actions/submissions/requestSubmissionSupport";
import ActionFeedback from "@/components/shared/ActionFeedback";
import { AutoCriteriaBadge, AutoCriteriaMessage } from "@/components/shared/criteria/AutoCriteriaAchievement";
import { getUserFacingActionError } from "@/lib/errors/getUserFacingActionError";

type CriteriaItem = {
  code: string;
  title: string;
  description: string | null;
  groupCode: string;
  groupTitle: string;
  minRequired: number;
  isRequired: boolean;
  autoPassed: boolean;
  autoMessage: string | null;
  contentText: string | null;
  fileName: string | null;
};

type State = {
  ok: boolean;
  message: string;
};

const initialState: State = { ok: false, message: "" };
const allowedFileExtensions = [".pdf", ".png"];
const maxFileSize = 10 * 1024 * 1024;
const maxRequestFileSize = 45 * 1024 * 1024;
type FileState = Record<string, { name: string; error: string }>;

export default function StudentSubmissionEvidenceForm({
  submissionId,
  criteria,
  canEdit,
}: {
  submissionId: number;
  criteria: CriteriaItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [fileStates, setFileStates] = useState<FileState>({});
  const [missingEvidence, setMissingEvidence] = useState<string[]>([]);
  const [groupErrors, setGroupErrors] = useState<Record<string, string>>({});

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
      toast.error(error, { id: `evidence-file-${criteriaCode}` });
      return;
    }

    setFileStates((current) => ({ ...current, [criteriaCode]: { name: file.name, error: "" } }));
    toast.success(`Tệp “${file.name}” hợp lệ và sẵn sàng tải lên.`, { id: `evidence-file-${criteriaCode}` });
  }

  async function saveAction(_prev: State, formData: FormData): Promise<State> {
    const totalFileSize=[...formData.values()].reduce((total,value)=>total+(value instanceof File?value.size:0),0);
    if(totalFileSize>maxRequestFileSize)return {ok:false,message:"Tổng dung lượng các tệp trong một lần lưu không được vượt quá 45 MB. Vui lòng lưu thành nhiều lần."};
    try {
      const result = await saveStudentSubmissionEvidence(submissionId, formData);
      setFileStates({});
      setMissingEvidence([]);
      setGroupErrors({});
      router.refresh();
      return { ok: true, message: result.message };
    } catch (error) {
      return {
        ok: false,
        message: getUserFacingActionError(error, "Không thể lưu minh chứng."),
      };
    }
  }

  async function submitAction(): Promise<State> {
    try {
      const result = await submitStudentSubmission(submissionId);
      if (!result.ok && "missingCriteria" in result) {
        const missing = (result.missingCriteria ?? []).map(item => item.code);
        const deficientGroups = result.deficientGroups ?? [];
        setMissingEvidence(missing);
        setGroupErrors(Object.fromEntries(deficientGroups.map(group => [group.code, `Cần có tệp minh chứng cho ít nhất ${group.required} tiêu chí; hiện có ${group.achieved}.`])));
        const first = missing[0] || criteria.find(item => deficientGroups.some(group => group.code === item.groupCode) && !item.autoPassed && !item.fileName)?.code;
        if (first) requestAnimationFrame(() => document.getElementById(`criterion-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
        return { ok: false, message: "" };
      }
      setMissingEvidence([]);
      setGroupErrors({});
      router.refresh();
      return { ok: true, message: result.message };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error ? error.message : "Gửi hồ sơ thất bại.",
      };
    }
  }
  async function supportAction(
    _prev: State,
    formData: FormData
  ): Promise<State> {
    try {
      const result = await requestSubmissionSupport(submissionId, formData);
      toast.success(result.message, { id: `submission-support-${submissionId}` });
      router.refresh();
      return { ok: true, message: "" };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể gửi yêu cầu hỗ trợ.",
      };
    }
  }

  const [saveState, saveFormAction, saving] = useActionState(
    saveAction,
    initialState
  );
  const [submitState, submitFormAction, submitting] = useActionState(
    submitAction,
    initialState
  );
  const [supportState,supportFormAction,supporting]=useActionState(supportAction,initialState);

  const grouped = criteria.reduce<Record<string, CriteriaItem[]>>((acc, item) => {
    const key = `${item.groupCode}. ${item.groupTitle}`;
    acc[key] = acc[key] ?? [];
    acc[key].push(item);
    return acc;
  }, {});
  const evidenceNotNeeded=(item:CriteriaItem)=>!item.isRequired&&criteria.filter(candidate=>candidate.groupCode===item.groupCode&&candidate.autoPassed).length>=Math.max(item.minRequired,criteria.filter(candidate=>candidate.groupCode===item.groupCode&&candidate.isRequired).length);

  return (
    <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <ActionFeedback pending={saving} message={saveState.message} ok={saveState.ok} />
      <ActionFeedback pending={submitting} message={submitState.message} ok={submitState.ok} />
      <ActionFeedback pending={supporting} message={supportState.message} ok={supportState.ok} />
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Minh chứng hồ sơ
          </h2>
        </div>

        {!canEdit && (
          <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-500">
            Không thể chỉnh sửa
          </span>
        )}
      </div>

      <form action={saveFormAction} className="mt-5 space-y-5">
        {Object.entries(grouped).map(([groupTitle, items]) => (
            <div
              key={groupTitle}
              className="overflow-hidden rounded-none border border-slate-200"
            >            
           {groupErrors[items[0]?.groupCode] && <p role="alert" className="bg-red-50 px-5 py-3 text-sm text-red-700">{groupErrors[items[0].groupCode]}</p>}
           <div className="flex flex-wrap items-center justify-between gap-2 border-l-4 border-blue-700 bg-blue-50 px-5 py-3 font-semibold text-blue-950">
              <span>{groupTitle}</span>
              <span className="text-xs font-semibold text-blue-700">Yêu cầu: Đạt tối thiểu {Math.max(items[0]?.minRequired ?? 0,items.filter(item=>item.isRequired).length)}/{items.length} tiêu chí</span>
            </div>

            <div className="divide-y divide-slate-100">
                {items.map((item) => (
                <div key={item.code} id={`criterion-${item.code}`} className="scroll-mt-24 p-5">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">
                        {item.code}. {item.title}<RequiredMark required={item.isRequired && !item.autoPassed} />
                      </div>
                      <div className="text-sm text-slate-500 mt-1">
                        {item.description || "Chưa có mô tả"}
                      </div>
                    </div>

                    {item.autoPassed ? (
                      <AutoCriteriaBadge />
                    ) : evidenceNotNeeded(item) ? (
                      <span className="text-xs font-semibold text-slate-500">Không cần bổ sung</span>
                    ) : item.fileName ? (
                      <span className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                        Đã nộp minh chứng
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 font-semibold">
                        Cần minh chứng
                      </span>
                    )}
                  </div>

                  {/* AUTO */}
                  {item.autoPassed ? (
                    <AutoCriteriaMessage message={item.autoMessage} />
                  ) : (
                    <div className="mt-4 space-y-3">
                      <input type="hidden" name="criteriaCode" value={item.code} />

                      <textarea
                        name={`note_${item.code}`}
                        defaultValue={item.contentText ?? ""}
                        placeholder="Nhập mô tả minh chứng..."
                        disabled={!canEdit || evidenceNotNeeded(item)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50"

                      />

                      <div
                        className={`rounded-none border p-3 ${
                          fileStates[item.code]?.error
                            ? "border-red-500 bg-red-50"
                            : fileStates[item.code]?.name
                              ? "border-emerald-500 bg-emerald-50"
                              : item.fileName
                                ? "border-blue-300 bg-blue-50/50"
                              : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="flex flex-wrap items-stretch gap-3">
                        {/* upload nhỏ */}
                        <label
                          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                            canEdit
                              ? "bg-blue-700 text-white"
                              : "bg-slate-200 text-slate-400"
                          }`}
                        >
                          <Upload size={14} />
                          Tải tệp
                          <input
                            type="file"
                            name={`file_${item.code}`}
                            accept=".pdf,.png,application/pdf,image/png"
                            className="hidden"
                            disabled={!canEdit || evidenceNotNeeded(item)}
                            aria-invalid={Boolean(fileStates[item.code]?.error) || missingEvidence.includes(item.code)}
                            aria-describedby={missingEvidence.includes(item.code) ? `evidence-error-${item.code}` : undefined}
                            onChange={(event) => handleFileChange(item.code, event)}
                          />
                        </label>

                        {/* tên file */}
                        <div className="flex min-w-0 flex-1 items-center text-xs text-slate-600">
                          <span className="truncate">
                            {fileStates[item.code]?.name || item.fileName || "Chưa có tệp được chọn"}
                          </span>
                        </div>
                        </div>
                        {missingEvidence.includes(item.code) && <p id={`evidence-error-${item.code}`} role="alert" className="mt-2 text-xs font-medium text-red-700">Vui lòng tải và lưu tệp minh chứng bắt buộc trước khi hoàn tất hồ sơ.</p>}
                        {fileStates[item.code]?.error ? (
                          <p className="mt-2 text-xs font-medium text-red-700">
                            {fileStates[item.code].error}
                          </p>
                        ) : (
                          <p className="mt-2 text-xs text-slate-500">
                            Chỉ nhận PDF hoặc PNG; dung lượng tối đa 10 MB.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canEdit || saving}
            className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : "Lưu minh chứng"}
          </button>
        </div>

      </form>

      <div className="mt-5 grid gap-4 rounded-none border border-amber-200 bg-amber-50/60 p-4 lg:grid-cols-[1fr_auto] shadow-md shadow-slate-200/60">
      <form action={supportFormAction} className="flex flex-col items-start gap-3 sm:flex-row"><label className="required-field-control w-full min-w-0 flex-1"><span className="mb-2 block text-sm font-medium text-slate-600">Nội dung cần hỗ trợ<RequiredMark required={true}/></span><textarea name="supportNote" required minLength={10} placeholder="Mô tả tiêu chí hoặc minh chứng bạn cần khoa hỗ trợ..." className="min-h-20 flex-1 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"/></label><button disabled={!canEdit||supporting} className="shrink-0 self-end sm:self-start sm:mt-7 rounded-xl border border-amber-500 bg-white px-4 py-2.5 text-sm font-semibold text-amber-800 disabled:opacity-60">{supporting?"Đang gửi...":"Cần hỗ trợ"}</button></form>
      <form action={submitFormAction} className="flex items-end justify-end">
        <button
          disabled={!canEdit || submitting}
          className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Đang gửi..." : "Hoàn tất hồ sơ"}
        </button>
      </form>
      </div>

    </section>
  );
}
