import bcrypt from "bcryptjs";

export function hashPasswordSync(raw: string) {
  return bcrypt.hashSync(raw, 10);
}

export function verifyPasswordSync(raw: string, hash: string) {
  return bcrypt.compareSync(raw, hash);
}

export async function hashPassword(raw: string) {
  return bcrypt.hash(raw, 10);
}

export async function verifyPassword(raw: string, hash: string) {
  return bcrypt.compare(raw, hash);
}