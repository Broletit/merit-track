"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  FileText,
  ImageIcon,
} from "lucide-react";

type Item = {
  id: number;
  fileName: string;
  mimeType: string;
};

function isPreviewable(mime: string) {
  return mime.startsWith("image/") || mime === "application/pdf";
}

export default function SubmissionEvidenceViewer({
  items,
}: {
  items: Item[];
}) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
        Chưa có file minh chứng nào.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const previewUrl = `/api/submissions/files/${item.id}`;
        const canPreview = isPreviewable(item.mimeType);
        const expanded = expandedIds.has(item.id);

        return (
          <div
            key={item.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-700">
                {item.mimeType.startsWith("image/") ? (
                  <ImageIcon size={16} />
                ) : (
                  <FileText size={16} />
                )}

                <span className="truncate">{item.fileName}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedIds((current) => {
                      const next = new Set(current);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  {expanded ? <EyeOff size={15} /> : <Eye size={15} />}
                  {expanded ? "Ẩn minh chứng" : "Xem minh chứng"}
                </button>

              </div>
            </div>

            {expanded && canPreview ? (
              item.mimeType.startsWith("image/") ? (
                <Image
                  src={previewUrl}
                  alt={item.fileName}
                  width={1200}
                  height={800}
                  unoptimized
                  className="max-h-180 w-full bg-slate-100 object-contain"
                />
              ) : (
                <iframe
                  src={previewUrl}
                  title={item.fileName}
                  className="h-180 w-full"
                />
              )
            ) : expanded ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                File này không hỗ trợ xem trực tiếp. Vui lòng tải xuống.
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
