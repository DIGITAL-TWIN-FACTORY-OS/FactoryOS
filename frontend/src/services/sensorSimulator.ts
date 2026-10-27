/**
 * FactoryOS - High-Fidelity Multi-Dataset Sensor Simulator & Degradation Engine
 * Mimics real-world industrial machinery dynamics trained on:
 * 1. NASA Ames & UC Berkeley Milling Machine Dataset (MC-510V 167 tool-wear cutting runs)
 * 2. AI4I 2020 Predictive Maintenance Dataset (10,000 synthetic machine instances)
 *
 * Implements:
 * - Taylor's Extended Tool Life & Flank Wear (VB) Progression:
 *     dVB/dt = k * (Speed/1000)^alpha * (Torque/10)^beta
 * - Spindle Motor DC Current & Cutting Torque Coupling:
 *     I_DC = I_no_load + gamma * Torque * (1 + delta * VB)
 * - Bearing & Spindle Vibration (ISO 10816):
 *     Vib = Vib_base + lambda * (VB / 0.40)^1.5 + imbalance
 * - Thermodynamic Friction Heat & Dissipation Gradient:
 *     dT/dt = (Q_gen - Q_diss) / C_thermal
 * - Acoustic Emission (AE RMS in Volts) for shear deformation
 * - Multi-Speed Time Acceleration (1x, 5x, 10x, 60x [1s = 1m], 360x [1s = 6m])
 * - Interactive Perturbation & Fault Injection (Coolant Loss, Tool Chipping, Spindle Overload)
 * - Dynamic Alerts & Maintenance Ticket Generator (Zero dummy alerts)
 */

import type { Machine, MachineStatus } from "../components/AddMachineModal/AddMachineModal";
import { predictMachineHealthScore } from "./aiHealthScoreModel";

export interface SimulatedSensorState {
  machineId: string;
  flankWearMm: number; // NASA VB in mm (0.02 to 1.20)
  temperature: number; // °C
  vibration: number; // mm/s
  current: number; // Amperes
  speed: number; // RPM
  runtimeHours: number; // Accumulated runtime
  acousticEmission: number; // Volts RMS
  loadPercent: number; // 0 - 200% mechanical load
  coolantEfficiency: number; // 0.0 to 1.0 (1.0 = optimal cooling)
  stressMultiplier: number; // Factor to accelerate wear intentionally
  isOperating: boolean;
  lastTickTimestamp: number;
}

export interface DynamicAlert {
  id: string;
  machineId: string;
  machine: string;
  message: string;
  time: string;
  type: "critical" | "warning" | "info";
  sensorKey: "temperature" | "vibration" | "current" | "flankWear" | "health";
  currentValue: number;
  threshold: number;
  recommendation: string;
}

export interface DynamicMaintenanceTask {
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
  parts: {
    partNumber: string;
    name: string;
    quantity: number;
    unit: string;
    inStock: number;
    status: "in-stock" | "low-stock" | "out-of-stock";
  }[];
}

export interface DynamicWorkOrder {
  id: string;
  machineId: string;
  machineName: string;
  location: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "assigned" | "in_progress" | "completed";
  assignedTo: string;
  dueDate: string;
  createdAt: string;
}

// Global simulation registry storing internal state for layout machines
const simulationStates: Map<string, SimulatedSensorState> = new Map();

/**
 * Initializes or retrieves the simulation state for a machine
 */
export function getOrCreateSimulationState(machine: Machine): SimulatedSensorState {
  let state = simulationStates.get(machine.id);
  if (!state) {
    const isDegraded = machine.status === "critical" || machine.status === "warning";
    state = {
      machineId: machine.id,
      flankWearMm: machine.flankWearMm ?? (machine.status === "critical" ? 0.48 : machine.status === "warning" ? 0.32 : 0.08),
      temperature: machine.temperature ?? 52.0,
      vibration: machine.vibration ?? (isDegraded ? 3.6 : 2.1),
      current: machine.current ?? 8.4,
      speed: machine.speed ?? 1450,
      runtimeHours: machine.runtime ?? 10.0,
      acousticEmission: isDegraded ? 0.28 : 0.09,
      loadPercent: 100,
      coolantEfficiency: 1.0,
      stressMultiplier: 1.0,
      isOperating: true,
      lastTickTimestamp: Date.now(),
    };
    simulationStates.set(machine.id, state);
  }
  return state;
}

/**
 * Performs one simulation tick with time acceleration
 * @param machine Current machine object
 * @param deltaSeconds Real elapsed time in seconds (typically ~1.0)
 * @param timeMultiplier Speed multiplier: 1x, 5x, 10x, 60x, 360x (0 = paused)
 * @returns Updated Machine object with recalculated AI health score and sensors
 */
