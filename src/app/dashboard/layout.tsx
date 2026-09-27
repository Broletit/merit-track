import { requireAuth } from "@/server/auth/guards";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return <DashboardLayout user={user}>{children}</DashboardLayout>;
}