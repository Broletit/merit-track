export type ImportClassOption = {
  id: number;
  code: string;
  name: string;
};

export type ParsedImportStudentRow = {
  rowNumber: number;
  mssv: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
};

export type ImportPreviewRowStatus =
  | "create"
  | "same_class_unchanged"
  | "same_class_diff_info"
  | "different_class"
  | "invalid"
  | "duplicate_in_file";

export type ImportPreviewRow = {
  rowNumber: number;
  mssv: string;
  full_name: string;
  email: string | null;
  currentClass: string | null;
  status: ImportPreviewRowStatus;
  message: string;
};

export type ImportPreviewResult = {
  ok: boolean;
  message: string;
  targetClassId: number | null;
  total: number;
  creatable: number;
  sameClassUnchanged: number;
  sameClassDifferentInfo: number;
  differentClass: number;
  invalid: number;
  duplicateInFile: number;
  rows: ImportPreviewRow[];
};

export type ImportResultState = {
  ok: boolean;
  message: string;
  inserted: number;
  updated: number;
  attachedToClass: number;
  transferred: number;
  skippedExisting: number;
  conflicts: number;
  total: number;
  conflictMessages: string[];
};

export type ClassMode = "existing" | "new";

