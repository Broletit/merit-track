import { OfficerSubmissionsPageView } from "@/app/dashboard/faculty-officer/officer-submissions/page";

export default async function ClassOfficerSubmissionsPage(props: {
  searchParams: Promise<{
    keyword?: string;
    status?: string;
    sort?: string;
    termId?: string;
    page?: string;
  }>;
}) {
  return (
    <OfficerSubmissionsPageView
      {...props}
      basePath="/dashboard/class-officer/officer-submissions"
      eventsPath="/dashboard/class-officer/officer-events"
    />
  );
}
