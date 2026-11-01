import { redirect } from "next/navigation";

export default function LegacyAdminStudentsPage() {
  redirect("/dashboard/admin/users");
}
