import React, { useState, useMemo } from "react";
import "./Alerts.css";
import type { Machine } from "../../components/AddMachineModal/AddMachineModal";
import type { Alert as RawAlert } from "../AIAssistant/AIAssistant";

interface AlertItem {
  id: string;
  machine: string;
  machineId: string;
  department: string;
  location: string;
  message: string;
  time: string;
  type: "critical" | "warning" | "info";
  status: "active" | "acknowledged" | "resolved";
  resolvedAt?: string;
  temperature?: number;
  vibration?: number;
  current?: number;
  flankWearMm?: number;
  sensorDetail?: string;
  suggestedAction?: string;
}

interface AlertsProps {
  machines: Machine[];
  alerts: RawAlert[];
  onNavigate?: (page: string) => void;
}

export const Alerts: React.FC<AlertsProps> = ({
  machines,
  alerts: initialAlerts,
  onNavigate,
}) => {
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [resolvedIds, setResolvedIds] = useState<Map<string, string>>(new Map());

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Extract unique departments / locations for bay filtering
  const availableBays = useMemo(() => {
    const set = new Set<string>();
    machines.forEach((m) => {
      if (m.department) set.add(m.department);
      if (m.location) set.add(m.location);
    });
    return Array.from(set).sort();
  }, [machines]);

  // Derive alert items dynamically from layout machines
  const alertList: AlertItem[] = useMemo(() => {
    return initialAlerts.map((a, index) => {
      const id = (a as any).id || `ALT-${1000 + index}`;
      const machineObj = machines.find(
        (m) =>
          a.machine.toLowerCase().includes(m.id.toLowerCase()) ||
          a.machine.toLowerCase().includes(m.name.toLowerCase())
      );

      let sensorDetail = "Operational telemetry recorded";
      let suggestedAction = (a as any).recommendation || "Monitor telemetry envelope closely.";
      let machineId = (a as any).machineId || "M-SYS";
      let department = "Production Floor";
      let location = "Main Plant";
      let temperature: number | undefined;
      let vibration: number | undefined;
      let current: number | undefined;
      let flankWearMm: number | undefined;

      if (machineObj) {
        machineId = machineObj.id;
        department = machineObj.department || department;
        location = machineObj.location || location;
        temperature = machineObj.temperature;
        vibration = machineObj.vibration;
        current = machineObj.current;
        flankWearMm = machineObj.flankWearMm;
        sensorDetail = `Temp: ${machineObj.temperature}°C | Vib: ${machineObj.vibration} mm/s | Current: ${machineObj.current}A | Tool Wear VB: ${(machineObj.flankWearMm ?? 0.08).toFixed(3)}mm`;
        suggestedAction = machineObj.recommendation || suggestedAction;
      }

      const isResolved = resolvedIds.has(id);
      const isAck = acknowledgedIds.has(id);
      const status: "active" | "acknowledged" | "resolved" = isResolved
        ? "resolved"
        : isAck
        ? "acknowledged"
        : "active";

      return {
        id,
        machine: a.machine,
        machineId,
        department,
        location,
        message: a.message,
        time: a.time,
        type: a.type,
        status,
        resolvedAt: resolvedIds.get(id),
        temperature,
        vibration,
        current,
        flankWearMm,
        sensorDetail,
        suggestedAction,
      };
    });
  }, [initialAlerts, machines, acknowledgedIds, resolvedIds]);

  // KPI Calculations
  const activeCount = alertList.filter((a) => a.status === "active").length;
  const criticalCount = alertList.filter((a) => a.type === "critical" && a.status !== "resolved").length;
  const warningCount = alertList.filter((a) => a.type === "warning" && a.status !== "resolved").length;
  const resolvedCount = alertList.filter((a) => a.status === "resolved").length;

  // Filtered & Sorted Alerts
  const filteredAlerts = useMemo(() => {
    let result = alertList.filter((a) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        a.machine.toLowerCase().includes(q) ||
        a.machineId.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        (a.department && a.department.toLowerCase().includes(q)) ||
        (a.suggestedAction && a.suggestedAction.toLowerCase().includes(q));

      const matchesType = typeFilter === "all" || a.type === typeFilter;
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      const matchesBay =
        departmentFilter === "all" ||
        a.department === departmentFilter ||
        a.location === departmentFilter;

      return matchesSearch && matchesType && matchesStatus && matchesBay;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "severity") {
        const score = (t: string) => (t === "critical" ? 3 : t === "warning" ? 2 : 1);
        return score(b.type) - score(a.type);
      }
      if (sortBy === "machine") {
        return a.machine.localeCompare(b.machine);
      }
      if (sortBy === "oldest") {
        return a.id.localeCompare(b.id);
      }
      // default: newest
      return b.id.localeCompare(a.id);
    });

    return result;
  }, [alertList, searchTerm, typeFilter, statusFilter, departmentFilter, sortBy]);

  // Actions
  const handleAcknowledge = (id: string) => {
    setAcknowledgedIds((prev) => new Set(prev).add(id));
    showToast(`Alert #${id} acknowledged by operator.`);
  };

  const handleResolve = (id: string) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setResolvedIds((prev) => new Map(prev).set(id, timeNow));
    showToast(`Alert #${id} marked as RESOLVED.`);
  };

  const handleAcknowledgeAll = () => {
    const allActive = alertList.filter((a) => a.status === "active").map((a) => a.id);
    setAcknowledgedIds((prev) => {
      const next = new Set(prev);
      allActive.forEach((id) => next.add(id));
      return next;
    });
    showToast(`All ${allActive.length} active alerts acknowledged.`);
  };

  const handleCreateWorkOrder = (alert: AlertItem) => {
    showToast(`Maintenance Work Order ticket dispatched for ${alert.machine}!`);
    if (onNavigate) {
      setTimeout(() => onNavigate("Maintenance"), 800);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setStatusFilter("all");
    setDepartmentFilter("all");
    setSortBy("newest");
  };

  const handleExportCSV = () => {
    if (filteredAlerts.length === 0) {
      alert("No alerts to export.");
      return;
    }
    const headers = ["Alert ID", "Machine ID", "Machine Name", "Department", "Severity", "Status", "Condition Message", "Logged Time", "Sensor Detail", "Action"];
    const rows = filteredAlerts.map((a) => [
      a.id,
      a.machineId,
      `"${a.machine}"`,
      `"${a.department}"`,
      a.type.toUpperCase(),
      a.status.toUpperCase(),
      `"${a.message.replace(/"/g, '""')}"`,
      a.time,
      `"${a.sensorDetail || ""}"`,
      `"${(a.suggestedAction || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FactoryOS_Condition_Alerts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Alerts log CSV exported successfully.");
  };

  const hasActiveFilters = searchTerm !== "" || typeFilter !== "all" || statusFilter !== "all" || departmentFilter !== "all" || sortBy !== "newest";

  return (
    <div className="alerts-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="alerts-toast-pill">
          🔔 {toastMessage}
        </div>
      )}

      {/* Header Banner */}
      <div className="alerts-header">
        <div className="alerts-title-group">
          <div className="alerts-icon-badge">⚡</div>
          <div>
            <h2>Condition Alerts & Telemetry Anomalies</h2>
            <p>
              Real-time sensor event log dynamically generated from {machines.length} active equipment across plant floor bays.
            </p>
          </div>
        </div>

        <div className="alerts-actions-top">
          {activeCount > 0 && (
            <button
              type="button"
              className="btn-ack-all"
              onClick={handleAcknowledgeAll}
              title="Mark all unacknowledged active alerts as read"
            >
              ✓ Acknowledge All ({activeCount})
            </button>
          )}

          <button
            type="button"
            className="btn-export-csv"
            onClick={handleExportCSV}
            title="Export filtered alerts log as a CSV audit report"
          >
            📥 Export CSV Log
          </button>

          {onNavigate && (
            <button
              type="button"
              className="btn-link-view"
              onClick={() => onNavigate("Dashboard")}
            >
              ← Floor Blueprint
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Ribbon */}
      <div className="alerts-kpi-grid">
        <div
          className={`alerts-kpi-card total ${statusFilter === "active" ? "active-kpi" : ""}`}
          onClick={() => setStatusFilter((curr) => (curr === "active" ? "all" : "active"))}
          title="Click to toggle active alerts"
        >
          <span className="alert-kpi-label">Active Anomalies</span>
          <strong className="alert-kpi-val" style={{ color: activeCount > 0 ? "#ef4444" : "#10b981" }}>
            {activeCount}
          </strong>
          <span className="alert-kpi-sub">{activeCount > 0 ? "Requires floor attention" : "All equipment nominal"}</span>
        </div>

        <div
          className={`alerts-kpi-card critical ${typeFilter === "critical" ? "active-kpi" : ""}`}
          onClick={() => setTypeFilter((curr) => (curr === "critical" ? "all" : "critical"))}
          title="Click to filter Critical out-of-spec alerts"
        >
          <span className="alert-kpi-label">Critical Out-of-Spec</span>
          <strong className="alert-kpi-val" style={{ color: criticalCount > 0 ? "#ff4d4f" : "#94a3b8" }}>
            {criticalCount}
          </strong>
          <span className="alert-kpi-sub">Immediate threshold breach</span>
        </div>

        <div
          className={`alerts-kpi-card warning ${typeFilter === "warning" ? "active-kpi" : ""}`}
          onClick={() => setTypeFilter((curr) => (curr === "warning" ? "all" : "warning"))}
          title="Click to filter Warning advisories"
        >
          <span className="alert-kpi-label">Warning Advisories</span>
          <strong className="alert-kpi-val" style={{ color: warningCount > 0 ? "#ffb84d" : "#94a3b8" }}>
            {warningCount}
          </strong>
          <span className="alert-kpi-sub">Within tolerance envelope</span>
        </div>

        <div
          className={`alerts-kpi-card resolved ${statusFilter === "resolved" ? "active-kpi" : ""}`}
          onClick={() => setStatusFilter((curr) => (curr === "resolved" ? "all" : "resolved"))}
          title="Click to filter Resolved events"
        >
          <span className="alert-kpi-label">Resolved Events</span>
          <strong className="alert-kpi-val" style={{ color: "#10b981" }}>
            {resolvedCount}
          </strong>
          <span className="alert-kpi-sub">Remediated & cleared</span>
        </div>
      </div>

      {/* Modern Search & Filter Command Bar */}
      <div className="alerts-command-bar">
        {/* Search Input Box */}
        <div className="alerts-search-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="alerts-search-input"
            placeholder="Search by Machine ID (e.g. M-01), name, fault, sensor, or recommendation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchTerm("")}
              title="Clear search input"
            >
              ✕
            </button>
          )}
        </div>

        {/* Quick Filter Chips */}
        <div className="alerts-quick-chips">
          <button
            type="button"
            className={`quick-chip ${typeFilter === "all" && statusFilter === "all" ? "active" : ""}`}
            onClick={() => { setTypeFilter("all"); setStatusFilter("all"); }}
          >
            All ({alertList.length})
          </button>
          <button
            type="button"
            className={`quick-chip critical ${typeFilter === "critical" ? "active" : ""}`}
            onClick={() => setTypeFilter((curr) => (curr === "critical" ? "all" : "critical"))}
          >
            🔴 Critical ({criticalCount})
          </button>
          <button
            type="button"
            className={`quick-chip warning ${typeFilter === "warning" ? "active" : ""}`}
            onClick={() => setTypeFilter((curr) => (curr === "warning" ? "all" : "warning"))}
          >
            ⚠️ Warnings ({warningCount})
          </button>
          <button
            type="button"
            className={`quick-chip active-state ${statusFilter === "active" ? "active" : ""}`}
            onClick={() => setStatusFilter((curr) => (curr === "active" ? "all" : "active"))}
          >
            ⚡ Active ({activeCount})
          </button>
          <button
            type="button"
            className={`quick-chip resolved ${statusFilter === "resolved" ? "active" : ""}`}
            onClick={() => setStatusFilter((curr) => (curr === "resolved" ? "all" : "resolved"))}
          >
            ✓ Resolved ({resolvedCount})
          </button>
        </div>

        {/* Dropdown Select Filters */}
        <div className="alerts-dropdown-row">
          <div className="alerts-dropdown-group">
            <span className="dropdown-label">Severity:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="alerts-select"
            >
              <option value="all">All Severities</option>
              <option value="critical">🔴 Critical Only</option>
              <option value="warning">⚠️ Warning Only</option>
              <option value="info">ℹ️ Info Only</option>
            </select>
          </div>

          <div className="alerts-dropdown-group">
            <span className="dropdown-label">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="alerts-select"
            >
              <option value="all">All Statuses</option>
              <option value="active">⚡ Active Only</option>
              <option value="acknowledged">👁️ Acknowledged</option>
              <option value="resolved">✓ Resolved</option>
            </select>
          </div>

          {availableBays.length > 0 && (
            <div className="alerts-dropdown-group">
              <span className="dropdown-label">Bay / Room:</span>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="alerts-select"
              >
                <option value="all">All Bays / Rooms</option>
                {availableBays.map((bay) => (
                  <option key={bay} value={bay}>
                    {bay}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="alerts-dropdown-group">
            <span className="dropdown-label">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="alerts-select"
            >
              <option value="newest">🕒 Newest First</option>
              <option value="oldest">⏳ Oldest First</option>
              <option value="severity">🔥 Severity (High to Low)</option>
              <option value="machine">🔤 Machine Name</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="btn-reset-filters"
              onClick={handleResetFilters}
              title="Reset all filters and search term"
            >
              ↺ Reset Filters
            </button>
          )}

          <div className="alerts-count-badge">
            Showing <strong>{filteredAlerts.length}</strong> of {alertList.length} alerts
          </div>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="alerts-list">
        {filteredAlerts.length === 0 ? (
          <div className="alerts-empty-state">
            {alertList.length === 0 ? (
              <>
                <div className="empty-state-icon nominal">✓</div>
                <h3>Zero Active Anomalies Detected</h3>
                <p>
                  All {machines.length} machines on the plant floor layout are operating strictly within nominal temperature, vibration, load current, and tool wear envelopes.
                </p>
              </>
            ) : (
              <>
                <div className="empty-state-icon">🔍</div>
                <h3>No Matching Alerts Found</h3>
                <p>
                  No condition alerts match your current search query <strong>"{searchTerm}"</strong> or selected filters.
                </p>
                <button
                  type="button"
                  className="btn-reset-filters"
                  style={{ margin: "14px auto 0", display: "inline-block" }}
                  onClick={handleResetFilters}
                >
                  Clear Search & Show All Alerts
                </button>
              </>
            )}
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`alert-item-card ${alert.type} ${alert.status === "resolved" ? "resolved" : alert.status === "acknowledged" ? "acknowledged" : ""}`}
            >
              <div className="alert-top-row">
                <div className="alert-machine-title">
                  <span className="alert-machine-icon">
                    {alert.machine.toLowerCase().includes("robot") || alert.machine.toLowerCase().includes("weld") ? "🤖" :
                     alert.machine.toLowerCase().includes("furnace") || alert.machine.toLowerCase().includes("heat") ? "♨" : "⚙"}
                  </span>
                  <span className="alert-machine-name">{alert.machine}</span>
                  <span className={`alert-type-badge ${alert.type}`}>
                    {alert.type}
                  </span>
                  <span className="alert-id-tag">#{alert.id}</span>
                  {alert.department && (
                    <span className="alert-bay-tag">🏛 {alert.department}</span>
                  )}
                </div>
                <span className="alert-time">Logged at {alert.time}</span>
              </div>

              <div className="alert-message-content">
                <strong>Condition Trigger:</strong> {alert.message}
              </div>

              {/* Live Telemetry Context Strip */}
              <div className="alert-context-box">
                {alert.temperature !== undefined && (
                  <div className="alert-context-pill">
                    <span className="pill-key">🌡️ Temp:</span>
                    <span className={`pill-val ${alert.temperature > 80 ? "critical-val" : ""}`}>
                      {alert.temperature}°C
                    </span>
                  </div>
                )}
                {alert.vibration !== undefined && (
                  <div className="alert-context-pill">
                    <span className="pill-key">⚡ Vibration:</span>
                    <span className={`pill-val ${alert.vibration > 4.5 ? "critical-val" : ""}`}>
                      {alert.vibration} mm/s
                    </span>
                  </div>
                )}
                {alert.current !== undefined && (
                  <div className="alert-context-pill">
                    <span className="pill-key">🔌 Current:</span>
                    <span className={`pill-val ${alert.current > 14 ? "critical-val" : ""}`}>
                      {alert.current} A
                    </span>
                  </div>
                )}
                {alert.flankWearMm !== undefined && (
                  <div className="alert-context-pill">
                    <span className="pill-key">🔪 Tool Wear VB:</span>
                    <span className={`pill-val ${alert.flankWearMm > 0.4 ? "critical-val" : ""}`}>
                      {alert.flankWearMm.toFixed(3)} mm
                    </span>
                  </div>
                )}

                {alert.suggestedAction && (
                  <div className="alert-action-pill">
                    <span className="pill-key">🤖 Prescribed Action:</span>
                    <span className="pill-val action-text">{alert.suggestedAction}</span>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="alert-bottom-actions">
                <div className="alert-state-tag">
                  Status:{" "}
                  <strong
                    className={`status-pill-text ${alert.status}`}
                  >
                    {alert.status}
                    {alert.resolvedAt ? ` (at ${alert.resolvedAt})` : ""}
                  </strong>
                </div>

                <div className="alert-btn-cluster">
                  {alert.status === "active" && (
                    <button
                      type="button"
                      className="btn-alert-action btn-ack"
                      onClick={() => handleAcknowledge(alert.id)}
                      title="Acknowledge receipt of this alert"
                    >
                      ✓ Acknowledge
                    </button>
                  )}

                  {alert.status !== "resolved" && (
                    <button
                      type="button"
                      className="btn-alert-action btn-resolve"
                      onClick={() => handleResolve(alert.id)}
                      title="Mark condition as resolved and cleared"
                    >
                      ✔ Mark Resolved
                    </button>
                  )}

                  {onNavigate && (
                    <button
                      type="button"
                      className="btn-alert-action btn-diagnose"
                      onClick={() => onNavigate("AI Assistant")}
                      title="Open Multimodal AI Assistant for Root Cause Analysis"
                    >
                      🤖 AI Diagnose
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-alert-action btn-wo-alert"
                    onClick={() => handleCreateWorkOrder(alert)}
                    title="Dispatch maintenance work order ticket to shop floor"
                  >
                    + Work Order
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Alerts;
