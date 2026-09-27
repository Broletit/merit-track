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
    role: string;
    loginContext?: string;
  };
}) {
  const loginContext = user.loginContext ?? "student";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar role={loginContext} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          fullName={user.full_name}
          role={user.role}
          loginContext={loginContext}
          roleLabel={getUiLabelByLoginContext(loginContext as never)}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}