import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { Database } from "@/server/db/mysql";

function digest(secret: string, value: string) {
  if (secret.length < 32) throw new Error("Chức năng khôi phục mật khẩu chưa được cấu hình. Vui lòng liên hệ quản trị viên.");
  return createHmac("sha256",secret).update(value).digest("hex");
}

export async function issuePasswordReset(db:Database, account:string, email:string, ip:string, secret:string, now=Date.now(), cooldownMs=0) {
  return (await (async () => (await db.withTransaction(async () => {
  const identity = digest(secret,`account:${account.trim().toLowerCase()}`);
  const ipHash = digest(secret,`ip:${ip}`);
  const limit = (await db.first(`SELECT
    SUM(CASE WHEN identity_hash=? THEN 1 ELSE 0 END) account_count,
    SUM(CASE WHEN ip_hash=? THEN 1 ELSE 0 END) ip_count
    FROM password_reset_requests WHERE created_at>?`, [identity, ipHash, now-15*60*1000])) as {account_count:number;ip_count:number};
  if (Number(limit.account_count)>=3 || Number(limit.ip_count)>=10) throw new Error("Bạn đã yêu cầu nhiều lần. Vui lòng thử lại sau 15 phút.");
  const user = (await db.first("SELECT id,email FROM users WHERE lower(mssv)=? AND lower(trim(email))=? AND is_active=1", [account.trim().toLowerCase(), email.trim().toLowerCase()])) as {id:number;email:string}|undefined;
  if (cooldownMs && user) {
    const latest=(await db.first("SELECT created_at FROM password_reset_requests WHERE user_id=? ORDER BY created_at DESC LIMIT 1", [user.id])) as {created_at:number}|undefined;
    if (latest && now-latest.created_at<cooldownMs) throw new Error("Vui lòng chờ 60 giây trước khi yêu cầu mã mới.");
  }
  const id = randomBytes(32).toString("hex");
  const code = String(randomInt(0,1000000)).padStart(6,"0");
  (await db.execute(`INSERT INTO password_reset_requests(id,user_id,identity_hash,ip_hash,code_hash,created_at,expires_at)
    VALUES(?,?,?,?,?,?,?)`, [id, user?.id??null, identity, ipHash, digest(secret,`${id}:${code}`), now, now+10*60*1000]));
  (await db.execute("DELETE FROM password_reset_requests WHERE expires_at<?", [now-24*60*60*1000]));
  return {id,code,recipient:user?.email??null,expiresAt:now+10*60*1000};
  })))());
}

export async function consumePasswordReset(db:Database,id:string,code:string,passwordHash:string,secret:string,now=Date.now()) {
  const incoming = digest(secret,`${id}:${code}`);
  const result = (await (async () => (await db.withTransaction(async () => {
    const request = (await db.first("SELECT * FROM password_reset_requests WHERE id=?", [id])) as {
      user_id:number|null;code_hash:string;expires_at:number;attempts:number;consumed_at:number|null;
    }|undefined;
    if (!request || request.consumed_at || request.expires_at<=now || request.attempts>=5) return false;
    const actual = Buffer.from(request.code_hash,"hex"), expected = Buffer.from(incoming,"hex");
    if (!request.user_id || actual.length!==expected.length || !timingSafeEqual(actual,expected)) {
      (await db.execute("UPDATE password_reset_requests SET attempts=attempts+1 WHERE id=?", [id]));
      return false;
    }
    const changed = (await db.execute("UPDATE users SET password_hash=?,must_change_pw=0,updated_at=CURRENT_TIMESTAMP(3) WHERE id=? AND is_active=1", [passwordHash, request.user_id]));
    if (!changed.changes) return false;
    (await db.execute("UPDATE password_reset_requests SET consumed_at=? WHERE user_id=? AND consumed_at IS NULL", [now, request.user_id]));
    (await db.execute("UPDATE sessions SET revoked_at=CURRENT_TIMESTAMP(3) WHERE user_id=? AND revoked_at IS NULL", [request.user_id]));
    return true;
  })))());
  if (!result) throw new Error("Mã xác nhận không đúng, đã hết hạn hoặc đã sử dụng. Vui lòng kiểm tra hoặc yêu cầu mã mới.");
}
