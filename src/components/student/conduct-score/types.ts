export type StudentConductScoreSummaryData = {
  totalScore: number;
  activityCount: number;
  pendingActivityCount: number;
  addedScore: number;
  deductedScore: number;
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
  absencePenalty: number;
  scoreAdded: boolean;
  scoreValue: number | null;
};
