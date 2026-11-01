import { isValidGmailAddress } from "@/lib/validation/gmail";
import SiteFooter from "./SiteFooter";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { getUiLabelByLoginContext } from "@/server/auth/role-context";

export default function DashboardLayout({
  children,
  user,
}: {
  children: React.ReactNode;
  user: {
    full_name: string;
    email?: string | null;
    role: string;
    loginContext?: string;
  };
}) {
  const loginContext = user.loginContext ?? "student";
  const emailMissing = user.role !== "admin" && !isValidGmailAddress(user.email);

  return (
    <div className="dashboard-shell flex h-dvh overflow-hidden bg-slate-50">
      <Sidebar role={loginContext} emailMissing={emailMissing} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          fullName={user.full_name}
          role={user.role}
          loginContext={loginContext}
          emailMissing={emailMissing}
          roleLabel={getUiLabelByLoginContext(loginContext as never)}
        />

        <main className="min-h-0 min-w-0 flex-1 overflow-auto">
          <div className="flex min-h-full min-w-0 flex-col"><div className="min-w-0 flex-1 p-3 sm:p-6">{children}</div><SiteFooter /></div>
        </main>
      </div>
    </div>
  );
}
