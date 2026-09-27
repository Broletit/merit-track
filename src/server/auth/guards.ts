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

  return user;
}

export async function requireAuth() {
  return requireLogin();
}

export async function requireAdmin() {
  const user = await requireLogin();
  const loginContext = (user.loginContext ?? "student") as LoginRoleContext;

  if (user.role !== "admin") {
    redirect(getDashboardPathByContext(loginContext));
  }

  return user;
}

export async function requireClassOfficer() {
  const user = await requireLogin();
  const loginContext = (user.loginContext ?? "student") as LoginRoleContext;

  if (user.role !== "class_officer" && user.role !== "admin") {
    redirect(getDashboardPathByContext(loginContext));
  }

  return user;
}

export async function requireFacultyOfficer() {
  const user = await requireLogin();
  const loginContext = (user.loginContext ?? "student") as LoginRoleContext;

  if (user.role !== "faculty_officer" && user.role !== "admin") {
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
  return requireLoginContext("student");
}

export async function requireAdminContext() {
  const user = await requireLoginContext("admin");

  if (user.role !== "admin") {
    redirect("/dashboard/student");
  }

  return user;
}

export async function requireClassOfficerContext() {
  const user = await requireLoginContext("class_officer");

  if (user.role !== "class_officer" && user.role !== "admin") {
    redirect("/dashboard/student");
  }

  return user;
}

export async function requireFacultyOfficerContext() {
  const user = await requireLoginContext("faculty_officer");

  if (user.role !== "faculty_officer" && user.role !== "admin") {
    redirect("/dashboard/student");
  }

  return user;
}