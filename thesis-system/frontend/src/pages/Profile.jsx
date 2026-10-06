import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

const tabs = ["Profile", "Experience & Education", "Resume & Certificates"];

const initialProfile = {
  firstName: "",
  surname: "",
  email: "",
  phone: "09XXXXXXXXX",
  location: "Barangay, City",
};

const primarySkills = [
  "Career Guidance",
  "Communication",
  "Teamwork",
  "Problem Solving",
  "Research",
  "Client Interaction",
];

const softwareSkills = [
  "Microsoft Excel",
  "Google Workspace",
  "Figma",
  "Canva",
  "Adobe Photoshop",
  "HTML / CSS",
  "JavaScript",
];

const educationDetails = {
  institution: "Pambayang Dalubhasaan ng Marilao",
  degree: "Bachelor of Science in Tourism Management",
  year: "2022 - Present",
};

const internshipHistory = [
  {
    id: 1,
    company: "Vacation Hills Resort",
    location: "Bulacan",
    description: "Assisted in guest relations and coordinated front desk operations.",
    date: "2024 - 2025",
  },
  {
    id: 2,
    company: "City Heritage Tours",
    location: "Manila",
    description: "Supported tour planning and customer communication for group bookings.",
    date: "2023 - 2024",
  },
];

const certificateCards = [
  { id: 1, title: "Name/Title", location: "Location", date: "Date" },
  { id: 2, title: "Name/Title", location: "Location", date: "Date" },
];

function Icon({ name, size = 18, className = "" }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    width: size,
    height: size,
    "aria-hidden": true,
  };

  const icons = {
    home: (
      <svg {...commonProps}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20h14V9.5" />
      </svg>
    ),
    user: (
      <svg {...commonProps}>
        <path d="M20 21a8 8 0 1 0-16 0" />
        <circle cx="12" cy="8" r="4" />
      </svg>
    ),
    bookmark: (
      <svg {...commonProps}>
        <path d="M7 4.75A1.75 1.75 0 0 1 8.75 3h6.5A1.75 1.75 0 0 1 17 4.75V20l-5-3-5 3V4.75Z" />
      </svg>
    ),
    settings: (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="3.2" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.86l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .62 1.7 1.7 0 0 0-.4 1.08V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.86.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.62-1 1.7 1.7 0 0 0-1.08-.4H2.8a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.86l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.62 1.7 1.7 0 0 0 .4-1.08V2.8a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.86-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.26.26.62.4 1.08.4H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.08.4 1.7 1.7 0 0 0-.4 1.08v.09a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 15 14.6Z" />
      </svg>
    ),
    help: (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.1 9a3 3 0 1 1 5.8 1.2c-.8 1.2-2.3 1.9-2.9 3.3" />
        <path d="M12 17h.01" />
      </svg>
    ),
    logout: (
      <svg {...commonProps}>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
      </svg>
    ),
    mail: (
      <svg {...commonProps}>
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z" />
        <path d="m5 7 7 5 7-5" />
      </svg>
    ),
    phone: (
      <svg {...commonProps}>
        <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3h2a1.5 1.5 0 0 1 1.5 1.5v1.2A1.5 1.5 0 0 1 8.5 7l-.7.7a14.5 14.5 0 0 1 8.5 8.5l.7-.7A1.5 1.5 0 0 1 18.3 14h1.2A1.5 1.5 0 0 1 21 15.5v2A1.5 1.5 0 0 1 19.5 19A17.5 17.5 0 0 1 5 4.5Z" />
      </svg>
    ),
    location: (
      <svg {...commonProps}>
        <path d="M12 21s6-4.35 6-10A6 6 0 1 0 6 11c0 5.65 6 10 6 10Z" />
        <circle cx="12" cy="11" r="2.5" />
      </svg>
    ),
    pen: (
      <svg {...commonProps}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
      </svg>
    ),
    upload: (
      <svg {...commonProps}>
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M4 18.5v.5A1.5 1.5 0 0 0 5.5 20h13A1.5 1.5 0 0 0 20 18.5v-.5" />
      </svg>
    ),
    trash: (
      <svg {...commonProps}>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </svg>
    ),
    download: (
      <svg {...commonProps}>
        <path d="M12 3v12" />
        <path d="m7 20 5 5 5-5" />
        <path d="M4 19.5v.5A1.5 1.5 0 0 0 5.5 21h13A1.5 1.5 0 0 0 20 19.5v-.5" />
      </svg>
    ),
    camera: (
      <svg {...commonProps}>
        <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h2l1.2-1.7A1.5 1.5 0 0 1 10.9 4h2.2a1.5 1.5 0 0 1 1.2.6L15.5 6h2A2.5 2.5 0 0 1 20 8.5v7A2.5 2.5 0 0 1 17.5 18h-11A2.5 2.5 0 0 1 4 15.5v-7Z" />
        <circle cx="12" cy="12" r="3.2" />
      </svg>
    ),
    star: (
      <svg {...commonProps}>
        <path d="m12 2.8 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 0l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 2.8Z" />
      </svg>
    ),
    bell: (
      <svg {...commonProps}>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>
    ),
    search: (
      <svg {...commonProps}>
        <circle cx="11" cy="11" r="6" />
        <path d="M16 16 21 21" />
      </svg>
    ),
    arrow: (
      <svg {...commonProps}>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    ),
    sparkles: (
      <svg {...commonProps}>
        <path d="m12 2.5 2.5 7.5L22 12.5l-7.5 2.5L12 22.5l-2.5-7.5L2 12.5l7.5-2.5L12 2.5Z" />
      </svg>
    ),
    chart: (
      <svg {...commonProps}>
        <path d="M4 19V5m0 14h16" />
        <path d="m7 15 4-4 3 2 6-7" />
      </svg>
    ),
    lightbulb: (
      <svg {...commonProps}>
        <path d="M9 18h6M10 21h4M12 3a7 7 0 0 0-4.5 12.1c.6.6 1 1.3 1 2.2H15c0-.9.4-1.6 1-2.2A7 7 0 0 0 12 3Z" />
      </svg>
    ),
    briefcase: (
      <svg {...commonProps}>
        <rect x="3" y="7" width="18" height="12" rx="2" />
        <path d="M9 7V5h6v2" />
        <path d="M3 12h18" />
      </svg>
    ),
    pin: (
      <svg {...commonProps}>
        <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
    building: (
      <svg {...commonProps}>
        <path d="M4 20V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v15" />
        <path d="M8 20v-4h8v4M8 8h2M14 8h2M8 12h2M14 12h2" />
      </svg>
    ),
  };

  return icons[name] ?? null;
}

