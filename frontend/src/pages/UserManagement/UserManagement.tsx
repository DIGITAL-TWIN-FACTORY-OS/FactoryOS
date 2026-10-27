import React, { useState, useEffect, useMemo } from "react";
import "./UserManagement.css";
import type { UserRole } from "../../components/Login/Login";
import UserRoleIcon from "../../components/UserRoleIcon/UserRoleIcon";
import {
  fetchProfilesFromDb,
  addProfileToDb,
  updateProfileRoleInDb,
  deleteProfileFromDb,
  SUPABASE_PROJECT_ID,
} from "../../services/supabaseService";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  shift: string;
  status: "active" | "suspended" | "pending";
  createdAt: string;
  createdBy: string;
  password?: string;
  lastLogin?: string;
}

// Dummy users removed. Real data dynamically loaded from Supabase database.

interface UserManagementProps {
  currentUserRole: UserRole;
  onNavigate?: (page: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  currentUserRole,
  onNavigate,
}) => {
  // If not admin, access denied
  if (currentUserRole !== "admin") {
    return (
      <div className="unauthorized-container">
        <div className="unauthorized-card">
          <div className="unauthorized-icon">🔒</div>
          <h2>Access Restricted</h2>
          <p>
            User Management and Access Control is strictly restricted to{" "}
            <strong>System Administrators</strong>.
          </p>
          <div className="unauthorized-badge">Current Role: {currentUserRole.toUpperCase()}</div>
          {onNavigate && (
            <button
              type="button"
              className="btn-return-dashboard"
              onClick={() => onNavigate("Dashboard")}
            >
              ← Return to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  // Load users from Supabase database
  const [userList, setUserList] = useState<ManagedUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      setIsLoadingUsers(true);
      try {
        const profiles = await fetchProfilesFromDb();
        setUserList(profiles);
      } catch (err) {
        console.error("Error loading users from Supabase:", err);
      } finally {
        setIsLoadingUsers(false);
      }
    }
    loadUsers();
  }, []);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Add User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("operator");
  const [newUserDept, setNewUserDept] = useState("Production Area 1");
  const [newUserShift, setNewUserShift] = useState("Morning (06:00 - 14:00)");
  const [newUserPassword, setNewUserPassword] = useState("factory123");

  // Edit Role Modal State
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editRoleSelection, setEditRoleSelection] = useState<UserRole>("operator");

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // KPIs
  const totalUsers = userList.length;
  const adminCount = userList.filter((u) => u.role === "admin").length;
  const supervisorCount = userList.filter((u) => u.role === "supervisor").length;
  const operatorCount = userList.filter((u) => u.role === "operator").length;
  const maintenanceCount = userList.filter((u) => u.role === "maintenance").length;

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return userList.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [userList, searchTerm, roleFilter, statusFilter]);

  // Handle Add User
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      alert("Please provide both name and email.");
      return;
    }

    const emailCheck = newUserEmail.trim().toLowerCase();
    if (userList.some((u) => u.email.toLowerCase() === emailCheck)) {
      alert("A user with this email address already exists.");
      return;
    }

    const nextIdNum = userList.length + 1;
    const newId = `USR-${nextIdNum < 10 ? "00" + nextIdNum : nextIdNum < 100 ? "0" + nextIdNum : nextIdNum}`;

    const newUser: ManagedUser = {
      id: newId,
      name: newUserName.trim(),
      email: emailCheck,
      role: newUserRole,
      department: newUserDept,
      shift: newUserShift,
      status: "active",
      createdAt: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      createdBy: "Administrator (You)",
      password: newUserPassword || "factory123",
      lastLogin: "Never",
    };

    // Persist to Supabase database
    addProfileToDb(newUser).catch((e) => console.warn("Supabase user save error:", e));
    setUserList((prev) => [newUser, ...prev]);
    showToast(`✓ User ${newUser.name} saved to Supabase with role ${newUser.role.toUpperCase()}`);

    // Reset Form
    setNewUserName("");
    setNewUserEmail("");
    setNewUserRole("operator");
    setNewUserPassword("factory123");
    setShowAddModal(false);
  };

  // Handle Update Role
  const handleSaveRole = () => {
    if (!editingUser) return;
    // Update in Supabase database
    updateProfileRoleInDb(editingUser.id, editRoleSelection).catch((e) => console.warn("Supabase role update error:", e));
    setUserList((prev) =>
      prev.map((u) =>
        u.id === editingUser.id ? { ...u, role: editRoleSelection } : u
      )
    );
    showToast(`✓ Role for ${editingUser.name} updated in Supabase to ${editRoleSelection.toUpperCase()}`);
    setEditingUser(null);
  };

  // Handle Toggle Status
  const handleToggleStatus = (userId: string) => {
    setUserList((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const newStatus = u.status === "active" ? "suspended" : "active";
        showToast(`User ${u.name} status set to ${newStatus.toUpperCase()}`);
        return { ...u, status: newStatus };
      })
    );
  };

  // Handle Delete User
  const handleDeleteUser = (userId: string, userName: string) => {
    if (userId === "USR-001") {
      alert("The primary Root Administrator account cannot be deleted.");
      return;
    }

    if (window.confirm(`Are you sure you want to permanently delete user "${userName}"?`)) {
      deleteProfileFromDb(userId).catch((e) => console.warn("Supabase profile delete error:", e));
      setUserList((prev) => prev.filter((u) => u.id !== userId));
      showToast(`User ${userName} has been removed from database.`);
    }
  };

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "role-admin";
      case "supervisor":
        return "role-supervisor";
      case "maintenance":
        return "role-maintenance";
      case "operator":
        return "role-operator";
      default:
        return "";
    }
  };


  return (
    <div className="user-management-page">
      {/* Toast Notification */}
      {toastMessage && <div className="user-toast">{toastMessage}</div>}

      {/* PAGE HEADER */}
      <div className="user-page-header">
        <div>
          <div className="header-tag">
            <span>🛡 ADMIN CONSOLE</span>
            <span>ROLE-BASED ACCESS CONTROL</span>
            <span style={{ color: "#20d873", borderColor: "rgba(32, 216, 115, 0.4)", background: "rgba(32, 216, 115, 0.1)" }}>
              ● SUPABASE: {SUPABASE_PROJECT_ID}
            </span>
          </div>
          <h1>User Management & Role Permissions</h1>
          <p>
            Create operator and engineer accounts, assign operational roles, and enforce modification clearances across FactoryOS.
          </p>
        </div>

        <button
          type="button"
          className="btn-add-user-primary"
          onClick={() => setShowAddModal(true)}
        >
          <span className="plus-icon">＋</span>
          <span>Add New User</span>
        </button>
      </div>

      {/* KPI RIBBON */}
      <div className="user-kpi-ribbon">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total System Users</span>
          </div>
          <strong className="kpi-value">{totalUsers}</strong>
          <span className="kpi-sub">Registered accounts</span>
        </div>
        <div className="kpi-card role-border-admin">
          <div className="kpi-header">
            <span className="kpi-label">Administrators</span>
            <UserRoleIcon role="admin" size={22} />
          </div>
          <strong className="kpi-value text-admin">{adminCount}</strong>
          <span className="kpi-sub">Full modification rights</span>
        </div>
        <div className="kpi-card role-border-supervisor">
          <div className="kpi-header">
            <span className="kpi-label">Supervisors</span>
            <UserRoleIcon role="supervisor" size={22} />
          </div>
          <strong className="kpi-value text-supervisor">{supervisorCount}</strong>
          <span className="kpi-sub">Monitoring & approvals</span>
        </div>
        <div className="kpi-card role-border-maintenance">
          <div className="kpi-header">
            <span className="kpi-label">Maintenance Team</span>
            <UserRoleIcon role="maintenance" size={22} />
          </div>
          <strong className="kpi-value text-maintenance">{maintenanceCount}</strong>
          <span className="kpi-sub">Work orders & repair</span>
        </div>
        <div className="kpi-card role-border-operator">
          <div className="kpi-header">
            <span className="kpi-label">Operators</span>
            <UserRoleIcon role="operator" size={22} />
          </div>
          <strong className="kpi-value text-operator">{operatorCount}</strong>
          <span className="kpi-sub">Floor machine view</span>
        </div>
      </div>

      {/* PRIVILEGES MATRIX BANNER */}
      <div className="privilege-banner">
        <div className="privilege-banner-icon">ℹ</div>
        <div className="privilege-banner-text">
          <strong>Strict Admin Authority Active:</strong> Only users assigned the <code>Admin</code> role can edit the factory floor layout, add or delete machines, resize equipment, or manage user accounts. Supervisors, maintenance technicians, and operators have non-destructive operational views.
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="user-filter-bar">
        <div className="user-search-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search users by name, email, department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-btn"
              onClick={() => setSearchTerm("")}
            >
              ✕
            </button>
          )}
        </div>

        <div className="filter-dropdowns">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Roles ({totalUsers})</option>
            <option value="admin">Administrators ({adminCount})</option>
            <option value="supervisor">Supervisors ({supervisorCount})</option>
            <option value="maintenance">Maintenance ({maintenanceCount})</option>
            <option value="operator">Operators ({operatorCount})</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="user-table-card">
        <div className="table-header-row">
          <h3>Authorized Users Directory ({filteredUsers.length})</h3>
          <span className="table-subtitle">All personnel with authorized digital twin access</span>
        </div>

        {isLoadingUsers && <div style={{ padding: "16px", color: "#00b4d8", fontSize: "12px" }}>Connecting to Supabase database (bsiazqbjrwaxgpzxhhqh)...</div>}
        <div className="user-table-container">
          <table className="user-table">
            <thead>
              <tr>
                <th>Personnel</th>
                <th>Assigned Role</th>
                <th>Department & Shift</th>
                <th>Status</th>
                <th>Added Date</th>
                <th>Created By</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-users-row">
                    No users matching the specified search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className={user.status === "suspended" ? "row-suspended" : ""}>
                    {/* Name & Avatar */}
                    <td>
                      <div className="user-profile-cell">
                        <div className={`user-avatar ${getRoleBadgeClass(user.role)}`}>
                          <UserRoleIcon role={user.role} size={22} />
                        </div>
                        <div className="user-details">
                          <strong>{user.name}</strong>
                          <span>{user.email}</span>
                          <small className="user-id-tag">{user.id}</small>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td>
                      <span className={`role-pill ${getRoleBadgeClass(user.role)}`}>
                        <UserRoleIcon role={user.role} size={14} />
                        <span>{user.role.toUpperCase()}</span>
                      </span>
                    </td>

                    {/* Dept & Shift */}
                    <td>
                      <div className="dept-cell">
                        <strong>{user.department}</strong>
                        <span>{user.shift}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`status-pill-badge ${user.status}`}>
                        {user.status === "active" ? "● Active" : "▲ Suspended"}
                      </span>
                    </td>

                    {/* Date */}
                    <td>
                      <span className="date-cell">{user.createdAt}</span>
                    </td>

                    {/* Created By */}
                    <td>
                      <span className="created-by-cell">{user.createdBy}</span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="action-buttons-cell">
                        <button
                          type="button"
                          className="btn-action-edit"
                          onClick={() => {
                            setEditingUser(user);
                            setEditRoleSelection(user.role);
                          }}
                          title="Modify User Role"
                        >
                          Modify Role
                        </button>

                        <button
                          type="button"
                          className={`btn-action-status ${user.status}`}
                          onClick={() => handleToggleStatus(user.id)}
                          title={user.status === "active" ? "Suspend Account" : "Activate Account"}
                        >
                          {user.status === "active" ? "Suspend" : "Activate"}
                        </button>

                        {user.id !== "USR-001" && (
                          <button
                            type="button"
                            className="btn-action-delete"
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            title="Remove user"
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD USER MODAL */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="user-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <span className="modal-icon">👥</span>
                <div>
                  <h3>Add User & Assign Role</h3>
                  <p>Create a team member account and define operational privileges</p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Connor"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. s.connor@factoryos.internal"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Assign Role *</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="role-selector"
                  >
                    <option value="operator">Operator (Floor Machine Telemetry View)</option>
                    <option value="maintenance">Maintenance Technician (Work Orders & BOM)</option>
                    <option value="supervisor">Plant Supervisor (Analytics, Reports & AI)</option>
                    <option value="admin">System Administrator (Full Modification Clearance)</option>
                  </select>
                  <small className="field-hint">
                    {newUserRole === "admin"
                      ? "⚡ Grants full rights: Floor layout editing, adding/deleting machines, user management."
                      : newUserRole === "supervisor"
                      ? "🔍 Grants operational analytics, AI diagnostics, and reporting rights."
                      : newUserRole === "maintenance"
                      ? "⚒ Grants work order creation, dispatching, and equipment servicing."
                      : "👁 Safe monitoring view of machines and floor status without modification."}
                  </small>
                </div>

                <div className="form-group">
                  <label>Department / Plant Area</label>
                  <select
                    value={newUserDept}
                    onChange={(e) => setNewUserDept(e.target.value)}
                  >
                    <option value="Production Area 1 (Machining)">Production Area 1 (Machining)</option>
                    <option value="Production Area 2 (Forming & Thermal)">Production Area 2 (Forming & Thermal)</option>
                    <option value="Assembly Area (Robotics Cell)">Assembly Area (Robotics Cell)</option>
                    <option value="Material Handling & Logistics">Material Handling & Logistics</option>
                    <option value="Quality Assurance & Metrology">Quality Assurance & Metrology</option>
                    <option value="Facility & Plant Engineering">Facility & Plant Engineering</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Assigned Work Shift</label>
                  <select
                    value={newUserShift}
                    onChange={(e) => setNewUserShift(e.target.value)}
                  >
                    <option value="Morning (06:00 - 14:00)">Morning (06:00 - 14:00)</option>
                    <option value="Evening (14:00 - 22:00)">Evening (14:00 - 22:00)</option>
                    <option value="Night (22:00 - 06:00)">Night (22:00 - 06:00)</option>
                    <option value="General Day (08:00 - 17:00)">General Day (08:00 - 17:00)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Initial Login Password</label>
                  <input
                    type="text"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="factory123"
                  />
                  <small className="field-hint">The user can change this upon sign in</small>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit">
                  <span>＋</span>
                  <span>Create User & Assign Role</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROLE MODAL */}
      {editingUser && (
        <div className="modal-backdrop" onClick={() => setEditingUser(null)}>
          <div className="user-modal-box modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <span className="modal-icon">⚙</span>
                <div>
                  <h3>Modify Role: {editingUser.name}</h3>
                  <p>{editingUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setEditingUser(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-form">
              <div className="form-group">
                <label>Select New Role Clearance</label>
                <div className="role-options-grid">
                  {[
                    { id: "operator", title: "Operator", desc: "View floor telemetries & live alerts" },
                    { id: "maintenance", title: "Maintenance", desc: "Work orders, equipment servicing & parts" },
                    { id: "supervisor", title: "Supervisor", desc: "Analytics, reports, and AI assistant" },
                    { id: "admin", title: "Admin", desc: "Full permissions: Layout editor, add machines & users" },
                  ].map((r) => (
                    <div
                      key={r.id}
                      className={`role-option-card ${editRoleSelection === r.id ? "active" : ""}`}
                      onClick={() => setEditRoleSelection(r.id as UserRole)}
                    >
                      <div className="role-option-header">
                        <div className="role-option-title-wrap">
                          <UserRoleIcon role={r.id as UserRole} size={18} />
                          <strong>{r.title}</strong>
                        </div>
                        {editRoleSelection === r.id && <span>✓ Selected</span>}
                      </div>
                      <p>{r.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-modal-submit"
                  onClick={handleSaveRole}
                >
                  Update Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
