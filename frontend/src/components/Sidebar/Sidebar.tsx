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
        <div className="brand-icon">
          ▥
        </div>

        <div>
          <h1>Smart Factory</h1>
          <span>Digital Twin</span>
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