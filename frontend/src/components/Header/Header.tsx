import { useState } from "react";
import type { UserRole } from "../Login/Login";
import "./Header.css";

interface HeaderProps {
  userRole: UserRole;
  onSignOut: () => void;
}

function Header({
  userRole,
  onSignOut,
}: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] =
    useState(false);

  const currentTime = new Date().toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  );

  const currentDate = new Date().toLocaleDateString(
    [],
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );

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

  return (
    <header className="top-header">

      <div className="header-title">
        <span className="header-logo">
          F
        </span>

        <h2>
          FactoryOS
        </h2>
      </div>

      <div className="header-right">

        <div className="header-time">
          <span>{currentTime}</span>

          <i></i>

          <span>{currentDate}</span>
        </div>

        <button
          className="header-icon"
          type="button"
        >
          ♧
          <span>6</span>
        </button>

        <button
          className="header-icon"
          type="button"
        >
          ✉
          <span>3</span>
        </button>

        <div className="header-divider"></div>

        {/* USER PROFILE */}

        <div className="user-profile-container">

          <button
            className="user-profile"
            type="button"
            onClick={() =>
              setIsDropdownOpen(
                !isDropdownOpen
              )
            }
          >
            <div className="user-avatar">
              ◯
            </div>

            <div>
              <strong>
                {currentUser.name}
              </strong>

              <small>
                {currentUser.role}
              </small>
            </div>

            <span
              className={`dropdown-arrow ${
                isDropdownOpen
                  ? "open"
                  : ""
              }`}
            >
              ⌄
            </span>
          </button>

          {/* DROPDOWN */}

          {isDropdownOpen && (
            <div className="user-dropdown">

              <div className="dropdown-user-info">

                <strong>
                  {currentUser.name}
                </strong>

                <span>
                  {currentUser.role}
                </span>

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