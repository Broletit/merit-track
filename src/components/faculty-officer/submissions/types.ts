export type FacultyOfficerSubmissionItem = {
  id: number;
  studentName: string;
  eventTitle: string;
  className: string;
  classCode: string;
  status: string;
  submittedAt: string;
};

export type FacultyOfficerSubmissionFilterOption = {
  value: string;
  label: string;
};