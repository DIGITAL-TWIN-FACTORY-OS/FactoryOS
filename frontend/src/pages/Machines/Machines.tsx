import React, { useState, useMemo } from "react";
import "./Machines.css";
import type { Machine } from "../AIAssistant/AIAssistant";

interface MachinesProps {
  machines: Machine[];
  onNavigate?: (page: string) => void;
}

export const Machines: React.FC<MachinesProps> = ({
  machines,
  onNavigate,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("risk_desc");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Extract unique locations
  const locations = useMemo(() => {
    return Array.from(new Set(machines.map((m) => m.location)));
  }, [machines]);

  // KPI Calculations
  const totalCount = machines.length;
  const runningCount = machines.filter((m) => m.status === "running").length;
  const warningCount = machines.filter((m) => m.status === "warning").length;
  const criticalCount = machines.filter((m) => m.status === "critical").length;
  const avgHealth = totalCount > 0
    ? Math.round(machines.reduce((acc, m) => acc + m.health, 0) / totalCount)
    : 0;

  // Filtered and Sorted
  const filteredMachines = useMemo(() => {
    return machines
      .filter((m) => {
        const matchesSearch =
          m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.location.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "all" || m.status === statusFilter;
        const matchesLocation = locationFilter === "all" || m.location === locationFilter;

        return matchesSearch && matchesStatus && matchesLocation;
      })
      .sort((a, b) => {
        if (sortBy === "risk_desc") return b.failureProbability - a.failureProbability;
        if (sortBy === "health_asc") return a.health - b.health;
        if (sortBy === "health_desc") return b.health - a.health;
        if (sortBy === "temp_desc") return b.temperature - a.temperature;
        if (sortBy === "vib_desc") return b.vibration - a.vibration;
        if (sortBy === "speed_desc") return b.speed - a.speed;
        if (sortBy === "runtime_desc") return b.runtime - a.runtime;
        if (sortBy === "id_asc") return a.id.localeCompare(b.id);
        return 0;
      });
  }, [machines, searchTerm, statusFilter, locationFilter, sortBy]);

  const getHealthColor = (health: number) => {
    if (health >= 80) return "#00ffc4";
    if (health >= 50) return "#ffb84d";
    return "#ff4d4f";
  };

  return (
    <div className="machines-container">
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
          ⚙️ {toastMessage}
        </div>
      )}

      {/* Header Banner */}
      <div className="machines-header">
        <div className="machines-title-group">
          <div className="machines-icon-badge">⚙</div>
          <div>
            <h2>Factory Machines Directory & Telemetry Hub</h2>
            <span>Complete operational state, physical sensor streams, and health monitoring</span>
          </div>
        </div>

        <div className="machines-header-actions">
          {onNavigate && (
            <button
              type="button"
              className="view-toggle-btn"
              onClick={() => onNavigate("Dashboard")}
            >
              ⬅ Dashboard
            </button>
          )}

          <button
            type="button"
            className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
          >
            ▦ Grid View
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === "table" ? "active" : ""}`}
            onClick={() => setViewMode("table")}
          >
            ▤ Table View
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="machines-kpi-grid">
        <div className="machines-kpi-card">
          <span>Active Factory Fleet</span>
          <strong>{totalCount} Machines</strong>
          <small>Across {locations.length} plant zones</small>
        </div>
        <div className="machines-kpi-card">
          <span>Normal Running Units</span>
          <strong style={{ color: "#00ffc4" }}>{runningCount} Running</strong>
          <small>Operating within nominal bounds</small>
        </div>
        <div className="machines-kpi-card">
          <span>Warning / Degrading</span>
          <strong style={{ color: warningCount > 0 ? "#ffb84d" : "#00ffc4" }}>
            {warningCount} Units
          </strong>
          <small>Preventive maintenance suggested</small>
        </div>
        <div className="machines-kpi-card">
          <span>Critical Failure Risk</span>
          <strong style={{ color: criticalCount > 0 ? "#ff4d4f" : "#00ffc4" }}>
            {criticalCount} Critical
          </strong>
          <small>Requires immediate shutdown</small>
        </div>
        <div className="machines-kpi-card">
          <span>Average Fleet Health</span>
          <strong style={{ color: getHealthColor(avgHealth) }}>{avgHealth}%</strong>
          <small>Composite condition score</small>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="machines-filter-bar">
        <div className="machines-search-box">
          <input
            type="text"
            className="machines-search-input"
            placeholder="🔍 Search machines by code, name, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="machines-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses ({totalCount})</option>
          <option value="running">Running / Healthy ({runningCount})</option>
          <option value="warning">Warning ({warningCount})</option>
          <option value="critical">Critical ({criticalCount})</option>
        </select>

        <select
          className="machines-select"
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
          className="machines-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="risk_desc">Sort: Highest Failure Risk</option>
          <option value="health_asc">Sort: Lowest Health Score</option>
          <option value="health_desc">Sort: Highest Health Score</option>
          <option value="temp_desc">Sort: Highest Temperature</option>
          <option value="vib_desc">Sort: Highest Vibration</option>
          <option value="speed_desc">Sort: Highest Speed (RPM)</option>
          <option value="runtime_desc">Sort: Longest Runtime</option>
          <option value="id_asc">Sort: Machine ID (A-Z)</option>
        </select>
      </div>

      {/* View Content */}
      {viewMode === "grid" ? (
        /* GRID VIEW: Detailed Industrial Cards */
        <div className="machines-grid">
          {filteredMachines.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "#8da4be" }}>
              No machines match the selected filter criteria.
            </div>
          ) : (
            filteredMachines.map((m) => (
              <div
                key={m.id}
                className={`machine-card-detailed ${m.status}`}
              >
                {/* Header */}
                <div className="machine-card-header">
                  <div>
                    <div className="machine-id-badge">
                      <span>⚙</span>
                      <strong>{m.id} — {m.name}</strong>
                    </div>
                    <span className="machine-location-tag">📍 {m.location}</span>
                  </div>
                  <span className={`machine-status-pill ${m.status}`}>
                    {m.status}
                  </span>
                </div>

                {/* Health & Risk Row */}
                <div className="machine-health-risk-row">
                  <div className="health-col">
                    <span>Health Score</span>
                    <strong className="health-val" style={{ color: getHealthColor(m.health) }}>
                      {m.health}%
                    </strong>
                  </div>
                  <div className="health-col" style={{ textAlign: "right" }}>
                    <span>Failure Risk</span>
                    <strong className="health-val" style={{ color: m.failureProbability > 50 ? "#ff4d4f" : m.failureProbability > 20 ? "#ffb84d" : "#00ffc4" }}>
                      {m.failureProbability}%
                    </strong>
                    <div style={{ fontSize: "0.7rem", color: "#8da4be", marginTop: "2px" }}>
                      Est: {m.failureTime}
                    </div>
                  </div>
                </div>

                {/* Telemetry 4-Cell Grid */}
                <div className="machine-telemetry-grid">
                  <div className="telemetry-cell">
                    <span>Temp</span>
                    <strong style={{ color: m.temperature > 80 ? "#ff4d4f" : m.temperature > 65 ? "#ffb84d" : "#00ffc4" }}>
                      {m.temperature}°C
                    </strong>
                  </div>
                  <div className="telemetry-cell">
                    <span>Vibration</span>
                    <strong style={{ color: m.vibration > 6 ? "#ff4d4f" : m.vibration > 3 ? "#ffb84d" : "#00ffc4" }}>
                      {m.vibration} mm/s
                    </strong>
                  </div>
                  <div className="telemetry-cell">
                    <span>Current</span>
                    <strong style={{ color: m.current > 12 ? "#ff4d4f" : m.current > 10 ? "#ffb84d" : "#00ffc4" }}>
                      {m.current} A
                    </strong>
                  </div>
                  <div className="telemetry-cell">
                    <span>Speed</span>
                    <strong style={{ color: "#90e0ef" }}>
                      {m.speed} RPM
                    </strong>
                  </div>
                </div>

                {/* AI Diagnosis Preview */}
                <div className="machine-diag-preview">
                  <strong>AI Diagnosis:</strong> {m.diagnosis}
                </div>

                {/* Machine Lifecycle Dates */}
                <div className="machine-dates-row">
                  <span>Runtime: <strong>{m.runtime} hrs</strong></span>
                  <span>Last Service: <strong>{m.lastMaintenance}</strong></span>
                </div>

                {/* Card Actions */}
                <div className="machine-card-actions">
                  <button
                    type="button"
                    className="btn-card-inspect"
                    onClick={() => setSelectedMachine(m)}
                  >
                    Deep Inspect
                  </button>
                  {onNavigate && (
                    <button
                      type="button"
                      className="btn-card-ai"
                      onClick={() => onNavigate("AI Assistant")}
                      title="Open AI Diagnostic Assistant"
                    >
                      🤖 AI Diagnose
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-card-inspect"
                    style={{ background: "#ff4d4f", color: "#ffffff", borderColor: "#ff4d4f" }}
                    onClick={() => showToast(`Work order ticket drafted for ${m.id} (${m.name})`)}
                  >
                    + Work Order
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* TABLE VIEW */
        <div style={{ background: "#0d1b2a", border: "1px solid #203448", borderRadius: "8px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#102235", borderBottom: "1px solid #203448", color: "#8da4be" }}>
                <th style={{ padding: "12px 14px" }}>Machine ID</th>
                <th style={{ padding: "12px 14px" }}>Name</th>
                <th style={{ padding: "12px 14px" }}>Area</th>
                <th style={{ padding: "12px 14px" }}>Status</th>
                <th style={{ padding: "12px 14px" }}>Health</th>
                <th style={{ padding: "12px 14px" }}>Risk</th>
                <th style={{ padding: "12px 14px" }}>Temp</th>
                <th style={{ padding: "12px 14px" }}>Vib</th>
                <th style={{ padding: "12px 14px" }}>Current</th>
                <th style={{ padding: "12px 14px" }}>RPM</th>
                <th style={{ padding: "12px 14px" }}>Runtime</th>
                <th style={{ padding: "12px 14px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMachines.map((m) => (
                <tr
                  key={m.id}
                  style={{ borderBottom: "1px solid #16283b", cursor: "pointer" }}
                  onClick={() => setSelectedMachine(m)}
                >
                  <td style={{ padding: "12px 14px", fontWeight: 700 }}>{m.id}</td>
                  <td style={{ padding: "12px 14px" }}>{m.name}</td>
                  <td style={{ padding: "12px 14px", color: "#8da4be" }}>{m.location}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span className={`machine-status-pill ${m.status}`}>{m.status}</span>
                  </td>
                  <td style={{ padding: "12px 14px", fontWeight: 700, color: getHealthColor(m.health) }}>
                    {m.health}%
                  </td>
                  <td style={{ padding: "12px 14px", fontWeight: 700, color: m.failureProbability > 50 ? "#ff4d4f" : "#ffb84d" }}>
                    {m.failureProbability}%
                  </td>
                  <td style={{ padding: "12px 14px", fontFamily: "monospace" }}>{m.temperature}°C</td>
                  <td style={{ padding: "12px 14px", fontFamily: "monospace" }}>{m.vibration} mm/s</td>
                  <td style={{ padding: "12px 14px", fontFamily: "monospace" }}>{m.current} A</td>
                  <td style={{ padding: "12px 14px", fontFamily: "monospace" }}>{m.speed.toLocaleString()}</td>
                  <td style={{ padding: "12px 14px" }}>{m.runtime} h</td>
                  <td style={{ padding: "12px 14px" }}>
                    <button
                      type="button"
                      className="btn-card-inspect"
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Machine Inspection Dossier Modal */}
      {selectedMachine && (
        <div className="machine-modal-overlay" onClick={() => setSelectedMachine(null)}>
          <div className="machine-modal" onClick={(e) => e.stopPropagation()}>
            <div className="machine-modal-header">
              <h3>⚙️ Machine Dossier: {selectedMachine.id} — {selectedMachine.name}</h3>
              <button
                type="button"
                className="machine-modal-close"
                onClick={() => setSelectedMachine(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div style={{ background: "#081420", padding: "12px", borderRadius: "6px", border: "1px solid #1c3349" }}>
                <span style={{ fontSize: "0.72rem", color: "#8da4be", textTransform: "uppercase" }}>Operational Status</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "4px", color: getHealthColor(selectedMachine.health) }}>
                  {selectedMachine.status.toUpperCase()} ({selectedMachine.health}% Health)
                </div>
              </div>
              <div style={{ background: "#081420", padding: "12px", borderRadius: "6px", border: "1px solid #1c3349" }}>
                <span style={{ fontSize: "0.72rem", color: "#8da4be", textTransform: "uppercase" }}>Plant Location</span>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: "4px", color: "#ffffff" }}>
                  📍 {selectedMachine.location}
                </div>
              </div>
              <div style={{ background: "#081420", padding: "12px", borderRadius: "6px", border: "1px solid #1c3349" }}>
                <span style={{ fontSize: "0.72rem", color: "#8da4be", textTransform: "uppercase" }}>Failure Probability & Horizon</span>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: "4px", color: selectedMachine.failureProbability > 50 ? "#ff4d4f" : "#ffb84d" }}>
                  {selectedMachine.failureProbability}% (Est: {selectedMachine.failureTime})
                </div>
              </div>
              <div style={{ background: "#081420", padding: "12px", borderRadius: "6px", border: "1px solid #1c3349" }}>
                <span style={{ fontSize: "0.72rem", color: "#8da4be", textTransform: "uppercase" }}>Service History</span>
                <div style={{ fontSize: "0.88rem", marginTop: "4px", color: "#c9d8e7" }}>
                  Installed: {selectedMachine.installedOn} | Last: {selectedMachine.lastMaintenance}
                </div>
              </div>
            </div>

            {/* Telemetry Breakdown */}
            <div style={{ background: "#091522", border: "1px solid #1e364e", borderRadius: "6px", padding: "14px", marginBottom: "16px" }}>
              <h4 style={{ margin: "0 0 10px 0", fontSize: "0.9rem", color: "#90e0ef" }}>📊 Real-Time Multi-Sensor Telemetry</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "#8da4be" }}>TEMPERATURE</div>
                  <strong style={{ fontSize: "1rem", color: selectedMachine.temperature > 80 ? "#ff4d4f" : selectedMachine.temperature > 65 ? "#ffb84d" : "#00ffc4" }}>
                    {selectedMachine.temperature}°C
                  </strong>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "#8da4be" }}>VIBRATION</div>
                  <strong style={{ fontSize: "1rem", color: selectedMachine.vibration > 6 ? "#ff4d4f" : selectedMachine.vibration > 3 ? "#ffb84d" : "#00ffc4" }}>
                    {selectedMachine.vibration} mm/s
                  </strong>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "#8da4be" }}>CURRENT</div>
                  <strong style={{ fontSize: "1rem", color: selectedMachine.current > 12 ? "#ff4d4f" : selectedMachine.current > 10 ? "#ffb84d" : "#00ffc4" }}>
                    {selectedMachine.current} A
                  </strong>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "#8da4be" }}>SPEED</div>
                  <strong style={{ fontSize: "1rem", color: "#90e0ef" }}>
                    {selectedMachine.speed.toLocaleString()} RPM
                  </strong>
                </div>
              </div>
            </div>

            <div style={{ background: "#112538", borderLeft: "4px solid #00b4d8", padding: "12px 16px", borderRadius: "4px", marginBottom: "12px" }}>
              <h4 style={{ margin: "0 0 6px 0", fontSize: "0.9rem", color: "#90e0ef" }}>🔍 AI Condition Diagnosis</h4>
              <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.45 }}>{selectedMachine.diagnosis}</p>
            </div>

            <div style={{ background: "#112538", borderLeft: "4px solid #ffb84d", padding: "12px 16px", borderRadius: "4px", marginBottom: "16px" }}>
              <h4 style={{ margin: "0 0 6px 0", fontSize: "0.9rem", color: "#ffb84d" }}>🛠️ Prescribed Maintenance Action</h4>
              <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.45 }}>{selectedMachine.recommendation}</p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              {onNavigate && (
                <button
                  type="button"
                  className="btn-card-ai"
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
                className="btn-card-inspect"
                style={{ background: "#ff4d4f", color: "#ffffff", borderColor: "#ff4d4f" }}
                onClick={() => {
                  showToast(`Work order ticket drafted for ${selectedMachine.id}!`);
                  setSelectedMachine(null);
                }}
              >
                + Create Work Order
              </button>
              <button
                type="button"
                className="btn-card-inspect"
                onClick={() => setSelectedMachine(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Machines;
