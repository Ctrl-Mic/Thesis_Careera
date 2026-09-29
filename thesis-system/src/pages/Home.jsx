import { useState } from "react";
import { Link } from "react-router-dom";

const recommendedCareer = {
  id: "recommended-frontend",
  title: "Junior Frontend Developer",
  company: "Accenture",
  location: "Mandaluyong",
  employmentType: "Full Time",
  workType: "On-site",
  skills: ["React", "TypeScript", "Tailwind CSS"],
  summary: "A sample recommendation based on your profile and interests.",
};

const opportunities = [
  {
    id: "opportunity-ui",
    title: "Junior UI Developer",
    company: "Northstar Digital",
    location: "Makati",
    employmentType: "Full Time",
    workType: "Hybrid",
    skills: ["React", "CSS", "Figma"],
    summary: "A prototype opportunity for early-career designers and developers.",
  },
  {
    id: "opportunity-web",
    title: "Web Developer Intern",
    company: "Brightpath Labs",
    location: "Manila",
    employmentType: "Internship",
    workType: "On-site",
    skills: ["JavaScript", "HTML", "Git"],
    summary: "A sample practicum listing for students building web skills.",
  },
];

const insights = [
  {
    id: "skills",
    icon: "sparkles",
    title: "Recommended Skills to Improve",
    subtitle: "Based on your profile and target jobs",
    detail: "Practice TypeScript fundamentals and accessible interface patterns.",
  },
  {
    id: "partners",
    icon: "building",
    title: "Practicum Partners for You",
    subtitle: "Matched with your course and skills",
    detail: "Explore sample partners with web development and design teams.",
  },
  {
    id: "profile",
    icon: "chart",
    title: "Profile Strength",
    subtitle: "Your interests align with frontend roles",
    detail: "Add project links and recent coursework to strengthen your profile.",
  },
];

