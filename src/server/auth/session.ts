import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "@/server/db/sqlite";
import type { LoginRoleContext } from "./role-context";

export type SessionPayload = {
  userId: number;
  role: string;
  loginContext: LoginRoleContext;
};

const SESSION_COOKIE = "merit_track_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type SessionRow = {
  user_id: number;
  role: string;
  login_context: LoginRoleContext;
};

export async function createSession(payload: SessionPayload) {
  const cookieStore = await cookies();
  const db = getDb();
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  ).toISOString();

  db.prepare(
    `
    INSERT INTO sessions (id, user_id, login_context, expires_at)
    VALUES (?, ?, ?, ?)
    `
  ).run(sessionId, payload.userId, payload.loginContext, expiresAt);

  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) return null;

  const row = getDb()
    .prepare(
      `
      SELECT s.user_id, s.login_context, u.role
      FROM sessions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.id = ?
        AND s.revoked_at IS NULL
        AND datetime(s.expires_at) > datetime('now')
        AND u.is_active = 1
      LIMIT 1
      `
    )
    .get(sessionId) as SessionRow | undefined;

  if (!row) {
    return null;
  }

  return {
    userId: Number(row.user_id),
    role: String(row.role),
    loginContext: row.login_context ?? "student",
  };
}

export async function updateSessionLoginContext(loginContext: LoginRoleContext) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) return null;

  const result = getDb()
    .prepare(
      `
      UPDATE sessions
      SET login_context = ?
      WHERE id = ?
        AND revoked_at IS NULL
        AND datetime(expires_at) > datetime('now')
      `
    )
    .run(loginContext, sessionId);

  if (result.changes === 0) return null;
  return getSession();
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    getDb()
      .prepare(
        `UPDATE sessions SET revoked_at = datetime('now') WHERE id = ? AND revoked_at IS NULL`
      )
      .run(sessionId);
  }

  cookieStore.delete(SESSION_COOKIE);
}
