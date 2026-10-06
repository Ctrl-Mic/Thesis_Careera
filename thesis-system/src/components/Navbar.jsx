import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

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
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-6h6v6" />
      </svg>
    ),
    user: (
      <svg {...commonProps}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    ),
    bookmark: (
      <svg {...commonProps}>
        <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z" />
      </svg>
    ),
    settings: (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2.75v2.5M12 18.75v2.5M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2.75 12h2.5M18.75 12h2.5M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
      </svg>
    ),
    help: (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.6 9a2.5 2.5 0 1 1 4.4 1.6c-1.1 1.1-2 1.4-2 3" />
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
    search: (
      <svg {...commonProps}>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.5 4.5" />
      </svg>
    ),
    bell: (
      <svg {...commonProps}>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>
    ),
  };

  return icons[name] ?? null;
}

const sidebarItems = [
  { label: "Home", to: "/home", icon: "home" },
  { label: "Profile", to: "/profile", icon: "user" },
  { label: "Saved", to: "/saved", icon: "bookmark" },
  { label: "Settings", to: "/home#completeness", icon: "settings" },
  { label: "Help", to: "/home#quick-insights", icon: "help" },
];

export default function Navbar({ children, searchText = "", onSearchChange = () => {} }) {
  const { pathname, hash } = useLocation();
  const [selectedItem, setSelectedItem] = useState(pathname === "/profile" ? "Profile" : "Home");

  useEffect(() => {
    if (pathname === "/profile") {
      setSelectedItem("Profile");
      return;
    }

    if (pathname === "/saved") {
      setSelectedItem("Saved");
      return;
    }

    const sectionMap = {
      "#saved-opportunities": "Saved",
      "#completeness": "Settings",
      "#quick-insights": "Help",
    };

    setSelectedItem(sectionMap[hash] ?? "Home");
  }, [hash, pathname]);

  return (
    <div className="dashboard-app">
      <aside className="dashboard-sidebar">
        <Link className="sidebar-brand" to="/home" aria-label="Careera home">
          <span>C</span>
          <span className="sidebar-brand-star">★</span>
          <strong>REERA</strong>
        </Link>

        <nav className="sidebar-nav" aria-label="Dashboard navigation">
          {sidebarItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              onClick={() => setSelectedItem(item.label)}
              className={selectedItem === item.label ? "sidebar-nav-link active" : "sidebar-nav-link"}
            >
              <span className="sidebar-icon">
                <Icon name={item.icon} className="dashboard-icon" size={22} />
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <Link className="sidebar-nav-link" to="/login">
            <span className="sidebar-icon">
              <Icon name="logout" className="dashboard-icon" size={22} />
            </span>
            <span>Logout</span>
          </Link>
        </div>
      </aside>

      <div className="dashboard-shell">
        <header className="dashboard-topbar">
          <label className="dashboard-search">
            <Icon name="search" size={18} />
            <input
              type="search"
              placeholder="Search"
              value={searchText}
              onChange={onSearchChange}
              aria-label="Search recommendations and opportunities"
            />
          </label>

          <div className="topbar-actions">
            <button className="notification-button" type="button" aria-label="Notifications">
              <Icon name="bell" size={18} />
              <span className="notification-dot" />
            </button>
            <Link className="profile-button" to="/profile" aria-label="Student profile">
              <Icon name="user" size={18} />
            </Link>
          </div>
        </header>

        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  );
}
