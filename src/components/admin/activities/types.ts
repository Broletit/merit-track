export type ActivityClassOption = {
  cohort?: number | null;
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
  hasChildren?: boolean;
};

export type ActivityCreateState = {
  ok: boolean;
  message: string;
  revision?: number;
  field?: string;
  values?: {
    maxRegistrations: string;
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
    cohorts: string[];
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
  absencePenalty: number;
  qrCheckinEnabled: boolean;
  participants: number;
  attended: number;
};

export type ActivityEditDetail = {
  maxRegistrations: number | null;
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
  absencePenalty: number;
  conductCategoryId: number | null;
  qrCheckinEnabled: boolean;
  selectedClassIds: number[];
  selectedCohorts: number[];
  organizerLevel: string;
  selectedCriteriaBindings: string[];
  attendedCount: number;
  participantCount: number;
  editMode: "full" | "limited" | "extension";
};
