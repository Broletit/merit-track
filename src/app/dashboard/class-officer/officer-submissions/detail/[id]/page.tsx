import { OfficerSubmissionDetailPageView } from "@/app/dashboard/faculty-officer/officer-submissions/detail/[id]/page";

export default async function ClassOfficerSubmissionDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <OfficerSubmissionDetailPageView
      {...props}
      basePath="/dashboard/class-officer/officer-submissions"
    />
  );
}
