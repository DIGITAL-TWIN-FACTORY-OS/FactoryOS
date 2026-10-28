import React, { useState, useRef, useEffect } from "react";
import "./AIAssistant.css";
import {
  predictMachineHealthScore,
  getModelDatasetSpecs,
  predictWhatIfScenario,
} from "../../services/aiHealthScoreModel";

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
  width?: number;
  height?: number;
  scale?: number;
  isLocked?: boolean;
  department?: string;
  type?: string;
  flankWearMm?: number;
}

export interface Alert {
  machine: string;
  message: string;
  time: string;
  type: "critical" | "warning" | "info";
}

export interface ActionButton {
  label: string;
  icon?: string;
  action: "service_reset" | "work_order" | "view_floor" | "clone_twin" | "pause_sim" | "speed_sim" | "service_all_critical";
  machineId?: string;
  variant?: "primary" | "warning" | "danger" | "success" | "secondary";
  speed?: number;
}

export interface DiagnosticCardData {
  machineId: string;
  machineName: string;
  location: string;
  status: "running" | "warning" | "critical";
  health: number;
  failureProbability: number;
  failureTime: string;
  flankWearMm: number;
  wearStage: string;
  temp: number;
  vib: number;
  current: number;
  speed: number;
  summary: string;
  rootCause: string;
  recommendedAction: string;
}

export interface Message {
  id: string;
  sender: "assistant" | "user";
  text: string;
  timestamp: string;
  chips?: string[];
  actions?: ActionButton[];
  card?: DiagnosticCardData;
  comparison?: {
    machineA: Machine;
    machineB: Machine;
  };
  modelSpecs?: boolean;
  fleetList?: Machine[];
}

interface AIAssistantProps {
  machines: Machine[];
  alerts: Alert[];
  onNavigate?: (page: string, machineId?: string) => void;
  onResetMaintenance?: (machineId: string) => void;
  onCloneMachine?: (machineId: string) => void;
  onSetTimeMultiplier?: (speed: number) => void;
  timeMultiplier?: number;
  activePresetName?: string;
}

// Ensure zero asterisks in any response string
const sanitizeText = (txt: string): string => {
  return txt.replace(/\*\*/g, "").replace(/\*/g, "");
};

// Rich metadata dictionary for all factory machines
const getDepartmentForMachine = (id: string, name: string): string => {
  const n = (name + " " + id).toLowerCase();
  if (n.includes("laser") || n.includes("cut")) return "Sheet Metal Fabrication";
  if (n.includes("lathe") || n.includes("turn")) return "Precision Machining";
  if (n.includes("mill") || n.includes("machining center") || n.includes("m-03")) return "5-Axis Milling & Tooling";
  if (n.includes("grind") || n.includes("m-04")) return "Precision Surface Finishing";
  if (n.includes("assembly") || n.includes("alpha")) return "Robotics & Automation";
  if (n.includes("wire") || n.includes("edm")) return "Tool & Die Making";
  if (n.includes("weld")) return "Automated Welding";
  if (n.includes("heat") || n.includes("furnace") || n.includes("m-09")) return "Thermal Processing";
  if (n.includes("packag") || n.includes("m-11")) return "Packaging & Shipping";
  if (n.includes("press") || n.includes("hydraulic")) return "Heavy Stamping";
  if (n.includes("cmm") || n.includes("measur")) return "Quality Assurance & Metrology";
  if (n.includes("agv") || n.includes("vehicle")) return "Material Logistics";
  return "Operational Production";
};

const getInstalledDateForMachine = (id: string): string => {
  const map: Record<string, string> = {
    "M-01": "14 Feb 2023",
    "M-02": "10 Aug 2022",
    "M-03": "05 May 2023",
    "M-04": "22 Nov 2022",
    "M-05": "18 Mar 2024",
    "M-06": "30 Jun 2023",
    "M-07": "12 Jan 2024",
    "M-08": "09 Sep 2023",
    "M-09": "15 Apr 2022",
    "M-10": "01 Dec 2024",
    "M-11": "20 May 2023",
    "M-12": "11 Nov 2021",
  };
  return map[id.toUpperCase()] || "15 Jan 2024";
};

