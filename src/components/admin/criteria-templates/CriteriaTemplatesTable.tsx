"use client";
import NumberedTable from "@/components/common/NumberedTable";
import styles from "./CriteriaTemplatesTable.module.css";


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

export default function CriteriaTemplatesTable({ page = 1,
  items,
}: { page?: number;
  items: AdminCriteriaTemplateItem[];
}) {
  const [editingItem, setEditingItem] =
    useState<AdminCriteriaTemplateItem | null>(null);

  return (
    <section className="flex flex-col rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <div className="order-2 mt-5">
        <CriteriaTemplatesFilter />
      </div>

      <h2 className="order-1 text-xl font-semibold text-slate-900">
        Danh sách bộ tiêu chuẩn
      </h2>

      {editingItem ? (
        <div className="order-3 mt-5"><CriteriaTemplateEditInlineForm
          item={editingItem}
          onCancel={() => setEditingItem(null)}
          onSaved={() => setEditingItem(null)}
        /></div>
      ) : null}

      <div className="order-4 mt-5 overflow-x-auto rounded-none border border-slate-200">
        <NumberedTable page={page} className={`${styles.table} w-full min-w-0 table-fixed divide-y divide-slate-200`}>
          <thead className="bg-slate-50">
            <tr>
              <th data-column-align="left" className="w-[34%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Bộ tiêu chuẩn
              </th>
              <th data-column-align="center" className="w-[14%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
                Đối tượng
              </th>
              <th data-column-align="center" className="w-[10%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
                Tiêu chuẩn
              </th>
              <th data-column-align="center" className="w-[10%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
                Tiêu chí
              </th>
              <th data-column-align="center" className="w-[12%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
                Ngày tạo
              </th>
              <th data-column-align="center" className="w-[20%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
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
                  <td data-column-align="left" className="px-4 py-4 align-top">
                    <div className="text-sm font-semibold text-slate-900">
                      {item.name}
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {item.description || "Chưa có mô tả"}
                    </div>
                  </td>

                  <td data-column-align="center" className="px-4 py-4 align-top text-sm text-slate-700">
                    {mapForType(item.forType)}
                  </td>

                  <td data-column-align="center" className="px-4 py-4 align-top text-sm text-slate-700">
                    {item.groups}
                  </td>

                  <td data-column-align="center" className="px-4 py-4 align-top text-sm text-slate-700">
                    {item.criteria}
                  </td>

                  <td data-column-align="center" className="px-4 py-4 align-top text-sm text-slate-700">
                    {formatDateTimeVN(item.createdAt)}
                  </td>

                  <td data-column-align="center" className="whitespace-nowrap px-4 py-4 text-center align-top">
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
        </NumberedTable>
      </div>
    </section>
  );
}
