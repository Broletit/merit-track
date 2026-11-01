import type { Database } from "@/server/db/mysql";

export const REASONED_ADMIN_ACTIONS = [
  "activity.delete", "event.delete", "conduct.category.delete", "criteria_template.delete",
  "criteria_group.delete", "criteria_item.delete", "user.class.transfer", "user.access.update", "user.role.update", "user.status.update", "activity.attendance.import",
] as const;
const allowedActions = new Set<string>(REASONED_ADMIN_ACTIONS);

export function requireChangeReason(value: FormDataEntryValue | null) {
  const reason = String(value ?? "").trim();
  if (reason.length < 10) {
    throw new Error("Vui lòng ghi lý do thay đổi cụ thể, tối thiểu 10 ký tự.");
  }
  return reason;
}

export async function writeAuditLog({
  db,
  actorUserId,
  action,
  entityType,
  entityId,
  reason,
  before,
  after,
  meta,
}: {
  db: Database;
  actorUserId?: number | null;
  action: string;
  entityType: string;
  entityId: string | number;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
  meta?: unknown;
}) {
  if (!allowedActions.has(action) || !actorUserId || (reason??"").trim().length<10) return;
  const actor=(await db.first("SELECT role FROM users WHERE id=?", [actorUserId])) as {role:string}|undefined;
  if(actor?.role!=="admin") return;
  (await db.execute(`
    INSERT INTO audit_logs (
      actor_user_id, action, entity_type, entity_id,
      reason, before_json, after_json, meta_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))
    `, [actorUserId ?? null, action, entityType, String(entityId), reason ?? null, before === undefined ? null : JSON.stringify(before), after === undefined ? null : JSON.stringify(after), meta === undefined ? null : JSON.stringify(meta)]));
}
