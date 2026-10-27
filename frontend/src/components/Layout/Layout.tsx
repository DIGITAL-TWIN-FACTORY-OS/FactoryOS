import { useState, type ReactNode } from "react";
import type { UserRole } from "../Login/Login";
import Header from "../Header/Header";
import Sidebar from "../Sidebar/Sidebar";
import "./Layout.css";

interface LayoutProps {
  children: ReactNode;
  userRole: UserRole;
  userName?: string;
  alerts?: any[];
  currentPage: string;
  onNavigate: (page: string) => void;
  onSignOut: () => void;
}

function Layout({
  children,
  userRole,
  userName,
  alerts,
  currentPage,
  onNavigate,
  onSignOut,
}: LayoutProps) {
  // Pop-out sideways navigation menu state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Pop-out Sideways Navigation Menu */}
      <Sidebar
        userRole={userRole}
        currentPage={currentPage}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNavigate={onNavigate}
      />

      <div className="main-area">
        <Header
          userRole={userRole}
          userName={userName}
          alerts={alerts}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onSignOut={onSignOut}
          onNavigate={onNavigate}
        />

        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
