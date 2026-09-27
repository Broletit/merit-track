"use server";

import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll(`"`, `""`)}"`;
}

export async function exportStudentAwardReport(formData: FormData) {
  await requireAdminContext();

  const db = getDb();

  const termId = Number(formData.get("termId"));
  const eventId = Number(formData.get("eventId") ?? 0);
  const classId = Number(formData.get("classId") ?? 0);
  const exportType = String(formData.get("exportType") ?? "passed");

  if (!Number.isFinite(termId) || termId <= 0) {
    throw new Error("Học kỳ không hợp lệ.");
  }
  if (!['passed', 'potential'].includes(exportType)) {
    throw new Error("Loại danh sách xuất không hợp lệ.");
  }

  const where: string[] = ["e.type = 'student'", "e.term_id = ?", "s.submitted_at IS NOT NULL"];
  const values: unknown[] = [termId];

  if (eventId > 0) {
    where.push("e.id = ?");
    values.push(eventId);
  }

  if (classId > 0) {
    where.push("s.class_id = ?");
    values.push(classId);
  }

  if (exportType === "passed") {
    where.push("s.status = 'passed'");
  } else {
    where.push("s.status IN ('submitted_v1','submitted_v2','needs_revision_v1','needs_revision_v2')");
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const rows = db
    .prepare(
      `
      SELECT
        u.full_name,
        u.mssv,
        c.code AS class_code,
        e.title AS event_title,
        CASE s.status
          WHEN 'submitted_v1' THEN 'Chờ duyệt vòng 1'
          WHEN 'submitted_v2' THEN 'Chờ duyệt vòng 2'
          WHEN 'needs_revision_v1' THEN 'Cần chỉnh sửa vòng 1'
          WHEN 'needs_revision_v2' THEN 'Cần chỉnh sửa vòng 2'
          WHEN 'passed' THEN 'Đạt'
          WHEN 'failed' THEN 'Không đạt'
          ELSE 'Đã đóng'
        END AS status,
        s.score_total,
        (
          SELECT COUNT(*)
          FROM event_criteria_items i
          WHERE i.event_id = s.event_id
        ) AS total_criteria,
        (
          SELECT COUNT(*)
          FROM event_criteria_items i
          WHERE i.event_id = s.event_id
        ) -
        (
          SELECT COUNT(DISTINCT i.code)
          FROM event_criteria_items i
          LEFT JOIN submission_auto_results ar
            ON ar.submission_id = s.id
           AND ar.criteria_code = i.code
           AND ar.passed = 1
          LEFT JOIN submission_files sf
            ON sf.submission_id = s.id
           AND sf.criteria_code = i.code
          LEFT JOIN submission_items si
            ON si.submission_id = s.id
           AND si.criteria_code = i.code
          WHERE i.event_id = s.event_id
            AND (
              (i.evidence_type = 'auto' AND ar.id IS NOT NULL)
              OR (i.evidence_type != 'auto' AND (
                ar.id IS NOT NULL
                OR sf.id IS NOT NULL
                OR NULLIF(TRIM(COALESCE(si.content_text, '')), '') IS NOT NULL
              ))
            )
        ) AS missing_count,
        (
          SELECT GROUP_CONCAT(i.title, '; ')
          FROM event_criteria_items i
          LEFT JOIN submission_auto_results ar
            ON ar.submission_id = s.id
           AND ar.criteria_code = i.code
           AND ar.passed = 1
          LEFT JOIN submission_files sf
            ON sf.submission_id = s.id
           AND sf.criteria_code = i.code
          LEFT JOIN submission_items si
            ON si.submission_id = s.id
           AND si.criteria_code = i.code
          WHERE i.event_id = s.event_id
            AND NOT (
              (i.evidence_type = 'auto' AND ar.id IS NOT NULL)
              OR (i.evidence_type != 'auto' AND (
                ar.id IS NOT NULL
                OR sf.id IS NOT NULL
                OR NULLIF(TRIM(COALESCE(si.content_text, '')), '') IS NOT NULL
              ))
            )
        ) AS missing_titles
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN users u ON u.id = s.user_id
      LEFT JOIN classes c ON c.id = s.class_id
      ${whereSql}
      ORDER BY c.code ASC, u.full_name ASC
      `
    )
    .all(...values) as Array<Record<string, unknown>>;

  const filtered = rows.filter((item) => {
    const missing = Number(item.missing_count ?? 0);
    return exportType === "potential"
      ? missing >= 1 && missing <= 2
      : missing === 0;
  });

  if (filtered.length === 0) {
    throw new Error(
      exportType === "potential"
        ? "Không có sinh viên tiềm năng phù hợp với bộ lọc hiện tại."
        : "Không có sinh viên đã đạt chuẩn phù hợp với bộ lọc hiện tại.",
    );
  }

  const header = [
    "Họ tên",
    "MSSV",
    "Lớp",
    "Đợt xét",
    "Trạng thái",
    "Điểm",
    "Tổng tiêu chí",
    "Số tiêu chí còn thiếu",
    "Tiêu chí còn thiếu",
  ];

  const csv = [
    header.map(csvEscape).join(";"),
    ...filtered.map((item) =>
      [
        item.full_name,
        item.mssv,
        item.class_code,
        item.event_title,
        item.status,
        item.score_total,
        item.total_criteria,
        item.missing_count,
        item.missing_titles,
      ]
        .map(csvEscape)
        .join(";")
    ),
  ].join("\n");

  return {
    fileName:
      exportType === "potential"
        ? "sinh-vien-tiem-nang.csv"
        : "sinh-vien-da-dat.csv",
    content: `\uFEFF${csv}`,
  };
}
