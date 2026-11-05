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

function normalizeRoles(userRoles: string | string[]) {
  return Array.isArray(userRoles) ? userRoles : [userRoles];
}

export function getDefaultLoginContextAfterLogin(userRoles: string | string[]): LoginRoleContext {
  if (normalizeRoles(userRoles).includes("admin")) return "admin";
  return "student";
}

export function getAvailableLoginContexts(userRoles: string | string[]): LoginRoleContext[] {
  const roles = normalizeRoles(userRoles);
  if (roles.includes("admin")) return ["admin"];
  return ["student", ...(roles.includes("class_officer") ? ["class_officer" as const] : []), ...(roles.includes("faculty_officer") ? ["faculty_officer" as const] : [])];
}

export function canUseLoginContext(userRoles: string | string[], context: LoginRoleContext) {
  return getAvailableLoginContexts(userRoles).includes(context);
}
