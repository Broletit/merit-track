export type AdminEventItem = {
  id: number;
  title: string;
  description: string;
  type: string;
  status: string;
  startAt: string;
  endAt: string;
  allowLate: boolean;
  templateName: string | null;
  submissions: number;
};

export type AdminCriteriaTemplateOption = {
  id: number;
  name: string;
  forType: string;
};

export type AdminEventClassOption = {
  id: number;
  code: string;
  name: string;
};

export type AdminEventReviewerOption = {
  id: number;
  fullName: string;
  mssv: string;
  role: string;
};

export type AdminEventAssignmentItem = {
  id: number;
  classId: number;
  classCode: string;
  className: string;
  reviewerV1Id: number;
  reviewerV1Name: string;
  reviewerV2Id: number;
  reviewerV2Name: string;
};
