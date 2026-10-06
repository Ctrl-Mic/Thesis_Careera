const JOBICY_API_URL = "https://jobicy.com/api/v2/remote-jobs";

export async function getJobs() {
  const response = await fetch(`${JOBICY_API_URL}?count=20`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Jobicy API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.success === false) {
    throw new Error(data.error || "Failed to load jobs.");
  }

  return (data.jobs || []).map((job) => ({
    id: String(job.id ?? job.jobSlug ?? job.jobTitle ?? crypto.randomUUID?.() ?? Date.now()),
    title: job.jobTitle || "Untitled role",
    company: job.companyName || "Unknown company",
    location: job.jobGeo || "Remote",
    geo: job.jobGeo || "Remote",
    level: job.jobLevel || "Not specified",
    salary: job.salary || "Not specified",
    salaryPeriod: job.salaryPeriod || "Not specified",
    publishedAt: job.pubDate || "Unknown",
    employmentType: Array.isArray(job.jobType) ? job.jobType[0] || "Remote" : job.jobType || "Remote",
    workType: "Remote",
    skills: Array.isArray(job.jobIndustry) ? job.jobIndustry.slice(0, 3) : ["Remote", "Flexible"],
    summary: job.jobExcerpt || "No summary available.",
    url: job.url || "#",
    logo: job.companyLogo || "",
  }));
}