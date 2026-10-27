import React, { useState, useMemo } from "react";
import "./Alerts.css";
import type { Machine, Alert as RawAlert } from "../AIAssistant/AIAssistant";

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
  // Convert initial alerts to enhanced alert items
  const [alertList, setAlertList] = useState<AlertItem[]>(() => {
    return initialAlerts.map((a, index) => {
      // Find corresponding machine if any
      const machineObj = machines.find(
        (m) => a.machine.toLowerCase().includes(m.id.toLowerCase()) || a.machine.toLowerCase().includes(m.name.toLowerCase())
      );

      let sensorDetail = "Operational telemetry recorded";
      let suggestedAction = "Monitor system parameters.";
      let machineId = "M-SYS";

      if (machineObj) {
        machineId = machineObj.id;
        sensorDetail = `Temp: ${machineObj.temperature}°C | Vib: ${machineObj.vibration} mm/s | Current: ${machineObj.current}A`;
        suggestedAction = machineObj.recommendation;
      }

      return {
        id: `ALT-${1000 + index}`,
        machine: a.machine,
        machineId,
        message: a.message,
        time: a.time,
        type: a.type,
        status: "active",
        sensorDetail,
        suggestedAction,
      };
    });
  });

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
    setAlertList((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "acknowledged" } : a))
    );
    showToast(`Alert ${id} acknowledged by operator.`);
  };

  const handleResolve = (id: string) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setAlertList((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "resolved", resolvedAt: timeNow } : a))
    );
    showToast(`Alert ${id} marked as RESOLVED.`);
  };

  const handleAcknowledgeAll = () => {
    setAlertList((prev) =>
      prev.map((a) => (a.status === "active" ? { ...a, status: "acknowledged" } : a))
    );
    showToast("All active alerts acknowledged.");
  };

  const handleCreateWorkOrder = (alert: AlertItem) => {
    showToast(`Work order ticket dispatched for ${alert.machine}!`);
  };

  return (
    <div className="alerts-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          background: "#00b4d8",
          color: "#07111b",
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
        <div className="alerts-title-group">
          <div className="alerts-icon-badge">♧</div>
          <div>
            <h2>Plant Alerts & Condition Monitoring Center</h2>
            <span>Real-time anomaly triggers, sensor thresholds, and incident resolution</span>
          </div>
        </div>

        <div className="alerts-header-actions">
          {onNavigate && (
            <button
              type="button"
              className="btn-ack-all"
              onClick={() => onNavigate("Dashboard")}
            >
              ⬅ Dashboard
            </button>
          )}
          <button
            type="button"
            className="btn-ack-all"
            onClick={handleAcknowledgeAll}
          >
            ✓ Acknowledge All Active
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="alerts-kpi-grid">
        <div className="alerts-kpi-card">
          <span>Active Unresolved</span>
          <strong>{activeCount} Alerts</strong>
          <small>Awaiting operator inspection</small>
        </div>
        <div className="alerts-kpi-card">
          <span>Critical Severity</span>
          <strong style={{ color: criticalCount > 0 ? "#ff4d4f" : "#00ffc4" }}>
            {criticalCount} Critical
          </strong>
          <small>Requires immediate equipment shutdown</small>
        </div>
        <div className="alerts-kpi-card">
          <span>Warning Triggers</span>
          <strong style={{ color: warningCount > 0 ? "#ffb84d" : "#00ffc4" }}>
            {warningCount} Warnings
          </strong>
          <small>Sensor threshold drift</small>
        </div>
        <div className="alerts-kpi-card">
          <span>Resolved Incidents</span>
          <strong style={{ color: "#52c41a" }}>{resolvedCount} Resolved</strong>
          <small>Restored to safe operating limits</small>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="alerts-filter-bar">
        <div className="alerts-search-box">
          <input
            type="text"
            className="alerts-search-input"
            placeholder="🔍 Search alerts by machine, error message, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="alerts-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All Severities ({alertList.length})</option>
          <option value="critical">Critical Only ({criticalCount})</option>
          <option value="warning">Warning Only ({warningCount})</option>
          <option value="info">Info Notices</option>
        </select>

        <select
          className="alerts-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active ({activeCount})</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved ({resolvedCount})</option>
        </select>
      </div>

      {/* Alerts Feed */}
      <div className="alerts-list">
        {filteredAlerts.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "40px",
            background: "#0d1b2a",
            borderRadius: "8px",
            border: "1px solid #203448",
            color: "#8da4be"
          }}>
            No alerts match the selected search or filter criteria.
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
                  <span style={{ fontSize: "0.78rem", color: "#6c8299", fontFamily: "monospace" }}>
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
                      <strong style={{ color: "#90e0ef" }}>{alert.suggestedAction}</strong>
                    </div>
                  )}
                </div>
              )}

              <div className="alert-bottom-actions">
                <div className="alert-state-tag">
                  Status:{" "}
                  <strong style={{
                    color: alert.status === "resolved" ? "#52c41a" : alert.status === "acknowledged" ? "#ffb84d" : "#ff4d4f",
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
