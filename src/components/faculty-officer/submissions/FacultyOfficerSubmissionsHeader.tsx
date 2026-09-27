import type { ReactNode } from "react";

export default function FacultyOfficerSubmissionsHeader({ termSelect }: { termSelect?: ReactNode }) {
  return (
    <section className="rounded-2xl bg-blue-900 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm text-blue-100/80">Hồ sơ khoa</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Duyệt hồ sơ vòng 2</h1>
        </div>
        {termSelect}
      </div>
    </section>
  );
}
