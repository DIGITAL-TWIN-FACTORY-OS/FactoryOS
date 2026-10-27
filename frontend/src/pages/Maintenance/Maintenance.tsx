import React, { useState, useMemo } from "react";
import "./Maintenance.css";
import type { Machine } from "../AIAssistant/AIAssistant";
import {
  generateDynamicMaintenanceTasks,
  generateDynamicWorkOrders,
} from "../../services/sensorSimulator";

export interface RequiredPart {
  partNumber: string;
  name: string;
  quantity: number;
  unit: string;
  inStock: number;
  status: "in-stock" | "low-stock" | "out-of-stock";
}

export interface MaintenanceTask {
  id: string;
  machineId: string;
  machineName: string;
  location: string;
  urgency: "emergency" | "preventive" | "routine" | "completed";
  issueDiagnosis: string;
  prescribedAction: string;
  scheduledTime: string;
  estDowntime: string;
  assignedTechnician: string;
  parts: RequiredPart[];
}

export interface WorkOrder {
  id: string;
  machineId: string;
  machineName: string;
  location: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "assigned" | "in_progress" | "completed" | "cancelled";
  assignedTo: string;
  dueDate: string;
  createdAt: string;
}

interface MaintenanceProps {
  machines: Machine[];
  onNavigate?: (page: string) => void;
}

