"use client";

import { useActionState, useMemo, useState } from "react";
import { createCriteriaItem } from "@/server/actions/criteria-templates/createCriteriaItem";
import { updateCriteriaItem } from "@/server/actions/criteria-templates/updateCriteriaItem";
import ActionFeedback from "@/components/shared/ActionFeedback";
import type {
  CriteriaTemplateActivityOption,
  CriteriaTemplateCriteriaItem,
} from "./types";

type State = {
  ok: boolean;
  message: string;
};

const initialState: State = {
  ok: false,
  message: "",
};

export default function CriteriaInlineItemCreateForm({
  templateId,
  templateForType,
  groupCode,
  activities,
  editingItem,
  onCancelEdit,
  onSaved,
}: {
  templateId: number;
  templateForType: string;
  groupCode: string;
  activities: CriteriaTemplateActivityOption[];
  editingItem?: CriteriaTemplateCriteriaItem | null;
  onCancelEdit?: () => void;
  onSaved?: () => void;
}) {
  const isOfficer = templateForType === "officer";
  const isEditing = Boolean(editingItem);

  const [selectedActivityIds, setSelectedActivityIds] = useState<number[]>(
    () => editingItem?.activityRules.map((rule) => Number(rule.activityId)) ?? []
  );
  const [activityKeyword, setActivityKeyword] = useState("");
  const [activityOpen, setActivityOpen] = useState(false);

  function toggleActivity(activityId: number) {
    setSelectedActivityIds((current) =>
      current.includes(activityId)
        ? current.filter((id) => id !== activityId)
        : [...current, activityId]
    );
  }

  const filteredActivities = useMemo(() => {
    const keyword = activityKeyword.trim().toLowerCase();

    if (!keyword) return activities.slice(0, 30);

    return activities
      .filter((item) => item.title.toLowerCase().includes(keyword))
      .slice(0, 30);
  }, [activities, activityKeyword]);

  const selectedActivities = activities.filter((item) =>
    selectedActivityIds.includes(item.id)
  );

  async function action(_prev: State, formData: FormData): Promise<State> {
    try {
      formData.set("groupCode", groupCode);

      if (!isOfficer) {
        formData.set("scoreMax", "0");
      }

      for (const activityId of selectedActivityIds) {
        formData.append("activityIds", String(activityId));
      }

      const result = editingItem
        ? await updateCriteriaItem(templateId, editingItem.code, formData)
        : await createCriteriaItem(templateId, formData);

      setSelectedActivityIds([]);
      setActivityKeyword("");
      setActivityOpen(false);
      onSaved?.();

      return {
        ok: true,
        message: result.message,
      };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error ? error.message : "Lưu tiêu chí thất bại.",
      };
    }
  }

  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <>
      <ActionFeedback pending={pending} message={state.message} ok={state.ok} />
    <form
      key={editingItem?.code ?? "create"}
      action={formAction}
      className={`rounded-2xl p-4 ring-1 ${
        isEditing
          ? "bg-amber-50 ring-amber-200"
          : "bg-slate-50 ring-slate-200"
      }`}
    >
      <input type="hidden" name="groupCode" value={groupCode} />

      {isEditing ? (
        <div className="mb-3 rounded-xl bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800">
          Đang sửa tiêu chí {editingItem?.code}
        </div>
      ) : null}

      <div className={`grid gap-3 ${isOfficer ? "md:grid-cols-12" : "md:grid-cols-11"}`}>
        <div className="md:col-span-3">
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Tên tiêu chí
          </label>
          <input
            name="title"
            required
            defaultValue={editingItem?.title ?? ""}
            placeholder="Ví dụ: Tham gia hoạt động tình nguyện"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Tính chất
          </label>
          <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700">
            <input
              name="isRequired"
              type="checkbox"
              defaultChecked={editingItem?.isRequired ?? false}
            />
            Bắt buộc
          </label>
        </div>

        {isOfficer ? (
          <div className="md:col-span-1">
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Điểm
            </label>
            <input
              name="scoreMax"
              type="number"
              min={0}
              defaultValue={editingItem?.scoreMax ?? 0}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
        ) : (
          <input name="scoreMax" type="hidden" value="0" />
        )}

        <div className={isOfficer ? "relative md:col-span-6" : "relative md:col-span-6"}>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Hoạt động đáp ứng
          </label>

          <input
            value={activityKeyword}
            onFocus={() => setActivityOpen(true)}
            onChange={(event) => {
              setActivityKeyword(event.target.value);
              setActivityOpen(true);
            }}
            placeholder={
              selectedActivities.length > 0
                ? `Đã chọn ${selectedActivities.length} hoạt động`
                : "Bấm để chọn hoạt động"
            }
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
          />

          {activityOpen ? (
            <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <div className="max-h-48 overflow-y-auto">
                {filteredActivities.length > 0 ? (
                  filteredActivities.map((activity) => {
                    const checked = selectedActivityIds.includes(activity.id);

                    return (
                      <label
                        key={activity.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleActivity(activity.id)}
                        />
                        <span className="line-clamp-1">{activity.title}</span>
                      </label>
                    );
                  })
                ) : (
                  <div className="px-3 py-2 text-sm text-slate-500">
                    Không tìm thấy hoạt động.
                  </div>
                )}
              </div>

              <div className="mt-2 flex justify-end border-t border-slate-100 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActivityKeyword("");
                    setActivityOpen(false);
                  }}
                  className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  Xong
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="md:col-span-12">
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Mô tả tiêu chí
          </label>
          <input
            name="description"
            defaultValue={editingItem?.description ?? ""}
            placeholder="Mô tả ngắn điều kiện đạt"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div className="md:col-span-12 text-xs text-slate-500">
          {selectedActivities.length > 0 ? (
            <>
              Đã chọn:{" "}
              <span className="font-medium text-slate-700">
                {selectedActivities.map((item) => item.title).join(", ")}
              </span>
            </>
          ) : (
            "Không chọn hoạt động thì tiêu chí này sẽ yêu cầu nộp minh chứng."
          )}
        </div>

        <div className="flex justify-end gap-2 md:col-span-12">
          {isEditing ? (
            <button
              type="button"
              onClick={onCancelEdit}
              className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </button>
          ) : null}

          <button
            disabled={pending}
            className="h-10 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {pending
              ? isEditing
                ? "Đang lưu..."
                : "Đang thêm..."
              : isEditing
              ? "Lưu thay đổi"
              : "Thêm tiêu chí"}
          </button>
        </div>
      </div>

    </form>
    </>
  );
}
