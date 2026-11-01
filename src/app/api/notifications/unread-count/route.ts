import { requireLogin } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
export async function GET() {
  const user = await requireLogin();
  const row = (await getDatabase().first('SELECT COUNT(*) count FROM notifications WHERE user_id=? AND role_context=? AND is_read=0', [user.id, user.loginContext ?? "student"])) as {count:number};
  return Response.json({count:row.count},{headers:{'Cache-Control':'no-store'}});
}