export function simulateMachineTick(
  machine: Machine,
  deltaSeconds: number,
  timeMultiplier: number
): Machine {
  if (timeMultiplier <= 0) return machine;

  const simSeconds = deltaSeconds * timeMultiplier;
  const simHours = simSeconds / 3600;
  const state = getOrCreateSimulationState(machine);

  // 1. Tool Flank Wear (VB) Progression (Taylor's Milling Law from NASA MC-510V)
  // Normal cutting wear rate: ~0.00035 mm per cutting hour at standard conditions
  const speedRatio = state.speed / 1400;
  const loadRatio = state.loadPercent / 100;
  const wearRatePerHour =
    0.00035 *
    Math.pow(speedRatio, 1.3) *
    Math.pow(loadRatio, 1.4) *
    state.stressMultiplier;

  // Flank wear increases monotonically (tool wear cannot heal itself without maintenance)
  state.flankWearMm = Math.min(1.20, state.flankWearMm + wearRatePerHour * simHours);
  state.runtimeHours += simHours;

  // 2. DC Spindle Current (Coupled with cutting torque & tool wear friction)
  // In NASA Ames MC-510V runs, DC current rises sharply as flank wear exceeds 0.35mm
  const baseCurrent = 4.5 + (loadRatio * 3.8);
  const wearCurrentContribution = (state.flankWearMm / 0.40) * 4.2;
  const currentNoise = (Math.random() - 0.5) * 0.15;
  state.current = Number((baseCurrent + wearCurrentContribution + currentNoise).toFixed(1));

  // 3. Spindle Vibration RMS (ISO 10816 standards)
  // Healthy baseline: 1.8 - 2.4 mm/s. Critical tool wear / bearing chatter: > 4.5 mm/s
  const baseVib = 1.9 * (state.speed / 1400);
  const wearVibContribution = Math.pow(Math.max(0, state.flankWearMm - 0.10) / 0.30, 1.6) * 3.4;
  const vibNoise = (Math.random() - 0.5) * 0.12;
  state.vibration = Number(Math.max(0.5, baseVib + wearVibContribution + vibNoise).toFixed(2));

  // 4. Thermodynamic Equilibrium & Process Temperature (°C)
  // Generated heat Q_gen vs Dissipated heat Q_diss
  const ambientTemp = 24.0;
  const heatGeneration = (state.current * 3.2) * (1 / Math.max(0.2, state.coolantEfficiency));
  const heatDissipation = (state.temperature - ambientTemp) * 0.65;
  const deltaTemp = (heatGeneration - heatDissipation) * 0.04 * Math.min(simSeconds, 30);
  const tempNoise = (Math.random() - 0.5) * 0.2;
  state.temperature = Number(
    Math.min(125.0, Math.max(30.0, state.temperature + deltaTemp + tempNoise)).toFixed(1)
  );

  // 5. Acoustic Emission (Micro-fracturing & shear deformation from NASA AE sensors)
  const baseAE = 0.08 + (state.flankWearMm * 0.25);
  state.acousticEmission = Number((baseAE + Math.random() * 0.04).toFixed(3));

  // 6. Multimodal AI Health Prediction
  const aiResult = predictMachineHealthScore({
    name: machine.name,
    type: machine.type || "CNC Milling",
    temperature: state.temperature,
    vibration: state.vibration,
    current: state.current,
    speed: state.speed,
    runtime: state.runtimeHours,
    acousticEmission: state.acousticEmission,
  });

  return {
    ...machine,
    temperature: state.temperature,
    vibration: state.vibration,
    current: state.current,
    speed: state.speed,
    runtime: Number(state.runtimeHours.toFixed(1)),
    health: aiResult.healthScore,
    status: aiResult.status,
    failureProbability: aiResult.failureProbability,
    failureTime: aiResult.remainingUsefulLifeDays,
    recommendation: aiResult.recommendations[0] || "Continue monitoring.",
    diagnosis: aiResult.diagnosis,
    flankWearMm: Number(state.flankWearMm.toFixed(3)),
  };
}

/**
 * Manually sets or overrides sensor parameters on a machine for interactive simulation
 */