export const Maintenance: React.FC<MaintenanceProps> = ({
  machines,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<"services" | "work_orders">("work_orders");
  const [searchTerm, setSearchTerm] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [woStatusFilter, setWoStatusFilter] = useState<string>("all");
  const [woPriorityFilter, setWoPriorityFilter] = useState<string>("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Work Order Modal State
  const [isNewWoModalOpen, setIsNewWoModalOpen] = useState(false);
  const [newWoMachineId, setNewWoMachineId] = useState(machines[0]?.id || "M-01");
  const [newWoTitle, setNewWoTitle] = useState("");
  const [newWoDesc, setNewWoDesc] = useState("");
  const [newWoPriority, setNewWoPriority] = useState<"low" | "medium" | "high" | "critical">("high");
  const [newWoAssignedTo, setNewWoAssignedTo] = useState("Marcus Vance");
  const [newWoDueDate, setNewWoDueDate] = useState("2026-10-28");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // User-created extra work orders
  const [userWorkOrders, setUserWorkOrders] = useState<WorkOrder[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const [woStatusOverrides, setWoStatusOverrides] = useState<Record<string, any>>({});

  // Dynamic Maintenance Tasks derived strictly from current layout equipment
  const tasks: MaintenanceTask[] = useMemo(() => {
    const dynamic = generateDynamicMaintenanceTasks(machines);
    return dynamic.map((t) => ({
      ...t,
      urgency: completedTaskIds.has(t.id) ? ("completed" as const) : t.urgency,
    }));
  }, [machines, completedTaskIds]);

  // Dynamic Work Orders derived from current layout equipment + user-submitted orders
  const workOrders: WorkOrder[] = useMemo(() => {
    const dynamic = generateDynamicWorkOrders(machines);
    const combined = [...userWorkOrders, ...dynamic];
    return combined.map((w) => ({
      ...w,
      status: woStatusOverrides[w.id] || w.status,
    }));
  }, [machines, userWorkOrders, woStatusOverrides]);

  // KPI Calculations
  const emergencyCount = tasks.filter((t) => t.urgency === "emergency").length;
  const preventiveCount = tasks.filter((t) => t.urgency === "preventive").length;
  const activeWoCount = workOrders.filter((w) => w.status !== "completed" && w.status !== "cancelled").length;
  const inProgressWoCount = workOrders.filter((w) => w.status === "in_progress").length;
  const totalPartsInDemand = tasks.reduce(
    (acc, t) => acc + t.parts.reduce((pAcc, p) => pAcc + p.quantity, 0),
    0
  );

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        t.machineId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.machineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.parts.some(
          (p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.partNumber.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesUrgency = urgencyFilter === "all" || t.urgency === urgencyFilter;

      return matchesSearch && matchesUrgency;
    });
  }, [tasks, searchTerm, urgencyFilter]);

  // Filtered Work Orders
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter((w) => {
      const matchesSearch =
        w.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.machineId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.machineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.assignedTo.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = woStatusFilter === "all" || w.status === woStatusFilter;
      const matchesPriority = woPriorityFilter === "all" || w.priority === woPriorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [workOrders, searchTerm, woStatusFilter, woPriorityFilter]);

  // Work Order Status Change Handler
    const handleCompleteServiceTask = (taskId: string) => {
    setCompletedTaskIds((prev) => new Set(prev).add(taskId));
    showToast(`Service task #${taskId} marked as COMPLETED.`);
  };

  const handleUpdateWoStatus = (
    woId: string,
    newStatus: "open" | "assigned" | "in_progress" | "completed" | "cancelled"
  ) => {
    setWoStatusOverrides((prev) => ({ ...prev, [woId]: newStatus }));
    showToast(`Work Order #${woId} status updated to: ${newStatus.toUpperCase()}`);
  };

  // Submit New Work Order
  const handleCreateWorkOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWoTitle.trim()) {
      alert("Please provide a work order title.");
      return;
    }

    const targetMachine = machines.find((m) => m.id === newWoMachineId);
    const newId = `WO-${1000 + workOrders.length + 1}`;

    const newTicket: WorkOrder = {
      id: newId,
      machineId: newWoMachineId,
      machineName: targetMachine ? targetMachine.name : "Machine",
      location: targetMachine ? targetMachine.location : "Factory Floor",
      title: newWoTitle.trim(),
      description: newWoDesc.trim() || "Maintenance requested via FactoryOS.",
      priority: newWoPriority,
      status: "open",
      assignedTo: newWoAssignedTo,
      dueDate: newWoDueDate,
      createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    };

    setUserWorkOrders((prev) => [newTicket, ...prev]);
    setIsNewWoModalOpen(false);
    setNewWoTitle("");
    setNewWoDesc("");
    showToast(`Work Order #${newId} created successfully for ${newTicket.machineId}!`);
  };

  // Export Work Orders as CSV
  const exportWorkOrdersCSV = () => {
    const headers = [
      "Work Order ID",
      "Machine ID",
      "Machine Name",
      "Location",
      "Title",
      "Description",
      "Priority",
      "Status",
      "Assigned Technician",
      "Due Date",
      "Created At",
    ];

    const rows = filteredWorkOrders.map((w) => [
      `"${w.id}"`,
      `"${w.machineId}"`,
      `"${w.machineName}"`,
      `"${w.location}"`,
      `"${w.title.replace(/"/g, '""')}"`,
      `"${w.description.replace(/"/g, '""')}"`,
      `"${w.priority.toUpperCase()}"`,
      `"${w.status.toUpperCase()}"`,
      `"${w.assignedTo}"`,
      `"${w.dueDate}"`,
      `"${w.createdAt}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `FactoryOS_Work_Orders_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Parts Requisition Sheet as CSV
  const exportPartsRequisition = () => {
    const headers = [
      "Task ID",
      "Machine ID",
      "Machine Name",
      "Urgency",
      "Part Number (SKU)",
      "Part Description",
      "Quantity Required",
      "Unit",
      "Stock Level",
      "Stock Status",
      "Assigned Tech",
    ];

    const rows: string[][] = [];
    tasks.forEach((t) => {
      t.parts.forEach((p) => {
        rows.push([
          `"${t.id}"`,
          `"${t.machineId}"`,
          `"${t.machineName}"`,
          `"${t.urgency.toUpperCase()}"`,
          `"${p.partNumber}"`,
          `"${p.name}"`,
          p.quantity.toString(),
          `"${p.unit}"`,
          p.inStock.toString(),
          `"${p.status.toUpperCase()}"`,
          `"${t.assignedTechnician}"`,
        ]);
      });
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `FactoryOS_Parts_Requisition_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="maintenance-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            background: "#f77f00",
            color: "#07111b",
            padding: "12px 20px",
            borderRadius: "6px",
            fontWeight: 700,
            zIndex: 2000,
            boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
          }}
        >
          ⚒️ {toastMessage}
        </div>
      )}

      {/* Header Banner */}
      <div className="maintenance-header">
        <div className="maintenance-title-group">
          <div className="maintenance-icon-badge">⚒</div>
          <div>
            <h2>Maintenance Operations & Work Orders Hub</h2>
            <span>Equipment service schedules, replacement parts BOM, and work order dispatch</span>
          </div>
        </div>

        <div className="maintenance-header-actions">
          {onNavigate && (
            <button
              type="button"
              className="btn-maint-export"
              onClick={() => onNavigate("Dashboard")}
            >
              ⬅ Dashboard
            </button>
          )}

          <button
            type="button"
            className="btn-new-wo"
            onClick={() => setIsNewWoModalOpen(true)}
          >
            + Create Work Order
          </button>

          {activeTab === "work_orders" ? (
            <button
              type="button"
              className="btn-maint-export"
              onClick={exportWorkOrdersCSV}
            >
              📥 Export Work Orders (CSV)
            </button>
          ) : (
            <button
              type="button"
              className="btn-maint-export"
              onClick={exportPartsRequisition}
            >
              📥 Export Parts BOM (CSV)
            </button>
          )}

          <button
            type="button"
            className="btn-maint-export"
            style={{ background: "#0077b6", color: "#ffffff", borderColor: "#0077b6" }}
            onClick={() => window.print()}
          >
            🖨️ Print
          </button>
        </div>
      </div>

      {/* Sub-Navigation Switcher */}
      <div className="maint-subnav-bar">
        <button
          type="button"
          className={`maint-subnav-btn ${activeTab === "work_orders" ? "active" : ""}`}
          onClick={() => setActiveTab("work_orders")}
        >
          <span>📋 Work Orders Tracking & Dispatch</span>
          <span className="maint-subnav-badge">{activeWoCount} Active</span>
        </button>
        <button
          type="button"
          className={`maint-subnav-btn ${activeTab === "services" ? "active" : ""}`}
          onClick={() => setActiveTab("services")}
        >
          <span>📦 Equipment Service & Parts Requisition (BOM)</span>
          <span className="maint-subnav-badge">{tasks.length} Scheduled</span>
        </button>
      </div>

      {/* KPI Ribbon */}
      <div className="maintenance-kpi-grid">
        <div className="maintenance-kpi-card">
          <span>Active Work Orders</span>
          <strong style={{ color: activeWoCount > 0 ? "#ffb84d" : "#00ffc4" }}>
            {activeWoCount} Tickets
          </strong>
          <small>{inProgressWoCount} currently in progress</small>
        </div>
        <div className="maintenance-kpi-card">
          <span>Emergency Interventions</span>
          <strong style={{ color: emergencyCount > 0 ? "#ff4d4f" : "#00ffc4" }}>
            {emergencyCount} Emergency
          </strong>
          <small>Imminent breakdown risk</small>
        </div>
        <div className="maintenance-kpi-card">
          <span>Preventive Tasks</span>
          <strong style={{ color: preventiveCount > 0 ? "#ffb84d" : "#00ffc4" }}>
            {preventiveCount} Due Soon
          </strong>
          <small>Condition-based triggers</small>
        </div>
        <div className="maintenance-kpi-card">
          <span>Total Parts in Demand</span>
          <strong style={{ color: "#90e0ef" }}>{totalPartsInDemand} Units</strong>
          <small>Across active work packages</small>
        </div>
        <div className="maintenance-kpi-card">
          <span>Fleet Machines Monitored</span>
          <strong>{machines.length} Units</strong>
          <small>Digital twin synced</small>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="maintenance-filter-bar">
        <div className="maintenance-search-box">
          <input
            type="text"
            className="maintenance-search-input"
            placeholder={
              activeTab === "work_orders"
                ? "🔍 Search work orders by ticket ID, machine, title, or technician..."
                : "🔍 Search service tasks by machine ID, part name, or SKU..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {activeTab === "work_orders" ? (
          <>
            <select
              className="maintenance-select"
              value={woStatusFilter}
              onChange={(e) => setWoStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses ({workOrders.length})</option>
              <option value="open">Open</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              className="maintenance-select"
              value={woPriorityFilter}
              onChange={(e) => setWoPriorityFilter(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </>
        ) : (
          <select
            className="maintenance-select"
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
          >
            <option value="all">All Urgency Levels ({tasks.length})</option>
            <option value="emergency">Emergency / Immediate ({emergencyCount})</option>
            <option value="preventive">Preventive ({preventiveCount})</option>
            <option value="routine">Routine Inspection</option>
            <option value="completed">Completed Tasks</option>
          </select>
        )}
      </div>

      {/* TAB 1: WORK ORDERS TRACKER */}
      {activeTab === "work_orders" && (
        <div className="work-orders-list">
          {filteredWorkOrders.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                background: "#0d1b2a",
                borderRadius: "8px",
                border: "1px solid #203448",
                color: "#8da4be",
              }}
            >
              No work orders match the selected search or filter criteria.
            </div>
          ) : (
            filteredWorkOrders.map((wo) => (
              <div
                key={wo.id}
                className={`work-order-card priority-${wo.priority} status-${wo.status}`}
              >
                <div className="wo-header">
                  <div className="wo-title-box">
                    <div className="wo-code-title">
                      <span className="wo-id-tag">#{wo.id}</span>
                      <span className="wo-title-text">{wo.title}</span>
                    </div>
                    <span className="wo-target-machine">
                      Target Machine: <strong>{wo.machineId} — {wo.machineName}</strong> (📍 {wo.location})
                    </span>
                  </div>

                  <div className="wo-badges-group">
                    <span className={`wo-priority-pill ${wo.priority}`}>
                      {wo.priority}
                    </span>

                    <select
                      className="wo-status-select"
                      value={wo.status}
                      onChange={(e) =>
                        handleUpdateWoStatus(
                          wo.id,
                          e.target.value as "open" | "assigned" | "in_progress" | "completed" | "cancelled"
                        )
                      }
                    >
                      <option value="open">Open</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="wo-desc-box">
                  <strong>Scope & Observations:</strong> {wo.description}
                </div>

                <div className="wo-footer">
                  <div>
                    Assigned Technician: <strong>{wo.assignedTo}</strong>
                  </div>
                  <div>
                    Due Date: <strong>{wo.dueDate}</strong> | Logged: <span>{wo.createdAt}</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {onNavigate && (
                      <button
                        type="button"
                        className="btn-maint-action btn-maint-ai"
                        onClick={() => onNavigate("AI Assistant")}
                      >
                        🤖 AI Diagnostic
                      </button>
                    )}
                    {wo.status !== "completed" && (
                      <button
                        type="button"
                        className="btn-maint-action btn-maint-complete"
                        onClick={() => handleUpdateWoStatus(wo.id, "completed")}
                      >
                        ✓ Mark Completed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: EQUIPMENT SERVICE & PARTS REQUISITION (BOM) */}
      {activeTab === "services" && (
        <div className="maintenance-cards-list">
          {filteredTasks.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                background: "#0d1b2a",
                borderRadius: "8px",
                border: "1px solid #203448",
                color: "#8da4be",
              }}
            >
              No maintenance tasks match the selected search or filter criteria.
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`maint-task-card ${task.urgency}`}
              >
                {/* Header */}
                <div className="maint-task-header">
                  <div>
                    <div className="maint-machine-title">
                      <strong>
                        ⚙ {task.machineId} — {task.machineName}
                      </strong>
                      <span className={`maint-urgency-badge ${task.urgency}`}>
                        {task.urgency}
                      </span>
                      <span style={{ fontFamily: "monospace", color: "#6c8299", fontSize: "0.78rem" }}>
                        #{task.id}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.76rem", color: "#8da4be", marginTop: "2px", display: "block" }}>
                      📍 {task.location}
                    </span>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        color: task.urgency === "emergency" ? "#ff4d4f" : "#ffb84d",
                      }}
                    >
                      ⏱ {task.scheduledTime}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#8da4be" }}>
                      Est. Downtime: <strong>{task.estDowntime}</strong>
                    </span>
                  </div>
                </div>

                {/* Problem Cause & Repair Procedure */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className="maint-reason-box">
                    <span>AI Condition Diagnosis & Root Cause</span>
                    <strong>{task.issueDiagnosis}</strong>
                  </div>
                  <div className="maint-reason-box" style={{ borderLeft: "3px solid #00b4d8" }}>
                    <span>Prescribed Repair Procedure</span>
                    <strong style={{ color: "#90e0ef" }}>{task.prescribedAction}</strong>
                  </div>
                </div>

                {/* REQUIRED PARTS BREAKDOWN (BOM) */}
                <div className="maint-parts-section">
                  <div className="maint-parts-title">
                    <h4>📦 Required Replacement Parts & Consumables ({task.parts.length} items)</h4>
                    <span style={{ fontSize: "0.75rem", color: "#8da4be" }}>
                      All parts verified against plant inventory
                    </span>
                  </div>

                  <table className="maint-parts-table">
                    <thead>
                      <tr>
                        <th>Part Number / SKU</th>
                        <th>Part Description</th>
                        <th>Qty Required</th>
                        <th>Stock Level</th>
                        <th>Availability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {task.parts.map((part, pIdx) => (
                        <tr key={pIdx}>
                          <td>
                            <span className="part-sku-code">{part.partNumber}</span>
                          </td>
                          <td>
                            <strong>{part.name}</strong>
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            {part.quantity} {part.unit}
                          </td>
                          <td style={{ color: "#8da4be" }}>
                            {part.inStock} {part.unit} in stockroom
                          </td>
                          <td>
                            <span className={`stock-pill ${part.status}`}>
                              {part.status === "in-stock"
                                ? "✓ In Stock"
                                : part.status === "low-stock"
                                ? "⚠ Low Stock"
                                : "✕ Order Required"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Meta & Actions */}
                <div className="maint-card-footer">
                  <div className="maint-meta-info">
                    <span>
                      Assigned Specialist: <strong>{task.assignedTechnician}</strong>
                    </span>
                  </div>

                  <div className="maint-card-btn-group">
                    {onNavigate && (
                      <button
                        type="button"
                        className="btn-maint-action btn-maint-ai"
                        onClick={() => onNavigate("AI Assistant")}
                        title="Open AI Diagnostic Assistant"
                      >
                        🤖 AI Diagnostic
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-maint-action btn-maint-reserve"
                      onClick={() => showToast(`Reserved ${task.parts.length} part types for ${task.machineId}`)}
                    >
                      📦 Reserve Parts & Dispatch
                    </button>

                    {task.urgency !== "completed" && (
                      <button
                        type="button"
                        className="btn-maint-action btn-maint-complete"
                        onClick={() => handleCompleteServiceTask(task.id)}
                      >
                        ✓ Mark Completed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CREATE WORK ORDER MODAL */}
      {isNewWoModalOpen && (
        <div className="wo-create-modal-overlay" onClick={() => setIsNewWoModalOpen(false)}>
          <div className="wo-create-modal" onClick={(e) => e.stopPropagation()}>
            <h3>🛠️ Create New Maintenance Work Order</h3>

            <form onSubmit={handleCreateWorkOrderSubmit}>
              <div className="wo-form-group">
                <label>Target Machine</label>
                <select
                  value={newWoMachineId}
                  onChange={(e) => setNewWoMachineId(e.target.value)}
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} — {m.name} ({m.location})
                    </option>
                  ))}
                </select>
              </div>

              <div className="wo-form-group">
                <label>Work Order Title</label>
                <input
                  type="text"
                  placeholder="e.g., Spindle Bearing Replacement & Lubricant Flush"
                  value={newWoTitle}
                  onChange={(e) => setNewWoTitle(e.target.value)}
                  required
                />
              </div>

              <div className="wo-form-group">
                <label>Description & Scope of Work</label>
                <textarea
                  rows={3}
                  placeholder="Describe observed faults, telemetry alarms, or tasks to be performed..."
                  value={newWoDesc}
                  onChange={(e) => setNewWoDesc(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="wo-form-group">
                  <label>Priority</label>
                  <select
                    value={newWoPriority}
                    onChange={(e) =>
                      setNewWoPriority(e.target.value as "low" | "medium" | "high" | "critical")
                    }
                  >
                    <option value="critical">Critical (Immediate Shutdown)</option>
                    <option value="high">High (Within 24 Hours)</option>
                    <option value="medium">Medium (Scheduled)</option>
                    <option value="low">Low (Routine)</option>
                  </select>
                </div>

                <div className="wo-form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={newWoDueDate}
                    onChange={(e) => setNewWoDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="wo-form-group">
                <label>Assigned Lead Technician</label>
                <input
                  type="text"
                  value={newWoAssignedTo}
                  onChange={(e) => setNewWoAssignedTo(e.target.value)}
                  placeholder="e.g., Marcus Vance"
                />
              </div>

              <div className="wo-modal-btn-row">
                <button
                  type="button"
                  className="btn-maint-export"
                  onClick={() => setIsNewWoModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-new-wo"
                >
                  Submit & Dispatch Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;
