"use client";

import { useActionState } from "react";
import { upsertCriteriaConductRule } from "@/server/actions/criteria-templates/upsertCriteriaConductRule";
import ActionFeedback from "@/components/shared/ActionFeedback";
import type { CriteriaTemplateConductRule } from "./types";

type State = { ok: boolean; message: string };
const initialState: State = { ok: false, message: "" };

export default function CriteriaConductRuleForm({
  templateId,
  criteriaCode,
  rule,
}: {
  templateId: number;
  criteriaCode: string;
  rule: CriteriaTemplateConductRule | null;
}) {
  async function action(_prev: State, formData: FormData): Promise<State> {
    try {
      const result = await upsertCriteriaConductRule(
        templateId,
        criteriaCode,
        formData
      );
      return { ok: true, message: result.message };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Cập nhật điều kiện điểm thất bại.",
      };
    }
  }

  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <>
      <ActionFeedback pending={pending} message={state.message} ok={state.ok} />
    <form action={formAction} className="mt-3 flex flex-wrap gap-2">
      <input
        name="minScore"
        type="number"
        min={0}
        defaultValue={rule?.minScore ?? 0}
        placeholder="Điểm tối thiểu"
        className="h-10 w-40 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
      />

      <select
        name="periodScope"
        defaultValue={rule?.periodScope ?? "current"}
        className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
      >
        <option value="current">Kỳ hiện tại</option>
        <option value="any">Bất kỳ kỳ nào</option>
      </select>

      <button
        disabled={pending}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        Lưu điều kiện điểm
      </button>

    </form>
    </>
  );
}
