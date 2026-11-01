
"use client";
import CriteriaTable from "@/components/shared/criteria/CriteriaTable";
import CriteriaGroupsPagination from "@/components/shared/criteria/CriteriaGroupsPagination";

import useConfirmation from "@/components/shared/useConfirmation";

import { useState, useTransition, type ReactNode } from "react";
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
  const [deletePending, startDeleteTransition] = useTransition();
  const { confirm, modal } = useConfirmation();
  const [feedback, setFeedback] = useState({ message: "", ok: false });

  async function handleDeleteGroup(group: CriteriaTemplateGroupItem) {
    const reason = await confirm({ title: 'Xác nhận xóa', message: `Xóa tiêu chuẩn ${group.code}? Các tiêu chí con cũng sẽ bị xóa.`, confirmLabel: 'Xác nhận xóa', requireReason: true });
    if (reason === null) return;
    const formData=new FormData();formData.set("reason",reason);

    startDeleteTransition(async () => {
      try {
        await deleteCriteriaGroup(templateId, group.code,formData);
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
        setFeedback({ message: "Xóa tiêu chí thành công.", ok: true });
        if (editingItem?.code === item.code) setEditingItem(null);
      } catch (error) {
        setFeedback({ message: error instanceof Error ? error.message : "Xóa tiêu chí thất bại.", ok: false });
      }
    });
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      {modal}
      <ActionFeedback pending={deletePending} message={feedback.message} ok={feedback.ok} />
      <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold text-slate-900">
        Cấu trúc tiêu chuẩn / tiêu chí
      </h2>
      <button type="button" onClick={onAddGroup} className="shrink-0 rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">Thêm tiêu chuẩn</button>
      </div>
      {groupForm ? <div className="mt-5">{groupForm}</div> : null}

      <CriteriaGroupsPagination totalGroups={groups.length} className="mt-5">
        {groups.length > 0 ? (
          groups.map((group) => {
            const groupCriteria = criteria.filter(
              (item) => item.groupCode === group.code
            );

            const groupEditingItem =
              editingItem?.groupCode === group.code ? editingItem : null;

            const isEditingGroup = editingGroupCode === group.code;

            return (
              <div
                key={group.id}
                className="min-w-0 space-y-3"
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
                    onSaved={() => { setEditingItem(null); setAddingGroupCode(null); setFeedback({message: "Đã lưu tiêu chí.", ok: true}); }}
                  /> : null}

                  <CriteriaTable className="min-w-full table-fixed divide-y divide-slate-200" containerClassName={`${addingGroupCode === group.code || groupEditingItem ? "mt-5 " : ""}overflow-hidden rounded-none! border border-slate-200`}>
                      <colgroup>
                        <col style={{ width: "8%" }} />
                        <col style={{ width: isOfficer ? "24%" : "30%" }} />
                        <col style={{ width: isOfficer ? "12%" : "14%" }} />
                        {isOfficer ? <col style={{ width: "12%" }} /> : null}
                        <col style={{ width: isOfficer ? "32%" : "36%" }} />
                        <col style={{ width: "12%" }} />
                      </colgroup>
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="w-[8%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Mã
                          </th>
                          <th className={`${isOfficer ? "w-[24%]" : "w-[30%]"} px-4 py-3 text-left text-sm font-semibold text-slate-700`}>
                            Tiêu chí
                          </th>
                          <th className="w-[12%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Bắt buộc
                          </th>
                          {isOfficer ? (
                            <th className="w-[12%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                              Điểm
                            </th>
                          ) : null}
                          <th className={`${isOfficer ? "w-[32%]" : "w-[36%]"} px-4 py-3 text-left text-sm font-semibold text-slate-700`}>
                            Hoạt động đáp ứng
                          </th>
                          <th className="w-[12%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
                            Thao tác
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 bg-white">
                        {groupCriteria.length > 0 ? (
                          groupCriteria.map((item) => (
                            <tr
                              key={item.id}
                              className={
                                editingItem?.code === item.code
                                  ? "bg-amber-50"
                                  : ""
                              }
                            >
                              <td className="px-4 py-4 align-top text-sm font-semibold text-slate-800">
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

                              <td className="px-4 py-4 align-top">
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
                                <td className="px-4 py-4 align-top text-sm text-slate-700">
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
                              colSpan={isOfficer ? 6 : 5}
                              className="px-4 py-8 text-center text-sm text-slate-500"
                            >
                              Chưa có tiêu chí trong tiêu chuẩn này.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </CriteriaTable>
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
