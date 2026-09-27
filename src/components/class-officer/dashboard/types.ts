export type ClassOfficerStats = {
  myClassStudents: number;
  totalActivities: number;
  totalEvents: number;
  pendingRound1: number;
  className: string;
  classCode: string;
};

export type ClassOfficerRecentSubmissionItem = {
  id: number;
  studentName: string;
  eventTitle: string;
  status: string;
  submittedAt: string;
};