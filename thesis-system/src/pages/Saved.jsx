import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { getJobs } from "../services/jobicyApi";
import { getSavedJobsForAccount, persistSavedJobs } from "../services/savedJobs";

function formatRelativeTime(savedAt, now) {
  const differenceInSeconds = Math.max(0, Math.floor((now - Number(savedAt)) / 1000));

  if (differenceInSeconds < 60) {
    return "Saved just now";
  }

  const minutes = Math.floor(differenceInSeconds / 60);
  if (minutes < 60) {
    return `Saved ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Saved ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `Saved ${days} day${days === 1 ? "" : "s"} ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 52) {
    return `Saved ${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }

  const years = Math.floor(weeks / 52);
  return `Saved ${years} year${years === 1 ? "" : "s"} ago`;
}

function Saved() {
  const [jobs, setJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setSavedJobs(getSavedJobsForAccount());
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadJobs() {
      try {
        const fetchedJobs = await getJobs();
        if (isMounted) {
          setJobs(fetchedJobs);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError.message || "Unable to load saved jobs right now.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadJobs();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredJobs = useMemo(() => {
    const savedSet = new Set(savedJobs.map((entry) => String(entry.id)));
    const matches = jobs.filter((job) => savedSet.has(String(job.id)));
    const term = searchText.trim().toLowerCase();

    if (!term) {
      return matches;
    }

    return matches.filter((job) =>
      [job.title, job.company, job.location, ...job.skills]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [jobs, savedJobs, searchText]);

  function handleRemove(jobId) {
    const nextSaved = savedJobs.filter((entry) => String(entry.id) !== String(jobId));
    setSavedJobs(nextSaved);
    persistSavedJobs(nextSaved);
  }

  return (
    <Navbar searchText={searchText} onSearchChange={(event) => setSearchText(event.target.value)}>
      <div className="saved-page">
        <header className="saved-header">
          <div>
            <p className="dashboard-eyebrow">CAREER / SAVED</p>
            <h1>Bookmarks</h1>
          </div>
        </header>

        {loading ? (
          <p className="dashboard-empty-state">Loading your saved opportunities...</p>
        ) : error ? (
          <p className="dashboard-empty-state">{error}</p>
        ) : filteredJobs.length === 0 ? (
          <p className="dashboard-empty-state">No saved opportunities yet.</p>
        ) : (
          <div className="saved-list">
            {filteredJobs.map((job) => {
              const savedEntry = savedJobs.find((entry) => String(entry.id) === String(job.id));
              const savedAt = savedEntry?.savedAt ?? Date.now();

              return (
                <article key={job.id} className="saved-card">
                  <div className="saved-card-header">
                    <div className="saved-company-mark" aria-hidden="true">
                      {job.logo ? (
                        <img src={job.logo} alt={job.company} className="company-logo" />
                      ) : (
                        job.company.slice(0, 1)
                      )}
                    </div>

                    <div className="saved-card-copy">
                      <div className="saved-title-row">
                        <h2>{job.title}</h2>
                        <button
                          type="button"
                          className="saved-bookmark-button"
                          aria-label={`Remove ${job.title} from saved jobs`}
                          onClick={() => handleRemove(job.id)}
                        >
                          <Icon name="bookmark" />
                        </button>
                      </div>
                      <p className="saved-company-name">{job.company}</p>
                    </div>
                  </div>

                  <div className="saved-card-meta">
                    <span><Icon name="pin" /> {job.location || "Remote"}</span>
                    <span><Icon name="briefcase" /> {job.employmentType || "Full Time"}</span>
                    <span><Icon name="building" /> {job.workType || "On-site"}</span>
                  </div>

                  <div className="saved-card-tags" aria-label="Skills">
                    {(job.skills || []).slice(0, 3).map((skill) => (
                      <span key={skill} className="skill-tag">{skill}</span>
                    ))}
                  </div>

                  <div className="saved-card-footer">
                    <span className="saved-time"><Icon name="clock" /> {formatRelativeTime(savedAt, now)}</span>
                    <div className="saved-card-actions">
                      <button type="button" className="saved-secondary-button" onClick={() => handleRemove(job.id)}>
                        Remove
                      </button>
                      {job.url ? (
                        <a className="apply-button" href={job.url} target="_blank" rel="noreferrer">
                          Apply
                        </a>
                      ) : (
                        <button type="button" className="apply-button" disabled>
                          Apply
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Navbar>
  );
}

function Icon({ name }) {
  const icons = {
    bookmark: <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z" />,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18m-11 0v2h4v-2" /></>,
    building: <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M8 7h2m4 0h2M8 11h2m4 0h2M8 15h2m4 0h2m-5 6v-3h2v3" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      className="dashboard-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icons[name]}
    </svg>
  );
}

export default Saved;
