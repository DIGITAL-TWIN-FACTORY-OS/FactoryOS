import "./Sidebar.css";
import type { UserRole } from "../Login/Login";
import { rolePermissions } from "../../config/roles";

interface SidebarProps {
  userRole: UserRole;
  currentPage: string;
  onNavigate: (page: string) => void;
}

function Sidebar({
  userRole,
  currentPage,
  onNavigate,
}: SidebarProps) {
  const permissions = rolePermissions[userRole];

  const navigationItems = [
    {
      icon: "▦",
      label: "Dashboard",
      visible: permissions.dashboard,
    },
    {
      icon: "▥",
      label: "Factory Layout",
      visible: permissions.factoryLayout,
    },
    {
      icon: "⚙",
      label: "Machines",
      visible: permissions.machines,
    },
    {
      icon: "▥",
      label: "Analytics",
      visible: permissions.analytics,
    },
    {
      icon: "♧",
      label: "Alerts",
      badge: 6,
      visible: permissions.alerts,
    },
    {
      icon: "⚒",
      label: "Maintenance",
      visible: permissions.maintenance,
    },
    {
      icon: "▤",
      label: "Reports",
      visible: permissions.reports,
    },
    {
      icon: "▣",
      label: "AI Assistant",
      visible: permissions.aiAssistant,
    },
    {
      icon: "👥",
      label: "User Management",
      visible: permissions.userManagement,
    },
  ];

  return (
    <aside className="sidebar">

      {/* BRAND */}
      <div className="brand">
        <div className="brand-logo-wrap">
          <svg
            className="smart-factory-svg-logo"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="sfLogoGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00e5ff" />
                <stop offset="100%" stopColor="#0077b6" />
              </linearGradient>
              <filter id="sfGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Isometric Digital Twin Factory Cube */}
            <polygon points="20,4 35,12 20,20 5,12" fill="url(#sfLogoGrad1)" opacity="0.95" />
            <polygon points="5,12 20,20 20,36 5,28" fill="#03446b" opacity="0.95" />
            <polygon points="20,20 35,12 35,28 20,36" fill="#02679e" opacity="0.9" />

            {/* Neural Telemetry Nodes & Paths */}
            <line x1="20" y1="20" x2="20" y2="8" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
            <line x1="12" y1="16" x2="28" y2="16" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />

            {/* Glowing Core Pulse Node */}
            <circle cx="20" cy="16" r="3.2" fill="#20d873" filter="url(#sfGlow)" />
            <circle cx="20" cy="16" r="1.6" fill="#ffffff" />
            <circle cx="20" cy="8" r="1.5" fill="#00e5ff" />
            <circle cx="12" cy="16" r="1.5" fill="#00e5ff" />
            <circle cx="28" cy="16" r="1.5" fill="#00e5ff" />
          </svg>
        </div>

        <div className="brand-text">
          <div className="brand-title">
            <span className="brand-smart">SMART</span>
            <span className="brand-factory">FACTORY</span>
          </div>
          <div className="brand-sub">
            <span className="brand-twin-text">DIGITAL TWIN OS</span>
            <span className="brand-live-pulse" title="System Online"></span>
          </div>
        </div>
      </div>

      {/* NAVIGATION */}

      <nav className="sidebar-nav">
        {navigationItems
          .filter((item) => item.visible)
          .map((item) => (
            <button
              key={item.label}
              className={`nav-item ${
                currentPage === item.label
                  ? "active"
                  : ""
              }`}
              type="button"
              onClick={() =>
                onNavigate(item.label)
              }
            >
              <span className="nav-icon">
                {item.icon}
              </span>

              <span className="nav-label">
                {item.label}
              </span>

              {item.badge && (
                <span className="nav-badge">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
      </nav>

      {/* SETTINGS */}

      {permissions.settings && (
        <button
          className={`settings-button ${
            currentPage === "Settings"
              ? "active"
              : ""
          }`}
          type="button"
          onClick={() =>
            onNavigate("Settings")
          }
        >
          <span className="nav-icon">
            ⚙
          </span>

          <span>
            Settings
          </span>
        </button>
      )}

      {/* FACTORY OVERVIEW */}

      <div className="sidebar-overview">
        <h3>Factory Overview</h3>

        <div>
          <span>Total Machines</span>
          <strong>24</strong>
        </div>

        <div>
          <span className="green-text">
            Running
          </span>

          <strong>16</strong>
        </div>

        <div>
          <span className="yellow-text">
            Warning
          </span>

          <strong>5</strong>
        </div>

        <div>
          <span className="red-text">
            Critical
          </span>

          <strong>2</strong>
        </div>

        <div>
          <span>
            Maintenance
          </span>

          <strong>1</strong>
        </div>

        <div>
          <span>
            Offline
          </span>

          <strong>0</strong>
        </div>
      </div>

    </aside>
  );
}

export default Sidebar;