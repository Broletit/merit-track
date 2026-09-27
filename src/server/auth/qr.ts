import crypto from "node:crypto";

const QR_MAX_AGE_MS = 2 * 60 * 1000;

function getSigningSecret() {
  const secret = process.env.QR_SIGN_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Thiếu cấu hình QR_SIGN_SECRET cho môi trường production.");
  }
  return "merittrack-local-development-qr-secret";
}

export type StudentQrPayload = {
  userId: number;
  mssv: string;
  ts: number;
  sig: string;
};

function sign(userId: number, mssv: string, ts: number) {
  return crypto
    .createHmac("sha256", getSigningSecret())
    .update(`${userId}.${mssv}.${ts}`)
    .digest("hex");
}

export function createStudentQrPayload(userId: number, mssv: string): StudentQrPayload {
  const ts = Date.now();
  return { userId, mssv, ts, sig: sign(userId, mssv, ts) };
}

export function encodeStudentQr(payload: StudentQrPayload) {
  return JSON.stringify(payload);
}

export function decodeAndVerifyStudentQr(raw: string): StudentQrPayload | null {
  try {
    const parsed = JSON.parse(raw) as StudentQrPayload;
    if (!parsed?.userId || !parsed?.mssv || !parsed?.ts || !parsed?.sig) return null;

    const age = Date.now() - Number(parsed.ts);
    if (age < -30_000 || age > QR_MAX_AGE_MS) return null;

    const expectedBuffer = Buffer.from(
      sign(parsed.userId, parsed.mssv, parsed.ts),
      "hex"
    );
    const receivedBuffer = Buffer.from(parsed.sig, "hex");
    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
