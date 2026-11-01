import type { Database } from "@/server/db/mysql";

export async function assertSameClassCohort(db:Database,userId:number,classId:number) {
  const row=(await db.first(`SELECT u.cohort user_cohort,cc.cohort class_cohort,c.is_active FROM users u
    JOIN classes c ON c.id=? JOIN class_cohort_links cc ON cc.class_id=c.id WHERE u.id=?`, [classId, userId])) as {user_cohort:number|null;class_cohort:number;is_active:number}|undefined;
  if (!row || !row.is_active) throw new Error("Người dùng hoặc lớp chưa xác định khóa, hoặc lớp đã ngừng hoạt động.");
  if (!row.user_cohort) throw new Error("Cần xác định khóa của sinh viên trước khi chuyển lớp.");
  if (row.user_cohort!==row.class_cohort) throw new Error(`Sinh viên Khóa ${row.user_cohort} chỉ được chuyển sang lớp thuộc Khóa ${row.user_cohort}.`);
}

export async function getTransferClassOptions(db:Database,userId:number) {
  return (await db.rows(`SELECT c.id,c.code,c.name,cc.cohort FROM classes c JOIN class_cohort_links cc ON cc.class_id=c.id
    JOIN users u ON u.cohort=cc.cohort WHERE u.id=? AND c.is_active=1 ORDER BY c.code,c.id`, [userId])) as {id:number;code:string;name:string;cohort:number}[];
}
