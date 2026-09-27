import {
  requireAdminContext,
  requireClassOfficerContext,
  requireFacultyOfficerContext,
} from "@/server/auth/guards";

export type ReviewerContext = {
  id: number;
  role: "class_officer" | "faculty_officer" | "admin";
  full_name?: string;
};

export async function requireReviewerContext(): Promise<ReviewerContext> {
  try {
    const admin = await requireAdminContext();

    return {
      id: Number(admin.id),
      role: "admin",
      full_name: admin.full_name,
    };
  } catch {
    // thử tiếp role khác
  }

  try {
    const facultyOfficer = await requireFacultyOfficerContext();

    return {
      id: Number(facultyOfficer.id),
      role: "faculty_officer",
      full_name: facultyOfficer.full_name,
    };
  } catch {
    // thử tiếp role khác
  }

  try {
    const classOfficer = await requireClassOfficerContext();

    return {
      id: Number(classOfficer.id),
      role: "class_officer",
      full_name: classOfficer.full_name,
    };
  } catch {
    throw new Error("Bạn không có quyền xét duyệt hồ sơ.");
  }
}