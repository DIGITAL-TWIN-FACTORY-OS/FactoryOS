import React, { useState, useMemo } from "react";
import "./Reports.css";
import type { Machine, Alert } from "../AIAssistant/AIAssistant";

interface ReportsProps {
  machines: Machine[];
  alerts?: Alert[];
  onNavigate?: (page: string) => void;
}

export const Reports: React.FC<ReportsProps> = ({
  machines,
  alerts = [],
  onNavigate,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("risk_desc");
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

  // Extract unique locations
  const locations = useMemo(() => {
    const locSet = new Set(machines.map((m) => m.location));
    return Array.from(locSet);
  }, [machines]);

  // KPI Calculations
  const totalMachines = machines.length;
  const criticalCount = machines.filter((m) => m.status === "critical").length;
  const warningCount = machines.filter((m) => m.status === "warning").length;
  const healthyCount = machines.filter((m) => m.status === "running").length;
  const totalAlerts = alerts.length;
  const fleetUptime = totalMachines > 0 ? ((healthyCount / totalMachines) * 100).toFixed(1) : "0";
  const avgHealth = totalMachines > 0
    ? Math.round(machines.reduce((acc, m) => acc + m.health, 0) / totalMachines)
    : 0;

  // Filtered and Sorted Machines
  const filteredMachines = useMemo(() => {
    return machines
      .filter((m) => {
        const matchesSearch =
          m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.location.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
          statusFilter === "all" || m.status === statusFilter;

        const matchesLocation =
          locationFilter === "all" || m.location === locationFilter;

        return matchesSearch && matchesStatus && matchesLocation;
      })
      .sort((a, b) => {
        if (sortBy === "risk_desc") return b.failureProbability - a.failureProbability;
        if (sortBy === "health_asc") return a.health - b.health;
        if (sortBy === "health_desc") return b.health - a.health;
        if (sortBy === "temp_desc") return b.temperature - a.temperature;
        if (sortBy === "vib_desc") return b.vibration - a.vibration;
        if (sortBy === "id_asc") return a.id.localeCompare(b.id);
        return 0;
      });
  }, [machines, searchTerm, statusFilter, locationFilter, sortBy]);

  // Export to CSV Function
  const exportToCSV = () => {
    const headers = [
      "Machine ID",
      "Machine Name",
      "Status",
      "Department / Location",
      "Health Score (%)",
      "Failure Probability (%)",
      "Est. Failure In",
      "Temperature (C)",
      "Vibration (mm/s)",
      "Current (A)",
      "Speed (RPM)",
      "Runtime (h)",
      "Installed On",
      "Last Maintenance",
      "AI Diagnosis",
      "Recommendation"
    ];

    const rows = filteredMachines.map((m) => [
      `"${m.id}"`,
      `"${m.name}"`,
      `"${m.status.toUpperCase()}"`,
      `"${m.location}"`,
      m.health,
      m.failureProbability,
      `"${m.failureTime}"`,
      m.temperature,
      m.vibration,
      m.current,
      m.speed,
      m.runtime,
      `"${m.installedOn}"`,
      `"${m.lastMaintenance}"`,
      `"${m.diagnosis.replace(/"/g, '""')}"`,
      `"${m.recommendation.replace(/"/g, '""')}"`
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `FactoryOS_Machine_Report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getHealthColor = (health: number) => {
    if (health >= 80) return "#00ffc4";
    if (health >= 50) return "#ffb84d";
    return "#ff4d4f";
  };

  return (
    <div className="reports-container">
      {/* Header Banner */}
      <div className="reports-header">
        <div className="reports-title-group">
          <div className="reports-icon-badge">▤</div>
          <div>
            <h2>Machine Intelligence & Operations Report</h2>
            <span>Detailed performance diagnostics, telemetry audit, and predictive risk report</span>
          </div>
        </div>

        <div className="reports-action-group">
          {onNavigate && (
            <button
              type="button"
              className="btn-export"
              onClick={() => onNavigate("Dashboard")}
            >
              ⬅ Dashboard
            </button>
          )}
          <button
            type="button"
            className="btn-export"
            onClick={exportToCSV}
            title="Download complete machine telemetry and health records as CSV"
          >
            📥 Export CSV
          </button>
          <button
            type="button"
            className="btn-print"
            onClick={() => window.print()}
            title="Print or Save as PDF"
          >
            🖨️ Print Report
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="reports-kpi-grid">
        <div className="reports-kpi-card">
          <span>Total Monitored Fleet</span>
          <strong>{totalMachines} Units</strong>
          <small>Across {locations.length} production departments</small>
        </div>
        <div className="reports-kpi-card">
          <span>Fleet Health Index</span>
          <strong style={{ color: getHealthColor(avgHealth) }}>{avgHealth}%</strong>
          <small>{healthyCount} healthy, {warningCount + criticalCount} degraded</small>
        </div>
        <div className="reports-kpi-card">
          <span>Operational Availability</span>
          <strong style={{ color: Number(fleetUptime) >= 80 ? "#00ffc4" : "#ffb84d" }}>
            {fleetUptime}%
          </strong>
          <small>{healthyCount} running at full capacity</small>
        </div>
        <div className="reports-kpi-card">
          <span>High Risk / Critical Units</span>
          <strong style={{ color: criticalCount > 0 ? "#ff4d4f" : "#00ffc4" }}>
            {criticalCount} Critical
          </strong>
          <small>{warningCount} in warning state</small>
        </div>
        <div className="reports-kpi-card">
          <span>System Alerts</span>
          <strong style={{ color: totalAlerts > 0 ? "#ffb84d" : "#00ffc4" }}>
            {totalAlerts} Logged
          </strong>
          <small>{criticalCount} requiring intervention</small>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="reports-filter-bar">
        <div className="reports-search-box">
          <input
            type="text"
            className="reports-search-input"
            placeholder="🔍 Search by machine ID, name, or area..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="reports-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses ({totalMachines})</option>
          <option value="critical">Critical ({criticalCount})</option>
          <option value="warning">Warning ({warningCount})</option>
          <option value="running">Healthy / Running ({healthyCount})</option>
        </select>

        <select
          className="reports-select"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
        >
          <option value="all">All Departments / Areas</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>

        <select
          className="reports-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="risk_desc">Sort: Highest Failure Risk</option>
          <option value="health_asc">Sort: Lowest Health Score</option>
          <option value="health_desc">Sort: Highest Health Score</option>
          <option value="temp_desc">Sort: Highest Temperature</option>
          <option value="vib_desc">Sort: Highest Vibration</option>
          <option value="id_asc">Sort: Machine ID (A-Z)</option>
        </select>
      </div>

      {/* Main Machine Details Table */}
      <div className="reports-table-card">
        <div className="reports-table-wrapper">
          <table className="machine-reports-table">
            <thead>
              <tr>
                <th>Machine</th>
                <th>Department</th>
                <th>Status</th>
                <th>Health Score</th>
                <th>Failure Risk</th>
                <th>Est. Failure</th>
                <th>Temp (°C)</th>
                <th>Vibration</th>
                <th>Current</th>
                <th>Speed (RPM)</th>
                <th>Last Service</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredMachines.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: "center", padding: "30px", color: "#8da4be" }}>
                    No machines match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredMachines.map((m) => (
                  <tr key={m.id} onClick={() => setSelectedMachine(m)}>
                    <td>
                      <strong>{m.id}</strong>
                      <div style={{ fontSize: "0.76rem", color: "#8da4be" }}>{m.name}</div>
                    </td>
                    <td>{m.location}</td>
                    <td>
                      <span className={`badge-status ${m.status}`}>
                        {m.status}
                      </span>
                    </td>
                    <td>
                      <div className="health-meter">
                        <div className="health-meter-bar">
                          <div
                            className="health-meter-fill"
                            style={{
                              width: `${m.health}%`,
                              backgroundColor: getHealthColor(m.health),
                            }}
                          />
                        </div>
                        <span style={{ fontWeight: 700, color: getHealthColor(m.health), minWidth: "32px" }}>
                          {m.health}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <strong style={{ color: m.failureProbability > 50 ? "#ff4d4f" : m.failureProbability > 20 ? "#ffb84d" : "#00ffc4" }}>
                        {m.failureProbability}%
                      </strong>
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "#8da4be" }}>{m.failureTime}</td>
                    <td>
                      <span className={`sensor-pill ${m.temperature > 80 ? "sensor-danger" : m.temperature > 65 ? "sensor-warn" : "sensor-ok"}`}>
                        {m.temperature}°C
                      </span>
                    </td>
                    <td>
                      <span className={`sensor-pill ${m.vibration > 6 ? "sensor-danger" : m.vibration > 3 ? "sensor-warn" : "sensor-ok"}`}>
                        {m.vibration} mm/s
                      </span>
                    </td>
                    <td>
                      <span className={`sensor-pill ${m.current > 12 ? "sensor-danger" : m.current > 10 ? "sensor-warn" : "sensor-ok"}`}>
                        {m.current} A
                      </span>
                    </td>
                    <td style={{ fontFamily: "monospace" }}>{m.speed.toLocaleString()}</td>
                    <td style={{ fontSize: "0.78rem", color: "#8da4be" }}>{m.lastMaintenance}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-export"
                        style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMachine(m);
                        }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Machine Details Inspection Modal */}
      {selectedMachine && (
        <div className="report-modal-overlay" onClick={() => setSelectedMachine(null)}>
          <div className="report-modal" onClick={(e) => e.stopPropagation()}>
            <div className="report-modal-header">
              <h3>
                📋 Machine Intelligence Dossier: {selectedMachine.id} — {selectedMachine.name}
              </h3>
              <button
                type="button"
                className="report-modal-close"
                onClick={() => setSelectedMachine(null)}
              >
                ✕
              </button>
            </div>

            <div className="report-detail-grid">
              <div className="report-detail-item">
                <label>Operational Status</label>
                <strong style={{ textTransform: "uppercase", color: getHealthColor(selectedMachine.health) }}>
                  {selectedMachine.status} ({selectedMachine.health}% Health)
                </strong>
              </div>
              <div className="report-detail-item">
                <label>Department / Plant Location</label>
                <strong>{selectedMachine.location}</strong>
              </div>
              <div className="report-detail-item">
                <label>Failure Probability</label>
                <strong style={{ color: selectedMachine.failureProbability > 50 ? "#ff4d4f" : "#ffb84d" }}>
                  {selectedMachine.failureProbability}% (Est. in {selectedMachine.failureTime})
                </strong>
              </div>
              <div className="report-detail-item">
                <label>Installation & Service Date</label>
                <strong>Installed: {selectedMachine.installedOn} | Last: {selectedMachine.lastMaintenance}</strong>
              </div>
              <div className="report-detail-item">
                <label>Thermal & Vibration Telemetry</label>
                <strong>
                  Temp: {selectedMachine.temperature}°C | Vibration: {selectedMachine.vibration} mm/s
                </strong>
              </div>
              <div className="report-detail-item">
                <label>Electrical & Speed Telemetry</label>
                <strong>
                  Current: {selectedMachine.current} A | RPM: {selectedMachine.speed.toLocaleString()}
                </strong>
              </div>
            </div>

            <div className="report-ai-box">
              <h4>🔍 AI Root-Cause Diagnostic</h4>
              <p>{selectedMachine.diagnosis}</p>
            </div>

            <div className="report-ai-box" style={{ borderLeftColor: "#ffb84d" }}>
              <h4>🛠️ Prescribed Maintenance Action</h4>
              <p>{selectedMachine.recommendation}</p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
              {onNavigate && (
                <button
                  type="button"
                  className="btn-print"
                  onClick={() => {
                    setSelectedMachine(null);
                    onNavigate("AI Assistant");
                  }}
                >
                  🤖 Ask AI Assistant to Analyze
                </button>
              )}
              <button
                type="button"
                className="btn-export"
                onClick={() => setSelectedMachine(null)}
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
