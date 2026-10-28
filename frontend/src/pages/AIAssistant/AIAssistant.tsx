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

  // Chat State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      sender: "assistant",
      text: `👋 **Factory AI Diagnostic Copilot Active**\n\nI monitor all **${machines.length} added machines** across all rooms and bays. Powered by the **NASA MC-510V Milling & AI4I Multimodal Dataset** ($R^2 = 0.841$), I provide real-time root causes, wear forecasting, and instant 1-click machine repairs.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      chips: [
        "🚨 Critical Machines",
        "📋 List All Equipment",
        "⚖️ Compare M-05 & M-07",
        "⏳ Which machine fails first?",
        "🧪 NASA Model Specs",
        "🔧 Service All Critical",
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

  // Helper to handle interactive actions right from chat
  const handleExecuteAction = (btn: ActionButton) => {
    if (btn.action === "service_reset" && btn.machineId) {
      onResetMaintenance?.(btn.machineId);
      showToast(`Tool change & maintenance reset completed for ${btn.machineId}!`);

      const replyMsg: Message = {
        id: Date.now().toString(),
        sender: "assistant",
        text: `✅ **Tool Replacement & Overhaul Successful: ${btn.machineId}**\n\n• **Health Restored:** 98% (Nominal)\n• **Flank Wear (VB):** Reset to 0.080 mm\n• **Status:** RUNNING 🟢\n• Telemetry has normalized to baseline.`,
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
      showToast(`Batch overhaul completed for ${crits.length} critical machines!`);

      const replyMsg: Message = {
        id: Date.now().toString(),
        sender: "assistant",
        text: `🛠️ **Batch Maintenance Overhaul Complete**\n\nServiced **${crits.length} critical machines** (${crits.map((m) => m.id).join(", ")}).\nAll tools replaced and health restored to 98%.`,
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
      showToast(`Digital Twin cloned for ${btn.machineId}!`);
      const replyMsg: Message = {
        id: Date.now().toString(),
        sender: "assistant",
        text: `⎘ **Digital Twin Cloned for ${btn.machineId}**\n\nA stress-test duplicate has been added to test cutting feeds, spindle speeds, and tool wear scenarios in parallel.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, replyMsg]);
    } else if (btn.action === "pause_sim") {
      onSetTimeMultiplier?.(0);
      showToast("Simulation paused");
    } else if (btn.action === "speed_sim" && btn.speed !== undefined) {
      onSetTimeMultiplier?.(btn.speed);
      showToast(`Simulation set to ${btn.speed}x acceleration`);
    }
  };

  // AI Diagnostic Reasoning Engine
  const generateAIResponse = (query: string): Partial<Message> => {
    const q = query.toLowerCase().trim();

    // 1. Service All Critical Query
    if (q.includes("service all") || q.includes("fix all") || q.includes("repair all") || q.includes("reset all")) {
      const crits = machines.filter((m) => m.status === "critical");
      if (crits.length === 0) {
        return {
          text: "✅ No critical machines need servicing right now. All units are running within normal parameters.",
        };
      }
      return {
        text: `⚠️ Found **${crits.length} critical machines** requiring immediate tool replacement: ${crits.map((m) => m.id).join(", ")}.\n\nClick below to service all units at once or inspect individual equipment.`,
        actions: [
          {
            label: `Service All ${crits.length} Critical Units`,
            icon: "🔧",
            action: "service_all_critical",
            variant: "danger",
          },
        ],
      };
    }

    // 2. NASA Prediction Model & Dataset Query
    if (
      q.includes("model") ||
      q.includes("dataset") ||
      q.includes("train") ||
      q.includes("nasa") ||
      q.includes("algorithm") ||
      q.includes("how it works") ||
      q.includes("feature importance") ||
      q.includes("accuracy")
    ) {
      const specs = getModelDatasetSpecs();
      return {
        text: `🧠 **Prediction Model Architecture & NASA Training Dataset**\n\n` +
          `• **Ensemble Model:** Random Forest (500 trees) + Gradient Boosting ($R^2 = ${specs.r2Health}$, MAE = ${specs.maeHealth}%)\n` +
          `• **Flank Wear Model:** Random Forest Tool Wear Regressor ($R^2 = ${specs.r2FlankWearVB}$, MAE = ${specs.maeFlankWearVB} mm)\n` +
          `• **Critical Failure Threshold:** $VB \\ge 0.450\\text{ mm}$ (flank wear limit before micro-cracking & catastrophic breakage)\n\n` +
          `📊 **NASA MC-510V Key Feature Importances:**\n` +
          `1. **Spindle Motor DC Current (59.1%):** Primary measure of cutting friction torque\n` +
          `2. **Spindle Vibration RMS (8.9%):** High-frequency chatter & bearing degradation\n` +
          `3. **Acoustic Emission Spindle (6.2%):** Micro-chipping and grain boundary shear\n` +
          `4. **AC-to-DC Current Ratio (4.9%):** Motor slip & torque ripple\n` +
          `5. **Process Temperature Delta (3.8%):** Thermal expansion and lubricant starvation\n\n` +
          `*All ${machines.length} added machines are evaluated in real time against this continuous model.*`,
        modelSpecs: true,
        chips: ["🚨 Show Critical Machines", "⏳ Which machine fails first?", "📋 List All Equipment"],
      };
    }

    // 3. Which machine will fail first? / Risk Ranking
    if (
      q.includes("fail first") ||
      q.includes("worst") ||
      q.includes("first to break") ||
      q.includes("breakdown order") ||
      q.includes("ranking")
    ) {
      const sorted = [...machines].sort((a, b) => {
        if (a.status === "critical" && b.status !== "critical") return -1;
        if (b.status === "critical" && a.status !== "critical") return 1;
        return a.health - b.health;
      });

      const worst = sorted[0];
      if (!worst) {
        return { text: "No machines currently added to the factory." };
      }

      return {
        text: `⏳ **Urgent Breakdown Forecast: ${worst.id} (${worst.name})**\n\n` +
          `• **Estimated Breakdown:** Within **${worst.failureTime}**\n` +
          `• **Current Health:** **${worst.health}%** [${worst.status.toUpperCase()}]\n` +
          `• **Location:** ${worst.location}\n` +
          `• **Primary Cause:** ${worst.diagnosis}\n\n` +
          `**Top 3 At-Risk Equipment:**\n` +
          sorted.slice(0, 3).map((m, i) => `${i + 1}. **${m.id}** — ${m.health}% Health (${m.failureTime} RUL)`).join("\n"),
        actions: [
          {
            label: `Service ${worst.id} Now`,
            icon: "🔧",
            action: "service_reset",
            machineId: worst.id,
            variant: "danger",
          },
          {
            label: `Create Work Order`,
            icon: "📋",
            action: "work_order",
            machineId: worst.id,
            variant: "warning",
          },
          {
            label: `View on Floor`,
            icon: "👁",
            action: "view_floor",
            machineId: worst.id,
            variant: "primary",
          },
        ],
      };
    }

    // 4. Comparison Query (e.g. "compare M-05 and M-07")
    const machineIdMatches = q.match(/m-?\d+/g) || [];
    if ((q.includes("compare") || q.includes("vs")) && machineIdMatches.length >= 2) {
      const matchA = machineIdMatches[0];
      const matchB = machineIdMatches[1];
      if (matchA && matchB) {
        const cleanA = matchA.replace("-", "").toUpperCase();
        const cleanB = matchB.replace("-", "").toUpperCase();
        const machA = machines.find((m) => m.id.replace("-", "").toUpperCase() === cleanA);
        const machB = machines.find((m) => m.id.replace("-", "").toUpperCase() === cleanB);

        if (machA && machB) {
          return {
            text: `⚖️ **Comparative Telemetry Analysis: ${machA.id} vs ${machB.id}**\n\n` +
              `• **${machA.id} (${machA.name}):** ${machA.health}% Health [${machA.status.toUpperCase()}] • Temp: ${machA.temperature}°C • Vib: ${machA.vibration} mm/s • Current: ${machA.current}A • RUL: ${machA.failureTime}\n` +
              `• **${machB.id} (${machB.name}):** ${machB.health}% Health [${machB.status.toUpperCase()}] • Temp: ${machB.temperature}°C • Vib: ${machB.vibration} mm/s • Current: ${machB.current}A • RUL: ${machB.failureTime}\n\n` +
              `💡 **Verdict:** ${machA.health < machB.health ? `${machA.id} is in worse condition (${machA.health}% vs ${machB.health}%). Recommend priority servicing on ${machA.id}.` : `${machB.id} is in worse condition (${machB.health}% vs ${machA.health}%). Recommend priority servicing on ${machB.id}.`}`,
            comparison: {
              machineA: machA,
              machineB: machB,
            },
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

    // 5. List All Added Machines Query
    if (
      q.includes("all machines") ||
      q.includes("list machines") ||
      q.includes("inventory") ||
      q.includes("all equipment") ||
      q.includes("show machines") ||
      q.includes("all added")
    ) {
      return {
        text: `📋 **All Monitored Equipment in FactoryOS (${machines.length} Total Units)**\n\n` +
          machines.map((m) => {
            const icon = m.status === "critical" ? "🔴" : m.status === "warning" ? "🟡" : "🟢";
            return `${icon} **${m.id}** — *${m.name}* (${m.location})\n   Health: **${m.health}%** | RUL: **${m.failureTime}** | Temp: **${m.temperature}°C**`;
          }).join("\n\n"),
        fleetList: machines,
        chips: ["🚨 Show Critical Machines", "⏳ Which machine fails first?", "🧪 NASA Model Specs"],
      };
    }

    // 6. Specific Machine Lookup (e.g. M-01, M-02, M-05, M-07, M-09, M-11, etc.)
    const matchedMachine = machines.find((m) => {
      const cleanId = m.id.toLowerCase();
      const cleanCompactId = m.id.replace("-", "").toLowerCase();
      const cleanName = m.name.toLowerCase();
      return (
        q.includes(cleanId) ||
        q.includes(cleanCompactId) ||
        q.includes(cleanName) ||
        (q.includes("heat") && cleanName.includes("heat")) ||
        (q.includes("packag") && cleanName.includes("packag")) ||
        (q.includes("laser") && cleanName.includes("laser")) ||
        (q.includes("lathe") && cleanName.includes("lathe")) ||
        (q.includes("welding") && cleanName.includes("weld")) ||
        (q.includes("grinding") && cleanName.includes("grind")) ||
        (q.includes("press") && cleanName.includes("press"))
      );
    });

    if (matchedMachine) {
      // Evaluate ML prediction using NASA MC-510V model
      const aiPred = predictMachineHealthScore({
        name: matchedMachine.name,
        temperature: matchedMachine.temperature,
        vibration: matchedMachine.vibration,
        current: matchedMachine.current,
        speed: matchedMachine.speed,
        runtime: matchedMachine.runtime,
      });

      const isCrit = matchedMachine.status === "critical";
      const isWarn = matchedMachine.status === "warning";
      const statusPill = isCrit ? "🔴 CRITICAL" : isWarn ? "🟡 WARNING" : "🟢 OPTIMAL";

      // Plain-English simple summary
      let plainSummary = "";
      if (isCrit) {
        plainSummary = `Machine **${matchedMachine.id}** is in critical condition. Spindle current (${matchedMachine.current}A) and vibration (${matchedMachine.vibration} mm/s) are excessively high, indicating severe tool wear (VB = ${aiPred.predictedFlankWearMm} mm).`;
      } else if (isWarn) {
        plainSummary = `Machine **${matchedMachine.id}** is showing early warning signs. Temperature (${matchedMachine.temperature}°C) or vibration (${matchedMachine.vibration} mm/s) are elevated above standard baseline.`;
      } else {
        plainSummary = `Machine **${matchedMachine.id}** is operating nominally at **${matchedMachine.health}% Health** with all telemetry within optimal NASA safety envelopes.`;
      }

      return {
        text: `${statusPill} **Diagnostic Summary for ${matchedMachine.id} — ${matchedMachine.name}**\n\n` +
          `${plainSummary}\n\n` +
          `**Key Telemetry:**\n` +
          `• **Health:** ${matchedMachine.health}% (ML Predicted: ${aiPred.healthScore}%)\n` +
          `• **Tool Flank Wear (VB):** **${aiPred.predictedFlankWearMm} mm** (${aiPred.wearStage})\n` +
          `• **Remaining Useful Life (RUL):** **${matchedMachine.failureTime}**\n` +
          `• **Sensors:** Temp: ${matchedMachine.temperature}°C • Vib: ${matchedMachine.vibration} mm/s • Current: ${matchedMachine.current}A\n` +
          `• **Location:** ${matchedMachine.location}\n\n` +
          `**Root Cause:**\n` +
          `${matchedMachine.diagnosis}\n\n` +
          `**Recommended Action:**\n` +
          `${matchedMachine.recommendation}`,
        card: {
          machineId: matchedMachine.id,
          machineName: matchedMachine.name,
          location: matchedMachine.location,
          status: matchedMachine.status,
          health: matchedMachine.health,
          failureProbability: matchedMachine.failureProbability,
          failureTime: matchedMachine.failureTime,
          flankWearMm: aiPred.predictedFlankWearMm,
          wearStage: aiPred.wearStage,
          temp: matchedMachine.temperature,
          vib: matchedMachine.vibration,
          current: matchedMachine.current,
          speed: matchedMachine.speed,
          summary: plainSummary,
          rootCause: matchedMachine.diagnosis,
          recommendedAction: matchedMachine.recommendation,
        },
        actions: [
          {
            label: "Tool Change & Reset Wear",
            icon: "🔧",
            action: "service_reset",
            machineId: matchedMachine.id,
            variant: isCrit ? "danger" : "success",
          },
          {
            label: "Create Work Order",
            icon: "📋",
            action: "work_order",
            machineId: matchedMachine.id,
            variant: "warning",
          },
          {
            label: "View on Floor",
            icon: "👁",
            action: "view_floor",
            machineId: matchedMachine.id,
            variant: "primary",
          },
          {
            label: "Clone Digital Twin",
            icon: "⎘",
            action: "clone_twin",
            machineId: matchedMachine.id,
            variant: "secondary",
          },
        ],
      };
    }

    // 7. Critical Machines Query
    if (q.includes("critical") || q.includes("urgent") || q.includes("failing") || q.includes("broken")) {
      const crits = machines.filter((m) => m.status === "critical");
      if (crits.length === 0) {
        return {
          text: "✅ **All Clear:** There are **0 critical machines** right now. Every unit in the plant is operating within safe baseline limits.",
          chips: ["📋 List All Equipment", "📡 Sensor Scan", "🏭 Overall Plant Health"],
        };
      }

      return {
        text: `🔴 **${crits.length} Machines Require Immediate Maintenance**\n\n` +
          crits.map((m) => (
            `• **${m.id} (${m.name})** — *${m.location}*\n` +
            `  Health: **${m.health}%** | Breakdown in: **${m.failureTime}**\n` +
            `  Issue: ${m.diagnosis}\n` +
            `  Action: ${m.recommendation}`
          )).join("\n\n"),
        actions: crits[0] ? [
          {
            label: `Service All ${crits.length} Critical Units`,
            icon: "🔧",
            action: "service_all_critical",
            variant: "danger",
          },
          {
            label: `Inspect ${crits[0].id} on Floor`,
            icon: "👁",
            action: "view_floor",
            machineId: crits[0].id,
            variant: "primary",
          },
        ] : undefined,
      };
    }

    // 8. What-If Scenario Simulation (NASA ML degradation model)
    if (q.includes("what if") || q.includes("scenario") || q.includes("reduce") || q.includes("simulate reduction")) {
      const target = matchedMachine || machines.find((m) => m.status !== "running") || machines[0];
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
          text: `🧪 **NASA What-If Scenario Simulation: ${target.id} (${target.name})**\n\n` +
            `*Scenario: Spindle coolant flow restored (-15°C) & cutting feed load reduced (-4.0A, -1.5 mm/s)*\n\n` +
            `• **Baseline Health:** ${whatIf.before.healthScore}% (Flank Wear VB: ${whatIf.before.predictedFlankWearMm} mm, RUL: ${whatIf.before.remainingUsefulLifeDays})\n` +
            `• **Projected Health:** **${whatIf.after.healthScore}%** (Flank Wear VB: ${whatIf.after.predictedFlankWearMm} mm, RUL: ${whatIf.after.remainingUsefulLifeDays})\n` +
            `• **Net Benefit:** **+${whatIf.deltaHealth}% Health Improvement** (+${whatIf.deltaRULHours} hours RUL)\n\n` +
            `💡 **Verdict:** ${whatIf.summary}`,
          actions: [
            {
              label: `Apply Tool Change on ${target.id}`,
              icon: "🔧",
              action: "service_reset",
              machineId: target.id,
              variant: "success",
            },
            {
              label: "View on Operational Floor",
              icon: "👁",
              action: "view_floor",
              machineId: target.id,
              variant: "primary",
            },
          ],
        };
      }
    }

    // 8. Healthy Machines Query
    if (q.includes("healthy") || q.includes("running") || q.includes("optimal") || q.includes("green")) {
      const healthy = machines.filter((m) => m.status === "running");
      return {
        text: `🟢 **${healthy.length} Machines Operating Nominally**\n\n` +
          healthy.map((m) => `• **${m.id} (${m.name})**: ${m.health}% Health, ${m.temperature}°C, ${m.vibration} mm/s`).join("\n") +
          `\n\nAll running within standard NASA/ISO vibration and current envelopes.`,
      };
    }

    // 9. Sensor Telemetry Scan
    if (q.includes("sensor") || q.includes("vibration") || q.includes("temp") || q.includes("current") || q.includes("anomaly")) {
      const highTemp = machines.filter((m) => m.temperature > 65);
      const highVib = machines.filter((m) => m.vibration > 3.0);
      const highCurrent = machines.filter((m) => m.current > 10.0);

      return {
        text: `📡 **Plant-Wide Sensor Telemetry Scan (${machines.length} machines monitored)**\n\n` +
          `• **Temperature Spikes (>65°C):** ${highTemp.map((m) => `**${m.id}** (${m.temperature}°C)`).join(", ") || "None"}\n` +
          `• **Vibration Alerts (>3.0 mm/s):** ${highVib.map((m) => `**${m.id}** (${m.vibration} mm/s)`).join(", ") || "None"}\n` +
          `• **Electrical Overload (>10A):** ${highCurrent.map((m) => `**${m.id}** (${m.current}A)`).join(", ") || "None"}\n\n` +
          `💡 **Analysis:** ${highCurrent.length > 0 ? "High current combined with high vibration strongly indicates tool flank wear and bearing fatigue." : "All electrical channels are stable."}`,
        chips: highVib.length > 0 ? [`🔍 Diagnose ${highVib[0].id}`, "🚨 Critical Machines"] : ["📋 List All Equipment"],
      };
    }

    // 10. Overall Plant Summary
    if (q.includes("plant") || q.includes("factory") || q.includes("summary") || q.includes("overview") || q.includes("health")) {
      return {
        text: `🏭 **Factory Operational Overview (${activePresetName})**\n\n` +
          `• **Overall Plant Health:** **${avgHealth}%**\n` +
          `• **Total Added Machines:** **${machines.length}**\n` +
          `• **Operational Status:** 🟢 ${healthyCount} Running | 🟡 ${warningCount} Warning | 🔴 ${criticalCount} Critical\n` +
          `• **Active Alerts Logged:** ${alerts.length}\n\n` +
          `💡 **Summary:** Factory health is **${avgHealth >= 70 ? "STABLE" : "COMPROMISED"}**. ${criticalCount > 0 ? `Immediate tool changes needed on ${criticalCount} machines to avoid line stoppage.` : "All equipment operating inside nominal tolerances."}`,
        actions: criticalCount > 0 ? [
          {
            label: `Service All ${criticalCount} Critical Units`,
            icon: "🔧",
            action: "service_all_critical",
            variant: "danger",
          },
        ] : undefined,
      };
    }

    // Default Fallback with Quick Useful Chips
    return {
      text: `🤖 **FactoryOS AI Diagnostic Assistant**\n\nI understand your query: "*${query}*". Here is how I can help:\n\n` +
        `• **Diagnose any machine:** Ask *"Diagnose M-09"*, *"Status of Packaging Machine"*, or *"Why is M-02 red?"*\n` +
        `• **Compare machines:** Ask *"Compare M-05 and M-07"*\n` +
        `• **Failure forecast:** Ask *"Which machine will fail first?"*\n` +
        `• **Dataset & ML model:** Ask *"Explain NASA prediction model specs"*\n` +
        `• **Fleet overview:** Ask *"List all added machines"*`,
      chips: [
        "🚨 Critical Machines",
        "📋 List All Equipment",
        "⏳ Which machine fails first?",
        "🧪 NASA Model Specs",
        "🏭 Factory Overview",
      ],
    };
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
      const aiReply = generateAIResponse(text);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: aiReply.text || "",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        chips: aiReply.chips,
        actions: aiReply.actions,
        card: aiReply.card,
        comparison: aiReply.comparison,
        modelSpecs: aiReply.modelSpecs,
        fleetList: aiReply.fleetList,
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 250);
  };

  const handleConfirmWorkOrder = () => {
    if (selectedWorkOrderMachine) {
      showToast(`Work order dispatched for ${selectedWorkOrderMachine.id} (${selectedWorkOrderMachine.name})!`);
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
            <span>Real-time anomaly identification, NASA ML model wear prediction & automated repairs</span>
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
                  {/* Clean Formatted Text */}
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
              onClick={() => handleSendMessage("Show critical machines and causes")}
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
              onClick={() => handleSendMessage("List all added machines")}
            >
              📋 All Equipment ({machines.length})
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
              onClick={() => handleSendMessage("Scan sensor anomalies")}
            >
              📡 Sensor Scan
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
              placeholder="Ask AI: 'Diagnose M-09', 'Which machine fails first?', 'Compare M-05 and M-07', 'NASA dataset specs'..."
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
                      onClick={() => handleSendMessage(`Diagnose ${machine.id} in detail`)}
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
