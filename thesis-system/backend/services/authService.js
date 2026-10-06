import bcrypt from "bcryptjs";

export function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

export async function hashPassword(password) {
  return bcrypt.hash(String(password ?? ""), 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(String(password ?? ""), hash);
}
