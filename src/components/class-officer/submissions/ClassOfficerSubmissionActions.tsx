"use client";

import {
  approveV1,
  rejectV1,
} from "@/server/actions/submissions/reviewSubmission";
import type { ClassOfficerSubmissionListItem } from "./types";

export default function ClassOfficerSubmissionActions({
  item,
}: {
  item: ClassOfficerSubmissionListItem;
}) {
  if (item.status !== "submitted_v1") return null;

  return (
    <div className="flex justify-center gap-2">
      <button
        onClick={() => approveV1(item.id)}
        className="rounded-lg bg-green-600 px-3 py-1 text-white"
      >
        Duyệt
      </button>

      <button
        onClick={() => rejectV1(item.id)}
        className="rounded-lg bg-red-600 px-3 py-1 text-white"
      >
        Từ chối
      </button>
    </div>
  );
}
