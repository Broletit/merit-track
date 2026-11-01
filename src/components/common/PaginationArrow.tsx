"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { scrollToTable } from "@/lib/ui/scrollToTable";

export default function PaginationArrow({href,direction,disabled}:{href:string;direction:"left"|"right";disabled:boolean}) {
  const router = useRouter();
  const anchor = useRef<HTMLSpanElement>(null);
  const shouldScroll = useRef(false);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (pending || !shouldScroll.current) return;
    const frame = requestAnimationFrame(() => {
      shouldScroll.current = false;
      scrollToTable(anchor.current);
    });
    return () => cancelAnimationFrame(frame);
  }, [pending]);
  const label=direction==="left"?"Trang trước":"Trang sau";
  const icon=<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d={direction==="left"?"M9 1 2 6l7 5Z":"M3 1l7 5-7 5Z"}/></svg>;
  const style="inline-flex h-10 w-8 shrink-0 items-center justify-center rounded-lg sm:w-10";
  return <span ref={anchor} className="contents">{disabled?<span aria-label={label} aria-disabled="true" className={style+" text-slate-300"}>{icon}</span>:<Link href={href} scroll={false} onNavigate={event => {
    event.preventDefault();
    if (pending) return;
    shouldScroll.current = true;
    startTransition(() => router.push(href, { scroll: false }));
  }} aria-label={label} aria-busy={pending} title={label} className={style+" text-slate-700 transition hover:bg-slate-100"}>{icon}</Link>}</span>;
}