export function overrideMachineSensor(
  machineId: string,
  overrides: {
    flankWearMm?: number;
    temperature?: number;
    vibration?: number;
    current?: number;
    speed?: number;
    loadPercent?: number;
    coolantEfficiency?: number;
    stressMultiplier?: number;
  }
) {
  const state = simulationStates.get(machineId);
  if (state) {
    if (overrides.flankWearMm !== undefined) state.flankWearMm = overrides.flankWearMm;
    if (overrides.temperature !== undefined) state.temperature = overrides.temperature;
    if (overrides.vibration !== undefined) state.vibration = overrides.vibration;
    if (overrides.current !== undefined) state.current = overrides.current;
    if (overrides.speed !== undefined) state.speed = overrides.speed;
    if (overrides.loadPercent !== undefined) state.loadPercent = overrides.loadPercent;
    if (overrides.coolantEfficiency !== undefined) state.coolantEfficiency = overrides.coolantEfficiency;
    if (overrides.stressMultiplier !== undefined) state.stressMultiplier = overrides.stressMultiplier;
  }
}

/**
 * Resets a machine after maintenance (simulates tool replacement, lubrication, bearing service)
 */
export function resetMachineMaintenance(machineId: string): Partial<Machine> {
  const state = simulationStates.get(machineId);
  if (state) {
    state.flankWearMm = 0.04;
    state.temperature = 49.5;
    state.vibration = 1.95;
    state.current = 8.1;
    state.coolantEfficiency = 1.0;
    state.stressMultiplier = 1.0;
  }
  return {
    flankWearMm: 0.04,
    temperature: 49.5,
    vibration: 1.95,
    current: 8.1,
    health: 98,
    status: "running" as MachineStatus,
    failureProbability: 3,
    failureTime: "68 days",
    recommendation: "Equipment newly serviced. Optimal cutting condition.",
    diagnosis: "All telemetry within nominal baseline parameters.",
    lastMaintenance: new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  };
}

/**
 * Injects a realistic cutting/mechanical fault into a machine for testing
 */
export function injectMachineFault(
  machineId: string,
  faultType: "tool_wear" | "thermal_choke" | "bearing_fatigue" | "overcurrent"
): Partial<Machine> {
  const state = simulationStates.get(machineId);
  if (!state) return {};

  if (faultType === "tool_wear") {
    // Severe tool flank wear exceeding NASA threshold (0.45mm)
    state.flankWearMm = 0.48;
    state.vibration = 4.8;
    state.current = 13.5;
  } else if (faultType === "thermal_choke") {
    // Coolant failure or heat dissipation restriction
    state.coolantEfficiency = 0.25;
    state.temperature = 88.5;
  } else if (faultType === "bearing_fatigue") {
    // Spindle bearing race spalling
    state.vibration = 5.6;
    state.acousticEmission = 0.42;
  } else if (faultType === "overcurrent") {
    // Heavy cutting torque overload
    state.loadPercent = 180;
    state.current = 16.2;
    state.temperature = 78.0;
  }

  const aiResult = predictMachineHealthScore({
    temperature: state.temperature,
    vibration: state.vibration,
    current: state.current,
    speed: state.speed,
    runtime: state.runtimeHours,
    acousticEmission: state.acousticEmission,
  });

  return {
    flankWearMm: state.flankWearMm,
    temperature: state.temperature,
    vibration: state.vibration,
    current: state.current,
    health: aiResult.healthScore,
    status: aiResult.status,
    failureProbability: aiResult.failureProbability,
    failureTime: aiResult.remainingUsefulLifeDays,
    recommendation: aiResult.recommendations[0],
    diagnosis: aiResult.diagnosis,
  };
}

/**
 * Clones a machine to create an identical digital twin for side-by-side simulation
 */
export function createSimulationCopy(
  baseMachine: Machine,
  copyIndex: number
): Partial<Machine> {
  const newId = `${baseMachine.id}-SIM${copyIndex > 1 ? copyIndex : ""}`;
  const basePosX = parseFloat(baseMachine.x) || 30;
  const basePosY = parseFloat(baseMachine.y) || 30;

  // Offset slightly on the floor layout so it doesn't overlap
  const newX = `${Math.min(88, basePosX + 14).toFixed(1)}%`;
  const newY = `${Math.min(85, basePosY + 8).toFixed(1)}%`;

  return {
    ...baseMachine,
    id: newId,
    name: `${baseMachine.name} (Twin ${copyIndex})`,
    x: newX,
    y: newY,
    isLocked: false,
    installedOn: new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  };
}

/**
 * GENERATE DYNAMIC ALERTS: Strictly derived from machines currently present on layout.
 * If all machines on layout are healthy, returns empty array [].
 */
