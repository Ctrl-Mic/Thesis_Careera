export async function getJobListings({ type, location, limit = 50 } = {}) {
  const params = new URLSearchParams();

  if (type) params.set("type", type);
  if (location) params.set("location", location);
  if (Number.isInteger(limit) && limit > 0) params.set("limit", String(limit));

  const query = params.size > 0 ? `?${params.toString()}` : "";
  const response = await fetch(`/api/job-listings${query}`);
  const result = await response.json();

  if (!response.ok || result.success !== true) {
    throw new Error(result.message || "Unable to load job listings.");
  }

  return result.jobs ?? [];
}
