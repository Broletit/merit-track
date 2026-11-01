"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Pencil, SquareX } from "lucide-react";
import CriteriaTable from "@/components/shared/criteria/CriteriaTable";
import CriteriaGroupsPagination from "@/components/shared/criteria/CriteriaGroupsPagination";
import { AutoCriteriaMessage } from "@/components/shared/criteria/AutoCriteriaAchievement";
import { preserveDialogScroll } from "@/lib/ui/dialogScroll";
type CriteriaItem = {
  code: string;
  title: string;
  description: string | null;
  group_code: string;
  group_title: string;
  min_required?: number;
  evidence_type: string;
  is_required: number;
  auto_passed: number | null;
  auto_message: string | null;
  content_text: string | null;
  file_count: number;
  review_decision: string | null;
  review_round: number | null;
  files: Array<{ id: number; fileName: string; mimeType: string }>;
};


function getEvidenceStatus(item: CriteriaItem) {
  const autoPassed = Number(item.auto_passed ?? 0) === 1;
  const fileCount = Number(item.file_count ?? 0);
  const hasContent = String(item.content_text ?? "").trim().length > 0;

  if (autoPassed) return "Đã đạt";
  if (item.review_decision === "pass") return `Đạt vòng ${item.review_round}`;
  if (item.review_decision === "fail") return `Chưa đạt vòng ${item.review_round}`;
  if (fileCount > 0 || hasContent) return "Đã nộp minh chứng";
  return "Cần bổ sung minh chứng";
}

function getEvidenceClass(item: CriteriaItem) {
  const label = getEvidenceStatus(item);

  if (label === "Đã đạt" || label.startsWith("Đạt vòng")) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (label === "Đã nộp minh chứng") {
    return "bg-blue-50 text-blue-700 ring-blue-100";
  }

  if (label.startsWith("Chưa đạt vòng")) return "bg-rose-50 text-rose-700 ring-rose-100";
  return "bg-amber-50 text-amber-700 ring-amber-100";
}