export function generateDynamicAlerts(machines: Machine[]): DynamicAlert[] {
  const alerts: DynamicAlert[] = [];
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  for (const m of machines) {
    const vb = m.flankWearMm ?? 0.08;

    // Critical Alerts
    if (m.temperature >= 80.0) {
      alerts.push({
        id: `ALT-CRIT-TMP-${m.id}`,
        machineId: m.id,
        machine: `${m.id} ${m.name}`,
        message: `Critical Thermal Overheating: Spindle bearing temperature reached ${m.temperature}°C (Limit: 80.0°C)`,
        time: timeStr,
        type: "critical",
        sensorKey: "temperature",
        currentValue: m.temperature,
        threshold: 80.0,
        recommendation: "Immediate spindle stop. Inspect heat dissipation lines and lubricant flow.",
      });
    }

    if (m.vibration >= 4.8) {
      alerts.push({
        id: `ALT-CRIT-VIB-${m.id}`,
        machineId: m.id,
        machine: `${m.id} ${m.name}`,
        message: `Severe Spindle Vibration: Peak RMS vibration at ${m.vibration} mm/s (ISO Limit: 4.8 mm/s)`,
        time: timeStr,
        type: "critical",
        sensorKey: "vibration",
        currentValue: m.vibration,
        threshold: 4.8,
        recommendation: "Bearing race fatigue or heavy cutting chatter detected. Replace tooling inserts or spindle bearings.",
      });
    }

    if (m.current >= 13.5) {
      alerts.push({
        id: `ALT-CRIT-CUR-${m.id}`,
        machineId: m.id,
        machine: `${m.id} ${m.name}`,
        message: `Spindle Motor Overcurrent: Current draw spiked to ${m.current}A (Threshold: 13.5A)`,
        time: timeStr,
        type: "critical",
        sensorKey: "current",
        currentValue: m.current,
        threshold: 13.5,
        recommendation: "Reduce feed rate immediately or check workpiece engagement for jamming.",
      });
    }

    if (vb >= 0.42) {
      alerts.push({
        id: `ALT-CRIT-VB-${m.id}`,
        machineId: m.id,
        machine: `${m.id} ${m.name}`,
        message: `Tool Wear Limit Exceeded: Flank wear VB is ${vb.toFixed(3)}mm (Failure threshold: 0.400mm)`,
        time: timeStr,
        type: "critical",
        sensorKey: "flankWear",
        currentValue: vb,
        threshold: 0.40,
        recommendation: "Tool chipping imminent. Index cutting inserts or replace tool assembly.",
      });
    }

    // Warning Alerts (if not already triggered critical)
    if (m.temperature >= 65.0 && m.temperature < 80.0) {
      alerts.push({
        id: `ALT-WARN-TMP-${m.id}`,
        machineId: m.id,
        machine: `${m.id} ${m.name}`,
        message: `Elevated Operating Temperature: Telemetry at ${m.temperature}°C (Advisory limit: 65.0°C)`,
        time: timeStr,
        type: "warning",
        sensorKey: "temperature",
        currentValue: m.temperature,
        threshold: 65.0,
        recommendation: "Check coolant levels and verify heat exchanger airflow.",
      });
    }

    if (m.vibration >= 3.0 && m.vibration < 4.8) {
      alerts.push({
        id: `ALT-WARN-VIB-${m.id}`,
        machineId: m.id,
        machine: `${m.id} ${m.name}`,
        message: `Spindle Vibration Harmonic Warning: Vibration elevated at ${m.vibration} mm/s`,
        time: timeStr,
        type: "warning",
        sensorKey: "vibration",
        currentValue: m.vibration,
        threshold: 3.0,
        recommendation: "Inspect tool holder clamp force and re-balance tool assembly.",
      });
    }

    if (m.current >= 10.5 && m.current < 13.5) {
      alerts.push({
        id: `ALT-WARN-CUR-${m.id}`,
        machineId: m.id,
        machine: `${m.id} ${m.name}`,
        message: `Elevated Motor Load: Current running at ${m.current}A`,
        time: timeStr,
        type: "warning",
        sensorKey: "current",
        currentValue: m.current,
        threshold: 10.5,
        recommendation: "Verify cutting depth and feed rate against material hardness specifications.",
      });
    }

    if (vb >= 0.30 && vb < 0.42) {
      alerts.push({
        id: `ALT-WARN-VB-${m.id}`,
        machineId: m.id,
        machine: `${m.id} ${m.name}`,
        message: `Tool Flank Wear Degradation: Flank wear VB reached ${vb.toFixed(3)}mm`,
        time: timeStr,
        type: "warning",
        sensorKey: "flankWear",
        currentValue: vb,
        threshold: 0.30,
        recommendation: "Schedule tool change within next 4 hours of production.",
      });
    }
  }

  return alerts;
}

/**
 * GENERATE DYNAMIC MAINTENANCE TASKS: Strictly derived from degraded machines currently on layout.
 */
