import React, { useState, useMemo } from "react";
import "./Alerts.css";
import type { Machine } from "../../components/AddMachineModal/AddMachineModal";
import type { Alert as RawAlert } from "../AIAssistant/AIAssistant";

interface AlertItem {
  id: string;
  machine: string;
  machineId: string;
  message: string;
  time: string;
  type: "critical" | "warning" | "info";
  status: "active" | "acknowledged" | "resolved";
  resolvedAt?: string;
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
      let suggestedAction = (a as any).recommendation || "Monitor system parameters.";
      let machineId = (a as any).machineId || "M-SYS";

      if (machineObj) {
        machineId = machineObj.id;
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
        message: a.message,
        time: a.time,
        type: a.type,
        status,
        resolvedAt: resolvedIds.get(id),
        sensorDetail,
        suggestedAction,
      };
    });
  }, [initialAlerts, machines, acknowledgedIds, resolvedIds]);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // KPI Calculations
  const activeCount = alertList.filter((a) => a.status === "active").length;
  const criticalCount = alertList.filter((a) => a.type === "critical" && a.status !== "resolved").length;
  const warningCount = alertList.filter((a) => a.type === "warning" && a.status !== "resolved").length;
  const resolvedCount = alertList.filter((a) => a.status === "resolved").length;

  // Filtered Alerts
  const filteredAlerts = useMemo(() => {
    return alertList.filter((a) => {
      const matchesSearch =
        a.machine.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === "all" || a.type === typeFilter;
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [alertList, searchTerm, typeFilter, statusFilter]);

  // Actions
  const handleAcknowledge = (id: string) => {
    setAcknowledgedIds((prev) => new Set(prev).add(id));
    showToast(`Alert ${id} acknowledged by operator.`);
  };

  const handleResolve = (id: string) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setResolvedIds((prev) => new Map(prev).set(id, timeNow));
    showToast(`Alert ${id} marked as RESOLVED.`);
  };

  const handleAcknowledgeAll = () => {
    const allActive = alertList.filter((a) => a.status === "active").map((a) => a.id);
    setAcknowledgedIds((prev) => {
      const next = new Set(prev);
      allActive.forEach((id) => next.add(id));
      return next;
    });
    showToast("All active alerts acknowledged.");
  };

  const handleCreateWorkOrder = (alert: AlertItem) => {
    showToast(`Work order ticket dispatched for ${alert.machine}!`);
    if (onNavigate) {
      setTimeout(() => onNavigate("Maintenance"), 800);
    }
  };

  return (
    <div className="alerts-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          background: "#0284c7",
          color: "#ffffff",
          padding: "12px 20px",
          borderRadius: "6px",
          fontWeight: 700,
          zIndex: 2000,
          boxShadow: "0 4px 14px rgba(0,0,0,0.4)"
        }}>
          🔔 {toastMessage}
        </div>
      )}

      {/* Header Banner */}
      <div className="alerts-header">
        <div>
          <h2>Condition Alerts & Telemetry Anomalies</h2>
          <p>
            Real-time sensor event log dynamically generated from {machines.length} equipment on floor layout.
          </p>
        </div>

        <div className="alerts-actions-top">
          {activeCount > 0 && (
            <button
              type="button"
              className="btn-ack-all"
              onClick={handleAcknowledgeAll}
            >
              ✓ Acknowledge All Active ({activeCount})
            </button>
          )}

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

      {/* KPI Cards */}
      <div className="alerts-kpi-grid">
        <div className="alert-kpi-card total">
          <span className="alert-kpi-label">Active Anomalies</span>
          <strong className="alert-kpi-val" style={{ color: activeCount > 0 ? "#ef4444" : "#10b981" }}>
            {activeCount}
          </strong>
          <span className="alert-kpi-sub">Real-time floor triggers</span>
        </div>

        <div className="alert-kpi-card critical">
          <span className="alert-kpi-label">Critical Out-of-Spec</span>
          <strong className="alert-kpi-val">{criticalCount}</strong>
          <span className="alert-kpi-sub">Immediate action required</span>
        </div>

        <div className="alert-kpi-card warning">
          <span className="alert-kpi-label">Warning Advisories</span>
          <strong className="alert-kpi-val">{warningCount}</strong>
          <span className="alert-kpi-sub">Within tolerance envelope</span>
        </div>

        <div className="alert-kpi-card resolved">
          <span className="alert-kpi-label">Resolved Events</span>
          <strong className="alert-kpi-val">{resolvedCount}</strong>
          <span className="alert-kpi-sub">Remediated by staff</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="alerts-toolbar">
        <div className="alerts-search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by Machine ID, Name, or Anomaly..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearchTerm("")}
            >
              ✕
            </button>
          )}
        </div>

        <div className="alerts-filters">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="alert-select"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="warning">Warning Only</option>
            <option value="info">Info Only</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="alert-select"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="alerts-list">
        {filteredAlerts.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "50px 20px",
            background: "#0e1726",
            borderRadius: "8px",
            border: "1px solid #1e293b",
            color: "#94a3b8"
          }}>
            <div style={{ color: "#10b981", fontSize: "28px", marginBottom: "8px" }}>✓</div>
            <strong style={{ display: "block", color: "#f8fafc", fontSize: "16px", marginBottom: "4px" }}>
              Zero Active Anomalies Detected
            </strong>
            <span>
              All {machines.length} machines on the layout floor are operating strictly within nominal temperature, vibration, and cutting load envelopes.
            </span>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`alert-item-card ${alert.type} ${alert.status === "resolved" ? "resolved" : ""}`}
            >
              <div className="alert-top-row">
                <div className="alert-machine-title">
                  <span>{alert.machine}</span>
                  <span className={`alert-type-badge ${alert.type}`}>
                    {alert.type}
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "#64748b", fontFamily: "monospace" }}>
                    #{alert.id}
                  </span>
                </div>
                <span className="alert-time">Logged at {alert.time}</span>
              </div>

              <div className="alert-message-content">
                <strong>Condition Trigger:</strong> {alert.message}
              </div>

              {alert.sensorDetail && (
                <div className="alert-context-box">
                  <div className="alert-context-item">
                    <span>Telemetry at Event:</span>
                    <strong>{alert.sensorDetail}</strong>
                  </div>
                  {alert.suggestedAction && (
                    <div className="alert-context-item">
                      <span>Prescribed Action:</span>
                      <strong style={{ color: "#38bdf8" }}>{alert.suggestedAction}</strong>
                    </div>
                  )}
                </div>
              )}

              <div className="alert-bottom-actions">
                <div className="alert-state-tag">
                  Status:{" "}
                  <strong style={{
                    color: alert.status === "resolved" ? "#10b981" : alert.status === "acknowledged" ? "#f59e0b" : "#ef4444",
                    textTransform: "uppercase"
                  }}>
                    {alert.status}
                    {alert.resolvedAt ? ` (at ${alert.resolvedAt})` : ""}
                  </strong>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  {alert.status === "active" && (
                    <button
                      type="button"
                      className="btn-alert-action btn-ack"
                      onClick={() => handleAcknowledge(alert.id)}
                    >
                      ✓ Acknowledge
                    </button>
                  )}

                  {alert.status !== "resolved" && (
                    <button
                      type="button"
                      className="btn-alert-action btn-resolve"
                      onClick={() => handleResolve(alert.id)}
                    >
                      ✔ Mark Resolved
                    </button>
                  )}

                  {onNavigate && (
                    <button
                      type="button"
                      className="btn-alert-action btn-diagnose"
                      onClick={() => onNavigate("AI Assistant")}
                    >
                      🤖 AI Diagnose
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-alert-action btn-wo-alert"
                    onClick={() => handleCreateWorkOrder(alert)}
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
