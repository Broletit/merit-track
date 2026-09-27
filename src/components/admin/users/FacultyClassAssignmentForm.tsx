"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { assignFacultyOfficerClasses } from "@/server/actions/admin/users/assignFacultyOfficerClasses";
import ActionFeedback from "@/components/shared/ActionFeedback";

type ClassOption = {
  id: number;
  code: string;
  name: string;
};

type State = {
  ok: boolean;
  neutral: boolean;
  message: string;
};

const initialState: State = {
  ok: false,
  neutral: false,
  message: "",
};

export default function FacultyClassAssignmentForm({
  facultyOfficerId,
  classes,
  selectedClassIds,
}: {
  facultyOfficerId: number;
  classes: ClassOption[];
  selectedClassIds: number[];
}) {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [selected, setSelected] = useState(() => new Set(selectedClassIds));
  const classListRef = useRef<HTMLDivElement>(null);

  async function action(_prev: State, formData: FormData): Promise<State> {
    try {
      const result = await assignFacultyOfficerClasses(
        facultyOfficerId,
        formData
      );

      if (result.changed) {
        setKeyword("");
        setShowSelectedOnly(true);
        classListRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        router.refresh();
      }

      return {
        ok: result.ok,
        neutral: !result.changed,
        message: result.message,
      };
    } catch (error) {
      return {
        ok: false,
        neutral: false,
        message:
          error instanceof Error
            ? error.message
            : "Cập nhật phân công thất bại.",
      };
    }
  }

  const [state, formAction, pending] = useActionState(
    action,
    initialState
  );
  const normalizedKeyword = keyword.trim().toLocaleLowerCase("vi");
  const visibleIds = useMemo(
    () => new Set(classes.filter((item) => {
      const matchesKeyword = `${item.code} ${item.name}`
        .toLocaleLowerCase("vi")
        .includes(normalizedKeyword);
      return matchesKeyword && (!showSelectedOnly || selected.has(item.id));
    }).map((item) => item.id)),
    [classes, normalizedKeyword, selected, showSelectedOnly]
  );

  return (
    <section className="h-full rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Phân công lớp quản lý
        </h2>

      </div>

      <form action={formAction} className="mt-5 flex h-[calc(100%-3rem)] flex-col gap-5">
        <ActionFeedback
          pending={pending}
          message={state.message}
          ok={state.ok}
          neutral={state.neutral}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-60 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm theo mã hoặc tên lớp..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-blue-500" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSelectedOnly((current) => !current)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${showSelectedOnly ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"}`}
            >
              {showSelectedOnly ? "Xem tất cả" : "Lớp đã phân công"}
            </button>
            <div className="rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700">
              Đã phân công {selected.size}/{classes.length} lớp
            </div>
          </div>
        </div>

        <div ref={classListRef} className="h-40 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          {classes.map((item) => (
            <label
              key={item.id}
              className={`${visibleIds.has(item.id) ? "flex" : "hidden"} items-start gap-3 rounded-xl border bg-white p-3 transition ${selected.has(item.id) ? "border-blue-300 ring-1 ring-blue-100" : "border-slate-200 hover:border-blue-300"}`}
            >
              <input
                type="checkbox"
                name="classIds"
                value={item.id}
                checked={selected.has(item.id)}
                onChange={(event) => setSelected((current) => {
                  const next = new Set(current);
                  if (event.target.checked) next.add(item.id);
                  else next.delete(item.id);
                  return next;
                })}
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />

              <div>
                <div className="text-sm font-semibold text-slate-800">
                  {item.code}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  {item.name}
                </div>
              </div>
            </label>
          ))}
        </div>
        {visibleIds.size === 0 ? <div className="px-4 py-8 text-center text-sm text-slate-500">{showSelectedOnly && selected.size === 0 ? "Cán bộ này chưa được phân công lớp quản lý." : "Không tìm thấy lớp phù hợp."}</div> : null}
        </div>

        <div className="mt-auto flex justify-end">
          <button
            disabled={pending}
            className="h-11 min-w-44 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
          >
            {pending ? "Đang lưu..." : "Lưu phân công"}
          </button>
        </div>
      </form>
    </section>
  );
}
