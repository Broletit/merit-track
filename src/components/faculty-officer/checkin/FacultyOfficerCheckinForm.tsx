"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
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
  const router=useRouter();
  useEffect(()=>{const timer=setInterval(()=>router.refresh(),30000);return ()=>clearInterval(timer);},[router]);
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
  const [now,setNow] = useState(()=>Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return ()=>clearInterval(timer);},[]);

  const filteredActivities = useMemo(() => {

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

      const timestamp=(value:string)=>Date.parse(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)?value.replace(" ","T")+"Z":value);
      const timeMatched=timestamp(item.startAt)<=now&&timestamp(item.endAt)>now;

      return keywordMatched && audienceMatched && typeMatched && timeMatched;
    });
  }, [activities, keyword, audienceType, checkinType, now]);

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
      <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
        <h2 className="text-xl font-semibold text-slate-900">Chọn hoạt động</h2>

        <div className="filter-row mt-5 grid gap-4 md:grid-cols-3">
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
            <FacultyOfficerCameraScanner key={`camera-${finalActivityId}`} activityId={finalActivityId} />
          ) : null}

          <FacultyOfficerManualScanForm key={`manual-${finalActivityId}`} activityId={finalActivityId} />
        </>
      ) : null}
    </div>
  );
}
