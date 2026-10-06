const STORAGE_PREFIX = "careerera_saved_jobs";
const CURRENT_ACCOUNT_KEY = "careerera_current_account";

function normalizeSavedEntry(entry, fallbackTimestamp = Date.now()) {
  const id = String(typeof entry === "string" ? entry : entry?.id ?? "");
  if (!id) {
    return null;
  }

  const savedAt = Number(typeof entry === "string" ? fallbackTimestamp : entry?.savedAt ?? fallbackTimestamp);

  return {
    id,
    savedAt: Number.isFinite(savedAt) ? savedAt : fallbackTimestamp,
  };
}

export function getCurrentAccountKey() {
  if (typeof window === "undefined") {
    return "guest";
  }

  const storedAccount = window.localStorage.getItem(CURRENT_ACCOUNT_KEY);
  return storedAccount ? storedAccount.trim().toLowerCase() : "guest";
}

export function getSavedJobsForAccount(accountKey = getCurrentAccountKey()) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}_${accountKey}`);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    const next = new Map();

    parsed.forEach((entry) => {
      const normalized = normalizeSavedEntry(entry, Date.now());
      if (!normalized) {
        return;
      }

      const existing = next.get(normalized.id);
      next.set(normalized.id, existing && existing.savedAt > normalized.savedAt ? existing : normalized);
    });

    return Array.from(next.values());
  } catch {
    return [];
  }
}

export function persistSavedJobs(savedJobs, accountKey = getCurrentAccountKey()) {
  if (typeof window === "undefined") {
    return [];
  }

  const normalized = Array.isArray(savedJobs)
    ? savedJobs.map((entry) => normalizeSavedEntry(entry, Date.now())).filter(Boolean)
    : [];

  const deduplicated = new Map();

  normalized.forEach((entry) => {
    const existing = deduplicated.get(entry.id);
    deduplicated.set(entry.id, existing && existing.savedAt > entry.savedAt ? existing : entry);
  });

  const nextValue = Array.from(deduplicated.values());
  window.localStorage.setItem(`${STORAGE_PREFIX}_${accountKey}`, JSON.stringify(nextValue));
  return nextValue;
}

export function toggleSavedJob(jobId, accountKey = getCurrentAccountKey()) {
  const safeId = String(jobId);
  const current = getSavedJobsForAccount(accountKey);
  const existing = current.find((entry) => entry.id === safeId);
  const next = existing
    ? current.filter((entry) => entry.id !== safeId)
    : [...current, { id: safeId, savedAt: Date.now() }];

  return persistSavedJobs(next, accountKey);
}
