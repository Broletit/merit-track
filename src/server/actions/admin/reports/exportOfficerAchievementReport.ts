"use server";

import { addCohortFilter } from "@/server/cohorts/sql";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll(`"`, `""`)}"`;
}

export async function exportOfficerAchievementReport(formData: FormData) {
  await requireAdminContext();

  const db = getDatabase();

  const termId = Number(formData.get("termId"));
  const eventId = Number(formData.get("eventId") ?? 0);
  const exportType = String(formData.get("exportType") ?? "passed");

  if (!Number.isFinite(termId) || termId <= 0) {
    throw new Error("Học kỳ không hợp lệ.");
  }

  const where: string[] = ["e.type = 'officer'", "e.term_id = ?"];
  const values: unknown[] = [termId];

  if (exportType === "passed") {
    where.push("s.status = 'passed'");
  }

  if (eventId > 0) {
    where.push("e.id = ?");
    values.push(eventId);
  }

  addCohortFilter(where,values,formData.get("cohort"),"u.cohort");
  const whereSql = `WHERE ${where.join(" AND ")}`;

  const rows = (await db.rows(`
      SELECT
        u.full_name,
        u.mssv,
        GROUP_CONCAT(c.code SEPARATOR ', ') AS class_codes,
        e.title AS event_title,
        s.status,
        s.score_total,
        s.submitted_at
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      LEFT JOIN class_members cm ON cm.user_id = u.id
      LEFT JOIN classes c ON c.id = cm.class_id
      ${whereSql}
      GROUP BY s.id
      ORDER BY s.score_total DESC, u.full_name ASC
      `, [...values])) as Array<Record<string, unknown>>;

  const header = [
    "Hạng",
    "Họ tên",
    "MSSV",
    "Lớp",
    "Đợt xét",
    "Trạng thái",
    "Điểm",
    "Ngày nộp",
  ];

  const csv = [
    header.map(csvEscape).join(";"),
    ...rows.map((item, index) =>
      [
        index + 1,
        item.full_name,
        item.mssv,
        item.class_codes,
        item.event_title,
        item.status,
        item.score_total,
        item.submitted_at,
      ]
        .map(csvEscape)
        .join(";")
    ),
  ].join("\n");

  return {
    fileName:
      exportType === "passed"
        ? "can-bo-doan-tieu-bieu.csv"
        : "bang-xep-hang-ho-so-can-bo.csv",
    content: `\uFEFF${csv}`,
  };
}
