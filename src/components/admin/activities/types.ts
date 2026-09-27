export type ActivityClassOption = {
  id: number;
  code: string;
  name: string;
};

export type ActivityCriteriaOption = {
  templateId: number;
  templateName: string;
  groupCode: string;
  criteriaCode: string;
  title: string;
};

export type ConductCategoryOption = {
  id: number;
  code: string;
  name: string;
  scoreMax: number;
  parentId?: number | null;
  depth?: number;
};

export type ActivityCreateState = {
  ok: boolean;
  message: string;
  revision?: number;
  field?: string;
  values?: {
    title: string;
    description: string;
    audienceType: string;
    status: string;
    conductScore: string;
    qrCheckinEnabled: boolean;
    registrationStartAt: string;
    registrationEndAt: string;
    startAt: string;
    endAt: string;
    scopeMode: string;
    classIds: string[];
    organizerLevel: string;
    participationSource: string;
    conductCategoryId: string;
  };
};

export type AdminActivityItem = {
  id: number;
  title: string;
  description: string;
  audienceType: string;
  status: string;
  startAt: string;
  endAt: string;
  registrationStartAt: string;
  registrationEndAt: string;
  conductScore: number;
  qrCheckinEnabled: boolean;
  participants: number;
  attended: number;
};

export type ActivityEditDetail = {
  id: number;
  title: string;
  description: string;
  audienceType: string;
  status: string;
  startAt: string;
  endAt: string;
  registrationStartAt: string;
  registrationEndAt: string;
  conductScore: number;
  conductCategoryId: number | null;
  qrCheckinEnabled: boolean;
  selectedClassIds: number[];
  selectedCriteriaBindings: string[];
  attendedCount: number;
  participantCount: number;
  editMode: "full" | "limited" | "extension";
};