Icon.propTypes = {
  name: PropTypes.string.isRequired,
  size: PropTypes.number,
  className: PropTypes.string,
};

function ProfileHeader({ profile, isEditing, onEditToggle, onChange }) {
  const profileName = useMemo(
    () => `${profile.firstName} ${profile.surname}`.trim(),
    [profile.firstName, profile.surname]
  );

  return (
    <section className="job-card" style={{ padding: "26px 28px", borderRadius: "16px", background: "#fdf8ee" }}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-[3px] border-[#F4C95D] bg-gradient-to-br from-[#F7E7C2] to-[#F4D279] text-2xl font-bold text-[#3B241C] shadow-[0_10px_30px_rgba(244,201,93,0.2)]">
              {profile.firstName?.charAt(0) || "F"}
              {profile.surname?.charAt(0) || "S"}
            </div>
            <button
              type="button"
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#FDF8EE] bg-[#F4C95D] text-[#3B241C] shadow-md"
              aria-label="Update profile photo"
            >
              <Icon name="camera" size={16} />
            </button>
          </div>

          <div className="space-y-2">
            {isEditing ? (
              <div className="flex flex-wrap gap-3">
                <input
                  name="firstName"
                  value={profile.firstName}
                  onChange={onChange}
                  className="w-32 rounded-xl border border-[#E8DBC1] bg-white px-3 py-2 text-xl font-bold text-[#3B241C] outline-none"
                />
                <input
                  name="surname"
                  value={profile.surname}
                  onChange={onChange}
                  className="w-32 rounded-xl border border-[#E8DBC1] bg-white px-3 py-2 text-xl font-bold text-[#3B241C] outline-none"
                />
              </div>
            ) : (
              <h1 className="text-3xl font-extrabold tracking-tight text-[#3B241C] md:text-4xl">
                {profileName}
              </h1>
            )}

            <div className="space-y-1.5 text-sm text-[#5E4C45]">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#5B1E13]">
                  <Icon name="mail" size={12} />
                </span>
                {isEditing ? (
                  <input
                    type="email"
                    value={profile.email}
                    readOnly
                    aria-label="Email address"
                    className="min-w-0 rounded-lg border border-[#E8DBC1] bg-white px-2 py-1 text-sm text-[#5E4C45] outline-none"
                  />
                ) : (
                  <span>{profile.email}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#5B1E13]">
                  <Icon name="phone" size={12} />
                </span>
                <span>{profile.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#5B1E13]">
                  <Icon name="location" size={12} />
                </span>
                <span>{profile.location}</span>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onEditToggle}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B1E13] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4A150B]"
        >
          <Icon name="pen" size={14} />
          {isEditing ? "Save Changes" : "Edit Profile"}
        </button>
      </div>
    </section>
  );
}

ProfileHeader.propTypes = {
  profile: PropTypes.shape({
    firstName: PropTypes.string,
    surname: PropTypes.string,
    email: PropTypes.string,
    phone: PropTypes.string,
    location: PropTypes.string,
  }).isRequired,
  isEditing: PropTypes.bool.isRequired,
  onEditToggle: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
};

function SkillPill({ label }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#E7DCC7] bg-[#F7F1E7] px-4 py-2 text-sm font-medium text-[#4C322A]">
      {label}
    </span>
  );
}

