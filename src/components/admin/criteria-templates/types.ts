export type AdminCriteriaTemplateItem = {
  id: number;
  name: string;
  description: string | null;
  forType: string;
  groups: number;
  criteria: number;
  usedEvents: number;
  createdAt: string;
};

export type AdminCriteriaTemplateDetail = {
  id: number;
  name: string;
  description: string | null;
  forType: string;
};

export type CriteriaTemplateGroupItem = {
  id: number;
  code: string;
  title: string;
  description: string | null;
  minRequired: number;
  sortOrder: number;
  criteriaCount: number;
};

export type CriteriaTemplateCriteriaItem = {
  id: number;
  groupCode: string | null;
  code: string;
  title: string;
  description: string | null;
  scoreMax: number;
  evidenceType: string;
  isRequired: boolean;
  sortOrder: number;
  activityRules: CriteriaTemplateActivityRule[];
  conductRule: CriteriaTemplateConductRule | null;
};

export type CriteriaTemplateActivityRule = {
  id: number;
  activityId: number;
  activityTitle: string;
};

export type CriteriaTemplateConductRule = {
  id: number;
  minScore: number;
  periodScope: string;
};

export type CriteriaTemplateActivityOption = {
  id: number;
  title: string;
};
