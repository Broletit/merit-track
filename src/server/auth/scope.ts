import { getDb } from "@/server/db/sqlite";
import { getSessionUser } from "@/server/auth/getSessionUser";

export type ClassOption = {
  id: number;
  code: string;
  name: string;
};

export type UserClassScope = {
  mode: "self_class" | "multi_class" | "all";
  classIds: number[];
  classes: ClassOption[];
};

export async function getUserClassScope(): Promise<UserClassScope> {
  const user = await getSessionUser();

  if (!user) {
    return {
      mode: "self_class",
      classIds: [],
      classes: [],
    };
  }

  const db = getDb();

  if (user.loginContext === "admin") {
    const rows = db
      .prepare(
        `
        SELECT id, code, name
        FROM classes
        ORDER BY name ASC, id ASC
        `
      )
      .all() as Array<{ id: number; code: string; name: string }>;

    return {
      mode: "all",
      classIds: rows.map((item) => Number(item.id)),
      classes: rows.map((item) => ({
        id: Number(item.id),
        code: String(item.code ?? ""),
        name: String(item.name ?? ""),
      })),
    };
  }

 if (user.loginContext === "faculty_officer") {
  const rows = db
    .prepare(
      `
      SELECT DISTINCT c.id, c.code, c.name
      FROM faculty_class_assignments fca
      INNER JOIN classes c ON c.id = fca.class_id
      WHERE fca.faculty_officer_id = ?
      ORDER BY c.name ASC, c.id ASC
      `
    )
    .all(user.id) as Array<{ id: number; code: string; name: string }>;

  return {
    mode: "multi_class",
    classIds: rows.map((item) => Number(item.id)),
    classes: rows.map((item) => ({
      id: Number(item.id),
      code: String(item.code ?? ""),
      name: String(item.name ?? ""),
    })),
  };
}

  const rows = db
    .prepare(
      `
      SELECT DISTINCT c.id, c.code, c.name
      FROM class_members cm
      INNER JOIN classes c ON c.id = cm.class_id
      WHERE cm.user_id = ?
      ORDER BY c.name ASC, c.id ASC
      `
    )
    .all(user.id) as Array<{ id: number; code: string; name: string }>;

  return {
    mode: "self_class",
    classIds: rows.map((item) => Number(item.id)),
    classes: rows.map((item) => ({
      id: Number(item.id),
      code: String(item.code ?? ""),
      name: String(item.name ?? ""),
    })),
  };
}