export default function StudentSubmissionCriteriaList({ items, editable, editHref }: {
  items: CriteriaItem[]; editable: boolean; editHref?: string;
}) {
  const groups = Array.from(new Map(items.map(item => [item.group_code, item.group_title])).entries());
  const [viewedEvidence, setViewedEvidence] = useState<{code: string; content: string} | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    preserveDialogScroll(() => {
      if (viewedEvidence && !dialog.current?.open) dialog.current?.showModal();
      if (!viewedEvidence) dialog.current?.close();
    });
  }, [viewedEvidence]);
  return <section className="min-w-0 rounded-3xl bg-white p-4 shadow-md ring-1 ring-slate-100 sm:p-6 shadow-slate-200/60">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold text-slate-900">Chi tiết tiêu chí</h2>
      {editable && editHref ? <Link href={editHref} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Pencil size={15}/>Chỉnh sửa</Link> : null}
    </div>
    <CriteriaGroupsPagination totalGroups={groups.length} className="mt-6">
      {groups.map(([groupCode, groupTitle]) => {
        const groupItems = items.filter(item => item.group_code === groupCode);
        return <div key={groupCode} className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-blue-700 bg-blue-50 px-4 py-3"><h3 className="text-base font-semibold text-blue-950">{groupCode}. {groupTitle}</h3><p className="text-sm font-medium text-blue-900">Yêu cầu: Đạt tối thiểu {Math.max(Number(groupItems[0]?.min_required ?? 0),groupItems.filter(item=>Number(item.is_required)===1).length)}/{groupItems.length} tiêu chí</p></div>
          <CriteriaTable className="w-full! min-w-0! table-fixed! [&_th]:whitespace-nowrap! [&_td]:whitespace-normal!  [&_td_div]:whitespace-normal!  [&_td]:[overflow-wrap:anywhere] [&_td_*]:min-w-0 [&_td_*]:max-w-full divide-y divide-slate-200 [&_tr::before]:w-auto! [&_tr::before]:text-xs! [&_tr::before]:px-1! sm:[&_tr::before]:px-2!" containerClassName="overflow-x-auto rounded-none!">
            <colgroup><col style={{width:"8%"}}/><col style={{width:"8%"}}/><col style={{width:"34%"}}/><col style={{width:"12%"}}/><col style={{width:"22%"}}/><col style={{width:"16%"}}/></colgroup>
            <thead className="bg-blue-800 text-white"><tr>
              <th className="px-1 py-3 text-center text-sm font-semibold whitespace-nowrap break-words sm:px-3">Mã</th>
              <th data-column-align="left" className="px-1 py-3 text-left text-sm font-semibold whitespace-nowrap break-words sm:px-3">Tiêu chí</th>
              <th className="px-1 py-3 text-center text-sm font-semibold whitespace-nowrap break-words sm:px-3">Bắt buộc</th>
              <th className="px-1 py-3 text-center text-sm font-semibold whitespace-nowrap break-words sm:px-3">Trạng thái</th>
              <th className="px-1 py-3 text-center text-sm font-semibold whitespace-nowrap break-words sm:px-3">Minh chứng</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 bg-white">{groupItems.map(item => <tr key={item.code} className="even:bg-slate-50/60 hover:bg-blue-50/50 transition-colors">
              <td className="px-1 py-4 sm:px-3 text-center text-sm font-medium text-slate-900">{item.code}</td>
              <td data-column-align="left" className="px-1 py-4 sm:px-3 text-left text-sm text-slate-900">
                <div className="whitespace-normal! break-words font-medium leading-6">{item.title}</div>
                {item.description ? <div className="mt-1 whitespace-normal! break-words text-sm leading-6 text-slate-500">{item.description}</div> : null}
                {Number(item.auto_passed) === 1 ? <div className="[&_*]:whitespace-normal! [&_*]:break-words"><AutoCriteriaMessage message={item.auto_message}/></div> : null}
              </td>
              <td className="px-1 py-4 sm:px-3 text-center text-sm"><span className={"inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1 " + (Number(item.is_required) === 1 ? "bg-rose-50 text-rose-700 ring-rose-100" : "bg-slate-100 text-slate-600 ring-slate-100")}>{Number(item.is_required) === 1 ? "Có" : "Không"}</span></td>
              <td className="px-1 py-4 sm:px-3 text-center text-sm"><span className={"inline-flex max-w-full items-center justify-center whitespace-nowrap! rounded-full px-3 py-1 text-xs font-semibold leading-5 ring-1 " + getEvidenceClass(item)}>{getEvidenceStatus(item)}</span></td>
              <td className="px-1 py-4 sm:px-3 text-center text-sm"><div className="flex flex-col items-center gap-2">
                {item.content_text?.trim() ? <button type="button" onClick={() => setViewedEvidence({code:item.code, content:item.content_text!})} className="h-auto! min-h-0! border-0! bg-transparent! p-0! rounded-none! text-sm! font-medium! text-blue-700! whitespace-normal! break-words underline underline-offset-2 hover:text-blue-900">Xem nội dung</button> : null}
                {item.files.map((file,index) => <a key={file.id} href={"/api/submissions/files/" + file.id} target="_blank" rel="noopener noreferrer" title={file.fileName} className="h-auto! min-h-0! border-0! bg-transparent! p-0! rounded-none! text-sm! font-medium! text-blue-700! block! max-w-full whitespace-nowrap! break-words underline underline-offset-2 hover:text-blue-900">{item.files.length === 1 ? "Xem minh chứng" : "Minh chứng " + (index+1)}</a>)}
                {!item.content_text?.trim() && !item.files.length ? <span className="text-slate-400">—</span> : null}
              </div></td>
            </tr>)}</tbody>
          </CriteriaTable>
        </div>;
      })}
      {!items.length ? <p className="text-sm text-slate-500">Chưa có tiêu chí.</p> : null}
    </CriteriaGroupsPagination>
    <dialog ref={dialog} aria-label="Nội dung minh chứng" onCancel={() => setViewedEvidence(null)} onClose={() => setViewedEvidence(null)} onClick={event => {if(event.target === event.currentTarget) setViewedEvidence(null);}} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-xl rounded-2xl border-0 bg-white p-5 shadow-xl backdrop:bg-slate-900/50">
      <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-slate-900">Minh chứng {viewedEvidence?.code}</h3><button type="button" onClick={() => setViewedEvidence(null)} aria-label="Đóng minh chứng" className="inline-flex h-10! w-10! min-h-10! min-w-10! shrink-0 items-center justify-center rounded-md! border-0! bg-transparent! p-0! text-red-500! shadow-none! transition-colors hover:bg-red-50! hover:text-red-700! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:opacity-50"><SquareX size={24} strokeWidth={1.75}/></button></div>
      <div className="mt-4 max-h-[65dvh] overflow-y-auto whitespace-pre-wrap break-words text-sm text-slate-700">{viewedEvidence?.content}</div>
    </dialog>
  </section>;
}
