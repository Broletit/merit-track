import type Database from "better-sqlite3";

export function requireChangeReason(value: FormDataEntryValue | null) {
  const reason = String(value ?? "").trim();
  if (reason.length < 10) {
    throw new Error("Vui lòng ghi lý do thay đổi cụ thể, tối thiểu 10 ký tự.");
  }
  return reason;
}

export function writeAuditLog({
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
  db: Database.Database;
  actorUserId?: number | null;
  action: string;
  entityType: string;
  entityId: string | number;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
  meta?: unknown;
}) {
  db.prepare(
    `
    INSERT INTO audit_logs (
      actor_user_id, action, entity_type, entity_id,
      reason, before_json, after_json, meta_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `
  ).run(
    actorUserId ?? null,
    action,
    entityType,
    String(entityId),
    reason ?? null,
    before === undefined ? null : JSON.stringify(before),
    after === undefined ? null : JSON.stringify(after),
    meta === undefined ? null : JSON.stringify(meta)
  );
}
