import React from "react";
import "./UserRoleIcon.css";
import type { UserRole } from "../Login/Login";

interface UserRoleIconProps {
  role: UserRole;
  size?: number;
  className?: string;
}

export const UserRoleIcon: React.FC<UserRoleIconProps> = ({
  role,
  size = 20,
  className = "",
}) => {
  switch (role) {
    case "admin":
      return (
        <svg
          className={`user-role-svg role-svg-admin ${className}`}
          viewBox="0 0 24 24"
          fill="none"
          width={size}
          height={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="adminShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff4650" />
              <stop offset="100%" stopColor="#801520" />
            </linearGradient>
            <linearGradient id="adminStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#ffd21c" />
            </linearGradient>
          </defs>
          {/* Administrator Command Shield */}
          <path
            d="M12 2L4 5.2V11.5C4 16.8 7.4 21.7 12 22.9C16.6 21.7 20 16.8 20 11.5V5.2L12 2Z"
            fill="url(#adminShieldGrad)"
            stroke="#ff7d85"
            strokeWidth="1.3"
          />
          {/* Command Star / Crown Insignia */}
          <path
            d="M12 6.5L13.6 9.8L17.2 10.3L14.6 12.8L15.2 16.5L12 14.8L8.8 16.5L9.4 12.8L6.8 10.3L10.4 9.8L12 6.5Z"
            fill="url(#adminStarGrad)"
          />
        </svg>
      );

    case "supervisor":
      return (
        <svg
          className={`user-role-svg role-svg-supervisor ${className}`}
          viewBox="0 0 24 24"
          fill="none"
          width={size}
          height={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="superGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00e5ff" />
              <stop offset="100%" stopColor="#0077b6" />
            </linearGradient>
          </defs>
          {/* Tactical Radar / Supervision Compass */}
          <circle cx="12" cy="12" r="9.5" stroke="#00e5ff" strokeWidth="1.5" opacity="0.4" />
          <circle cx="12" cy="12" r="6.5" stroke="#00b4d8" strokeWidth="1.2" />
          <circle cx="12" cy="12" r="2.8" fill="url(#superGrad)" />
          {/* Crosshairs */}
          <line x1="12" y1="2" x2="12" y2="6.5" stroke="#00e5ff" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="12" y1="17.5" x2="12" y2="22" stroke="#00e5ff" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="2" y1="12" x2="6.5" y2="12" stroke="#00e5ff" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="17.5" y1="12" x2="22" y2="12" stroke="#00e5ff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case "maintenance":
      return (
        <svg
          className={`user-role-svg role-svg-maintenance ${className}`}
          viewBox="0 0 24 24"
          fill="none"
          width={size}
          height={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="maintGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffd21c" />
              <stop offset="100%" stopColor="#ff8c00" />
            </linearGradient>
          </defs>
          {/* Crossed Precision Wrench & Gear */}
          <path
            d="M19.4 4.6a4 4 0 0 0-5.1-.4l2.5 2.5-1.4 1.4-2.5-2.5a4 4 0 0 0-.4 5.1l7.8 7.8a2 2 0 0 0 2.8 0 2 2 0 0 0 0-2.8l-3.7-3.7z"
            fill="url(#maintGrad)"
          />
          <path
            d="M5.4 18.6a4 4 0 0 0 5.1.4l-2.5-2.5 1.4-1.4 2.5 2.5a4 4 0 0 0 .4-5.1l-7.8-7.8a2 2 0 0 0-2.8 0 2 2 0 0 0 0 2.8l3.7 3.7z"
            fill="#ffaa00"
            opacity="0.85"
          />
        </svg>
      );

    case "operator":
    default:
      return (
        <svg
          className={`user-role-svg role-svg-operator ${className}`}
          viewBox="0 0 24 24"
          fill="none"
          width={size}
          height={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="operGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#20d873" />
              <stop offset="100%" stopColor="#00b4d8" />
            </linearGradient>
          </defs>
          {/* Operator with Cyber Telemetry Headset */}
          <circle cx="12" cy="7.5" r="4.2" fill="url(#operGrad)" />
          <path
            d="M4.5 19.5c0-3.6 3.4-6.5 7.5-6.5s7.5 2.9 7.5 6.5"
            stroke="#20d873"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Headset Arc & Mic */}
          <path
            d="M7 8a5.2 5.2 0 0 1 10 0v2.5a1.2 1.2 0 0 1-1.2 1.2h-1.5"
            stroke="#00e5ff"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <circle cx="14" cy="11.7" r="1.3" fill="#00e5ff" />
        </svg>
      );
  }
};

export default UserRoleIcon;