SkillPill.propTypes = {
  label: PropTypes.string.isRequired,
};

function ProfileTabContent() {
  return (
    <div className="space-y-6">
      <div className="job-card" style={{ padding: "26px 28px" }}>
        <div className="dashboard-section-heading" style={{ marginBottom: 18 }}>
          <div>
            <h2 style={{ fontSize: 24 }}>Core Competencies &amp; Tools</h2>
          </div>
          <button type="button" className="dashboard-assessment-link" style={{ minHeight: 40, padding: "0 16px", borderRadius: 999, background: "#f7efe1", color: "#4d2f24" }}>
            + Add Skills
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[#7D645C]">Primary Skills</p>
            <div className="flex flex-wrap gap-3">
              {primarySkills.map((skill) => (
                <SkillPill key={skill} label={skill} />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[#7D645C]">
              Industry Software &amp; Languages
            </p>
            <div className="flex flex-wrap gap-3">
              {softwareSkills.map((skill) => (
                <SkillPill key={skill} label={skill} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="job-card" style={{ padding: "26px 28px" }}>
        <div className="dashboard-section-heading" style={{ marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 24 }}>Completeness</h2>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:items-center md:justify-around">
          <div className="relative h-32 w-32">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r="46" fill="none" stroke="#F2E4C8" strokeWidth="12" />
              <circle
                cx="60"
                cy="60"
                r="46"
                fill="none"
                stroke="#F4C95D"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray="289"
                strokeDashoffset="57.8"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-extrabold text-[#3B241C]">80%</span>
            </div>
          </div>

          <div className="max-w-md text-center md:text-left">
            <p className="text-base text-[#5E4C45]">
              Take assessment to get your personalized career recommendations.
            </p>
            <Link to="/assessment" className="widget-primary-link mt-4" style={{ width: "100%" }}>
              Take Assessment <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExperienceTabContent() {
  return (
    <div className="space-y-6">
      <div className="job-card" style={{ padding: "26px 28px" }}>
        <div className="dashboard-section-heading" style={{ marginBottom: 18 }}>
          <div>
            <h2 style={{ fontSize: 24 }}>Education</h2>
          </div>
          <button type="button" className="dashboard-assessment-link" style={{ minHeight: 40, padding: "0 16px", borderRadius: 999, background: "#F4C95D", color: "#3B241C" }}>
            Edit
          </button>
        </div>

        <div className="space-y-2 text-[#3B241C]">
          <p className="text-lg font-bold">{educationDetails.institution}</p>
          <p className="text-base text-[#5E4C45]">{educationDetails.degree}</p>
          <p className="text-sm font-medium text-[#7A685F]">{educationDetails.year}</p>
        </div>
      </div>

      <div className="job-card" style={{ padding: "26px 28px" }}>
        <div className="dashboard-section-heading" style={{ marginBottom: 18 }}>
          <div>
            <h2 style={{ fontSize: 24 }}>Practicum &amp; Internship History</h2>
          </div>
        </div>

        <div className="space-y-5">
          {internshipHistory.map((item) => (
            <div key={item.id} className="flex items-start gap-4 rounded-2xl border border-[#F0E5D4] bg-[#F6F0E7] p-4">
              <div className="mt-1 h-12 w-12 rounded-xl bg-[#F4C95D] shadow-inner shadow-[#f1d66d]/50" />

              <div className="flex-1">
                <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-base font-bold text-[#3B241C]">{item.company}</p>
                    <p className="text-sm text-[#5E4C45]">{item.location}</p>
                  </div>
                  <span className="text-sm text-[#7A685F]">{item.date}</span>
                </div>
                <p className="mt-2 text-sm text-[#5E4C45]">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResumeTabContent({ resumeName, resumeUploadedAt, resumeError, isUploading, onUpload, onDelete, onDownload }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-2xl font-bold text-[#5B1E13]">Resume</h3>

        <div className="job-card" style={{ padding: "26px 28px" }}>
          {resumeName ? (
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#F7E5E3] text-[#C5443A]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7" aria-hidden="true">
                    <path d="M7 3.5A2.5 2.5 0 0 1 9.5 1h6.1a1.7 1.7 0 0 1 1.2.5l3.7 3.7a1.7 1.7 0 0 1 .5 1.2v11.1A2.5 2.5 0 0 1 19.5 20h-10A2.5 2.5 0 0 1 7 17.5v-14Z" />
                    <path d="M16 1v5h5" />
                    <path d="M9 10h6M9 14h6" />
                  </svg>
                </div>

                <div>
                  <p className="text-lg font-bold text-[#3B241C]">{resumeName}</p>
                  <p className="text-sm text-[#745F57]">{resumeUploadedAt}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[#5B1E13]">
                <button type="button" onClick={onDelete} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F7E7C2] transition hover:bg-[#F4D279]" aria-label="Delete resume">
                  <Icon name="trash" size={18} />
                </button>
                <button type="button" onClick={onDownload} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F7E7C2] transition hover:bg-[#F4D279]" aria-label="Download resume">
                  <Icon name="download" size={18} />
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#745F57]">No resume uploaded yet.</p>
          )}
        </div>

        {resumeError && <p className="mt-3 text-sm text-[#A32D24]" role="alert">{resumeError}</p>}

        <div className="mt-4">
          <input type="file" accept=".pdf,.doc,.docx" onChange={onUpload} className="hidden" id="resume-upload" disabled={isUploading} />
          <label
            htmlFor="resume-upload"
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[18px] border border-[#5B1E13] bg-transparent px-5 py-4 text-base font-semibold text-[#5B1E13] transition hover:bg-[#F7E7C2]"
          >
            <Icon name="upload" size={18} />
            {isUploading ? "Uploading..." : "Upload New Resume"}
          </label>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-2xl font-bold text-[#5B1E13]">Certificates</h3>

        <div className="grid gap-5 md:grid-cols-2">
          {certificateCards.map((certificate) => (
            <div key={certificate.id} className="overflow-hidden rounded-[22px] border border-[#F0E5D4] bg-[#FDF8EE] shadow-sm">
              <div className="h-36 bg-gradient-to-br from-[#F3E5D3] via-[#FAF4EB] to-[#F6D690]" />

              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lg font-bold text-[#3B241C]">{certificate.title}</p>
                  <span className="text-sm font-medium text-[#7A685F]">{certificate.date}</span>
                </div>
                <p className="text-sm text-[#5E4C45]">{certificate.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

ResumeTabContent.propTypes = {
  resumeName: PropTypes.string.isRequired,
  resumeUploadedAt: PropTypes.string.isRequired,
  resumeError: PropTypes.string.isRequired,
  isUploading: PropTypes.bool.isRequired,
  onUpload: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
};

function Profile() {
  const [activeTab, setActiveTab] = useState("Resume & Certificates");
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState(initialProfile);
  const [resume, setResume] = useState(null);
  const [accountEmail] = useState(() => window.localStorage.getItem("careerera_current_account") ?? "");
  const [profileError, setProfileError] = useState(() => accountEmail ? "" : "Sign in to view your profile.");
  const [resumeError, setResumeError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (!accountEmail) return;

    async function loadProfile() {
      try {
        const response = await fetch(`/api/profile?email=${encodeURIComponent(accountEmail)}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load your profile.");

        const nameParts = result.user.fullName.trim().split(/\s+/);
        const surname = nameParts.length > 1 ? nameParts.pop() : "";
        setProfile((current) => ({
          ...current,
          firstName: nameParts.join(" "),
          surname,
          email: result.user.email,
        }));
        setResume(result.resume);
      } catch (error) {
        setProfileError(error.message || "Unable to load your profile.");
      }
    }

    loadProfile();
  }, [accountEmail]);

  function handleProfileChange(event) {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  }

  async function handleUploadResume(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["pdf", "doc", "docx"].includes(extension) || file.size > 5 * 1024 * 1024) {
      setResumeError("Choose a PDF, DOC, or DOCX file under 5 MB.");
      event.target.value = "";
      return;
    }

    const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const isValidSignature = extension === "pdf"
      ? String.fromCharCode(...header.slice(0, 5)) === "%PDF-"
      : extension === "doc"
        ? [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every((byte, index) => header[index] === byte)
        : header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04;

    if (!isValidSignature) {
      setResumeError("The selected file does not match its file type.");
      event.target.value = "";
      return;
    }

    setResumeError("");
    setIsUploading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const response = await fetch("/api/profile/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: accountEmail,
          fileName: file.name,
          contentBase64: dataUrl.split(",")[1],
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to upload resume.");

      setResume(result.resume);
    } catch (error) {
      setResumeError(error.message || "Unable to upload resume.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  async function handleDeleteResume() {
    setResumeError("");
    try {
      const response = await fetch(`/api/profile/resume?email=${encodeURIComponent(accountEmail)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to delete resume.");
      setResume(null);
    } catch (error) {
      setResumeError(error.message || "Unable to delete resume.");
    }
  }

  async function handleDownloadResume() {
    try {
      const response = await fetch(`/api/profile/resume?email=${encodeURIComponent(accountEmail)}`);
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Unable to download resume.");
      }

      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = resume?.name || "resume";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setResumeError(error.message || "Unable to download resume.");
    }
  }

  function renderTabContent() {
    if (activeTab === "Profile") {
      return <ProfileTabContent />;
    }

    if (activeTab === "Experience & Education") {
      return <ExperienceTabContent />;
    }

    return (
      <ResumeTabContent
        resumeName={resume?.name ?? ""}
        resumeUploadedAt={resume?.uploadedAt ? `Uploaded ${new Date(resume.uploadedAt).toLocaleDateString()}` : ""}
        resumeError={resumeError}
        isUploading={isUploading}
        onUpload={handleUploadResume}
        onDelete={handleDeleteResume}
        onDownload={handleDownloadResume}
      />
    );
  }

  return (
    <Navbar
      searchText={searchText}
      onSearchChange={(event) => setSearchText(event.target.value)}
    >
      <div className="dashboard-heading" style={{ alignItems: "center" }}>
        <div>
          <p className="dashboard-eyebrow">CAREER / PROFILE</p>
          <h1>Your profile</h1>
          <p className="dashboard-subtitle">Review your details and keep your profile ready for opportunities.</p>
        </div>
      </div>

      <ProfileHeader
        profile={profile}
        isEditing={isEditing}
        onEditToggle={() => setIsEditing((current) => !current)}
        onChange={handleProfileChange}
      />
      {profileError && <p className="mt-3 text-sm text-[#A32D24]" role="alert">{profileError}</p>}

      <div className="mt-7 flex flex-wrap gap-4 rounded-[20px] bg-[#FDF8EE] p-2 shadow-sm ring-1 ring-[#F0E5D4]" role="tablist" aria-label="Profile sections">
        {tabs.map((tab) => {
          const isActive = tab === activeTab;

          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab)}
              className={[
                "rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200",
                isActive ? "bg-[#F4C95D] text-[#3B241C] shadow-sm" : "bg-transparent text-[#5E4C45] hover:bg-[#F8EFD8]",
              ].join(" ")}
            >
              {tab}
            </button>
          );
        })}
      </div>

      <section className="mt-7">{renderTabContent()}</section>
    </Navbar>
  );
}

export default Profile;
