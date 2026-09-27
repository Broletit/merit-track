"use client";

import { useState } from "react";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import CriteriaTemplatesFilter from "./CriteriaTemplatesFilter";
import CriteriaTemplateActions from "./CriteriaTemplateActions";
import CriteriaTemplateEditInlineForm from "./CriteriaTemplateEditInlineForm";
import type { AdminCriteriaTemplateItem } from "./types";

function mapForType(value: string) {
  if (value === "officer") return "Cán bộ";
  return "Sinh viên";
}

export default function CriteriaTemplatesTable({
  items,
}: {
  items: AdminCriteriaTemplateItem[];
}) {
  const [editingItem, setEditingItem] =
    useState<AdminCriteriaTemplateItem | null>(null);

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-xl font-semibold text-slate-900">
        Danh sách bộ tiêu chuẩn
      </h2>

      <div className="mt-5">
        <CriteriaTemplatesFilter />
      </div>

      {editingItem ? (
        <CriteriaTemplateEditInlineForm
          item={editingItem}
          onCancel={() => setEditingItem(null)}
          onSaved={() => setEditingItem(null)}
        />
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full min-w-[960px] table-fixed divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-[34%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Bộ tiêu chuẩn
              </th>
              <th className="w-[14%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Đối tượng
              </th>
              <th className="w-[10%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Tiêu chuẩn
              </th>
              <th className="w-[10%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Tiêu chí
              </th>
              <th className="w-[12%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Ngày tạo
              </th>
              <th className="w-[20%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
                Thao tác
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {items.length > 0 ? (
              items.map((item) => (
                <tr
                  key={item.id}
                  className={editingItem?.id === item.id ? "bg-amber-50" : ""}
                >
                  <td className="px-4 py-4 align-top">
                    <div className="text-sm font-semibold text-slate-900">
                      {item.name}
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {item.description || "Chưa có mô tả"}
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {mapForType(item.forType)}
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {item.groups}
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {item.criteria}
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {formatDateTimeVN(item.createdAt)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 text-center align-top">
                    <CriteriaTemplateActions
                      item={item}
                      onEdit={() => setEditingItem(item)}
                      onDeleted={() => {
                        if (editingItem?.id === item.id) {
                          setEditingItem(null);
                        }
                      }}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  Không có bộ tiêu chuẩn phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