function Home() {
  const [searchText, setSearchText] = useState("");
  const [savedJobs, setSavedJobs] = useState([]);
  const [selectedInsight, setSelectedInsight] = useState("");
  const [notice, setNotice] = useState("");

  const searchTerm = searchText.trim().toLowerCase();
  const matchesSearch = (job) =>
    !searchTerm ||
    [job.title, job.company, job.location, ...job.skills]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm);

  const recommendation = matchesSearch(recommendedCareer)
    ? recommendedCareer
    : null;
  const filteredOpportunities = opportunities.filter(matchesSearch);

  function toggleSaved(jobId) {
    setSavedJobs((currentSaved) =>
      currentSaved.includes(jobId)
        ? currentSaved.filter((savedId) => savedId !== jobId)
        : [...currentSaved, jobId]
    );
  }

  function showPrototypeNotice(job) {
    setNotice(`${job.title} is a sample listing. Applications are not enabled.`);
  }

  return (
    <div className="dashboard-app">
      <aside className="dashboard-sidebar">
        <Link className="sidebar-brand" to="/home" aria-label="Careera home">
          <span>C</span><span className="sidebar-brand-star">★</span><strong>REERA</strong>
        </Link>

        <nav className="sidebar-nav" aria-label="Dashboard navigation">
          <a className="sidebar-nav-link active" href="#dashboard-top" aria-current="page">
            <span className="sidebar-icon"><Icon name="home" /></span>
            <span>Home</span>
          </a>
          <a className="sidebar-nav-link" href="#profile">
            <span className="sidebar-icon"><Icon name="user" /></span>
            <span>Profile</span>
          </a>
          <a className="sidebar-nav-link" href="#saved-opportunities">
            <span className="sidebar-icon"><Icon name="bookmark" /></span>
            <span>Saved</span>
          </a>
          <a className="sidebar-nav-link" href="#completeness">
            <span className="sidebar-icon"><Icon name="settings" /></span>
            <span>Settings</span>
          </a>
          <a className="sidebar-nav-link" href="#quick-insights">
            <span className="sidebar-icon"><Icon name="help" /></span>
            <span>Help</span>
          </a>
        </nav>

        <div className="sidebar-bottom">
          <Link className="sidebar-nav-link" to="/login">
            <span className="sidebar-icon"><Icon name="logout" /></span>
            <span>Logout</span>
          </Link>
        </div>
      </aside>

      <div className="dashboard-shell">
        <header className="dashboard-topbar">
          <label className="dashboard-search">
            <Icon name="search" />
            <input
              type="search"
              placeholder="Search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              aria-label="Search recommendations and opportunities"
            />
          </label>

          <div className="topbar-actions">
            <button className="notification-button" type="button" aria-label="Notifications">
              <Icon name="bell" />
              <span className="notification-dot" />
            </button>
            <button className="profile-button" id="profile" type="button" aria-label="Student profile">
              <Icon name="user" />
            </button>
          </div>
        </header>

        <main className="dashboard-main" id="dashboard-top">
          <div className="dashboard-heading">
            <div>
              <p className="dashboard-eyebrow">CAREERA / STUDENT SPACE</p>
              <h1>Your career dashboard</h1>
              <p className="dashboard-subtitle">
                Explore recommendations and opportunities matched to your goals.
              </p>
            </div>
            <Link className="dashboard-assessment-link" to="/assessment">
              Take Assessment <span aria-hidden="true">→</span>
            </Link>
          </div>

          {notice && <p className="dashboard-notice" role="status">{notice}</p>}

          <div className="dashboard-columns">
            <div className="dashboard-primary-column">
              <section className="dashboard-section" id="recommended-career">
                <div className="dashboard-section-heading">
                  <div>
                    <h2>Recommended Career</h2>
                    <p>Prototype suggestions based on your profile.</p>
                  </div>
                  <span className="prototype-label">Sample data</span>
                </div>

                {recommendation ? (
                  <JobCard
                    job={recommendation}
                    isSaved={savedJobs.includes(recommendation.id)}
                    onToggleSave={() => toggleSaved(recommendation.id)}
                    onApply={() => showPrototypeNotice(recommendation)}
                  />
                ) : (
                  <p className="dashboard-empty-state">No recommendations match “{searchText}”.</p>
                )}
              </section>

              <section className="dashboard-section" id="saved-opportunities">
                <div className="dashboard-section-heading">
                  <div>
                    <h2>Browse Opportunities</h2>
                    <p>Explore sample roles and practicum opportunities.</p>
                  </div>
                  <span className="prototype-label">Prototype listings</span>
                </div>

                <div className="opportunity-list">
                  {filteredOpportunities.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      isSaved={savedJobs.includes(job.id)}
                      onToggleSave={() => toggleSaved(job.id)}
                      onApply={() => showPrototypeNotice(job)}
                    />
                  ))}
                  {filteredOpportunities.length === 0 && (
                    <p className="dashboard-empty-state">No opportunities match “{searchText}”.</p>
                  )}
                </div>
              </section>
            </div>

            <aside className="dashboard-widgets" aria-label="Career widgets">
              <section className="widget-card completeness-card" id="completeness">
                <div className="widget-heading">
                  <span className="widget-kicker">PROFILE</span>
                  <h2>Completeness</h2>
                  <p>Take assessment to get your personalized career recommendations</p>
                </div>

                <div className="completeness-content">
                  <div className="progress-ring" role="img" aria-label="Profile completeness: 80 percent">
                    <span>80%</span>
                  </div>
                  <div>
                    <strong>Almost there</strong>
                    <p>Complete your assessment to refine your matches.</p>
                  </div>
                </div>

                <Link className="widget-primary-link" to="/assessment">
                  Take Assessment <span aria-hidden="true">→</span>
                </Link>
              </section>

              <section className="widget-card insights-card" id="quick-insights">
                <div className="widget-heading insights-heading">
                  <span className="insights-mark"><Icon name="lightbulb" /></span>
                  <h2>Quick Insights</h2>
                </div>

                <div className="insight-list">
                  {insights.map((insight) => (
                    <div className="insight-item" key={insight.id}>
                      <button
                        className="insight-row"
                        type="button"
                        aria-expanded={selectedInsight === insight.id}
                        onClick={() =>
                          setSelectedInsight((current) =>
                            current === insight.id ? "" : insight.id
                          )
                        }
                      >
                        <span className="insight-icon"><Icon name={insight.icon} /></span>
                        <span className="insight-copy">
                          <strong>{insight.title}</strong>
                          <span>{insight.subtitle}</span>
                        </span>
                        <Icon name="arrow" />
                      </button>
                      {selectedInsight === insight.id && (
                        <p className="insight-detail">{insight.detail}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>

          <p className="dashboard-disclaimer">
            Career and company details shown here are mock data for this thesis prototype, not live openings.
          </p>
        </main>
      </div>

      <button className="assistant-button" type="button" aria-label="Career assistant prototype">
        <Icon name="bot" />
        <span className="assistant-dot" />
      </button>
    </div>
  );
}

function JobCard({ job, isSaved, onToggleSave, onApply }) {
  return (
    <article className="job-card">
      <div className="job-card-topline">
        <div className="company-mark" aria-hidden="true">{job.company.slice(0, 1)}</div>
        <div className="job-title-group">
          <span className="job-company">{job.company}</span>
          <h3>{job.title}</h3>
        </div>
        <span className="job-prototype-tag">Prototype</span>
      </div>

      <p className="job-summary">{job.summary}</p>

      <div className="job-metadata">
        <span><Icon name="pin" />{job.location}</span>
        <span><Icon name="briefcase" />{job.employmentType}</span>
        <span><Icon name="building" />{job.workType}</span>
      </div>

      <div className="job-card-bottom">
        <div className="job-skills" aria-label="Skills">
          {job.skills.map((skill) => <span className="skill-tag" key={skill}>{skill}</span>)}
        </div>
        <div className="job-actions">
          <button
            className={`save-job-button${isSaved ? " saved" : ""}`}
            type="button"
            aria-label={isSaved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
            aria-pressed={isSaved}
            onClick={onToggleSave}
          >
            <Icon name="bookmark" />
          </button>
          <button className="apply-button" type="button" onClick={onApply}>Apply</button>
        </div>
      </div>
    </article>
  );
}

function Icon({ name }) {
  const icons = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    bookmark: <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z" />,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.1.9-1.5 2.6-1.3-.5a7.8 7.8 0 0 1-1.4.8l-.2 1.4h-3l-.2-1.4a7.8 7.8 0 0 1-1.4-.8l-1.3.5-1.5-2.6 1.1-.9a7 7 0 0 1 0-1.6l-1.1-.9 1.5-2.6 1.3.5a7.8 7.8 0 0 1 1.4-.8l.2-1.4h3l.2 1.4a7.8 7.8 0 0 1 1.4.8l1.3-.5 1.5 2.6-1.1.9a7 7 0 0 1 0 1.5Z" transform="translate(-1 -1)" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9a2.5 2.5 0 1 1 4.4 1.6c-1.1 1.1-2 1.4-2 3" /><path d="M12 17h.01" /></>,
    logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18m-11 0v2h4v-2" /></>,
    building: <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M8 7h2m4 0h2M8 11h2m4 0h2M8 15h2m4 0h2m-5 6v-3h2v3" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    sparkles: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>,
    chart: <><path d="M4 19V5m0 14h17" /><path d="m7 15 4-4 3 2 6-7" /></>,
    lightbulb: <><path d="M9 18h6m-5 3h4m-2-18a7 7 0 0 0-4 12.7c.5.3 1 1.1 1 1.8h6c0-.7.5-1.5 1-1.8A7 7 0 0 0 12 3Z" /></>,
    bot: <><rect x="4" y="7" width="16" height="13" rx="4" /><path d="M12 3v4m-3 6h.01M15 13h.01M9 17h6" /><path d="M4 12H2m20 0h-2" /></>,
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

export default Home;