export type AdminSubmissionListItem = {
  id: number;
  studentName: string;
  eventTitle: string;
  className: string;
  classCode: string;
  status: string;
  submittedAt: string;
};

export type AdminSubmissionSummary = {
  submissionId: number;
  eventTitle: string;
  studentName: string;
  className: string;
  classCode: string;
  status: string;
};

export type AdminCriteriaItem = {
  code: string;
  title: string;
  description: string;
  evidenceType: string;
  isRequired: boolean;
  autoPassed: boolean;
  autoMessages: string[];
};

export type AdminCriteriaGroup = {
  code: string;
  title: string;
  description: string;
  minRequired: number;
  passedCount: number;
  passed: boolean;
  items: AdminCriteriaItem[];
};

export type AdminFinalSummary = {
  submissionPassed: boolean;
  groups: Array<{
    groupCode: string;
    passed: boolean;
    passedCount: number;
    required: number;
  }>;
};

export type AdminSubmissionFilterOption = {
  value: string;
  label: string;
};