export const AIAssistant: React.FC<AIAssistantProps> = ({
  machines,
  alerts,
  onNavigate,
  onResetMaintenance,
  onCloneMachine,
  onSetTimeMultiplier,
  timeMultiplier = 1,
  activePresetName = "Operational Floor",
}) => {
  // Plant-wide Stats across all added machines
  const criticalCount = machines.filter((m) => m.status === "critical").length;
  const warningCount = machines.filter((m) => m.status === "warning").length;
  const healthyCount = machines.filter((m) => m.status === "running").length;
  const avgHealth = Math.round(
    machines.reduce((acc, m) => acc + m.health, 0) / (machines.length || 1)
  );

  // Chat State with straight-to-the-point initial greeting (NO asterisks)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      sender: "assistant",
      text: `Factory AI Assistant Online. Monitoring all ${machines.length} machines in the factory. Ask any specific question about machine temperatures, vibration, current, flank wear, locations, root causes, or maintenance actions.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      chips: [
        "Critical Machines",
        "List All Machines",
        "Which machine will fail first?",
        "Compare M-05 and M-07",
        "Highest vibration machine",
        "NASA Model Specs",
      ],
      actions: criticalCount > 0 ? [
        {
          label: `Service All ${criticalCount} Critical Units`,
          icon: "🔧",
          action: "service_all_critical",
          variant: "danger",
        },
      ] : undefined,
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Work Order Modal State
  const [selectedWorkOrderMachine, setSelectedWorkOrderMachine] = useState<Machine | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Enriched machine data with full specifications
  const getEnriched = (m: Machine) => {
    const aiPred = predictMachineHealthScore({
      name: m.name,
      temperature: m.temperature,
      vibration: m.vibration,
      current: m.current,
      speed: m.speed,
      runtime: m.runtime,
    });

    return {
      ...m,
      flankWearMm: m.flankWearMm ?? aiPred.predictedFlankWearMm,
      wearStage: aiPred.wearStage,
      mlHealth: aiPred.healthScore,
      department: m.department || getDepartmentForMachine(m.id, m.name),
      installedOn: m.installedOn || getInstalledDateForMachine(m.id),
      lastMaintenance: m.lastMaintenance || "02 Oct 2026",
      speed: m.speed || 1850,
      runtime: m.runtime || 120,
    };
  };

  // Helper to handle interactive actions right from chat
  const handleExecuteAction = (btn: ActionButton) => {
    if (btn.action === "service_reset" && btn.machineId) {
      onResetMaintenance?.(btn.machineId);
      showToast(`Tool change completed for ${btn.machineId}`);

      const replyMsg: Message = {
        id: Date.now().toString(),
        sender: "assistant",
        text: `Tool replacement completed for ${btn.machineId}. Health is restored to 98% (Running). Flank wear reset to 0.080 mm VB. Telemetry normalized.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actions: [
          {
            label: "View on Operational Floor",
            icon: "👁",
            action: "view_floor",
            machineId: btn.machineId,
            variant: "primary",
          },
        ],
      };
      setMessages((prev) => [...prev, replyMsg]);
    } else if (btn.action === "service_all_critical") {
      const crits = machines.filter((m) => m.status === "critical");
      crits.forEach((m) => onResetMaintenance?.(m.id));
      showToast(`Batch service completed for ${crits.length} machines`);

      const replyMsg: Message = {
        id: Date.now().toString(),
        sender: "assistant",
        text: `Batch overhaul completed for ${crits.length} critical machines: ${crits.map((m) => m.id).join(", ")}. Tools replaced and health restored to 98%.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actions: [
          {
            label: "Inspect Operational Floor",
            icon: "👁",
            action: "view_floor",
            variant: "success",
          },
        ],
      };
      setMessages((prev) => [...prev, replyMsg]);
    } else if (btn.action === "work_order" && btn.machineId) {
      const target = machines.find((m) => m.id === btn.machineId);
      if (target) {
        setSelectedWorkOrderMachine(target);
      }
    } else if (btn.action === "view_floor") {
      onNavigate?.("Dashboard", btn.machineId);
    } else if (btn.action === "clone_twin" && btn.machineId) {
      onCloneMachine?.(btn.machineId);
      showToast(`Digital Twin created for ${btn.machineId}`);
      const replyMsg: Message = {
        id: Date.now().toString(),
        sender: "assistant",
        text: `Digital Twin created for ${btn.machineId}. Twin duplicate added to test cutting parameters and stress conditions.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, replyMsg]);
    } else if (btn.action === "pause_sim") {
      onSetTimeMultiplier?.(0);
      showToast("Simulation paused");
    } else if (btn.action === "speed_sim" && btn.speed !== undefined) {
      onSetTimeMultiplier?.(btn.speed);
      showToast(`Simulation set to ${btn.speed}x`);
    }
  };

  // Find target machine mentioned in query (by ID, number, alias, or keyword)
  const findTargetMachine = (q: string): Machine | undefined => {
    // 1. Direct number match for patterns like M-02, M02, M2, M-2, machine 2, machine 02, unit 2
    const numMatch = q.match(/(?:m-?|machine\s*|unit\s*)(\d+)/i);
    if (numMatch && numMatch[1]) {
      const targetNum = parseInt(numMatch[1], 10);
      const found = machines.find((m) => {
        const mNum = m.id.match(/\d+/);
        return mNum ? parseInt(mNum[0], 10) === targetNum : false;
      });
      if (found) return found;
    }

    // 2. Exact word or substring match
    for (const m of machines) {
      const cleanId = m.id.toLowerCase();
      const noHyphen = cleanId.replace("-", "");
      if (q.includes(cleanId) || q.includes(noHyphen)) return m;
    }

    // 3. Machine Name keyword matching
    const keywords: { key: string; nameSub: string }[] = [
      { key: "laser", nameSub: "laser" },
      { key: "lathe", nameSub: "lathe" },
      { key: "turn", nameSub: "turn" },
      { key: "mill", nameSub: "mill" },
      { key: "grind", nameSub: "grind" },
      { key: "assembly", nameSub: "assembly" },
      { key: "alpha", nameSub: "alpha" },
      { key: "weld", nameSub: "weld" },
      { key: "furnace", nameSub: "heat" },
      { key: "heat", nameSub: "heat" },
      { key: "treatment", nameSub: "heat" },
      { key: "packag", nameSub: "packag" },
      { key: "wire", nameSub: "wire" },
      { key: "edm", nameSub: "wire" },
      { key: "press", nameSub: "press" },
      { key: "cmm", nameSub: "measur" },
      { key: "measur", nameSub: "measur" },
      { key: "agv", nameSub: "vehicle" },
      { key: "vehicle", nameSub: "vehicle" },
      { key: "robot", nameSub: "assembly" },
    ];

    for (const item of keywords) {
      if (q.includes(item.key)) {
        const found = machines.find((m) => m.name.toLowerCase().includes(item.nameSub));
        if (found) return found;
      }
    }

    return undefined;
  };

  // AI Diagnostic Reasoning Engine - Direct, Question-Specific, Zero Asterisks
  const generateAIResponse = (query: string): Partial<Message> => {
    const q = query.toLowerCase().trim();

    // 1. Machine Comparison Question (e.g., "compare M-05 and M-07")
    const machineIdMatches = q.match(/m-?\d+/g) || [];
    if ((q.includes("compare") || q.includes("vs") || q.includes("difference")) && machineIdMatches.length >= 2) {
      const matchA = machineIdMatches[0];
      const matchB = machineIdMatches[1];
      if (matchA && matchB) {
        const cleanA = matchA.replace("-", "").toUpperCase();
        const cleanB = matchB.replace("-", "").toUpperCase();
        const machA = machines.find((m) => m.id.replace("-", "").toUpperCase() === cleanA);
        const machB = machines.find((m) => m.id.replace("-", "").toUpperCase() === cleanB);

        if (machA && machB) {
          const emA = getEnriched(machA);
          const emB = getEnriched(machB);
          return {
            text: `Comparison between ${machA.id} and ${machB.id}:\n\n` +
              `• ${machA.id} (${machA.name}): ${machA.status.toUpperCase()}, ${machA.health}% health, ${machA.failureTime} RUL, Temp ${machA.temperature}°C, Vib ${machA.vibration} mm/s, Current ${machA.current} A, Flank wear ${emA.flankWearMm.toFixed(3)} mm\n` +
              `• ${machB.id} (${machB.name}): ${machB.status.toUpperCase()}, ${machB.health}% health, ${machB.failureTime} RUL, Temp ${machB.temperature}°C, Vib ${machB.vibration} mm/s, Current ${machB.current} A, Flank wear ${emB.flankWearMm.toFixed(3)} mm\n\n` +
              `Verdict: ${machA.health < machB.health ? `${machA.id} is in worse condition (${machA.health}% vs ${machB.health}%). Recommend priority service on ${machA.id}.` : `${machB.id} is in worse condition (${machB.health}% vs ${machA.health}%). Recommend priority service on ${machB.id}.`}`,
            comparison: { machineA: machA, machineB: machB },
            actions: [
              {
                label: `Service ${machA.health < machB.health ? machA.id : machB.id}`,
                icon: "🔧",
                action: "service_reset",
                machineId: machA.health < machB.health ? machA.id : machB.id,
                variant: "warning",
              },
            ],
          };
        }
      }
    }

    // 2. Specific Machine Matched -> Check What Exact Question Was Asked
    const targetMachine = findTargetMachine(q);
    if (targetMachine) {
      const em = getEnriched(targetMachine);

      // 2A. Temperature Question
      if (
        q.includes("temp") ||
        q.includes("hot") ||
        q.includes("heat") && !q.includes("heat treatment") ||
        q.includes("warm") ||
        q.includes("celsius") ||
        q.includes("degree")
      ) {
        let comment = "Normal operating baseline (<65°C).";
        if (targetMachine.temperature > 80) {
          comment = "Critically high (limit: 65°C). Immediate cooling or line pause required.";
        } else if (targetMachine.temperature > 65) {
          comment = "Elevated above the 65°C advisory threshold due to spindle thermal friction.";
        }
        return {
          text: `${targetMachine.id} (${targetMachine.name}) temperature is ${targetMachine.temperature}°C. ${comment}`,
          actions: targetMachine.temperature > 65 ? [
            { label: `Tool Change ${targetMachine.id}`, icon: "🔧", action: "service_reset", machineId: targetMachine.id, variant: "warning" },
            { label: "View on Floor", icon: "👁", action: "view_floor", machineId: targetMachine.id, variant: "primary" },
          ] : undefined,
        };
      }

      // 2B. Vibration Question
      if (
        q.includes("vib") ||
        q.includes("shake") ||
        q.includes("imbalance") ||
        q.includes("bearing") ||
        q.includes("chatter")
      ) {
        let comment = "Within ISO 10816 nominal limits (<3.0 mm/s).";
        if (targetMachine.vibration > 4.5) {
          comment = "Critical vibration (limit: 3.0 mm/s). Severe mechanical unbalance or bearing race spalling.";
        } else if (targetMachine.vibration > 3.0) {
          comment = "Elevated vibration above the 3.0 mm/s advisory limit.";
        }
        return {
          text: `${targetMachine.id} (${targetMachine.name}) vibration is ${targetMachine.vibration} mm/s. ${comment}`,
          actions: targetMachine.vibration > 3.0 ? [
            { label: `Service Bearings & Tool`, icon: "🔧", action: "service_reset", machineId: targetMachine.id, variant: "danger" },
            { label: "View on Floor", icon: "👁", action: "view_floor", machineId: targetMachine.id, variant: "primary" },
          ] : undefined,
        };
      }

      // 2C. Current / Electrical Power Question
      if (
        q.includes("current") ||
        q.includes("amp") ||
        q.includes("load") ||
        q.includes("power") ||
        q.includes("electrical")
      ) {
        let comment = "Nominal electrical current draw (5.0 to 9.5 A).";
        if (targetMachine.current > 12.0) {
          comment = "Severe motor overload (safe threshold: <10.0 A). Motor is drawing excessive torque due to cutting tool friction.";
        } else if (targetMachine.current > 10.0) {
          comment = "Elevated electrical current above 10.0 A.";
        }
        return {
          text: `${targetMachine.id} (${targetMachine.name}) spindle motor current draw is ${targetMachine.current} A. ${comment}`,
          actions: targetMachine.current > 10.0 ? [
            { label: `Tool Change ${targetMachine.id}`, icon: "🔧", action: "service_reset", machineId: targetMachine.id, variant: "warning" },
          ] : undefined,
        };
      }

      // 2D. Flank Wear (VB) / Tool Wear Question
      if (
        q.includes("wear") ||
        q.includes("flank") ||
        q.includes("vb") ||
        q.includes("tool life") ||
        q.includes("insert")
      ) {
        let comment = "Tool wear is within the nominal steady-state envelope.";
        if (em.flankWearMm >= 0.45) {
          comment = "Critical Failure Stage. Exceeds the 0.450 mm NASA threshold. Cutting inserts must be replaced immediately.";
        } else if (em.flankWearMm >= 0.35) {
          comment = "Accelerated Wear Stage. Preventive replacement required within current shift.";
        }
        return {
          text: `${targetMachine.id} (${targetMachine.name}) tool flank wear is ${em.flankWearMm.toFixed(3)} mm VB (${em.wearStage}). ${comment}`,
          actions: [
            { label: `Tool Change & Reset Wear`, icon: "🔧", action: "service_reset", machineId: targetMachine.id, variant: em.flankWearMm >= 0.45 ? "danger" : "success" },
          ],
        };
      }

      // 2E. Speed / RPM Question
      if (q.includes("speed") || q.includes("rpm") || q.includes("velocity") || q.includes("rotation")) {
        return {
          text: `${targetMachine.id} (${targetMachine.name}) spindle speed is ${em.speed} RPM.`,
        };
      }

      // 2F. Runtime / Operating Hours Question
      if (q.includes("runtime") || q.includes("hour") || q.includes("operating time") || q.includes("how long has")) {
        return {
          text: `${targetMachine.id} (${targetMachine.name}) cumulative runtime is ${em.runtime} operating hours since last overhaul.`,
        };
      }

      // 2G. Location / Bay / Room / Position Question
      if (
        q.includes("where") ||
        q.includes("location") ||
        q.includes("bay") ||
        q.includes("room") ||
        q.includes("place") ||
        q.includes("position") ||
        q.includes("floor")
      ) {
        return {
          text: `${targetMachine.id} (${targetMachine.name}) is located in ${targetMachine.location} (Floor grid: x=${targetMachine.x}, y=${targetMachine.y}).`,
          actions: [
            { label: "View on Operational Floor", icon: "👁", action: "view_floor", machineId: targetMachine.id, variant: "primary" },
          ],
        };
      }

      // 2H. Department Question
      if (q.includes("department") || q.includes("dept") || q.includes("division") || q.includes("team")) {
        return {
          text: `${targetMachine.id} (${targetMachine.name}) is assigned to the ${em.department} department.`,
        };
      }

      // 2I. Installation Date Question
      if (q.includes("installed") || q.includes("install date") || (q.includes("when was") && q.includes("install"))) {
        return {
          text: `${targetMachine.id} (${targetMachine.name}) was installed on ${em.installedOn}.`,
        };
      }

      // 2J. Last Maintenance / Service Date Question
      if (q.includes("last maintenance") || q.includes("service date") || q.includes("serviced") || q.includes("last service")) {
        return {
          text: `${targetMachine.id} (${targetMachine.name}) last maintenance was completed on ${em.lastMaintenance}.`,
        };
      }

      // 2K. Dimensions / Size Question
      if (q.includes("dimension") || q.includes("size") || q.includes("width") || q.includes("height")) {
        return {
          text: `${targetMachine.id} (${targetMachine.name}) dimensions on the floor map are ${targetMachine.width || 135} x ${targetMachine.height || 92} px.`,
        };
      }

      // 2L. Remaining Useful Life / Breakdown Horizon Question
      if (
        q.includes("rul") ||
        q.includes("when will it fail") ||
        q.includes("breakdown") ||
        q.includes("lifespan") ||
        q.includes("fail") && (q.includes("when") || q.includes("time") || q.includes("how long"))
      ) {
        return {
          text: `${targetMachine.id} (${targetMachine.name}) estimated time to breakdown is within ${targetMachine.failureTime} under current cutting loads. Failure probability: ${targetMachine.failureProbability}%.`,
          actions: targetMachine.status !== "running" ? [
            { label: "Service Now", icon: "🔧", action: "service_reset", machineId: targetMachine.id, variant: "danger" },
            { label: "Create Work Order", icon: "📋", action: "work_order", machineId: targetMachine.id, variant: "warning" },
          ] : undefined,
        };
      }

      // 2M. Why is it failing / Root Cause / What is wrong
      if (
        q.includes("why") ||
        q.includes("cause") ||
        q.includes("diagnosis") ||
        q.includes("wrong") ||
        q.includes("issue") ||
        q.includes("problem") ||
        q.includes("fault") ||
        q.includes("reason")
      ) {
        return {
          text: `Cause of ${targetMachine.id} condition: ${targetMachine.diagnosis}. Current readings: Temp ${targetMachine.temperature}°C, Vibration ${targetMachine.vibration} mm/s, Current ${targetMachine.current} A, Tool flank wear ${em.flankWearMm.toFixed(3)} mm VB.`,
          actions: [
            { label: "Tool Change & Reset Wear", icon: "🔧", action: "service_reset", machineId: targetMachine.id, variant: "danger" },
            { label: "Create Work Order", icon: "📋", action: "work_order", machineId: targetMachine.id, variant: "warning" },
          ],
        };
      }

      // 2N. How to fix / Recommendation / What action to take
      if (
        q.includes("fix") ||
        q.includes("repair") ||
        q.includes("action") ||
        q.includes("recommend") ||
        q.includes("solution") ||
        q.includes("what should")
      ) {
        return {
          text: `Recommended action for ${targetMachine.id}: ${targetMachine.recommendation}. Click Tool Change & Reset below to complete the service.`,
          actions: [
            { label: "Tool Change & Reset Wear", icon: "🔧", action: "service_reset", machineId: targetMachine.id, variant: "success" },
            { label: "Create Work Order", icon: "📋", action: "work_order", machineId: targetMachine.id, variant: "warning" },
          ],
        };
      }

      // 2O. Health / Condition / Score Question
      if (q.includes("health") || q.includes("condition")) {
        return {
          text: `${targetMachine.id} (${targetMachine.name}) health score is ${targetMachine.health}% (${targetMachine.status.toUpperCase()}). Breakdown horizon: ${targetMachine.failureTime}. Root cause: ${targetMachine.diagnosis}.`,
          actions: targetMachine.status !== "running" ? [
            { label: `Tool Change ${targetMachine.id}`, icon: "🔧", action: "service_reset", machineId: targetMachine.id, variant: "warning" },
            { label: "View on Floor", icon: "👁", action: "view_floor", machineId: targetMachine.id, variant: "primary" },
          ] : undefined,
        };
      }

      // 2P. Is it Running / Operational Question
      if (q.includes("running") || q.includes("operational") || q.includes("working") || q.includes("ok") || q.includes("fine")) {
        const isRunning = targetMachine.status === "running";
        return {
          text: isRunning
            ? `Yes, ${targetMachine.id} (${targetMachine.name}) is running normally at ${targetMachine.health}% health.`
            : `No, ${targetMachine.id} (${targetMachine.name}) is in ${targetMachine.status.toUpperCase()} condition (${targetMachine.health}% health). Issue: ${targetMachine.diagnosis}.`,
          actions: !isRunning ? [
            { label: `Tool Change ${targetMachine.id}`, icon: "🔧", action: "service_reset", machineId: targetMachine.id, variant: "danger" },
            { label: "View on Floor", icon: "👁", action: "view_floor", machineId: targetMachine.id, variant: "primary" },
          ] : undefined,
        };
      }

      // 2Q. Tooling / Cutting Insert Question
      if (q.includes("tool") || q.includes("insert") || q.includes("cutter")) {
        return {
          text: `${targetMachine.id} (${targetMachine.name}) uses KC735M coated carbide milling inserts. Current tool flank wear is ${em.flankWearMm.toFixed(3)} mm VB (${em.wearStage}, failure limit: 0.450 mm).`,
          actions: [
            { label: "Tool Change & Reset Wear", icon: "🔧", action: "service_reset", machineId: targetMachine.id, variant: em.flankWearMm >= 0.45 ? "danger" : "success" },
          ],
        };
      }

      // 2R. Direct Service / Reset Query
      if (q.startsWith("service") || q.startsWith("reset") || q.startsWith("replace tool")) {
        return {
          text: `Ready to service ${targetMachine.id} (${targetMachine.name}). Click the button below to replace tool and reset health to 98%.`,
          actions: [
            { label: `Tool Change ${targetMachine.id}`, icon: "🔧", action: "service_reset", machineId: targetMachine.id, variant: "success" },
          ],
        };
      }

      // 2S. General Machine Status / Overview Question (e.g., "Tell me about M-09", "Status of M-02")
      const statusLabel = targetMachine.status.toUpperCase();
      return {
        text: `${targetMachine.id} — ${targetMachine.name} [${statusLabel}]\n` +
          `Location: ${targetMachine.location} | Department: ${em.department}\n` +
          `Health: ${targetMachine.health}% | Breakdown Horizon: ${targetMachine.failureTime} | Tool Flank Wear: ${em.flankWearMm.toFixed(3)} mm VB (${em.wearStage})\n` +
          `Sensors: Temp ${targetMachine.temperature}°C, Vibration ${targetMachine.vibration} mm/s, Current ${targetMachine.current} A, Speed ${em.speed} RPM\n` +
          `Root Cause: ${targetMachine.diagnosis}\n` +
          `Action: ${targetMachine.recommendation}`,
        card: {
          machineId: targetMachine.id,
          machineName: targetMachine.name,
          location: targetMachine.location,
          status: targetMachine.status,
          health: targetMachine.health,
          failureProbability: targetMachine.failureProbability,
          failureTime: targetMachine.failureTime,
          flankWearMm: em.flankWearMm,
          wearStage: em.wearStage,
          temp: targetMachine.temperature,
          vib: targetMachine.vibration,
          current: targetMachine.current,
          speed: em.speed,
          summary: `${targetMachine.id} is in ${statusLabel} status. Health: ${targetMachine.health}%.`,
          rootCause: targetMachine.diagnosis,
          recommendedAction: targetMachine.recommendation,
        },
        actions: [
          { label: "Tool Change & Reset Wear", icon: "🔧", action: "service_reset", machineId: targetMachine.id, variant: targetMachine.status === "critical" ? "danger" : "success" },
          { label: "Create Work Order", icon: "📋", action: "work_order", machineId: targetMachine.id, variant: "warning" },
          { label: "View on Floor", icon: "👁", action: "view_floor", machineId: targetMachine.id, variant: "primary" },
          { label: "Clone Twin", icon: "⎘", action: "clone_twin", machineId: targetMachine.id, variant: "secondary" },
        ],
      };
    }

    // 3. Fleet-Wide Specific Questions

    // 3A. Which machine has highest vibration?
    if (q.includes("highest vibration") || q.includes("most vibration") || q.includes("max vibration") || (q.includes("vibration") && q.includes("which"))) {
      const sorted = [...machines].sort((a, b) => b.vibration - a.vibration);
      const top = sorted[0];
      if (!top) return { text: "No machines present in the factory." };
      return {
        text: `${top.id} (${top.name}) has the highest vibration at ${top.vibration} mm/s (safe limit: 3.0 mm/s). Location: ${top.location}. Root cause: ${top.diagnosis}.`,
        actions: [
          { label: `Service ${top.id}`, icon: "🔧", action: "service_reset", machineId: top.id, variant: "danger" },
          { label: "View on Floor", icon: "👁", action: "view_floor", machineId: top.id, variant: "primary" },
        ],
      };
    }

    // 3A2. Which machine has lowest vibration?
    if (q.includes("lowest vibration") || q.includes("least vibration") || q.includes("min vibration")) {
      const sorted = [...machines].sort((a, b) => a.vibration - b.vibration);
      const lowest = sorted[0];
      if (!lowest) return { text: "No machines present in the factory." };
      return {
        text: `${lowest.id} (${lowest.name}) has the lowest vibration at ${lowest.vibration} mm/s. Location: ${lowest.location}.`,
      };
    }

    // 3B. Which machine has highest temperature / is hottest?
    if (q.includes("highest temp") || q.includes("hottest") || q.includes("max temp") || (q.includes("temperature") && q.includes("which"))) {
      const sorted = [...machines].sort((a, b) => b.temperature - a.temperature);
      const top = sorted[0];
      if (!top) return { text: "No machines present in the factory." };
      return {
        text: `${top.id} (${top.name}) has the highest temperature at ${top.temperature}°C (safe limit: 65°C). Location: ${top.location}.`,
        actions: [
          { label: `Service ${top.id}`, icon: "🔧", action: "service_reset", machineId: top.id, variant: "warning" },
          { label: "View on Floor", icon: "👁", action: "view_floor", machineId: top.id, variant: "primary" },
        ],
      };
    }

    // 3B2. Which machine has lowest temperature / coldest?
    if (q.includes("lowest temp") || q.includes("coldest") || q.includes("min temp")) {
      const sorted = [...machines].sort((a, b) => a.temperature - b.temperature);
      const lowest = sorted[0];
      if (!lowest) return { text: "No machines present in the factory." };
      return {
        text: `${lowest.id} (${lowest.name}) has the lowest temperature at ${lowest.temperature}°C. Location: ${lowest.location}.`,
      };
    }

    // 3C. Which machine has highest current / electrical draw?
    if (q.includes("highest current") || q.includes("most current") || q.includes("max current") || (q.includes("current") && q.includes("which"))) {
      const sorted = [...machines].sort((a, b) => b.current - a.current);
      const top = sorted[0];
      if (!top) return { text: "No machines present in the factory." };
      return {
        text: `${top.id} (${top.name}) has the highest current draw at ${top.current} A (normal: 5 to 9.5 A). Driven by tool cutting friction. Location: ${top.location}.`,
        actions: [
          { label: `Tool Change ${top.id}`, icon: "🔧", action: "service_reset", machineId: top.id, variant: "danger" },
        ],
      };
    }

    // 3C2. Which machine has lowest current / least electrical draw?
    if (q.includes("lowest current") || q.includes("least current") || q.includes("min current")) {
      const sorted = [...machines].sort((a, b) => a.current - b.current);
      const lowest = sorted[0];
      if (!lowest) return { text: "No machines present in the factory." };
      return {
        text: `${lowest.id} (${lowest.name}) has the lowest current draw at ${lowest.current} A. Location: ${lowest.location}.`,
      };
    }

    // 3C3. Which machine has highest tool wear?
    if (q.includes("highest wear") || q.includes("most wear") || q.includes("max wear") || (q.includes("wear") && q.includes("which"))) {
      const sorted = [...machines].map((m) => getEnriched(m)).sort((a, b) => b.flankWearMm - a.flankWearMm);
      const top = sorted[0];
      if (!top) return { text: "No machines present in the factory." };
      return {
        text: `${top.id} (${top.name}) has the highest tool wear at ${top.flankWearMm.toFixed(3)} mm VB (${top.wearStage}). Failure threshold is 0.450 mm VB. Location: ${top.location}.`,
        actions: [
          { label: `Tool Change ${top.id}`, icon: "🔧", action: "service_reset", machineId: top.id, variant: "danger" },
        ],
      };
    }

    // 3D. Which machine will fail first? / Lowest RUL
    if (
      q.includes("fail first") ||
      q.includes("first to break") ||
      q.includes("break first") ||
      q.includes("shortest life")
    ) {
      const sorted = [...machines].sort((a, b) => a.health - b.health);
      const worst = sorted[0];
      if (!worst) return { text: "No machines present in the factory." };
      return {
        text: `${worst.id} (${worst.name}) will fail first. Breakdown predicted within ${worst.failureTime} (${worst.health}% health). Issue: ${worst.diagnosis}.`,
        actions: [
          { label: `Service ${worst.id} Now`, icon: "🔧", action: "service_reset", machineId: worst.id, variant: "danger" },
          { label: "Create Work Order", icon: "📋", action: "work_order", machineId: worst.id, variant: "warning" },
          { label: "View on Floor", icon: "👁", action: "view_floor", machineId: worst.id, variant: "primary" },
        ],
      };
    }

    // 3E. Which machine is worst / lowest health?
    if (q.includes("worst") || q.includes("lowest health") || q.includes("most critical")) {
      const sorted = [...machines].sort((a, b) => a.health - b.health);
      const worst = sorted[0];
      if (!worst) return { text: "No machines present in the factory." };
      return {
        text: `${worst.id} (${worst.name}) is in the worst condition with ${worst.health}% health (${worst.status.toUpperCase()}). Location: ${worst.location}. Breakdown horizon: ${worst.failureTime}.`,
        actions: [
          { label: `Service ${worst.id}`, icon: "🔧", action: "service_reset", machineId: worst.id, variant: "danger" },
          { label: "View on Floor", icon: "👁", action: "view_floor", machineId: worst.id, variant: "primary" },
        ],
      };
    }

    // 3F. Which machine is best / highest health?
    if (q.includes("best") || q.includes("highest health") || q.includes("healthiest")) {
      const sorted = [...machines].sort((a, b) => b.health - a.health);
      const best = sorted[0];
      if (!best) return { text: "No machines present in the factory." };
      return {
        text: `${best.id} (${best.name}) has the highest health at ${best.health}% (${best.status.toUpperCase()}). Operating nominally at ${best.temperature}°C, ${best.vibration} mm/s vibration. Location: ${best.location}.`,
      };
    }

    // 3G. How many machines? (Counts / Status Breakdown)
    if (
      q.includes("how many") ||
      q.includes("machine count") ||
      q.includes("total machines") ||
      q.includes("number of machines")
    ) {
      if (q.includes("critical")) {
        const crits = machines.filter((m) => m.status === "critical");
        return {
          text: `There are ${crits.length} critical machines: ${crits.map((m) => m.id).join(", ")}.`,
          actions: crits.length > 0 ? [
            { label: `Service All ${crits.length} Units`, icon: "🔧", action: "service_all_critical", variant: "danger" },
          ] : undefined,
        };
      }
      if (q.includes("warning")) {
        const warns = machines.filter((m) => m.status === "warning");
        return {
          text: `There are ${warns.length} machines in warning status${warns.length > 0 ? `: ${warns.map((m) => m.id).join(", ")}` : "."}`,
        };
      }
      if (q.includes("healthy") || q.includes("running")) {
        const healthy = machines.filter((m) => m.status === "running");
        return {
          text: `There are ${healthy.length} machines running nominally${healthy.length > 0 ? `: ${healthy.map((m) => m.id).join(", ")}` : "."}`,
        };
      }
      return {
        text: `Factory has ${machines.length} monitored machines total: ${healthyCount} Running, ${warningCount} Warning, and ${criticalCount} Critical. Average fleet health is ${avgHealth}%.`,
      };
    }

    // 3H. List all machines / equipment
    if (
      q.includes("all machines") ||
      q.includes("list machines") ||
      q.includes("all equipment") ||
      q.includes("show machines") ||
      q.includes("inventory") ||
      q.includes("list all")
    ) {
      const lines = machines.map((m) => {
        const icon = m.status === "critical" ? "🔴" : m.status === "warning" ? "🟡" : "🟢";
        return `${icon} ${m.id} — ${m.name} (${m.location}): ${m.status.toUpperCase()}, ${m.health}% health, ${m.failureTime} RUL, Temp ${m.temperature}°C, Vib ${m.vibration} mm/s`;
      });
      return {
        text: `Factory equipment list (${machines.length} total units):\n\n${lines.join("\n")}`,
        fleetList: machines,
        chips: ["Critical Machines", "Which machine will fail first?", "NASA Model Specs"],
      };
    }

    // 3I. Show Critical Machines
    if (q.includes("critical") || q.includes("urgent") || q.includes("failing")) {
      const crits = machines.filter((m) => m.status === "critical");
      if (crits.length === 0) {
        return { text: "Zero critical machines currently in the factory. All units operating safely." };
      }
      const lines = crits.map((m) => {
        return `• ${m.id} (${m.name}) — ${m.location}: ${m.health}% health, breakdown in ${m.failureTime}. Issue: ${m.diagnosis}`;
      });
      return {
        text: `${crits.length} machines require immediate service:\n\n${lines.join("\n")}`,
        actions: [
          { label: `Service All ${crits.length} Critical Units`, icon: "🔧", action: "service_all_critical", variant: "danger" },
          { label: `View ${crits[0]?.id} on Floor`, icon: "👁", action: "view_floor", machineId: crits[0]?.id, variant: "primary" },
        ],
      };
    }

    // 3J. Show Healthy Machines
    if (q.includes("healthy") || q.includes("running") || q.includes("optimal") || q.includes("green")) {
      const healthy = machines.filter((m) => m.status === "running");
      const lines = healthy.map((m) => `• ${m.id} (${m.name}) — ${m.location}: ${m.health}% health, Temp ${m.temperature}°C, Vib ${m.vibration} mm/s`);
      return {
        text: `${healthy.length} machines running nominally:\n\n${lines.join("\n")}`,
      };
    }

    // 3K. Service All Critical Query
    if (q.includes("service all") || q.includes("fix all") || q.includes("repair all") || q.includes("reset all")) {
      const crits = machines.filter((m) => m.status === "critical");
      if (crits.length === 0) {
        return { text: "No critical machines need servicing right now. All units are running normally." };
      }
      return {
        text: `Found ${crits.length} critical machines: ${crits.map((m) => m.id).join(", ")}. Click below to service all units at once.`,
        actions: [
          { label: `Service All ${crits.length} Critical Units`, icon: "🔧", action: "service_all_critical", variant: "danger" },
        ],
      };
    }

    // 3L. What are the safe limits / thresholds?
    if (q.includes("safe limit") || q.includes("threshold") || q.includes("limits")) {
      return {
        text: `FactoryOS Safe Operating Thresholds:\n\n` +
          `• Temperature: Safe < 65°C | Advisory 65-80°C | Critical > 80°C\n` +
          `• Vibration: Safe < 3.0 mm/s | Advisory 3.0-4.5 mm/s | Critical > 4.5 mm/s (ISO 10816)\n` +
          `• Motor Current: Safe 5.0-9.5 A | Advisory 9.5-12.0 A | Critical > 12.0 A\n` +
          `• Tool Flank Wear: Initial < 0.15 mm | Steady 0.15-0.35 mm | Accelerated 0.35-0.45 mm | Failure >= 0.450 mm VB`,
      };
    }

    // 3M. NASA Prediction Model & Dataset Specs
    if (
      q.includes("model") ||
      q.includes("dataset") ||
      q.includes("train") ||
      q.includes("nasa") ||
      q.includes("how it works") ||
      q.includes("feature importance") ||
      q.includes("accuracy")
    ) {
      const specs = getModelDatasetSpecs();
      return {
        text: `Prediction Model Specifications:\n\n` +
          `Ensemble: Random Forest + Gradient Boosting Regressor\n` +
          `Accuracy: R² = ${specs.r2Health}, MAE = ${specs.maeHealth}%\n` +
          `Tool Wear Model: Flank Wear VB Regressor (R² = ${specs.r2FlankWearVB}, MAE = ${specs.maeFlankWearVB} mm)\n` +
          `Critical Limit: VB >= 0.450 mm threshold\n\n` +
          `NASA MC-510V Top Feature Importances:\n` +
          `1. Spindle Motor DC Current: 59.1% (cutting friction torque)\n` +
          `2. Spindle Vibration RMS: 8.9% (bearing degradation & chatter)\n` +
          `3. Acoustic Emission Spindle: 6.2% (micro-chipping & shear)\n` +
          `4. AC-to-DC Current Ratio: 4.9% (torque ripple)\n` +
          `5. Table Vibration RMS: 4.2% (workpiece deflection)\n` +
          `6. Temperature Gradient: 3.8% (frictional heating)`,
        modelSpecs: true,
      };
    }

    // 3N. What-If Scenario Simulation
    if (q.includes("what if") || q.includes("scenario") || q.includes("simulate")) {
      const target = machines.find((m) => m.status !== "running") || machines[0];
      if (target) {
        const whatIf = predictWhatIfScenario(
          {
            temperature: target.temperature,
            vibration: target.vibration,
            current: target.current,
            speed: target.speed,
            runtime: target.runtime,
          },
          {
            temperature: Math.max(45, target.temperature - 15),
            current: Math.max(6.0, target.current - 4.0),
            vibration: Math.max(1.8, target.vibration - 1.5),
          }
        );

        return {
          text: `NASA What-If Simulation for ${target.id} (${target.name}):\n\n` +
            `Scenario: Coolant flow restored (-15°C) and cutting load reduced (-4.0 A, -1.5 mm/s vib)\n` +
            `• Baseline Health: ${whatIf.before.healthScore}% (VB: ${whatIf.before.predictedFlankWearMm} mm, RUL: ${whatIf.before.remainingUsefulLifeDays})\n` +
            `• Simulated Health: ${whatIf.after.healthScore}% (VB: ${whatIf.after.predictedFlankWearMm} mm, RUL: ${whatIf.after.remainingUsefulLifeDays})\n` +
            `• Net Improvement: +${whatIf.deltaHealth}% Health (+${whatIf.deltaRULHours} hours RUL)\n\n` +
            `Verdict: ${whatIf.summary}`,
          actions: [
            { label: `Tool Change ${target.id}`, icon: "🔧", action: "service_reset", machineId: target.id, variant: "success" },
          ],
        };
      }
    }

    // 3O. Overall Plant Health / Summary
    if (q.includes("plant") || q.includes("factory") || q.includes("summary") || q.includes("overview") || q.includes("health")) {
      return {
        text: `Factory Operational Summary (${activePresetName}):\n\n` +
          `• Average Fleet Health: ${avgHealth}%\n` +
          `• Total Machines: ${machines.length} (${healthyCount} Running, ${warningCount} Warning, ${criticalCount} Critical)\n` +
          `• Active Alerts: ${alerts.length}\n` +
          `• Condition: ${avgHealth >= 70 ? "Stable operation" : "Degraded. Tool replacements required on critical units to avoid stoppage."}`,
        actions: criticalCount > 0 ? [
          { label: `Service All ${criticalCount} Critical Units`, icon: "🔧", action: "service_all_critical", variant: "danger" },
        ] : undefined,
      };
    }

    // 4. Fallback: Concise, Straight to the Point
    return {
      text: `I have details on all ${machines.length} machines in the factory. Ask any direct question such as:\n\n` +
        `• What is the temperature of M-02?\n` +
        `• Why is M-09 failing?\n` +
        `• Where is M-11 located?\n` +
        `• Which machine has highest vibration?\n` +
        `• List all machines`,
      chips: [
        "Critical Machines",
        "List All Machines",
        "Which machine will fail first?",
        "Highest vibration machine",
        "NASA Model Specs",
      ],
    };
  };

  const handleSendMessage = (textToSend?: string) => {
    const raw = (textToSend || inputQuery).trim();
    if (!raw) return;

    // Clean user message
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: sanitizeText(raw),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");

    setTimeout(() => {
      const aiReply = generateAIResponse(raw);
      const cleanReplyText = sanitizeText(aiReply.text || "");

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: cleanReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        chips: aiReply.chips,
        actions: aiReply.actions,
        card: aiReply.card,
        comparison: aiReply.comparison,
        modelSpecs: aiReply.modelSpecs,
        fleetList: aiReply.fleetList,
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 200);
  };

  const handleConfirmWorkOrder = () => {
    if (selectedWorkOrderMachine) {
      showToast(`Work order dispatched for ${selectedWorkOrderMachine.id}`);
      setSelectedWorkOrderMachine(null);
    }
  };

  return (
    <div className="ai-assistant-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="ai-toast-banner">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Stats Banner */}
      <div className="ai-assistant-header">
        <div className="ai-title-group">
          <div className="ai-avatar-icon">🤖</div>
          <div>
            <h2>Industrial AI Diagnostic Assistant</h2>
            <span>Direct answers, NASA ML model wear prediction & automated repairs for all factory equipment</span>
          </div>
        </div>

        <div className="ai-stats-row">
          {onNavigate && (
            <button
              type="button"
              className="suggestion-chip btn-back-dashboard"
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
            <strong style={{ color: avgHealth >= 70 ? "#00ffc4" : avgHealth >= 45 ? "#ffb84d" : "#ff4d4f" }}>
              {avgHealth}%
            </strong>
          </div>
        </div>
      </div>

      {/* Main Grid: Chat on Left, Real-time Anomaly Feed on Right */}
      <div className="ai-assistant-grid">
        {/* Left: Chat Copilot */}
        <div className="ai-card chat-container">
          <div className="ai-card-header">
            <h3>
              <span>💬 Factory Floor Diagnostic Copilot</span>
              <span className="ai-header-sub">({machines.length} Machines Loaded)</span>
            </h3>
            <span className="ai-card-badge">NASA MC-510V Trained • {timeMultiplier > 0 ? `${timeMultiplier}x Sim` : "Sim Paused"} • R² = 0.841</span>
          </div>

          <div className="chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message ${msg.sender}`}>
                <div className="chat-msg-avatar">
                  {msg.sender === "assistant" ? "🤖" : "👤"}
                </div>
                <div className="chat-bubble">
                  {/* Clean Formatted Text without any markdown asterisks */}
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

                  {/* Clean Diagnostic Card if attached */}
                  {msg.card && (
                    <div className="ai-diagnostic-embed">
                      <div className="embed-header">
                        <strong>{msg.card.machineId} — {msg.card.machineName}</strong>
                        <span className={`embed-badge ${msg.card.status}`}>
                          {msg.card.status.toUpperCase()} ({msg.card.health}%)
                        </span>
                      </div>
                      <div className="embed-telemetry-row">
                        <div className="embed-stat">
                          <span>Tool VB Wear</span>
                          <strong className={msg.card.flankWearMm >= 0.45 ? "text-danger" : "text-safe"}>
                            {msg.card.flankWearMm.toFixed(3)} mm
                          </strong>
                        </div>
                        <div className="embed-stat">
                          <span>Breakdown In</span>
                          <strong>{msg.card.failureTime}</strong>
                        </div>
                        <div className="embed-stat">
                          <span>Temperature</span>
                          <strong className={msg.card.temp > 65 ? "text-warn" : "text-safe"}>
                            {msg.card.temp}°C
                          </strong>
                        </div>
                        <div className="embed-stat">
                          <span>Vibration</span>
                          <strong className={msg.card.vib > 3.0 ? "text-warn" : "text-safe"}>
                            {msg.card.vib} mm/s
                          </strong>
                        </div>
                        <div className="embed-stat">
                          <span>Motor Current</span>
                          <strong>{msg.card.current} A</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Interactive Action Buttons */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="ai-actions-row">
                      {msg.actions.map((act, actIdx) => (
                        <button
                          key={actIdx}
                          type="button"
                          className={`btn-ai-action btn-ai-${act.variant || "primary"}`}
                          onClick={() => handleExecuteAction(act)}
                        >
                          {act.icon && <span className="btn-ai-icon">{act.icon}</span>}
                          <span>{act.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Quick Suggestion Chips */}
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

          {/* Persistent Quick Action Bar */}
          <div className="chat-suggestions">
            <button
              className="suggestion-chip"
              type="button"
              onClick={() => handleSendMessage("Show critical machines")}
            >
              🚨 Critical Machines
            </button>
            <button
              className="suggestion-chip"
              type="button"
              onClick={() => handleSendMessage("Which machine will fail first?")}
            >
              ⏳ Failure Forecast
            </button>
            <button
              className="suggestion-chip"
              type="button"
              onClick={() => handleSendMessage("List all machines")}
            >
              📋 All Equipment ({machines.length})
            </button>
            <button
              className="suggestion-chip"
              type="button"
              onClick={() => handleSendMessage("Which machine has highest vibration?")}
            >
              📈 Highest Vibration
            </button>
            <button
              className="suggestion-chip"
              type="button"
              onClick={() => handleSendMessage("Explain NASA prediction model dataset")}
            >
              🧪 NASA Model Specs
            </button>
            <button
              className="suggestion-chip"
              type="button"
              onClick={() => handleSendMessage("What are the safe limits?")}
            >
              📏 Safe Limits
            </button>
          </div>

          {/* Chat Input Bar */}
          <div className="chat-input-bar">
            <input
              type="text"
              className="chat-input"
              placeholder="Ask anything: 'What is temp of M-02?', 'Why is M-09 failing?', 'Where is M-11?'..."
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
            <h3>
              <span>⚠️ Active Equipment Watchlist</span>
              <span className="ai-header-sub">({criticalCount + warningCount} Flagged)</span>
            </h3>
            <span className="ai-card-badge">Live Telemetry</span>
          </div>

          <div className="right-panel-scroll">
            {machines
              .filter((m) => m.status !== "running")
              .sort((a, b) => a.health - b.health)
              .map((machine) => (
                <div
                  key={machine.id}
                  className={`anomaly-card ${machine.status}`}
                >
                  <div className="anomaly-header">
                    <span className="anomaly-machine-name">
                      <strong>{machine.id}</strong> — {machine.name}
                    </span>
                    <span className={`anomaly-badge ${machine.status}`}>
                      {machine.status.toUpperCase()} ({machine.health}%)
                    </span>
                  </div>

                  <div className="anomaly-location-tag">
                    <span>📍 {machine.location}</span>
                    <span>⏳ RUL: <strong>{machine.failureTime}</strong></span>
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
                    <div className="anomaly-sensor-item">
                      <span>Tool VB</span>
                      <strong className={(machine.flankWearMm ?? 0.08) >= 0.45 ? "text-danger" : "text-safe"}>
                        {(machine.flankWearMm ?? 0.08).toFixed(3)} mm
                      </strong>
                    </div>
                  </div>

                  <div className="anomaly-actions">
                    <button
                      className="btn-diagnose-sm"
                      type="button"
                      onClick={() => handleSendMessage(`What is wrong with ${machine.id}?`)}
                    >
                      🔍 Ask AI
                    </button>
                    <button
                      className="btn-reset-sm"
                      type="button"
                      onClick={() => handleExecuteAction({
                        label: "Tool Change",
                        action: "service_reset",
                        machineId: machine.id,
                      })}
                      title="Replace cutting tool and reset wear to 98% health"
                    >
                      🔧 Reset Wear
                    </button>
                    <button
                      className="btn-wo-sm"
                      type="button"
                      onClick={() => setSelectedWorkOrderMachine(machine)}
                    >
                      + Work Order
                    </button>
                  </div>
                </div>
              ))}

            {machines.filter((m) => m.status !== "running").length === 0 && (
              <div className="ai-empty-watchlist">
                <span className="empty-check">✓</span>
                <strong>Zero Active Machine Faults</strong>
                <p>All {machines.length} machines are operating with nominal vibration, temperature, and electrical current.</p>
              </div>
            )}
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
