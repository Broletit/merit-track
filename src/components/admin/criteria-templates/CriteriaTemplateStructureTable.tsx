
"use client";
import CriteriaTable from "@/components/shared/criteria/CriteriaTable";
import CriteriaGroupsPagination from "@/components/shared/criteria/CriteriaGroupsPagination";

import useConfirmation from "@/components/shared/useConfirmation";

import { useLayoutEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { deleteCriteriaGroup } from "@/server/actions/criteria-templates/deleteCriteriaGroup";
import { deleteCriteriaItem } from "@/server/actions/criteria-templates/deleteCriteriaItem";
import ActionFeedback from "@/components/shared/ActionFeedback";
import CriteriaInlineItemCreateForm from "./CriteriaInlineItemCreateForm";
import type {
  CriteriaTemplateActivityOption,
  CriteriaTemplateCriteriaItem,
  CriteriaTemplateGroupItem,
} from "./types";



export default function CriteriaTemplateStructureTable({
  templateId,
  templateForType,
  groups,
  criteria,
  activities,
  saveControl,
  onDataChanged,
  editingGroupCode,
  onEditGroup,
  onCancelGroupEdit,
  onAddGroup,
  groupForm,
}: {
  templateId: number;
  templateForType: string;
  groups: CriteriaTemplateGroupItem[];
  criteria: CriteriaTemplateCriteriaItem[];
  activities: CriteriaTemplateActivityOption[];
  saveControl?: ReactNode;
  onDataChanged?: () => void;
  editingGroupCode?: string | null;
  onEditGroup?: (group: CriteriaTemplateGroupItem) => void;
  onCancelGroupEdit?: () => void;
  onAddGroup?: () => void;
  groupForm?: ReactNode;
}) {
  const isOfficer = templateForType === "officer";
  const [editingItem, setEditingItem] =
    useState<CriteriaTemplateCriteriaItem | null>(null);
  const [addingGroupCode, setAddingGroupCode] = useState<string | null>(null);
  const [criteriaPages, setCriteriaPages] = useState<Record<string, number>>({});
  const structureRef = useRef<HTMLElement>(null);
  const previousCriteriaPages = useRef<Record<string, number>>({});
  const [deletePending, startDeleteTransition] = useTransition();
  const { confirm, modal } = useConfirmation();
  const [feedback, setFeedback] = useState({ message: "", ok: false });

  useLayoutEffect(() => {
    const changedCode = Object.keys(criteriaPages).find(code => criteriaPages[code] !== previousCriteriaPages.current[code]);
    previousCriteriaPages.current = criteriaPages;
    if (!changedCode) return;
    const group = Array.from(structureRef.current?.querySelectorAll<HTMLElement>("[data-criteria-group-code]") ?? [])
      .find(element => element.dataset.criteriaGroupCode === changedCode);
    group?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }, [criteriaPages]);

  async function handleDeleteGroup(group: CriteriaTemplateGroupItem) {
    const reason = await confirm({ title: 'Xác nhận xóa', message: `Xóa tiêu chuẩn ${group.code}? Các tiêu chí con cũng sẽ bị xóa.`, confirmLabel: 'Xác nhận xóa', requireReason: true });
    if (reason === null) return;
    const formData=new FormData();formData.set("reason",reason);

    startDeleteTransition(async () => {
      try {
        await deleteCriteriaGroup(templateId, group.code,formData);
        onDataChanged?.();
        setFeedback({ message: "Xóa tiêu chuẩn thành công.", ok: true });
        if (editingGroupCode === group.code) onCancelGroupEdit?.();
      } catch (error) {
        setFeedback({ message: error instanceof Error ? error.message : "Xóa tiêu chuẩn thất bại.", ok: false });
      }
    });
  }

  async function handleDeleteItem(item: CriteriaTemplateCriteriaItem) {
    const reason = await confirm({ title: 'Xác nhận xóa', message: `Xóa tiêu chí ${item.code}?`, confirmLabel: 'Xác nhận xóa', requireReason: true });
    if (reason === null) return;
    const formData=new FormData();formData.set("reason",reason);

    startDeleteTransition(async () => {
      try {
        await deleteCriteriaItem(templateId, item.code,formData);
        onDataChanged?.();
        setFeedback({ message: "Xóa tiêu chí thành công.", ok: true });
        if (editingItem?.code === item.code) setEditingItem(null);
      } catch (error) {
        setFeedback({ message: error instanceof Error ? error.message : "Xóa tiêu chí thất bại.", ok: false });
      }
    });
  }

  return (
    <section ref={structureRef} className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      {modal}
      <ActionFeedback pending={deletePending} message={feedback.message} ok={feedback.ok} />
      <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold text-slate-900">
        Cấu trúc tiêu chuẩn / tiêu chí
      </h2>
      <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={onAddGroup} className="shrink-0 rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">Thêm tiêu chuẩn</button>
      {saveControl}
      </div>
      </div>
      {groupForm ? <div className="mt-5">{groupForm}</div> : null}

      <CriteriaGroupsPagination totalGroups={groups.length} className="mt-5">
        {groups.length > 0 ? (
          groups.map((group) => {
            const groupCriteria = criteria.filter(
              (item) => item.groupCode === group.code
            );
            const criteriaPageSize = 5;
            const criteriaTotalPages = Math.max(1, Math.ceil(groupCriteria.length / criteriaPageSize));
            const criteriaPage = Math.min(criteriaPages[group.code] ?? 1, criteriaTotalPages);
            const visibleCriteria = groupCriteria.slice((criteriaPage - 1) * criteriaPageSize, criteriaPage * criteriaPageSize);

            const groupEditingItem =
              editingItem?.groupCode === group.code ? editingItem : null;

            const isEditingGroup = editingGroupCode === group.code;

            return (
              <div
                key={group.id}
                data-criteria-group-code={group.code}
                className="min-w-0 scroll-mt-4 space-y-3"
              >
                <div className={isEditingGroup ? "border-l-4 border-amber-500 bg-amber-50 px-4 py-3" : "border-l-4 border-blue-700 bg-blue-50 px-4 py-3"}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-slate-900">
                        {group.code}. {group.title}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {group.description || "Chưa có mô tả"}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                        Yêu cầu: Đạt tối thiểu {Math.max(group.minRequired,groupCriteria.filter(item=>item.isRequired).length)}/{groupCriteria.length} tiêu chí
                      </span>
                      {isOfficer ? (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                          Tối đa {group.scoreMax} điểm
                        </span>
                      ) : null}

                      <button type="button" aria-expanded={addingGroupCode === group.code && !groupEditingItem} onClick={() => { setEditingItem(null); setAddingGroupCode(group.code); }} className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50">Thêm tiêu chí</button>
                      <button
                        type="button"
                        onClick={() => onEditGroup?.(group)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Sửa
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteGroup(group)}
                        className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>

                <div className="min-w-0 w-full">
                  {addingGroupCode === group.code || groupEditingItem ? <CriteriaInlineItemCreateForm
                    key={`${group.code}:${groupEditingItem?.code ?? "create"}`}
                    templateId={templateId}
                    templateForType={templateForType}
                    groupCode={group.code}
                    activities={activities}
                    editingItem={groupEditingItem}
                    onCancelEdit={() => { setEditingItem(null); setAddingGroupCode(null); }}
                    onSaved={() => { setEditingItem(null); setAddingGroupCode(null); setFeedback({message: "Đã lưu tiêu chí.", ok: true}); onDataChanged?.(); }}
                  /> : null}

                  <CriteriaTable className="criteria-template-structure-table min-w-full table-fixed divide-y divide-slate-200" containerClassName={`${addingGroupCode === group.code || groupEditingItem ? "mt-5 " : ""}overflow-hidden rounded-none! border border-slate-200`}>
                      <colgroup>
                        <col style={{ width: "4%" }} />
                        <col style={{ width: "6%" }} />
                        <col style={{ width: isOfficer ? "36%" : "43%" }} />
                        <col style={{ width: "9%" }} />
                        {isOfficer ? <col style={{ width: "7%" }} /> : null}
                        <col style={{ width: "28%" }} />
                        <col style={{ width: "10%" }} />
                      </colgroup>
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="w-[4%] px-2 py-3 text-center text-sm font-semibold text-slate-700">STT</th>
                          <th className="w-[6%] px-3 py-3 text-left text-sm font-semibold text-slate-700">
                            Mã
                          </th>
                          <th className={`${isOfficer ? "w-[36%]" : "w-[43%]"} px-4 py-3 text-left text-sm font-semibold text-slate-700`}>
                            Tiêu chí
                          </th>
                          <th className="w-[9%] px-3 py-3 text-left text-sm font-semibold text-slate-700">
                            Bắt buộc
                          </th>
                          {isOfficer ? (
                            <th className="w-[7%] px-3 py-3 text-left text-sm font-semibold text-slate-700">
                              Điểm
                            </th>
                          ) : null}
                          <th className="w-[28%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Hoạt động đáp ứng
                          </th>
                          <th className="w-[12%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
                            Thao tác
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 bg-white">
                        {groupCriteria.length > 0 ? (
                          visibleCriteria.map((item, index) => (
                            <tr
                              key={item.id}
                              className={
                                editingItem?.code === item.code
                                  ? "bg-amber-50"
                                  : ""
                              }
                            >
                              <td className="px-2 py-4 text-center align-top text-sm text-slate-600">{(criteriaPage - 1) * criteriaPageSize + index + 1}</td>
                              <td className="px-3 py-4 align-top text-sm font-semibold text-slate-800">
                                {item.code}
                              </td>

                              <td className="px-4 py-4 align-top">
                                <div className="text-sm font-medium text-slate-900">
                                  {item.title}
                                </div>
                                <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                                  {item.description || "Chưa có mô tả"}
                                </div>
                                
                              </td>

                              <td className="px-3 py-4 align-top">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    item.isRequired
                                      ? "bg-rose-50 text-rose-700"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {item.isRequired ? "Có" : "Không"}
                                </span>
                              </td>

                              {isOfficer ? (
                                <td className="px-3 py-4 align-top text-sm text-slate-700">
                                  {item.scoreMax}
                                </td>
                              ) : null}

                              <td className="px-4 py-4 align-top text-xs text-slate-600">
                                {item.activityRules.length > 0
                                  ? item.activityRules
                                      .map((rule) => rule.activityTitle)
                                      .join(", ")
                                  : "Không có, cần nộp minh chứng"}
                              </td>

                              <td className="px-4 py-4 text-center align-top">
                                <div className="flex justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => { setAddingGroupCode(null); setEditingItem(item); }}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                  >
                                    Sửa
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteItem(item)}
                                    className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                                  >
                                    Xóa
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={isOfficer ? 7 : 6}
                              className="px-4 py-8 text-center text-sm text-slate-500"
                            >
                              Chưa có tiêu chí trong tiêu chuẩn này.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </CriteriaTable>
                    {groupCriteria.length > criteriaPageSize ? (
                      <div className="flex items-center justify-end gap-2 border-x border-b border-slate-200 px-3 py-2">
                        <button type="button" aria-label="Trang trước" disabled={criteriaPage <= 1} onClick={() => setCriteriaPages(current => ({ ...current, [group.code]: criteriaPage - 1 }))} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:text-slate-300">‹</button>
                        <span className="whitespace-nowrap text-xs text-slate-500">Trang {criteriaPage}/{criteriaTotalPages}</span>
                        <button type="button" aria-label="Trang sau" disabled={criteriaPage >= criteriaTotalPages} onClick={() => setCriteriaPages(current => ({ ...current, [group.code]: criteriaPage + 1 }))} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:text-slate-300">›</button>
                      </div>
                    ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500 shadow-md shadow-slate-200/60">
            Chưa có tiêu chuẩn nào. Hãy thêm tiêu chuẩn trước.
          </div>
        )}
      </CriteriaGroupsPagination>
    </section>
  );
}
