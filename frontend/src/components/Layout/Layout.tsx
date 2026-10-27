import type { ReactNode } from "react";
import type { UserRole } from "../Login/Login";
import Header from "../Header/Header";
import Sidebar from "../Sidebar/Sidebar";
import "./Layout.css";

interface LayoutProps {
  children: ReactNode;
  userRole: UserRole;
  userName?: string;
  currentPage: string;
  onNavigate: (page: string) => void;
  onSignOut: () => void;
}

function Layout({
  children,
  userRole,
  userName,
  currentPage,
  onNavigate,
  onSignOut,
}: LayoutProps) {
  return (
    <div className="app-layout">
      <Sidebar
        userRole={userRole}
        currentPage={currentPage}
        onNavigate={onNavigate}
      />

      <div className="main-area">
        <Header
          userRole={userRole}
          userName={userName}
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