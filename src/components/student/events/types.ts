export type StudentEventItem = {
  id: number;
  title: string;
  description: string;
  type: string;
  status: string;
  startAt: string;
  endAt: string;
  allowLate: boolean;
  submissionId?: number | null;
  submissionStatus: string | null;
};

export type StudentEventDetail = StudentEventItem & {
  canSubmit: boolean;
};

export type StudentEventCriteriaItem = {
  code: string;
  title: string;
  description: string | null;
  groupCode: string;
  groupTitle: string;
  isRequired: boolean;
  autoPassed: boolean;
  autoMessage: string | null;
};
