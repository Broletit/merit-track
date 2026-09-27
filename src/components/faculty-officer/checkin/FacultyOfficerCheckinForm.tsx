"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import FacultyOfficerCameraScanner from "./FacultyOfficerCameraScanner";
import FacultyOfficerManualScanForm from "./FacultyOfficerManualScanForm";
import type { CheckinActivityOption } from "./types";

function mapAudienceLabel(value: string) {
  if (value === "student") return "Sinh viên";
  return "Cán bộ";
}

export default function FacultyOfficerCheckinForm({
  activities,
  defaultActivityId,
}: {
  activities: CheckinActivityOption[];
  defaultActivityId?: number | null;
}) {
  const defaultSelectedActivity = activities.find(
    (item) => Number(item.id) === Number(defaultActivityId)
  );

  const [activityId, setActivityId] = useState(
    defaultSelectedActivity
      ? String(defaultSelectedActivity.id)
      : activities[0]
        ? String(activities[0].id)
        : ""
  );
  const [keyword, setKeyword] = useState("");
  const [audienceType, setAudienceType] = useState("");
  const [checkinType, setCheckinType] = useState("");
  const [timeFilter, setTimeFilter] = useState("");

  const filteredActivities = useMemo(() => {
    const now = new Date();

    return activities.filter((item) => {
      const keywordMatched = keyword.trim()
        ? item.title.toLowerCase().includes(keyword.trim().toLowerCase())
        : true;

      const audienceMatched = audienceType
        ? item.audienceType === audienceType
        : true;

      const typeMatched =
        checkinType === "qr"
          ? item.qrCheckinEnabled
          : checkinType === "manual"
            ? !item.qrCheckinEnabled
            : true;

      const start = item.startAt ? new Date(item.startAt) : null;
      const end = item.endAt ? new Date(item.endAt) : null;

      let timeMatched = true;

      if (timeFilter === "upcoming") timeMatched = start ? start > now : false;
      if (timeFilter === "ongoing") timeMatched = start && end ? start <= now && end >= now : false;
      if (timeFilter === "ended") timeMatched = end ? end < now : false;

      return keywordMatched && audienceMatched && typeMatched && timeMatched;
    });
  }, [activities, keyword, audienceType, checkinType, timeFilter]);

  const selectedActivityId = Number(activityId || 0);
  const selectedStillVisible = filteredActivities.some(
    (item) => Number(item.id) === selectedActivityId
  );

  const finalActivity = selectedStillVisible
    ? filteredActivities.find((item) => Number(item.id) === selectedActivityId)
    : filteredActivities[0];

  const finalActivityId = Number(finalActivity?.id ?? 0);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-xl font-semibold text-slate-900">Chọn hoạt động</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm tên hoạt động..."
              className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-4 text-sm outline-none transition focus:border-blue-500"
            />
          </div>

          <select
            value={audienceType}
            onChange={(event) => setAudienceType(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500"
          >
            <option value="">Tất cả đối tượng</option>
            <option value="student">Sinh viên</option>
            <option value="officer">Cán bộ</option>
          </select>

          <select
            value={checkinType}
            onChange={(event) => setCheckinType(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500"
          >
            <option value="">Tất cả hình thức</option>
            <option value="qr">QR check-in</option>
            <option value="manual">Xác nhận thủ công</option>
          </select>

          <select
            value={timeFilter}
            onChange={(event) => setTimeFilter(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500"
          >
            <option value="">Tất cả thời gian</option>
            <option value="upcoming">Sắp diễn ra</option>
            <option value="ongoing">Đang diễn ra</option>
            <option value="ended">Đã kết thúc</option>
          </select>
        </div>

        <select
          value={String(finalActivityId || "")}
          onChange={(event) => setActivityId(event.target.value)}
          className="mt-4 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500"
        >
          {filteredActivities.length > 0 ? (
            filteredActivities.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} • {mapAudienceLabel(item.audienceType)} •{" "}
                {item.qrCheckinEnabled ? "QR" : "Thủ công"} •{" "}
                {formatDateTimeVN(item.startAt)} → {formatDateTimeVN(item.endAt)}
              </option>
            ))
          ) : (
            <option value="">Không có hoạt động phù hợp</option>
          )}
        </select>
      </section>

      {finalActivityId > 0 ? (
        <>
          {finalActivity?.qrCheckinEnabled ? (
            <FacultyOfficerCameraScanner activityId={finalActivityId} />
          ) : null}

          <FacultyOfficerManualScanForm activityId={finalActivityId} />
        </>
      ) : null}
    </div>
  );
}
