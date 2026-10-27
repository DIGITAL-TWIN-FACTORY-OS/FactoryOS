import React, { useState, useRef, useEffect } from "react";
import "./AIAssistant.css";

export interface Machine {
  id: string;
  name: string;
  status: "running" | "warning" | "critical";
  x: string;
  y: string;
  temperature: number;
  vibration: number;
  current: number;
  speed: number;
  runtime: number;
  health: number;
  failureProbability: number;
  failureTime: string;
  location: string;
  installedOn: string;
  lastMaintenance: string;
  recommendation: string;
  diagnosis: string;
}

export interface Alert {
  machine: string;
  message: string;
  time: string;
  type: "critical" | "warning" | "info";
}

interface Message {
  id: string;
  sender: "assistant" | "user";
  text: string;
  timestamp: string;
  chips?: string[];
}

interface AIAssistantProps {
  machines: Machine[];
  alerts: Alert[];
  onNavigate?: (page: string) => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  machines,
  alerts,
  onNavigate,
}) => {
  // Stats
  const criticalCount = machines.filter((m) => m.status === "critical").length;
  const warningCount = machines.filter((m) => m.status === "warning").length;
  const healthyCount = machines.filter((m) => m.status === "running").length;
  const avgHealth = Math.round(
    machines.reduce((acc, m) => acc + m.health, 0) / (machines.length || 1)
  );

  // Chat State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      sender: "assistant",
      text: "👋 Welcome to the **Factory Digital Twin AI Diagnostic Copilot**.\n\nI continuously monitor all machine sensor streams (temperature, vibration, electrical current, RPM), detect anomalies, analyze failure risks, and provide actionable maintenance recommendations.\n\nHow can I assist you with the factory floor today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      chips: ["🚨 Critical Machines", "🔍 Diagnose M-09", "🛠️ Maintenance Priority", "📡 Sensor Scan"],
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Work Order Modal State
  const [selectedWorkOrderMachine, setSelectedWorkOrderMachine] = useState<Machine | null>(null);
  const [woSuccessToast, setWoSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // AI Diagnostic Reasoning Engine
  const generateAIResponse = (query: string): string => {
    const q = query.toLowerCase().trim();

    // 1. Critical Machines Query
    if (q.includes("critical") || q.includes("urgent") || q.includes("failing") || q.includes("stop")) {
      const crits = machines.filter((m) => m.status === "critical");
      if (crits.length === 0) {
        return "✅ Excellent news: Currently there are **0 critical machines** operating in the factory. All units are operating within safe baseline thresholds.";
      }
      return `⚠️ **CRITICAL ATTENTION REQUIRED: ${crits.length} Machines Flagged**\n\n` +
        crits.map((m) => (
          `🔴 **${m.id} (${m.name})**\n` +
          `• **Health:** ${m.health}% | **Failure Probability:** ${m.failureProbability}%\n` +
          `• **Est. Breakdown:** Within ${m.failureTime}\n` +
          `• **Root Cause:** ${m.diagnosis}\n` +
          `• **Immediate Action:** ${m.recommendation}\n` +
          `• **Sensors:** Temp: ${m.temperature}°C, Vib: ${m.vibration} mm/s, Current: ${m.current}A`
        )).join("\n\n");
    }

    // 2. Specific Machine Lookup (e.g. M-09, M-11, M-04, M-07, Heat Treatment, etc.)
    const matchedMachine = machines.find(
      (m) =>
        q.includes(m.id.toLowerCase()) ||
        q.includes(m.name.toLowerCase()) ||
        q.includes(m.id.replace("-", "").toLowerCase())
    );

    if (matchedMachine) {
      const isCrit = matchedMachine.status === "critical";
      const isWarn = matchedMachine.status === "warning";
      const statusIcon = isCrit ? "🔴" : isWarn ? "🟡" : "🟢";

      let sensorAnalysis = [];
      if (matchedMachine.temperature > 80) sensorAnalysis.push(`- ⚠️ **Critical Temperature Spike:** ${matchedMachine.temperature}°C (Safe limit: <65°C)`);
      else if (matchedMachine.temperature > 65) sensorAnalysis.push(`- ⚡ **Elevated Temperature:** ${matchedMachine.temperature}°C`);

      if (matchedMachine.vibration > 6) sensorAnalysis.push(`- ⚠️ **Severe Vibration:** ${matchedMachine.vibration} mm/s (Safe limit: <3.0 mm/s) - Mechanical imbalance / bearing wear`);
      else if (matchedMachine.vibration > 3) sensorAnalysis.push(`- ⚡ **Abnormal Vibration:** ${matchedMachine.vibration} mm/s`);

      if (matchedMachine.current > 12) sensorAnalysis.push(`- ⚠️ **High Electrical Current Draw:** ${matchedMachine.current} A (Safe limit: <10 A) - High motor load or winding resistance`);

      if (sensorAnalysis.length === 0) {
        sensorAnalysis.push("- ✅ All sensor parameters (Temp, Vibration, Current, RPM) are within nominal ISO limits.");
      }

      return `${statusIcon} **Comprehensive Diagnostic for ${matchedMachine.id} — ${matchedMachine.name}**\n\n` +
        `• **Operational Status:** ${matchedMachine.status.toUpperCase()}\n` +
        `• **Location:** ${matchedMachine.location}\n` +
        `• **Health Score:** ${matchedMachine.health}% | **Failure Risk:** ${matchedMachine.failureProbability}%\n` +
        `• **Failure Horizon:** ${matchedMachine.failureTime}\n` +
        `• **Last Maintenance:** ${matchedMachine.lastMaintenance}\n\n` +
        `🔍 **Sensor Analysis:**\n${sensorAnalysis.join("\n")}\n\n` +
        `💡 **Root-Cause Diagnosis:**\n${matchedMachine.diagnosis}\n\n` +
        `🛠️ **Recommended Maintenance Action:**\n${matchedMachine.recommendation}`;
    }

    // 3. Maintenance Priority Query
    if (q.includes("maintenance") || q.includes("work order") || q.includes("repair") || q.includes("schedule") || q.includes("priority")) {
      const degraded = [...machines]
        .filter((m) => m.status !== "running")
        .sort((a, b) => b.failureProbability - a.failureProbability);

      if (degraded.length === 0) {
        return "✨ All machines are in healthy condition. Standard routine preventive maintenance should follow scheduled cycles.";
      }

      return `📋 **Recommended Maintenance Priority Ranking:**\n\n` +
        degraded.map((m, idx) => (
          `**Priority ${idx + 1}: ${m.id} (${m.name})** — [${m.status.toUpperCase()}]\n` +
          `• Health: ${m.health}% | Failure Risk: ${m.failureProbability}%\n` +
          `• Target: ${m.recommendation}\n` +
          `• Due: Immediate (Breakdown predicted in ${m.failureTime})`
        )).join("\n\n");
    }

    // 4. Sensor Anomaly Scan Query
    if (q.includes("sensor") || q.includes("vibration") || q.includes("temperature") || q.includes("temp") || q.includes("current") || q.includes("rpm") || q.includes("anomaly")) {
      const highTemp = machines.filter((m) => m.temperature > 65);
      const highVib = machines.filter((m) => m.vibration > 3);
      const highCurrent = machines.filter((m) => m.current > 10);

      return `📡 **Plant-Wide Sensor Telemetry Audit:**\n\n` +
        `• **Thermal Anomalies (>65°C):** ${highTemp.map((m) => `${m.id} (${m.temperature}°C)`).join(", ") || "None"}\n` +
        `• **Vibration Anomalies (>3.0 mm/s):** ${highVib.map((m) => `${m.id} (${m.vibration} mm/s)`).join(", ") || "None"}\n` +
        `• **Current Draw Anomalies (>10A):** ${highCurrent.map((m) => `${m.id} (${m.current}A)`).join(", ") || "None"}\n\n` +
        `💡 **Insight:** ${highVib.length > 0 ? "Elevated vibration combined with high current on M-09 and M-11 strongly indicates mechanical bearing friction and spindle unbalance." : "No multi-sensor fault cascades detected."}`;
    }

    // 5. Overall Plant Health / Summary Query
    if (q.includes("health") || q.includes("overall") || q.includes("factory") || q.includes("plant") || q.includes("summary") || q.includes("status")) {
      return `🏭 **Factory Digital Twin Operational Overview:**\n\n` +
        `• **Overall Plant Health Index:** **${avgHealth}%**\n` +
        `• **Total Monitored Machines:** ${machines.length}\n` +
        `• **Healthy (Normal Operation):** 🟢 ${healthyCount} units\n` +
        `• **Warning (Monitoring Required):** 🟡 ${warningCount} units (${machines.filter(m => m.status === "warning").map(m => m.id).join(", ")})\n` +
        `• **Critical (Urgent Maintenance):** 🔴 ${criticalCount} units (${machines.filter(m => m.status === "critical").map(m => m.id).join(", ")})\n` +
        `• **Active System Alerts:** 🚨 ${alerts.length} alerts logged\n\n` +
        `💡 **AI Summary:** The factory is operating at **${avgHealth >= 75 ? "MODERATE-HEALTHY" : "DEGRADED"}** efficiency. Prioritize inspection for **M-09 (Heat Treatment)** and **M-11 (Packaging)** to prevent unplanned downtime.`;
    }

    // 6. Alerts Query
    if (q.includes("alert")) {
      return `🚨 **Recent Factory Alerts Summary (${alerts.length} total):**\n\n` +
        alerts.slice(0, 5).map((a) => (
          `• [${a.type.toUpperCase()}] **${a.machine}** (${a.time}): ${a.message}`
        )).join("\n") +
        `\n\nSelect any machine to run a root-cause diagnostic or generate an emergency work order.`;
    }

    // Default Fallback
    return `🤖 I analyzed your query: "*${query}*".\n\n` +
      `Here are the most relevant actions I can take:\n` +
      `• Ask *"Diagnose [Machine ID]"* (e.g. M-01 to M-11) for root cause and sensor breakdowns.\n` +
      `• Ask *"Show critical machines"* to see machines requiring immediate intervention.\n` +
      `• Ask *"Scan sensor anomalies"* to inspect temperature, vibration, and electrical telemetry.\n` +
      `• Ask *"Maintenance priority list"* to see the recommended work order queue.\n` +
      `• Ask *"Overall plant health"* for plant-wide operational performance.`;
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputQuery).trim();
    if (!text) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");

    setTimeout(() => {
      const aiReplyText = generateAIResponse(text);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 300);
  };

  const handleOpenWorkOrder = (machine: Machine) => {
    setSelectedWorkOrderMachine(machine);
  };

  const handleConfirmWorkOrder = () => {
    if (selectedWorkOrderMachine) {
      setWoSuccessToast(`Work order successfully generated for ${selectedWorkOrderMachine.id} (${selectedWorkOrderMachine.name})!`);
      setSelectedWorkOrderMachine(null);
      setTimeout(() => setWoSuccessToast(null), 4000);
    }
  };

  return (
    <div className="ai-assistant-container">
      {/* Toast Notification */}
      {woSuccessToast && (
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
          ✅ {woSuccessToast}
        </div>
      )}

      {/* Header & Stats Banner */}
      <div className="ai-assistant-header">
        <div className="ai-title-group">
          <div className="ai-avatar-icon">🤖</div>
          <div>
            <h2>Industrial AI Diagnostic Assistant</h2>
            <span>Real-time anomaly identification, root-cause diagnosis & decision support</span>
          </div>
        </div>

        <div className="ai-stats-row">
          {onNavigate && (
            <button
              type="button"
              className="suggestion-chip"
              style={{ background: "#1c354e", color: "#f0f6fc", borderColor: "#00b4d8", padding: "6px 14px", fontWeight: 600 }}
              onClick={() => onNavigate("Dashboard")}
            >
              ⬅ Back to Dashboard
            </button>
          )}
          <div className="ai-stat-badge stat-critical">
            <span>Critical</span>
            <strong>{criticalCount}</strong>
          </div>
          <div className="ai-stat-badge stat-warning">
            <span>Warning</span>
            <strong>{warningCount}</strong>
          </div>
          <div className="ai-stat-badge stat-healthy">
            <span>Healthy</span>
            <strong>{healthyCount}</strong>
          </div>
          <div className="ai-stat-badge">
            <span>Avg Health</span>
            <strong style={{ color: avgHealth >= 75 ? "#00ffc4" : avgHealth >= 50 ? "#ffb84d" : "#ff4d4f" }}>
              {avgHealth}%
            </strong>
          </div>
        </div>
      </div>

      {/* Main Grid: Chat on Left, Anomaly Feed on Right */}
      <div className="ai-assistant-grid">
        {/* Left: Chat Copilot */}
        <div className="ai-card chat-container">
          <div className="ai-card-header">
            <h3>💬 Factory Floor Diagnostic Copilot</h3>
            <span className="ai-card-badge">Rule & Physics Powered</span>
          </div>

          <div className="chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message ${msg.sender}`}>
                <div className="chat-msg-avatar">
                  {msg.sender === "assistant" ? "🤖" : "👤"}
                </div>
                <div className="chat-bubble">
                  {msg.text.split("\n\n").map((para, i) => (
                    <p key={i}>
                      {para.split("\n").map((line, j) => (
                        <React.Fragment key={j}>
                          {line}
                          {j < para.split("\n").length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </p>
                  ))}
                  {msg.chips && (
                    <div className="diagnostic-chip-list">
                      {msg.chips.map((chip, idx) => (
                        <button
                          key={idx}
                          className="suggestion-chip"
                          type="button"
                          onClick={() => handleSendMessage(chip)}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="chat-suggestions">
            <button
              className="suggestion-chip"
              type="button"
              onClick={() => handleSendMessage("Show critical machines and causes")}
            >
              🚨 Critical Machines
            </button>
            <button
              className="suggestion-chip"
              type="button"
              onClick={() => handleSendMessage("Diagnose M-09 Heat Treatment")}
            >
              🔍 Diagnose M-09
            </button>
            <button
              className="suggestion-chip"
              type="button"
              onClick={() => handleSendMessage("Diagnose M-11 Packaging")}
            >
              🔍 Diagnose M-11
            </button>
            <button
              className="suggestion-chip"
              type="button"
              onClick={() => handleSendMessage("Scan sensor anomalies")}
            >
              📡 Sensor Anomalies
            </button>
            <button
              className="suggestion-chip"
              type="button"
              onClick={() => handleSendMessage("Recommend maintenance priority list")}
            >
              🛠️ Maintenance Priority
            </button>
            <button
              className="suggestion-chip"
              type="button"
              onClick={() => handleSendMessage("Summarize overall factory health")}
            >
              🏭 Factory Overview
            </button>
          </div>

          {/* Chat Input Bar */}
          <div className="chat-input-bar">
            <input
              type="text"
              className="chat-input"
              placeholder="Ask AI: 'Diagnose M-09', 'Why is vibration high?', 'Maintenance recommendations'..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <button
              className="chat-send-btn"
              type="button"
              onClick={() => handleSendMessage()}
            >
              Send
            </button>
          </div>
        </div>

        {/* Right: Real-time Anomaly & Root Cause Feed */}
        <div className="ai-card">
          <div className="ai-card-header">
            <h3>⚠️ Active Anomalies & Root Causes</h3>
            <span className="ai-card-badge">Live Telemetry</span>
          </div>

          <div className="right-panel-scroll">
            {machines
              .filter((m) => m.status !== "running")
              .map((machine) => (
                <div
                  key={machine.id}
                  className={`anomaly-card ${machine.status}`}
                >
                  <div className="anomaly-header">
                    <span className="anomaly-machine-name">
                      {machine.id} — {machine.name}
                    </span>
                    <span className={`anomaly-badge ${machine.status}`}>
                      {machine.status} ({machine.health}%)
                    </span>
                  </div>

                  <div className="anomaly-cause">
                    <strong>Root Cause:</strong> {machine.diagnosis}
                  </div>

                  <div className="anomaly-sensors">
                    <div className="anomaly-sensor-item">
                      <span>Temp</span>
                      <strong className={machine.temperature > 80 ? "text-danger" : machine.temperature > 65 ? "text-warn" : "text-safe"}>
                        {machine.temperature}°C
                      </strong>
                    </div>
                    <div className="anomaly-sensor-item">
                      <span>Vibration</span>
                      <strong className={machine.vibration > 6 ? "text-danger" : machine.vibration > 3 ? "text-warn" : "text-safe"}>
                        {machine.vibration} mm/s
                      </strong>
                    </div>
                    <div className="anomaly-sensor-item">
                      <span>Current</span>
                      <strong className={machine.current > 12 ? "text-danger" : machine.current > 10 ? "text-warn" : "text-safe"}>
                        {machine.current} A
                      </strong>
                    </div>
                  </div>

                  <div style={{ fontSize: "0.78rem", color: "#8da4be", marginBottom: "10px" }}>
                    <strong>Action:</strong> {machine.recommendation}
                  </div>

                  <div className="anomaly-actions">
                    <button
                      className="btn-diagnose-sm"
                      type="button"
                      onClick={() => handleSendMessage(`Diagnose ${machine.id} in detail`)}
                    >
                      Ask AI to Diagnose
                    </button>
                    <button
                      className="btn-wo-sm"
                      type="button"
                      onClick={() => handleOpenWorkOrder(machine)}
                    >
                      + Work Order
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Work Order Modal */}
      {selectedWorkOrderMachine && (
        <div className="wo-modal-overlay">
          <div className="wo-modal">
            <h3>🛠️ Create AI Maintenance Work Order</h3>
            <div className="wo-modal-field">
              <label>Machine Target</label>
              <input
                type="text"
                readOnly
                value={`${selectedWorkOrderMachine.id} — ${selectedWorkOrderMachine.name} (${selectedWorkOrderMachine.location})`}
              />
            </div>
            <div className="wo-modal-field">
              <label>Priority</label>
              <input
                type="text"
                readOnly
                value={selectedWorkOrderMachine.status === "critical" ? "CRITICAL (Immediate Maintenance)" : "HIGH"}
              />
            </div>
            <div className="wo-modal-field">
              <label>AI Diagnosis / Root Cause</label>
              <textarea
                rows={2}
                readOnly
                value={selectedWorkOrderMachine.diagnosis}
              />
            </div>
            <div className="wo-modal-field">
              <label>Recommended Maintenance Action</label>
              <textarea
                rows={2}
                readOnly
                value={selectedWorkOrderMachine.recommendation}
              />
            </div>
            <div className="wo-modal-buttons">
              <button
                className="btn-secondary"
                type="button"
                onClick={() => setSelectedWorkOrderMachine(null)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                type="button"
                onClick={handleConfirmWorkOrder}
              >
                Confirm & Dispatch Work Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
