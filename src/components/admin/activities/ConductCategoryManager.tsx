"use client";
import styles from "./ConductCategoryManager.module.css";
import RequiredMark from "@/components/common/RequiredMark";


import { ChevronDown, ChevronUp } from "lucide-react";
import { Fragment, useEffect, useRef, useState, useTransition } from "react";
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
  const [createFormKey, setCreateFormKey] = useState(0);
  const itemById = new Map(items.map((item) => [item.id, item]));
  const belongsToSubtree = (candidate: Item | undefined, ancestor: Item) => {
    let current = candidate;
    while (current) {
      if (current.id === ancestor.id) return true;
      current = current.parentId ? itemById.get(current.parentId) : undefined;
    }
    return false;
  };

  return (
    <section className={`${styles.panel} rounded-3xl bg-white p-4 sm:p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60`}>
      {canManage ? (
        <form
          key={createFormKey}
          className={`${styles.form} mb-5`}
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            startTransition(async () => {
              try {
                const result = await createConductCategory(termId, data);
                toast.success(result.message);
                form.reset();
                setCreateFormKey((value) => value + 1);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Không thể lưu mục điểm.");
              }
            });
          }}
        >
          <label className={styles.name}><span className="mb-2 block text-sm font-medium text-slate-600">Tên mục<RequiredMark required={true}/></span><input name="name" required placeholder="Hoạt động đoàn thể và phong trào thanh niên" className="h-11 rounded-xl border border-slate-200 px-3" /></label>
          <CategoryParentPicker className={styles.parent} items={items} />
          <label className={styles.score}><span className="mb-2 block text-sm font-medium text-slate-600">Điểm tối đa<RequiredMark required={true}/></span><input name="scoreMax" type="number" min="0.5" step="0.5" required placeholder="10" className="h-11 rounded-xl border border-slate-200 px-3" /></label>
          <button disabled={pending} className={`${styles.actions} min-h-11 h-auto rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-60 py-2 max-w-full break-words`}>{pending ? "Đang lưu..." : "Thêm mục"}</button>
        </form>
      ) : null}
      <div className="overflow-hidden rounded-none border border-slate-200">
        {items.map((item, index) => {
          const nextItem = items[index + 1];
          const closingItems = items
            .slice(0, index + 1)
            .filter((candidate) => candidate.activities?.length && belongsToSubtree(item, candidate) && !belongsToSubtree(nextItem, candidate))
            .sort((a, b) => b.depth - a.depth);
          return <Fragment key={item.id}>
          {editingId === item.id ? (
            <form
              className={`${styles.form} border-b border-slate-100 bg-blue-50/50 p-4`}
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
              <label className={styles.name}><span className="mb-2 block text-sm font-medium text-slate-600">Tên mục<RequiredMark required={true}/></span><input name="name" required defaultValue={item.name} className="h-10 rounded-xl border border-slate-200 px-3" /></label>
              <CategoryParentPicker className={styles.parent} items={items} initialId={item.parentId} excludeId={item.id} compact />
              <label className={styles.score}><span className="mb-2 block text-sm font-medium text-slate-600">Điểm tối đa<RequiredMark required={true}/></span><input name="scoreMax" type="number" min="0.5" step="0.5" required defaultValue={item.scoreMax} className="h-10 rounded-xl border border-slate-200 px-3" /></label>
              <div className={`${styles.actions} flex flex-wrap justify-end gap-2`}>
                <button disabled={pending} className="min-h-10 h-auto rounded-xl border border-blue-600 bg-white px-3 text-sm font-semibold text-blue-700 py-2 max-w-full break-words">Lưu</button>
                <button type="button" onClick={() => setEditingId(null)} className="min-h-10 h-auto rounded-xl border border-slate-300 bg-white px-3 text-sm py-2 max-w-full break-words">Hủy</button>
              </div>
            </form>
          ) : (
            <div className={`border-b border-slate-100 px-4 py-3 last:border-0 ${item.depth === 0 ? "bg-blue-800 text-white" : ""}`} style={{ paddingLeft: `${16 + item.depth * 24}px` }}>
              <div className="flex min-w-0 flex-nowrap items-start justify-between gap-3">
                <div className={`min-w-0 flex-1 break-words ${item.depth === 0 ? "font-semibold text-white" : "text-sm font-bold text-slate-700"}`}>{item.code}. {item.name}</div>
                <div className="ml-auto flex shrink-0 flex-nowrap items-center justify-end gap-2">
                  <span className={`text-sm font-semibold ${item.depth === 0 ? "text-white" : "text-blue-700"}`}>{item.scoreMax} điểm</span>
                  {canManage ? (
                    <>
                      <button type="button" onClick={() => setEditingId(item.id)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">Sửa</button>
                      <DeleteEntityButton label="Xóa" confirmMessage={`Xóa mục “${item.code} ${item.name}”?`} action={deleteConductCategory.bind(null, item.id)} />
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          )}
          {closingItems.flatMap((owner) => owner.activities?.map((activity) => (
            <div key={`${owner.id}-${activity.id}`} className="border-b border-slate-100 px-4 py-2 text-sm font-normal text-slate-600" style={{paddingLeft:`${40+(owner.depth+1)*24}px`}}>
              {owner.code}.{activity.order}. {activity.title} <span className="font-medium text-slate-600">({activity.score} điểm)</span>
            </div>
          )) ?? [])}
          </Fragment>;
        })}
        {!items.length ? <div className="p-4 text-sm text-slate-500">Chưa cấu hình khung điểm.</div> : null}
      </div>


    </section>
  );
}

function CategoryParentPicker({
  className,
  compact = false,
  excludeId,
  initialId = null,
  items,
}: {
  className: string;
  compact?: boolean;
  excludeId?: number;
  initialId?: number | null;
  items: Item[];
}) {
  const [selectedId, setSelectedId] = useState<number | null>(initialId);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const itemById = new Map(items.map((item) => [item.id, item]));
  const selectableItems = items.filter((item) => {
    if (item.id === excludeId) return false;
    let current = item;
    while (current.parentId) {
      if (current.parentId === excludeId) return false;
      current = itemById.get(current.parentId) ?? { ...current, parentId: null };
    }
    return true;
  });
  const selectedItem = selectableItems.find((item) => item.id === selectedId);

  useEffect(() => {
    const closeWhenClickingOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeWhenClickingOutside);
    return () => document.removeEventListener("mousedown", closeWhenClickingOutside);
  }, []);

  return (
    <div ref={rootRef} className={`${className} relative`}>
      <span className="mb-2 block text-sm font-medium text-slate-600">Mục cha</span>
      <input type="hidden" name="parentId" value={selectedId ?? ""} />
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`${compact ? "min-h-10" : "min-h-11"} flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700`}
      >
        <span className="min-w-0 break-words leading-5">
          {selectedItem ? `${selectedItem.code}. ${selectedItem.name}` : "Cấp 1 (không có mục cha)"}
        </span>
        {open ? <ChevronUp className="shrink-0" size={16} /> : <ChevronDown className="shrink-0" size={16} />}
      </button>
      {open ? (
        <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          <button
            type="button"
            onClick={() => { setSelectedId(null); setOpen(false); }}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm leading-5 text-slate-700 hover:bg-blue-50"
          >
            Cấp 1 (không có mục cha)
          </button>
          {selectableItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { setSelectedId(item.id); setOpen(false); }}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm leading-5 break-words hover:bg-blue-50 ${selectedId === item.id ? "bg-blue-50 text-blue-800" : "text-slate-700"}`}
              style={{ paddingLeft: `${12 + item.depth * 16}px` }}
            >
              {item.code}. {item.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
