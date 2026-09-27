import type { Metadata } from "next";
import "./globals.css";
import { ensureDb } from "@/server/db/sqlite";
import AppToaster from "@/components/shared/AppToaster";
import FormUxGuard from "@/components/shared/FormUxGuard";
import GlobalInteractionLoading from "@/components/shared/GlobalInteractionLoading";

export const metadata: Metadata = {
  title: "Thi đua - Khen thưởng FET",
  description: "Hệ thống Thi đua - Khen thưởng FET",
};

ensureDb();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>
        <GlobalInteractionLoading />
        {children}
        <AppToaster />
        <FormUxGuard />
      </body>
    </html>
  );
}
