export type OfficerActivityItem = {
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
  registrationStatus: string | null;
  canRegister: boolean;
};

export type OfficerActivityDetail = OfficerActivityItem & {
  qrCheckinEnabled: boolean;
};