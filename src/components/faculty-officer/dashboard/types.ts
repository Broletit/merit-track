export type FacultyOfficerStats = {
  totalActivities: number;
  totalEvents: number;
  pendingRound2: number;
  todayCheckins: number;
  totalClasses: number;
};

export type FacultyOfficerActivityItem = {
  id: number;
  title: string;
  startAt: string;
  endAt: string;
  participants: number;
};

export type FacultyOfficerClassItem = {
  id: number;
  code: string;
  name: string;
};