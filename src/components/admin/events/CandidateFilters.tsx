"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Option = { value: string; label: string };

export default function CandidateFilters({
  classes,
  groups,
  initialKeyword,
  initialClass,
  initialGroup,
}: {
  classes: string[];
  groups: Option[];
  initialKeyword: string;
  initialClass: string;
  initialGroup: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(initialKeyword);
  const [classCode, setClassCode] = useState(initialClass);
  const [showClassSuggestions, setShowClassSuggestions] = useState(false);
  const initialized = useRef(false);
  const normalizedClass = classCode.trim().toLocaleLowerCase("vi");
  const classSuggestions = normalizedClass
    ? classes
        .filter((item) => item.toLocaleLowerCase("vi").includes(normalizedClass))
        .sort((left, right) => {
          const leftStarts = left.toLocaleLowerCase("vi").startsWith(normalizedClass);
          const rightStarts = right.toLocaleLowerCase("vi").startsWith(normalizedClass);
          return Number(rightStarts) - Number(leftStarts) || left.localeCompare(right, "vi");
        })
        .slice(0, 6)
    : [];

  function navigate(values: { keyword?: string; classCode?: string; group?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextKeyword = values.keyword ?? keyword;
    const nextClass = values.classCode ?? classCode;
    const nextGroup = values.group ?? params.get("group") ?? "";

    if (nextKeyword.trim()) params.set("keyword", nextKeyword.trim());
    else params.delete("keyword");
    if (nextClass.trim()) params.set("classCode", nextClass.trim());
    else params.delete("classCode");
    if (nextGroup) params.set("group", nextGroup);
    else params.delete("group");
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    const timer = window.setTimeout(() => navigate({ keyword, classCode }), 350);
    return () => window.clearTimeout(timer);
    // Navigation must react only to the two text filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, classCode]);

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <label>
        <input
          aria-label="Tìm sinh viên"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Họ tên hoặc MSSV..."
          className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500"
        />
      </label>
      <label className="relative">
        <input
          aria-label="Lọc theo lớp"
          value={classCode}
          onChange={(event) => {
            setClassCode(event.target.value);
            setShowClassSuggestions(true);
          }}
          onFocus={() => setShowClassSuggestions(true)}
          onBlur={() => window.setTimeout(() => setShowClassSuggestions(false), 120)}
          placeholder="Nhập mã lớp..."
          autoComplete="off"
          className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500"
        />
        {showClassSuggestions && classSuggestions.length > 0 ? (
          <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            {classSuggestions.map((item) => (
              <button
                key={item}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setClassCode(item);
                  setShowClassSuggestions(false);
                }}
                className="block w-full px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-blue-50 hover:text-blue-800"
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}
      </label>
      <label>
        <select
          aria-label="Lọc theo phân loại"
          defaultValue={initialGroup}
          onChange={(event) => navigate({ group: event.target.value })}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none focus:border-blue-500"
        >
          <option value="">Tất cả phân loại</option>
          <optgroup label="Hồ sơ đã tham gia xét">
            {groups.filter((item) => item.value.startsWith("official_")).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </optgroup>
          <optgroup label="Sinh viên chưa tham gia xét">
            {groups.filter((item) => item.value.startsWith("candidate_")).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </optgroup>
        </select>
      </label>
    </div>
  );
}
