"use client";
import FieldError from "@/components/common/FieldError";
import { classDraftErrors } from "@/lib/classes/classDraft";
import RequiredMark from "@/components/common/RequiredMark";


import useCohorts from "@/components/shared/useCohorts";
import { useState } from "react";
import toast from "react-hot-toast";
import type { ClassMode, ImportClassOption } from "./types";

export default function StudentsImportClassForm({
  classes,
  onSelectionChange,
}: {
  classes: ImportClassOption[];
  onSelectionChange: (ready: boolean) => void;
}) {
  const [code,setCode]=useState("");
  const [name,setName]=useState("");
  const [faculty,setFaculty]=useState("");
  const errors=classDraftErrors(classes,code,name,faculty);
  const majors=Array.from(new Set(classes.map(item=>item.faculty?.trim()).filter((item):item is string=>Boolean(item)))).sort((a,b)=>a.localeCompare(b,"vi"));
  const {cohorts,setCohorts}=useCohorts();
  const [adding,setAdding]=useState(false);
  const [newCohort,setNewCohort]=useState("");
  const [saving,setSaving]=useState(false);
  const [cohortError,setCohortError]=useState("");
  async function addCohort(){
    const requested = newCohort.trim();
    if (!requested) { setCohortError("Vui lòng nhập số khóa mới."); return; }
    const number = Number(requested);
    if (!Number.isInteger(number) || number < 17 || number > 95) { setCohortError("Khóa phải là số nguyên từ 17 đến 95."); return; }
    if (cohorts.includes(number)) { setCohortError(`Khóa ${number} đã tồn tại. Vui lòng chọn khóa có sẵn.`); return; }
    setSaving(true); setCohortError("");
    try {
      const response=await fetch("/api/cohorts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({cohort:number})});
      if (response.status >= 500) throw new Error("Máy chủ chưa thể thêm khóa. Vui lòng thử lại.");
      if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("Không thể nhận kết quả thêm khóa. Vui lòng tải lại trang rồi thử lại.");
      const data=await response.json();
      if(!response.ok) throw new Error(data.message || "Không thể thêm khóa. Vui lòng thử lại.");
      setCohorts(data.cohorts); setCohort(String(number)); setAdding(false); setNewCohort(""); onSelectionChange(false);
      toast.success(data.message || `Đã thêm Khóa ${number}.`);
    } catch(error) { setCohortError(error instanceof TypeError ? "Không thể kết nối máy chủ. Vui lòng thử lại." : error instanceof Error ? error.message : "Không thể thêm khóa."); }
    finally { setSaving(false); }
  }
  const [cohort,setCohort] = useState("");
  const [mode, setMode] = useState<ClassMode>("existing");

  const cohortField = (
    <div className="text-sm font-medium text-slate-600">
      <div className="flex items-center justify-between gap-2"><label htmlFor="import-cohort">Khóa<RequiredMark required={true}/></label><button type="button" disabled={saving} onClick={()=>{setAdding(!adding);setCohortError("");onSelectionChange(false);}} className="text-sm font-medium text-blue-700">{adding?"Hủy":"+ Thêm khóa mới"}</button></div>
      {!adding ? <select
        id="import-cohort"
        name="cohort"
        required
        value={cohort}
        onChange={(event) => setCohort(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4"
      >
        <option value="">Chọn khóa</option>
        {cohorts.map((item) => <option key={item} value={item}>Khóa {item}</option>)}
      </select> : null}
      {adding?<span className="mt-2 flex flex-wrap gap-2"><input id="import-cohort" type="number" min="17" max="95" aria-label="Số khóa mới" aria-invalid={Boolean(cohortError)} aria-describedby={cohortError ? "import-cohort-error" : undefined} value={newCohort} onChange={event=>{setNewCohort(event.target.value);setCohortError("");}} placeholder="Ví dụ: 22" className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3"/><button type="button" disabled={saving||!newCohort} onClick={addCohort} className="rounded-xl bg-blue-700 px-4 py-2 text-white disabled:opacity-50">{saving?"Đang lưu...":"Tạo khóa"}</button></span>:null}
      {cohortError?<span id="import-cohort-error" role="alert" className="mt-2 block text-sm text-red-600">{cohortError}</span>:null}
    </div>
  );

  return (
    <section
      className="h-full rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60"
      onChange={(event) => {
        const section = event.currentTarget;
        const value = (name: string) => section.querySelector<HTMLInputElement | HTMLSelectElement>("[name=" + name + "]")?.value.trim() ?? "";
        if ((event.target as HTMLInputElement).name === "cohort" && mode === "existing") { onSelectionChange(false); return; }
        onSelectionChange(Boolean(value("cohort")) && (mode === "existing" ? Boolean(value("classId")) : Boolean(value("newClassCode") && value("newClassName") && value("newClassFaculty")) && !Object.values(classDraftErrors(classes,value("newClassCode"),value("newClassName"),value("newClassFaculty"))).some(Boolean)));
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-slate-900">
        Chọn lớp import
      </h2>

      <input type="hidden" name="classMode" value={mode} />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => { if (mode !== "existing") { setMode("existing"); onSelectionChange(false); } }}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            mode === "existing"
              ? "bg-blue-700 text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Chọn lớp có sẵn
        </button>

        <button
          type="button"
          onClick={() => { if (mode !== "new") { setMode("new"); onSelectionChange(false); } }}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            mode === "new"
              ? "bg-blue-700 text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Tạo lớp mới
        </button>
      </div>
      </div>

      {mode === "existing" ? (
        <div className="mt-5">
          <div className="mb-4">{cohortField}</div>
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Lớp có sẵn
          <RequiredMark required={mode === "existing"}/></label>
          <select
            key={cohort}
            name="classId"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500"
            defaultValue=""
            required={mode === "existing"}
          >
            <option value="">-- Chọn lớp --</option>
            {classes.filter(item=>!cohort || !item.cohort || item.cohort===Number(cohort)).map((item) => (
              <option key={item.id} value={item.id}>
                {item.code}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {cohortField}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Mã lớp
            <RequiredMark required={mode === "new"}/></label>
            <input
              name="newClassCode"
              value={code} onChange={event=>setCode(event.target.value)} aria-invalid={Boolean(code && errors.code)} aria-describedby={code && errors.code?"new-class-code-error":undefined}
              placeholder="Ví dụ: DHTH17A"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500"
              required={mode === "new"}
            />
            <FieldError id="new-class-code-error" message={code ? errors.code : null} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Tên lớp
            <RequiredMark required={mode === "new"}/></label>
            <input
              name="newClassName"
              value={name} onChange={event=>setName(event.target.value)} aria-invalid={Boolean(name && errors.name)} aria-describedby={name && errors.name?"new-class-name-error":undefined}
              placeholder="Ví dụ: Lớp DHTH17A"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500"
              required={mode === "new"}
            />
            <FieldError id="new-class-name-error" message={name ? errors.name : null} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Ngành<RequiredMark/>
            </label>
            <input
              name="newClassFaculty" required list="import-existing-majors"
              value={faculty} onChange={event=>setFaculty(event.target.value)}
              placeholder="Chọn ngành có sẵn hoặc nhập ngành mới"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500"
            />
            <datalist id="import-existing-majors">{majors.map(major=><option key={major} value={major}/>)}</datalist>
          </div>


        </div>
      )}
    </section>
  );
}
