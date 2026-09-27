import { OfficerEventsPageView } from "@/app/dashboard/faculty-officer/officer-events/page";

export default async function ClassOfficerEventsPage(props: {
  searchParams: Promise<{ keyword?: string; submission?: string; phase?: string; termId?: string; page?: string }>;
}) {
  return <OfficerEventsPageView {...props} basePath="/dashboard/class-officer/officer-events" />;
}
