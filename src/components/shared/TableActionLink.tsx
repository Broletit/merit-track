import Link from "next/link";

const variants = {
  view: "border-blue-300 text-blue-700 hover:bg-blue-50",
  edit: "border-slate-300 text-slate-700 hover:bg-slate-50",
};

const disabledVariants = {
  view: "border-blue-300 text-blue-700",
  edit: "border-slate-300 text-slate-700",
};

export default function TableActionLink({ href, children, variant, disabled = false, disabledReason }: { href: string; children: React.ReactNode; variant: keyof typeof variants; disabled?: boolean; disabledReason?: string }) {
  if (disabled) {
    return <span title={disabledReason} aria-disabled="true" className={`inline-flex h-8 shrink-0 cursor-not-allowed items-center justify-center whitespace-nowrap rounded-lg border bg-white px-3 text-xs font-semibold opacity-40 ${disabledVariants[variant]}`}>{children}</span>;
  }
  return <Link href={href} className={`inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border bg-white px-3 text-xs font-semibold transition ${variants[variant]}`}>{children}</Link>;
}
