export type CheckinActivityOption = {
  id: number;
  title: string;
  audienceType: string;
  startAt: string;
  endAt: string;
  qrCheckinEnabled: boolean;
};

export type CheckinLogActivityOption = {
  id: number;
  title: string;
};

export type AttendanceLogItem = {
  id: number;
  activityTitle: string;
  fullName: string | null;
  mssv: string | null;
  scannedAt: string;
  result: string;
  note: string | null;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};