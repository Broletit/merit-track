import { Bell } from "lucide-react";
import Pagination from "@/components/common/Pagination";
import {
  MarkAllNotificationsReadButton,
  NotificationLink,
} from "@/components/student/notifications/NotificationActions";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import { requireLogin } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { resolveVacancyLink } from "@/lib/notifications/vacancyLink";

const PAGE_SIZE = 10;

type NotificationRow = {
  id: number;
  type: string;
  title: string;
  content: string | null;
  link: string | null;
  is_read: number;
  created_at: string;
};

export default async function StudentNotificationsPage({ searchParams }: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireLogin();
  const query = await searchParams;
  const requestedPage = Math.max(1, Number(query.page ?? 1) || 1);
  const db = getDatabase();
  const total = Number(((await db.first(`SELECT COUNT(1) AS total FROM notifications WHERE user_id = ? AND role_context = ?`, [user.id, user.loginContext ?? "student"])) as { total: number }).total);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const rows = (await db.rows(`SELECT id, type, title, content, link, is_read, created_at
     FROM notifications
     WHERE user_id = ? AND role_context = ?
     ORDER BY is_read ASC, CAST(created_at AS DATETIME(3)) DESC, id DESC
     LIMIT ? OFFSET ?`, [user.id, user.loginContext ?? "student", PAGE_SIZE, (page - 1) * PAGE_SIZE])) as NotificationRow[];

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-md shadow-slate-200/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Bell size={24} />
            <div>
              <h1 className="text-2xl font-semibold">Thông báo</h1>
            </div>
          </div>
          <MarkAllNotificationsReadButton />
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="divide-y divide-slate-100">
          {rows.length > 0 ? (await Promise.all(rows.map(async (item) => (
            <article key={item.id} className={`p-5 ${item.is_read ? "bg-white" : "bg-blue-50/50"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-slate-900">{item.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.content || "Không có nội dung bổ sung."}
                  </p>
                  <div className="mt-2 text-xs text-slate-400">
                    {formatDateTimeVN(item.created_at)}
                  </div>
                </div>
                {item.link ? (
                  <NotificationLink
                    id={item.id}
                    href={item.type === "class_officer_vacancy" ? (await resolveVacancyLink(item.link, item.title, async code => (await db.first("SELECT id,code FROM classes WHERE code=? LIMIT 1", [code])) as {id:number;code:string}|undefined)) : item.link}
                  >
                    Xem chi tiết
                  </NotificationLink>
                ) : null}
              </div>
            </article>
          )))) : (
            <div className="p-12 text-center text-sm text-slate-500">Chưa có thông báo.</div>
          )}
        </div>
      </section>
      <Pagination totalResults={total} resultLabel="thông báo" page={page} totalPages={totalPages} />
    </main>
  );
}
