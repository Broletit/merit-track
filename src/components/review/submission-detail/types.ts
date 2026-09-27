export type ReviewSubmissionSummary = {
  submissionId: number;
  eventTitle: string;
  studentName: string;
  className: string;
  classCode: string;
  status: string;
};

export type ReviewCriteriaItem = {
  code: string;
  title: string;
  description: string;
  evidenceType: string;
  isRequired: boolean;
  autoPassed: boolean;
  autoMessages: string[];
};

export type ReviewCriteriaGroup = {
  code: string;
  title: string;
  description: string;
  minRequired: number;
  passedCount: number;
  passed: boolean;
  items: ReviewCriteriaItem[];
};

export type ReviewFinalSummary = {
  submissionPassed: boolean;
  groups: Array<{
    groupCode: string;
    passed: boolean;
    passedCount: number;
    required: number;
  }>;
};