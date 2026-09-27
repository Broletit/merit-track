import { Bell } from "lucide-react";
import Pagination from "@/components/common/Pagination";
import {
  MarkAllNotificationsReadButton,
  NotificationLink,
} from "@/components/student/notifications/NotificationActions";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import { requireLogin } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";

const PAGE_SIZE = 12;

type NotificationRow = {
  id: number;
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
  const db = getDb();
  const total = Number((db.prepare(
    `SELECT COUNT(1) AS total FROM notifications WHERE user_id = ?`
  ).get(user.id) as { total: number }).total);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const rows = db.prepare(
    `SELECT id, title, content, link, is_read, created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY is_read ASC, datetime(created_at) DESC, id DESC
     LIMIT ? OFFSET ?`
  ).all(user.id, PAGE_SIZE, (page - 1) * PAGE_SIZE) as NotificationRow[];

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white">
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
          {rows.length > 0 ? rows.map((item) => (
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
                  <NotificationLink id={item.id} href={item.link}>Xem chi tiết</NotificationLink>
                ) : null}
              </div>
            </article>
          )) : (
            <div className="p-12 text-center text-sm text-slate-500">Chưa có thông báo.</div>
          )}
        </div>
      </section>
      <Pagination page={page} totalPages={totalPages} />
    </main>
  );
}
