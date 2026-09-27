"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import DeleteEntityButton from "@/components/admin/shared/DeleteEntityButton";
import { createConductCategory } from "@/server/actions/conduct/createConductCategory";
import { deleteConductCategory } from "@/server/actions/conduct/deleteConductCategory";
import { updateConductCategory } from "@/server/actions/conduct/updateConductCategory";

type Item = {
  id: number;
  parentId: number | null;
  code: string;
  name: string;
  scoreMax: number;
  depth: number;
  activities?: Array<{ id: number; title: string; score: number; order: number }>;
};

export default function ConductCategoryManager({
  termId,
  items,
  canManage,
}: {
  termId: number;
  items: Item[];
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-lg font-semibold">Khung điểm rèn luyện phân cấp</h2>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        {items.map((item) =>
          editingId === item.id ? (
            <form
              key={item.id}
              className="grid min-w-0 gap-3 border-b border-slate-100 bg-blue-50/50 p-4 md:grid-cols-2 2xl:grid-cols-[110px_minmax(180px,1fr)_minmax(220px,1.3fr)_120px_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                startTransition(async () => {
                  try {
                    const result = await updateConductCategory(item.id, data);
                    toast.success(result.message);
                    setEditingId(null);
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Không thể cập nhật.");
                  }
                });
              }}
            >
              <input name="code" required defaultValue={item.code} className="h-10 rounded-xl border border-slate-200 px-3" />
              <input name="name" required defaultValue={item.name} className="h-10 rounded-xl border border-slate-200 px-3" />
              <select name="parentId" defaultValue={item.parentId ?? ""} className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3">
                <option value="">Mục gốc</option>
                {items.filter((candidate) => candidate.id !== item.id).map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>{"— ".repeat(candidate.depth)}{candidate.code}. {candidate.name}</option>
                ))}
              </select>
              <input name="scoreMax" type="number" min="0.5" step="0.5" required defaultValue={item.scoreMax} className="h-10 rounded-xl border border-slate-200 px-3" />
              <div className="flex gap-2">
                <button disabled={pending} className="h-10 rounded-xl border border-blue-600 bg-white px-3 text-sm font-semibold text-blue-700">Lưu</button>
                <button type="button" onClick={() => setEditingId(null)} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm">Hủy</button>
              </div>
            </form>
          ) : (
            <div key={item.id} className="border-b border-slate-100 px-4 py-3 last:border-0" style={{ paddingLeft: `${16 + item.depth * 24}px` }}>
              <div className="flex items-center justify-between gap-4">
                <div className={item.depth === 0 ? "font-semibold text-slate-900" : "text-sm text-slate-700"}>{item.code}. {item.name}</div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <span className="text-sm font-semibold text-blue-700">{item.scoreMax} điểm</span>
                  {canManage ? (
                    <>
                      <button type="button" onClick={() => setEditingId(item.id)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">Sửa</button>
                      <DeleteEntityButton label="Xóa" confirmMessage={`Xóa mục “${item.code}. ${item.name}”?`} action={deleteConductCategory.bind(null, item.id)} />
                    </>
                  ) : null}
                </div>
              </div>
              {item.activities?.map((activity) => (
                <div key={activity.id} className="mt-2 pl-6 text-sm font-normal text-slate-600">
                  {item.code}.{activity.order}. {activity.title} <span className="font-medium text-blue-700">({activity.score} điểm)</span>
                </div>
              ))}
            </div>
          ),
        )}
        {!items.length ? <div className="p-4 text-sm text-slate-500">Chưa cấu hình khung điểm.</div> : null}
      </div>

      {canManage ? (
        <form
          className="mt-5 grid min-w-0 gap-3 md:grid-cols-2 2xl:grid-cols-[130px_minmax(180px,1fr)_minmax(240px,1.4fr)_150px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            startTransition(async () => {
              try {
                const result = await createConductCategory(termId, data);
                toast.success(result.message);
                form.reset();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Không thể lưu mục điểm.");
              }
            });
          }}
        >
          <input name="code" required placeholder="Mã (I, 1, 1.1)" className="h-11 rounded-xl border border-slate-200 px-3" />
          <input name="name" required placeholder="Tên mục" className="h-11 rounded-xl border border-slate-200 px-3" />
          <select name="parentId" className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3">
            <option value="">Mục gốc</option>
            {items.map((item) => <option key={item.id} value={item.id}>{"— ".repeat(item.depth)}{item.code}. {item.name}</option>)}
          </select>
          <input name="scoreMax" type="numbe`r" min="0.5" step="0.5" required placeholder="Điểm tối đa" className="h-11 rounded-xl border border-slate-200 px-3" />
          <button disabled={pending} className="h-11 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Đang lưu..." : "Thêm mục"}</button>
        </form>
      ) : null}
    </section>
  );
}
