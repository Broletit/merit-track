import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/getSessionUser";
import type { LoginRoleContext } from "./role-context";

function getDashboardPathByContext(context: LoginRoleContext) {
  switch (context) {
    case "admin":
      return "/dashboard/admin";
    case "class_officer":
      return "/dashboard/class-officer";
    case "faculty_officer":
      return "/dashboard/faculty-officer";
    case "student":
    default:
      return "/dashboard/student";
  }
}

export async function requireLogin() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.is_active) {
    redirect("/login");
  }
  if (Number(user.must_change_pw) === 1) redirect("/change-password");

  return user;
}

export async function requireAuth() {
  return (await requireLogin());
}

export async function requireAdmin() {
  const user = await requireLogin();
  const loginContext = (user.loginContext ?? "student") as LoginRoleContext;

  if (!user.roles.includes("admin")) {
    redirect(getDashboardPathByContext(loginContext));
  }

  return user;
}

export async function requireClassOfficer() {
  const user = await requireLogin();
  const loginContext = (user.loginContext ?? "student") as LoginRoleContext;

  if (!user.roles.includes("class_officer") && !user.roles.includes("admin")) {
    redirect(getDashboardPathByContext(loginContext));
  }

  return user;
}

export async function requireFacultyOfficer() {
  const user = await requireLogin();
  const loginContext = (user.loginContext ?? "student") as LoginRoleContext;

  if (!user.roles.includes("faculty_officer") && !user.roles.includes("admin")) {
    redirect(getDashboardPathByContext(loginContext));
  }

  return user;
}

export async function requireLoginContext(expected: LoginRoleContext) {
  const user = await requireLogin();
  const loginContext = (user.loginContext ?? "student") as LoginRoleContext;

  if (loginContext !== expected) {
    redirect(getDashboardPathByContext(loginContext));
  }

  return user;
}

export async function requireStudentContext() {
  return (await requireLoginContext("student"));
}

export async function requireAdminContext() {
  const user = await requireLoginContext("admin");

  if (!user.roles.includes("admin")) {
    redirect("/dashboard/student");
  }

  return user;
}

export async function requireClassOfficerContext() {
  const user = await requireLoginContext("class_officer");

  if (!user.roles.includes("class_officer") && !user.roles.includes("admin")) {
    redirect("/dashboard/student");
  }

  return user;
}

export async function requireFacultyOfficerContext() {
  const user = await requireLoginContext("faculty_officer");

  if (!user.roles.includes("faculty_officer") && !user.roles.includes("admin")) {
    redirect("/dashboard/student");
  }

  return user;
}
