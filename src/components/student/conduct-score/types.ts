export type StudentConductScoreSummaryData = {
  totalScore: number;
  activityCount: number;
  pendingActivityCount: number;
};

export type StudentConductScoreItem = {
  id: number;
  activityId: number;
  title: string;
  startAt: string;
  endAt: string;
  registrationStatus: string;
  checkedInAt: string | null;
  conductScore: number;
  scoreAdded: boolean;
  scoreValue: number | null;
};