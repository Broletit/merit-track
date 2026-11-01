import SiteFooter from "@/components/layout/SiteFooter";

export default function AuthLayout({children}: {children: React.ReactNode}) {
  return <div className="flex min-h-dvh flex-col bg-slate-50"><div className="flex flex-1 flex-col [&>main]:flex-1">{children}</div><SiteFooter /></div>;
}
