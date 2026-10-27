import { useState, useEffect, useRef } from "react";
import type { UserRole } from "../Login/Login";
import "./Header.css";
import UserRoleIcon from "../UserRoleIcon/UserRoleIcon";

interface HeaderProps {
  userRole: UserRole;
  userName?: string;
  onSignOut: () => void;
  onNavigate?: (page: string) => void;
}

interface DropdownAlert {
  id: string;
  machine: string;
  message: string;
  time: string;
  type: "critical" | "warning" | "info";
}

interface DropdownMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  tag: string;
}

function Header({
  userRole,
  userName,
  onSignOut,
  onNavigate,
}: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);

  const headerRightRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        headerRightRef.current &&
        !headerRightRef.current.contains(event.target as Node)
      ) {
        setIsAlertsOpen(false);
        setIsMessagesOpen(false);
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const currentTime = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const currentDate = new Date().toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const roleDetails: Record<
    UserRole,
    {
      name: string;
      role: string;
    }
  > = {
    admin: {
      name: "Administrator",
      role: "Admin",
    },
    supervisor: {
      name: "Supervisor",
      role: "Supervisor",
    },
    maintenance: {
      name: "Maintenance",
      role: "Engineer",
    },
    operator: {
      name: "Operator",
      role: "Operator",
    },
  };

  const currentUser = roleDetails[userRole];

  // Active Alerts List for Dropdown
  const dropdownAlerts: DropdownAlert[] = [
    {
      id: "ALT-1",
      machine: "M-09 Heat Treatment",
      message: "Temperature exceeded safe limit (91.8°C)",
      time: "11:40 AM",
      type: "critical",
    },
    {
      id: "ALT-2",
      machine: "M-11 Packaging",
      message: "Severe vibration level detected (8.2 mm/s)",
      time: "11:38 AM",
      type: "critical",
    },
    {
      id: "ALT-3",
      machine: "M-07 Welding Robot",
      message: "High current detected on torch manifold (15.8A)",
      time: "11:32 AM",
      type: "warning",
    },
    {
      id: "ALT-4",
      machine: "M-04 Grinding",
      message: "Spindle preventive maintenance due in 8 hrs",
      time: "11:20 AM",
      type: "warning",
    },
    {
      id: "ALT-5",
      machine: "M-15 Conveyor",
      message: "Speed fluctuation and belt slip warning",
      time: "10:40 AM",
      type: "warning",
    },
    {
      id: "ALT-6",
      machine: "M-21 Air Compressor",
      message: "Scheduled intake filter service window",
      time: "10:55 AM",
      type: "info",
    },
  ];

  // System Notifications / Messages List
  const dropdownMessages: DropdownMessage[] = [
    {
      id: "MSG-1",
      sender: "Marcus Vance (Thermal Lead)",
      text: "Assigned to emergency work order #WO-1001 for M-09 Heat Treatment.",
      time: "12m ago",
      tag: "Work Order",
    },
    {
      id: "MSG-2",
      sender: "Parts Storeroom",
      text: "SKF-6208-2RS bearing set reserved for M-11 Packaging service.",
      time: "28m ago",
      tag: "Inventory",
    },
    {
      id: "MSG-3",
      sender: "AI Diagnostic Copilot",
      text: "Thermal and vibration trend correlation identified on Welding Robot.",
      time: "1h ago",
      tag: "AI Notice",
    },
  ];

  const handleToggleAlerts = () => {
    setIsAlertsOpen((prev) => !prev);
    setIsMessagesOpen(false);
    setIsDropdownOpen(false);
  };

  const handleToggleMessages = () => {
    setIsMessagesOpen((prev) => !prev);
    setIsAlertsOpen(false);
    setIsDropdownOpen(false);
  };

  const handleToggleProfile = () => {
    setIsDropdownOpen((prev) => !prev);
    setIsAlertsOpen(false);
    setIsMessagesOpen(false);
  };

  const handleAlertItemClick = () => {
    setIsAlertsOpen(false);
    if (onNavigate) {
      onNavigate("Alerts");
    }
  };

  const handleMessageItemClick = () => {
    setIsMessagesOpen(false);
    if (onNavigate) {
      onNavigate("Maintenance");
    }
  };

  return (
    <header className="top-header">
      <div className="header-title">
        <div className="header-factoryos-mark">
          <svg
            className="header-factoryos-svg"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="fosGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00e5ff" />
                <stop offset="100%" stopColor="#0077b6" />
              </linearGradient>
            </defs>
            <path
              d="M12 2L3 7V17L12 22L21 17V7L12 2Z"
              stroke="#00e5ff"
              strokeWidth="1.6"
              fill="rgba(0, 229, 255, 0.08)"
            />
            <path
              d="M12 6L6 9.5V15.5L12 18.5L18 15.5V9.5L12 6Z"
              stroke="url(#fosGrad)"
              strokeWidth="1.2"
              fill="rgba(0, 119, 182, 0.25)"
            />
            <circle cx="12" cy="12" r="2.2" fill="#20d873" />
          </svg>
        </div>

        <div className="header-brand-wrap">
          <div className="header-brand-logo-text">
            <span className="header-fos-factory">FACTORY</span>
            <span className="header-fos-badge">OS</span>
          </div>
          <span className="header-fos-telemetry">PLANT 01 • DIGITAL TWIN</span>
        </div>
      </div>

      <div className="header-right" ref={headerRightRef}>
        <div className="header-time">
          <span>{currentTime}</span>
          <i></i>
          <span>{currentDate}</span>
        </div>

        {/* ===================== ALERTS ICON & DROPDOWN ===================== */}
        <div className="header-icon-container">
          <button
            className={`header-icon ${isAlertsOpen ? "active" : ""}`}
            type="button"
            title="View Plant Alerts"
            onClick={handleToggleAlerts}
          >
            ♧
            <span>{dropdownAlerts.length}</span>
          </button>

          {isAlertsOpen && (
            <div className="header-dropdown-menu alerts-dropdown">
              <div className="header-dropdown-header">
                <h4>
                  <span>♧</span>
                  <span>Plant Condition Alerts</span>
                </h4>
                <span className="header-dropdown-count-badge">
                  {dropdownAlerts.filter((a) => a.type === "critical").length} Critical
                </span>
              </div>

              <div className="header-dropdown-list">
                {dropdownAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`header-dropdown-item ${alert.type}`}
                    onClick={handleAlertItemClick}
                  >
                    <div className="header-dropdown-item-top">
                      <span className="header-dropdown-item-title">
                        {alert.machine}
                        <span className={`header-dropdown-severity-tag ${alert.type}`}>
                          {alert.type}
                        </span>
                      </span>
                      <span className="header-dropdown-item-time">{alert.time}</span>
                    </div>
                    <div className="header-dropdown-item-msg">{alert.message}</div>
                  </div>
                ))}
              </div>

              <div className="header-dropdown-footer">
                <button
                  type="button"
                  className="header-dropdown-viewall"
                  onClick={handleAlertItemClick}
                >
                  Go to Alerts Center ➔
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ===================== MESSAGES ICON & DROPDOWN ===================== */}
        <div className="header-icon-container">
          <button
            className={`header-icon ${isMessagesOpen ? "active" : ""}`}
            type="button"
            title="View Notifications & Messages"
            onClick={handleToggleMessages}
          >
            ✉
            <span>{dropdownMessages.length}</span>
          </button>

          {isMessagesOpen && (
            <div className="header-dropdown-menu messages-dropdown">
              <div className="header-dropdown-header">
                <h4>
                  <span>✉</span>
                  <span>Maintenance Logs & Dispatch</span>
                </h4>
                <span
                  className="header-dropdown-count-badge"
                  style={{ background: "#00b4d8" }}
                >
                  {dropdownMessages.length} New
                </span>
              </div>

              <div className="header-dropdown-list">
                {dropdownMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="header-dropdown-item info"
                    onClick={handleMessageItemClick}
                  >
                    <div className="header-dropdown-item-top">
                      <span className="header-dropdown-item-title">
                        {msg.sender}
                      </span>
                      <span className="header-dropdown-item-time">{msg.time}</span>
                    </div>
                    <div className="header-dropdown-item-msg">{msg.text}</div>
                  </div>
                ))}
              </div>

              <div className="header-dropdown-footer">
                <button
                  type="button"
                  className="header-dropdown-viewall"
                  onClick={handleMessageItemClick}
                >
                  Open Work Orders & Maintenance ➔
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="header-divider"></div>

        {/* ===================== USER PROFILE DROPDOWN ===================== */}
        <div className="user-profile-container">
          <button
            className="user-profile"
            type="button"
            onClick={handleToggleProfile}
          >
            <div className={`user-avatar role-avatar-${userRole}`}>
              <UserRoleIcon role={userRole} size={20} />
            </div>

            <div className="user-profile-info">
              <strong className="user-profile-name">{userName || currentUser.name}</strong>
              <small className={`user-profile-role role-text-${userRole}`}>
                {currentUser.role.toUpperCase()}
              </small>
            </div>

            <span
              className={`dropdown-arrow ${
                isDropdownOpen ? "open" : ""
              }`}
            >
              ⌄
            </span>
          </button>

          {isDropdownOpen && (
            <div className="user-dropdown">
              <div className="dropdown-user-info">
                <div className="dropdown-avatar-row">
                  <div className={`dropdown-user-avatar role-avatar-${userRole}`}>
                    <UserRoleIcon role={userRole} size={24} />
                  </div>
                  <div className="dropdown-user-text">
                    <strong className="dropdown-user-name">{userName || currentUser.name}</strong>
                    <span className={`role-badge-tag role-tag-${userRole}`}>
                      {currentUser.role.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="dropdown-divider"></div>

              <button
                type="button"
                className="dropdown-item sign-out-item"
                onClick={onSignOut}
              >
                <span>↪</span>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
