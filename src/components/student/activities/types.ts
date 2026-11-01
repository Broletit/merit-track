export type StudentActivityItem = {
  capacityFull?: boolean;
  maxRegistrations?: number | null;
  id: number;
  title: string;
  description: string;
  audienceType: string;
  startAt: string;
  endAt: string;
  registrationStartAt: string;
  registrationEndAt: string;
  conductScore: number;
  absencePenalty: number;
  canRegister: boolean;
  registrationStatus: string | null;
  participationSource?: string;
  categoryLabel?: string | null;
  categoryParentLabel?: string | null;
  categoryScore?: number;
  categoryMax?: number;
  projectedScore?: number;
};

export type StudentActivityDetail = StudentActivityItem & {
  qrCheckinEnabled: boolean;
};
