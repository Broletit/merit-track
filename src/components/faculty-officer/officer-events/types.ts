export type OfficerEventDetail = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  startAt: string;
  endAt: string;
  allowLate: boolean;
  publishedAt: string | null;
  createdAt: string | null;
  templateName: string | null;
  templateDescription: string | null;
  criteriaTemplateId: number | null;
  groupsCount: number;
  criteriaCount: number;
};

export type OfficerEventSubmissionItem = {
  id: number;
  status: string;
  scoreTotal: number;
  submittedAt: string | null;
  updatedAt: string;
};

export type OfficerEventCriteriaItem = {
  code: string;
  title: string;
  description: string | null;
  groupCode: string;
  groupTitle: string;
  scoreMax: number;
  isRequired: boolean;
  autoPassed: boolean;
  autoMessage: string | null;
  matchedActivityCount: number;
  matchedActivityScore: number;
  matchedActivityTitles: string[];
};
