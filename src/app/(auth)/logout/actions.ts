"use server";

import { redirect } from "next/navigation";
import { revokeCurrentSession } from "@/server/auth/session";

export async function logoutAction() {
  await revokeCurrentSession();
  redirect("/login");
}