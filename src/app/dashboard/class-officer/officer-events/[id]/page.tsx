import { OfficerEventDetailPageView } from "@/app/dashboard/faculty-officer/officer-events/[id]/page";

export default async function ClassOfficerEventDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <OfficerEventDetailPageView
      {...props}
      basePath="/dashboard/class-officer/officer-events"
      submissionBasePath="/dashboard/class-officer/officer-submissions"
    />
  );
}