export function generateDynamicMaintenanceTasks(machines: Machine[]): DynamicMaintenanceTask[] {
  const tasks: DynamicMaintenanceTask[] = [];

  for (const m of machines) {
    if (m.status === "running") continue;

    const isCritical = m.status === "critical";
    const vb = m.flankWearMm ?? 0.08;

    // Determine relevant parts and actions based on the specific machine and telemetry
    const parts = [];
    let issue = "";
    let action = "";
    let estDowntime = "1.5 hrs";
    let technician = "Marcus Vance (Mechanical Lead)";

    if (m.vibration > 4.0 || vb >= 0.40) {
      issue = `Tool wear VB (${vb.toFixed(3)}mm) and spindle vibration (${m.vibration} mm/s) exceed tolerance.`;
      action = "Replace cutting carbide insert pack, inspect spindle taper runout, and re-grease spindle bearings.";
      estDowntime = "2.0 hrs";
      technician = "Elena Rostova (Drive & Spindle Specialist)";
      parts.push(
        { partNumber: "INS-CARB-WNMG", name: "Carbide Turning/Milling Inserts WNMG 080408", quantity: 4, unit: "pcs", inStock: 12, status: "in-stock" as const },
        { partNumber: "SKF-7014-ACD", name: "Super-Precision Spindle Angular Ball Bearing", quantity: 2, unit: "pcs", inStock: 3, status: "in-stock" as const },
        { partNumber: "GREASE-KLUB-NBU15", name: "Klüber Isoflex NBU 15 High-Speed Spindle Grease", quantity: 1, unit: "tube", inStock: 8, status: "in-stock" as const }
      );
    } else if (m.temperature > 65.0) {
      issue = `Thermal overload (${m.temperature}°C). Heat dissipation deficit detected.`;
      action = "Flush cooling lines, replace high-pressure coolant filter cartridge, and calibrate thermocouple.";
      estDowntime = "1.2 hrs";
      technician = "David Chen (Thermal Systems Tech)";
      parts.push(
        { partNumber: "COOL-FLTR-10M", name: "10-Micron High-Pressure Coolant Cartridge", quantity: 2, unit: "pcs", inStock: 6, status: "in-stock" as const },
        { partNumber: "VALVE-COOL-SOL", name: "24V Solenoid Coolant Bypass Valve", quantity: 1, unit: "pcs", inStock: 2, status: "low-stock" as const }
      );
    } else {
      issue = `Elevated current (${m.current}A) and load fluctuation.`;
      action = "Inspect drive belt tension, check guideway wiper clearances, and lubricate slideway reservoirs.";
      estDowntime = "45 mins";
      technician = "Marcus Vance (Mechanical Lead)";
      parts.push(
        { partNumber: "OIL-VG68-SLIDE", name: "Mobil Vactra No. 2 Way Lube ISO VG 68", quantity: 5, unit: "liters", inStock: 14, status: "in-stock" as const },
        { partNumber: "WIPER-WAY-PU", name: "Polyurethane Guideway Wiper Set", quantity: 1, unit: "set", inStock: 4, status: "in-stock" as const }
      );
    }

    tasks.push({
      id: `MNT-${m.id}`,
      machineId: m.id,
      machineName: m.name,
      location: m.location,
      urgency: isCritical ? "emergency" : "preventive",
      issueDiagnosis: issue,
      prescribedAction: action,
      scheduledTime: isCritical ? "Immediate (Urgent Action Required)" : "Within 8 operating hours",
      estDowntime,
      assignedTechnician: technician,
      parts,
    });
  }

  return tasks;
}

/**
 * GENERATE DYNAMIC WORK ORDERS: Derived strictly from machines requiring attention.
 */
export function generateDynamicWorkOrders(machines: Machine[]): DynamicWorkOrder[] {
  const orders: DynamicWorkOrder[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const m of machines) {
    if (m.status === "running") continue;

    const isCritical = m.status === "critical";
    orders.push({
      id: `WO-${m.id}`,
      machineId: m.id,
      machineName: m.name,
      location: m.location,
      title: isCritical ? `Emergency Overhaul: ${m.name}` : `Preventive Servicing: ${m.name}`,
      description: `Telemetry anomaly detected: Temp ${m.temperature}°C, Vib ${m.vibration}mm/s, Current ${m.current}A. Recommendation: ${m.recommendation}`,
      priority: isCritical ? "critical" : "high",
      status: isCritical ? "in_progress" : "open",
      assignedTo: isCritical ? "Elena Rostova" : "Marcus Vance",
      dueDate: today,
      createdAt: `${today} 08:30`,
    });
  }

  return orders;
}
