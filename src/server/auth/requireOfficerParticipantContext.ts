import { redirect } from "next/navigation";
import { requireLogin } from "@/server/auth/guards";

export async function requireOfficerParticipantContext() {
  const user = await requireLogin();

  const role = String(user.role ?? "");
  const loginContext = String(user.loginContext ?? "");

  const isAllowedRole =
    role === "faculty_officer" ||
    role === "class_officer" ||
    role === "admin";

  if (!isAllowedRole) {
    redirect("/dashboard/student");
  }

  const isAllowedContext =
    loginContext === "faculty_officer" ||
    loginContext === "class_officer" ||
    loginContext === "admin";

  if (!isAllowedContext) {
    redirect("/dashboard/student");
  }

  return user;
}