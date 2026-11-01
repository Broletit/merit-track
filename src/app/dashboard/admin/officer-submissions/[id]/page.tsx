import { redirect } from "next/navigation";

export default async function AdminOfficerSubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/admin/officer-reviews/${id}?mode=view`);
}
