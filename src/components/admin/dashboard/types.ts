export type AdminStats = {
  totalStudents: number;
  totalActivities: number;
  totalParticipations: number;
  totalCampaigns: number;
};

export type ActivityItem = {
  id: number;
  title: string;
  start_at: string;
  end_at: string;
  participants: number;
};