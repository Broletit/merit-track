import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/getSessionUser";

export default async function HomePage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  switch (user.loginContext) {
    case "admin":
      redirect("/dashboard/admin");
    case "class_officer":
      redirect("/dashboard/class-officer");
    case "faculty_officer":
      redirect("/dashboard/faculty-officer");
    case "student":
    default:
      redirect("/dashboard/student");
  }
}