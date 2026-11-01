import { requireLogin, requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { parseCohort } from "@/lib/cohorts/cohorts";

export async function GET() {
  await requireLogin();
  const rows = (await getDatabase().rows("SELECT cohort FROM cohorts ORDER BY cohort", [])) as {cohort:number}[];
  return Response.json({cohorts:rows.map(row => row.cohort)});
}

export async function POST(request: Request) {
  await requireAdminContext();
  let body: {cohort?:unknown};
  try { body = await request.json(); } catch {
    return Response.json({message:"Dữ liệu thêm khóa không hợp lệ."},{status:400});
  }
  if (!body || typeof body !== 'object') return Response.json({message:"Dữ liệu thêm khóa không hợp lệ."},{status:400});
  const cohort = parseCohort(body.cohort);
  if (!cohort) return Response.json({message:"Khóa phải là số nguyên từ 17 đến 95."},{status:400});
  const inserted = (await getDatabase().execute("INSERT IGNORE INTO cohorts(cohort) VALUES (?)", [cohort]));
  if (!inserted.changes) return Response.json({message:`Khóa ${cohort} đã tồn tại. Vui lòng chọn khóa có sẵn.`},{status:409});
  const rows = (await getDatabase().rows("SELECT cohort FROM cohorts ORDER BY cohort", [])) as {cohort:number}[];
  return Response.json({cohorts:rows.map(row => row.cohort), message:`Đã thêm Khóa ${cohort}.`},{status:201});
}
