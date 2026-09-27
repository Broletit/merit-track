export type LoginRoleContext =
  | "student"
  | "class_officer"
  | "faculty_officer"
  | "admin";

export const LOGIN_ROLE_OPTIONS: Array<{
  value: LoginRoleContext;
  label: string;
}> = [
  { value: "student", label: "Người dùng" },
  { value: "class_officer", label: "Cán bộ lớp" },
  { value: "faculty_officer", label: "Cán bộ khoa" },
  { value: "admin", label: "Quản trị viên" },
];

export function normalizeLoginRoleContext(
  value: FormDataEntryValue | string | null | undefined
): LoginRoleContext {
  if (
    value === "admin" ||
    value === "class_officer" ||
    value === "faculty_officer"
  ) {
    return value;
  }

  return "student";
}

export function getDefaultRouteByRoleContext(role: LoginRoleContext) {
  switch (role) {
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

export function getUiLabelByLoginContext(role: LoginRoleContext) {
  switch (role) {
    case "admin":
      return "Quản trị viên";
    case "class_officer":
      return "Cán bộ Lớp";
    case "faculty_officer":
      return "Cán bộ Khoa";
    case "student":
    default:
      return "Sinh viên";
  }
}

export function getDefaultLoginContextAfterLogin(userRole: string): LoginRoleContext {
  if (userRole === "admin") return "admin";
  return "student";
}

export function getAvailableLoginContexts(userRole: string): LoginRoleContext[] {
  if (userRole === "admin") return ["admin"];
  if (userRole === "faculty_officer") return ["student", "faculty_officer"];
  if (userRole === "class_officer") return ["student", "class_officer"];
  return ["student"];
}

export function canUseLoginContext(userRole: string, context: LoginRoleContext) {
  return getAvailableLoginContexts(userRole).includes(context);
}