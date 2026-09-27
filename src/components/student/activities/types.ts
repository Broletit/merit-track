export type StudentActivityItem = {
  id: number;
  title: string;
  description: string;
  audienceType: string;
  startAt: string;
  endAt: string;
  registrationStartAt: string;
  registrationEndAt: string;
  conductScore: number;
  canRegister: boolean;
  registrationStatus: string | null;
  participationSource?: string;
  categoryLabel?: string | null;
  categoryScore?: number;
  categoryMax?: number;
  projectedScore?: number;
  canCancel?: boolean;
};

export type StudentActivityDetail = StudentActivityItem & {
  qrCheckinEnabled: boolean;
};
