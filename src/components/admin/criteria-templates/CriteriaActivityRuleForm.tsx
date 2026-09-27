"use client";

import { useActionState, useMemo, useState } from "react";
import { addCriteriaActivityRule } from "@/server/actions/criteria-templates/addCriteriaActivityRule";
import ActionFeedback from "@/components/shared/ActionFeedback";
import type { CriteriaTemplateActivityOption } from "./types";

type State = {
  ok: boolean;
  message: string;
};

const initialState: State = {
  ok: false,
  message: "",
};

export default function CriteriaActivityRuleForm({
  templateId,
  criteriaCode,
  activities,
}: {
  templateId: number;
  criteriaCode: string;
  activities: CriteriaTemplateActivityOption[];
}) {
  const [keyword, setKeyword] = useState("");

  async function action(_prev: State, formData: FormData): Promise<State> {
    try {
      const result = await addCriteriaActivityRule(
        templateId,
        criteriaCode,
        formData
      );

      return {
        ok: true,
        message: result.message,
      };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error ? error.message : "Gắn hoạt động thất bại.",
      };
    }
  }

  const [state, formAction, pending] = useActionState(action, initialState);

  const filteredActivities = useMemo(() => {
    const value = keyword.trim().toLowerCase();

    if (!value) return activities.slice(0, 30);

    return activities
      .filter((item) => item.title.toLowerCase().includes(value))
      .slice(0, 30);
  }, [activities, keyword]);

  return (
    <>
      <ActionFeedback pending={pending} message={state.message} ok={state.ok} />
    <form action={formAction} className="space-y-2">
      <label className="block text-xs font-medium text-slate-500">
        Gán hoạt động đáp ứng tiêu chí
      </label>

      <input
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder="Tìm hoạt động..."
        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500"
      />

      <div className="flex gap-2">
        <select
          name="activityId"
          required
          className="h-9 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500"
        >
          <option value="">Chọn hoạt động</option>
          {filteredActivities.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>

        <input name="scoreValue" type="number" min="0" step="0.5" required placeholder="Điểm" className="h-9 w-20 rounded-xl border border-slate-200 px-2 text-xs" />

        <button
          disabled={pending}
          className="h-9 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Gắn
        </button>
      </div>

    </form>
    </>
  );
}
