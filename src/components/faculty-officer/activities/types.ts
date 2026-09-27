export type FacultyOfficerActivityItem = {
  id: number;
  title: string;
  description: string;
  organizerLevel: string;
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

export type FacultyOfficerActivityDetail = FacultyOfficerActivityItem;

export type FacultyOfficerActivityRegistrationItem = {
  id: number;
  userId: number;
  fullName: string;
  mssv: string;
  classCode: string | null;
  className: string | null;
  status: string;
  registeredAt: string;
  checkedInAt: string | null;
};

export type FacultyOfficerActivityClassOption = {
  id: number;
  code: string;
  name: string;
};
