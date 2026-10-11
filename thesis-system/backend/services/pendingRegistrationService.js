import { randomBytes } from "node:crypto";

const pendingRegistrationLifetimeMs = 15 * 60 * 1000;
const pendingRegistrations = new Map();
const pendingRegistrationTimers = new Map();

export function createPendingRegistration(registration) {
  const token = randomBytes(32).toString("base64url");
  pendingRegistrations.set(token, {
    ...registration,
    expiresAt: Date.now() + pendingRegistrationLifetimeMs,
  });

  const timer = setTimeout(() => {
    pendingRegistrations.delete(token);
    pendingRegistrationTimers.delete(token);
  }, pendingRegistrationLifetimeMs);
  timer.unref();
  pendingRegistrationTimers.set(token, timer);

  return token;
}

export function getPendingRegistration(token) {
  if (typeof token !== "string") return null;

  const registration = pendingRegistrations.get(token);
  if (!registration || registration.expiresAt <= Date.now()) {
    removePendingRegistration(token);
    return null;
  }

  return registration;
}

export function hasPendingRegistrationEmail(email) {
  for (const [token, registration] of pendingRegistrations) {
    if (registration.expiresAt <= Date.now()) {
      removePendingRegistration(token);
    } else if (registration.email === email) {
      return true;
    }
  }

  return false;
}

export function removePendingRegistration(token) {
  const registration = typeof token === "string" ? pendingRegistrations.get(token) : null;
  pendingRegistrations.delete(token);
  const timer = pendingRegistrationTimers.get(token);
  if (timer) clearTimeout(timer);
  pendingRegistrationTimers.delete(token);
  return registration ?? null;
}
