export type AdminStudentItem = {
  id: number;
  mssv: string;
  fullName: string;
  email: string | null;
  isActive: boolean;
  classId: number | null;
  classCode: string | null;
  className: string | null;
};

export type AdminStudentClassOption = {
  id: number;
  code: string;
  name: string;
};

export type StudentDetailSummary = {
  id: number;
  mssv: string;
  full_name: string;
  email: string | null;
  class_id: number;
  class_code: string;
  class_name: string;
};

export type AdminClassOption = AdminStudentClassOption;
