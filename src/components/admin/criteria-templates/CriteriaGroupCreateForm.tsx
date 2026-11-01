"use client";
import { SquareX } from "lucide-react";
import styles from "./CriteriaGroupCreateForm.module.css";
import RequiredMark from "@/components/common/RequiredMark";


import { useActionState } from "react";
import { createCriteriaGroup } from "@/server/actions/criteria-templates/createCriteriaGroup";
import { updateCriteriaGroup } from "@/server/actions/criteria-templates/updateCriteriaGroup";
import ActionFeedback from "@/components/shared/ActionFeedback";
import type { CriteriaTemplateGroupItem } from "./types";

type State = {
  ok: boolean;
  message: string;
};

const initialState: State = {
  ok: false,
  message: "",
};

export default function CriteriaGroupCreateForm({
  templateId,
  templateForType,
  editingGroup,
  onCancelEdit,
  onSaved,
  mandatoryCount = 0,
  criteriaCount = 0,
}: {
  templateId: number;
  templateForType: string;
  editingGroup?: CriteriaTemplateGroupItem | null;
  onCancelEdit?: () => void;
  onSaved?: () => void;
  mandatoryCount?: number;
  criteriaCount?: number;
}) {
  const isEditing = Boolean(editingGroup);
  const isOfficer = templateForType === "officer";

  async function action(_prev: State, formData: FormData): Promise<State> {
    try {
      const result = editingGroup
        ? await updateCriteriaGroup(templateId, editingGroup.code, formData)
        : await createCriteriaGroup(templateId, formData);

      onSaved?.();

      return { ok: true, message: result.message };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error ? error.message : "Lưu tiêu chuẩn thất bại.",
      };
    }
  }

  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <>
      <ActionFeedback pending={pending} message={state.message} ok={state.ok} />
    <section
      className={`${styles.panel} rounded-none shadow-md shadow-slate-200/60 ring-1 ${
        isEditing ? "bg-amber-50 ring-amber-200" : "bg-white ring-slate-100"
      }`}
    >
      <div className={styles.header}>
        <h2 className="text-xl font-semibold text-slate-900">
          {isEditing ? `Sửa tiêu chuẩn ${editingGroup?.code}` : "Thêm tiêu chuẩn"}
        </h2>
        <button type="button" onClick={onCancelEdit} disabled={pending} aria-label="Đóng khung nhập" title="Đóng" className="inline-flex h-10! w-10! min-h-10! min-w-10! shrink-0 items-center justify-center rounded-md! border-0! bg-transparent! p-0! text-red-500! shadow-none! transition-colors hover:bg-red-50! hover:text-red-700! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:opacity-50"><SquareX size={24} strokeWidth={1.75} aria-hidden="true" /></button>
      </div>

      <form key={editingGroup?.code ?? "create"} action={formAction} data-stable-validation className={styles.form}>
        <div className={isOfficer ? styles.fields : `${styles.fields} ${styles.studentFields}`}>
          <div className={`${styles.field} ${styles.nameField}`}>
            <label className={styles.label}>
              Tên tiêu chuẩn<RequiredMark required />
            </label>
            <input name="title" required defaultValue={editingGroup?.title ?? ""}
              placeholder="Ví dụ: Đạo đức - Tình nguyện"
              className={`${styles.control} rounded-xl border border-slate-200 bg-white outline-none transition focus:border-blue-500`} />
          </div>

          <div className={styles.field}>
            <label className={`${styles.label} ${styles.numberLabel}`}>
              Số TC tối thiểu
            </label>
            <input name="minRequired" type="number" inputMode="numeric" min={mandatoryCount}
              max={criteriaCount || undefined} step={1}
              defaultValue={Math.max(editingGroup?.minRequired ?? 1, mandatoryCount)}
              className={`${styles.control} rounded-xl border border-slate-200 bg-white outline-none transition focus:border-blue-500`} />
          </div>

          {isOfficer ? (
            <div className={styles.field}>
              <label className={`${styles.label} ${styles.numberLabel}`}>
                Điểm tối đa<RequiredMark required />
              </label>
              <input name="scoreMax" type="number" inputMode="decimal" min="0.5" step="0.5" required
                defaultValue={editingGroup?.scoreMax || 10}
                className={`${styles.control} rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500`} />
            </div>
          ) : <input type="hidden" name="scoreMax" value="0" />}

          <div className={styles.submit}>
            <button type="submit" aria-label={isEditing ? "Lưu tiêu chuẩn" : "Thêm tiêu chuẩn"}
              aria-busy={pending} disabled={pending}
              className="h-11 shrink-0 whitespace-nowrap rounded-xl bg-blue-700 px-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60">
              {pending ? "..." : isEditing ? "Lưu" : "Thêm"}
            </button>
          </div>
        </div>

        <div className={styles.description}>
          <label className={styles.label}>Mô tả tiêu chuẩn</label>
          <textarea name="description" rows={2} defaultValue={editingGroup?.description ?? ""}
            placeholder="Mô tả ngắn nhóm tiêu chuẩn này"
            className="rounded-xl border border-slate-200 bg-white outline-none transition focus:border-blue-500" />
        </div>
      </form>

    </section>
    </>
  );
}
