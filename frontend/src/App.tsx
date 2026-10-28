import { useEffect, useState, useRef, useMemo } from "react";
import "./App.css";
import {
  simulateMachineTick,
  overrideMachineSensor,
  resetMachineMaintenance,
  injectMachineFault,
  createSimulationCopy,
  generateDynamicAlerts,
} from "./services/sensorSimulator";
import Layout from "./components/Layout/Layout";
import Login, { type UserRole } from "./components/Login/Login";
import AIAssistant from "./pages/AIAssistant/AIAssistant";
import Reports from "./pages/Reports/Reports";
import Alerts from "./pages/Alerts/Alerts";
import Machines from "./pages/Machines/Machines";
import Maintenance from "./pages/Maintenance/Maintenance";
import Analytics from "./pages/Analytics/Analytics";
import AddMachineModal, { type Machine, type MachineStatus } from "./components/AddMachineModal/AddMachineModal";
import {
  addMachineToDb,
  fetchLayoutPresetsFromDb,
  saveLayoutPresetToDb,
  deleteLayoutPresetFromDb,
  DEFAULT_LAYOUT_PRESETS,
  type LayoutPreset,
} from "./services/supabaseService";
import UserManagement from "./pages/UserManagement/UserManagement";
import { supabase } from "./lib/supabaseClient";
import "./components/Login/Login.css";

export type { Machine, MachineStatus };

interface Alert {
  machine: string;
  message: string;
  time: string;
  type: "critical" | "warning" | "info";
}

// Dynamic alerts generated strictly from layout machines via sensorSimulator

function getStatusLabel(status: MachineStatus) {
  if (status === "running") return "Healthy";
  if (status === "warning") return "Warning";
  return "Critical";
}

function getMachineIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("robot") || n.includes("arm") || n.includes("cobot")) return "🤖";
  if (n.includes("weld")) return "⚡";
  if (n.includes("conveyor") || n.includes("agv") || n.includes("handling")) return "⇄";
  if (n.includes("heat") || n.includes("furnace") || n.includes("treatment")) return "♨";
  if (n.includes("press") || n.includes("brake") || n.includes("stamping")) return "▼";
  if (n.includes("laser")) return "✦";
  if (n.includes("pack")) return "▣";
  if (n.includes("inspection") || n.includes("aoi") || n.includes("scan") || n.includes("cmm")) return "🔍";
  if (n.includes("compressor") || n.includes("chiller") || n.includes("air")) return "💨";
  return "⚙";
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("operator");
  const [userName, setUserName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("factoryos_user_name");
      if (saved) return saved;
    } catch (e) {
      // Ignore
    }
    return "System Administrator";
  });
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Blueprint Controls State (Independent per room preset)
  const [blueprint, setBlueprint] = useState<string | null>(null);
  const [showBlueprint, setShowBlueprint] = useState<boolean>(true);
  const [blueprintScale, setBlueprintScale] = useState<number>(1);
  const [blueprintOffsetX, setBlueprintOffsetX] = useState<number>(0);
  const [blueprintOffsetY, setBlueprintOffsetY] = useState<number>(0);
  const [blueprintOpacity, setBlueprintOpacity] = useState<number>(0.65);
  const [blueprintFit, setBlueprintFit] = useState<"contain" | "cover">("contain");
  const [showAdjustPanel, setShowAdjustPanel] = useState<boolean>(false);
  const [isBottomPanelMinimized, setIsBottomPanelMinimized] = useState<boolean>(false);

  const [timeMultiplier, setTimeMultiplier] = useState<number>(1);
  const [isSimPanelOpen, setIsSimPanelOpen] = useState<boolean>(false);
  const [isAlertsPanelOpen, setIsAlertsPanelOpen] = useState<boolean>(true);
  const [quickInspectorMachineId, setQuickInspectorMachineId] = useState<string | null>(null);

  // Factory Room & Layout Preset Configurations State with Independent Machines & Blueprints
  const [layoutPresets, setLayoutPresets] = useState<LayoutPreset[]>([]);
  const [currentPresetId, setCurrentPresetId] = useState<string>("preset-all");

  useEffect(() => {
    fetchLayoutPresetsFromDb()
      .then((presets) => {
        setLayoutPresets(presets);
        const initial = presets.find((p) => p.id === currentPresetId) || presets[0];
        if (initial) {
          setBlueprint(initial.blueprint || null);
          setBlueprintScale(initial.blueprintScale ?? 1);
          setBlueprintOffsetX(initial.blueprintOffsetX ?? 0);
          setBlueprintOffsetY(initial.blueprintOffsetY ?? 0);
          setBlueprintOpacity(initial.blueprintOpacity ?? 0.65);
          setBlueprintFit(initial.blueprintFit || "contain");
          if (initial.machines && initial.machines.length > 0) {
            setSelectedMachineId(initial.machines[0].id);
          }
        }
      })
      .catch((err) => console.warn("Failed to load layout presets:", err));
  }, []);

  // Active Preset definition
  const activePreset: LayoutPreset = useMemo(() => {
    return (
      layoutPresets.find((p) => p.id === currentPresetId) ||
      layoutPresets[0] ||
      DEFAULT_LAYOUT_PRESETS[0]
    );
  }, [layoutPresets, currentPresetId]);

  // Current machines deployed strictly on this layout
  const currentFloorMachines: Machine[] = useMemo(() => {
    return activePreset.machines || [];
  }, [activePreset]);

  // Keep machineList synchronized with the active preset machines
  const machineList: Machine[] = currentFloorMachines;

  // Comprehensive fleet of all machines added across all rooms & layout presets
  const allFactoryMachines: Machine[] = useMemo(() => {
    const map = new Map<string, Machine>();
    (layoutPresets || []).forEach((preset) => {
      (preset.machines || []).forEach((m) => {
        if (!map.has(m.id)) {
          map.set(m.id, {
            ...m,
            location: m.location || preset.name,
          });
        }
      });
    });
    (currentFloorMachines || []).forEach((m) => {
      map.set(m.id, {
        ...m,
        location: m.location || activePreset?.name || "Factory Operational Floor",
      });
    });
    return Array.from(map.values());
  }, [layoutPresets, currentFloorMachines, activePreset]);

  // Helper to update machines strictly on the active preset with DB persistence
  const updateActivePresetMachines = (updater: (prevMachines: Machine[]) => Machine[]) => {
    setLayoutPresets((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== activePreset.id) return p;
        return {
          ...p,
          machines: updater(p.machines || []),
        };
      });
      const target = updated.find((p) => p.id === activePreset.id);
      if (target) saveLayoutPresetToDb(target);
      return updated;
    });
  };

  // Selected Machine & Add Modal state
  const [selectedMachineId, setSelectedMachineId] = useState<string>("M-01");
  const [showAddMachineModal, setShowAddMachineModal] = useState<boolean>(false);
  const [showDragHint, setShowDragHint] = useState<boolean>(true);

  const selectedMachine: Machine = useMemo(() => {
    return (
      currentFloorMachines.find((m) => m.id === selectedMachineId) ??
      currentFloorMachines[0] ?? {
        id: "NO-MACHINE",
        name: "No Equipment in Layout",
        status: "running",
        x: "50%",
        y: "50%",
        temperature: 50,
        vibration: 2,
        current: 8,
        speed: 1400,
        runtime: 0,
        health: 100,
        failureProbability: 0,
        failureTime: "N/A",
        location: activePreset.name,
        installedOn: "N/A",
        lastMaintenance: "N/A",
        recommendation: "Click '+ Add Machine' to deploy equipment to this bay.",
        diagnosis: "Layout empty.",
      }
    );
  }, [currentFloorMachines, selectedMachineId, activePreset]);

  const handleSwitchPreset = (presetId: string) => {
    setCurrentPresetId(presetId);
    const target = layoutPresets.find((p) => p.id === presetId);
    if (target) {
      setBlueprint(target.blueprint || null);
      setBlueprintScale(target.blueprintScale ?? 1);
      setBlueprintOffsetX(target.blueprintOffsetX ?? 0);
      setBlueprintOffsetY(target.blueprintOffsetY ?? 0);
      setBlueprintOpacity(target.blueprintOpacity ?? 0.65);
      setBlueprintFit(target.blueprintFit || "contain");
      setShowBlueprint(true);
      setShowAdjustPanel(false);

      if (target.machines && target.machines.length > 0) {
        setSelectedMachineId(target.machines[0].id);
      }
    }
  };

  const handleSaveCurrentPreset = async () => {
    const name = window.prompt("Enter name for this factory / room layout configuration:", "Custom Bay Layout");
    if (!name || !name.trim()) return;

    const newPresetId = `preset-${Date.now().toString().slice(-6)}`;
    // Clone independent copies of current machines for this new preset
    const clonedMachines: Machine[] = currentFloorMachines.map((m) => ({ ...m }));

    const newPreset: LayoutPreset = {
      id: newPresetId,
      name: `💾 ${name.trim()}`,
      description: `Configuration saved on ${new Date().toLocaleDateString("en-GB")}`,
      roomFilter: "custom",
      blueprint: blueprint,
      blueprintScale: blueprintScale,
      blueprintOffsetX: blueprintOffsetX,
      blueprintOffsetY: blueprintOffsetY,
      blueprintOpacity: blueprintOpacity,
      blueprintFit: blueprintFit,
      machines: clonedMachines,
      isDefault: false,
      createdAt: new Date().toISOString(),
    };

    await saveLayoutPresetToDb(newPreset);
    setLayoutPresets((prev) => [...prev, newPreset]);
    setCurrentPresetId(newPresetId);
  };

  const handleDeletePreset = async (presetId: string) => {
    if (presetId.startsWith("preset-") && DEFAULT_LAYOUT_PRESETS.some((d) => d.id === presetId)) {
      alert("Factory default presets cannot be deleted.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this custom room layout configuration?")) {
      return;
    }
    await deleteLayoutPresetFromDb(presetId);
    setLayoutPresets((prev) => prev.filter((p) => p.id !== presetId));
    handleSwitchPreset("preset-all");
  };

  // Dynamic real alerts derived strictly from equipment on the active layout
  const alerts: Alert[] = useMemo(() => {
    return generateDynamicAlerts(currentFloorMachines).map((d) => ({
      machine: d.machine,
      message: d.message,
      time: d.time,
      type: d.type,
    }));
  }, [currentFloorMachines]);

  // Time Acceleration & Degradation Simulation Loop on Active Layout
  useEffect(() => {
    if (timeMultiplier === 0) return;
    const interval = setInterval(() => {
      setLayoutPresets((prev) =>
        prev.map((p) =>
          p.id === currentPresetId
            ? {
                ...p,
                machines: p.machines.map((m) => simulateMachineTick(m, 1, timeMultiplier)),
              }
            : p
        )
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [timeMultiplier, currentPresetId]);

  const handleSensorSliderChange = (
    machineId: string,
    sensor: "flankWearMm" | "temperature" | "vibration" | "current" | "speed",
    val: number
  ) => {
    overrideMachineSensor(machineId, { [sensor]: val });
    setLayoutPresets((prev) =>
      prev.map((p) =>
        p.id === activePreset.id
          ? {
              ...p,
              machines: p.machines.map((m) => {
                if (m.id !== machineId) return m;
                const modified = { ...m, [sensor]: val };
                return simulateMachineTick(modified, 0, 1);
              }),
            }
          : p
      )
    );
  };

  const handleInjectFault = (
    machineId: string,
    faultType: "tool_wear" | "thermal_choke" | "bearing_fatigue" | "overcurrent"
  ) => {
    const updates = injectMachineFault(machineId, faultType);
    setLayoutPresets((prev) =>
      prev.map((p) =>
        p.id === activePreset.id
          ? {
              ...p,
              machines: p.machines.map((m) => (m.id === machineId ? { ...m, ...updates } : m)),
            }
          : p
      )
    );
  };

  const handleResetMaintenance = (machineId: string) => {
    const restored = resetMachineMaintenance(machineId);
    setLayoutPresets((prev) => {
      const updated = prev.map((p) =>
        p.id === activePreset.id
          ? {
              ...p,
              machines: p.machines.map((m) => (m.id === machineId ? { ...m, ...restored } : m)),
            }
          : p
      );
      const target = updated.find((p) => p.id === activePreset.id);
      if (target) saveLayoutPresetToDb(target);
      return updated;
    });
  };

  const handleCloneMachine = async (machineId: string) => {
    const base = currentFloorMachines.find((m) => m.id === machineId);
    if (!base) return;
    const count = currentFloorMachines.filter((m) => m.id.startsWith(base.id)).length;
    const twinPartial = createSimulationCopy(base, count + 1);
    const saved = await addMachineToDb(twinPartial);
    setLayoutPresets((prev) => {
      const updated = prev.map((p) =>
        p.id === activePreset.id
          ? {
              ...p,
              machines: [saved, ...p.machines],
            }
          : p
      );
      const target = updated.find((p) => p.id === activePreset.id);
      if (target) saveLayoutPresetToDb(target);
      return updated;
    });
    setSelectedMachineId(saved.id);
  };

  const handleAddMachine = async (machineData: Partial<Machine>) => {
    // Ensure unique ID that never collides with any existing machine in this layout
    const currentList = currentFloorMachines || [];
    const currentIds = new Set(currentList.map((m) => m.id.toUpperCase()));

    let resolvedId = machineData.id?.trim();
    if (!resolvedId || currentIds.has(resolvedId.toUpperCase())) {
      let n = 1;
      while (currentIds.has(`M-${n < 10 ? "0" + n : n}`)) {
        n++;
      }
      resolvedId = `M-${n < 10 ? "0" + n : n}`;
    }

    const payload = {
      ...machineData,
      id: resolvedId,
    };

    const saved = await addMachineToDb(payload);
    setLayoutPresets((prev) => {
      const updated = prev.map((p) =>
        p.id === activePreset.id
          ? {
              ...p,
              machines: [...(p.machines || []).filter((m) => m.id !== saved.id), saved],
            }
          : p
      );
      const target = updated.find((p) => p.id === activePreset.id);
      if (target) saveLayoutPresetToDb(target);
      return updated;
    });
    setSelectedMachineId(saved.id);
    setShowAddMachineModal(false);
  };

  const handleDeleteMachine = async (machineId: string) => {
    if (!window.confirm(`Remove ${selectedMachine.name} (#${machineId}) from ${activePreset.name}?`)) {
      return;
    }
    setLayoutPresets((prev) => {
      const updated = prev.map((p) =>
        p.id === activePreset.id
          ? {
              ...p,
              machines: p.machines.filter((m) => m.id !== machineId),
            }
          : p
      );
      const target = updated.find((p) => p.id === activePreset.id);
      if (target) saveLayoutPresetToDb(target);
      return updated;
    });

    const remaining = currentFloorMachines.filter((m) => m.id !== machineId);
    if (remaining.length > 0) {
      setSelectedMachineId(remaining[0].id);
    }
  };

  // Seed Default Equipment for the active layout if empty
  const handleSeedNasaMachines = async () => {
    const defaultM = DEFAULT_LAYOUT_PRESETS.find((d) => d.id === activePreset.id)?.machines || DEFAULT_LAYOUT_PRESETS[0].machines;
    const cloned = defaultM.map((m) => ({ ...m }));
    setLayoutPresets((prev) => {
      const updated = prev.map((p) =>
        p.id === activePreset.id ? { ...p, machines: cloned } : p
      );
      const target = updated.find((p) => p.id === activePreset.id);
      if (target) saveLayoutPresetToDb(target);
      return updated;
    });
    if (cloned.length > 0) setSelectedMachineId(cloned[0].id);
  };

  // LAYOUT EDIT MODE (Lock / Unlock)
  const [isLayoutMode, setIsLayoutMode] = useState(false);

  // Drag & Move state
  const factoryFloorRef = useRef<HTMLElement>(null);
  const [draggingMachineId, setDraggingMachineId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{
    offsetX: number;
    offsetY: number;
    rect: DOMRect;
  } | null>(null);

  // Machine Resize state
  const [resizingMachineId, setResizingMachineId] = useState<string | null>(null);
  const resizeStartRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  useEffect(() => {
    const restoreSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", session.user.id)
          .single();

        if (profile?.role) {
          setUserRole(profile.role as UserRole);
          const resolvedName = (profile as any).full_name || session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Administrator";
          setUserName(resolvedName);
          localStorage.setItem("factoryos_user_name", resolvedName);
          setIsLoggedIn(true);
        }
      }

      setIsAuthLoading(false);
    };

    restoreSession();
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", session.user.id)
          .single();

        if (profile?.role) {
          setUserRole(profile.role as UserRole);
          const resolvedName = (profile as any).full_name || session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Administrator";
          setUserName(resolvedName);
          localStorage.setItem("factoryos_user_name", resolvedName);
          setIsLoggedIn(true);
        }
      }

      if (event === "SIGNED_OUT") {
        setIsLoggedIn(false);
        setUserRole("operator");
        setCurrentPage("dashboard");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const [isPasswordRecovery, setIsPasswordRecovery] = useState(
    () => window.location.hash.includes("type=recovery")
  );

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  useEffect(() => {
    const handleRecovery = () => {
      setIsPasswordRecovery(true);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        handleRecovery();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handlePasswordReset = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setResetError("");
    setResetSuccess("");

    if (newPassword.length < 8) {
      setResetError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }

    try {
      setIsResettingPassword(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setResetError(error.message);
        return;
      }

      setResetSuccess(
        "Password updated successfully. You can now sign in."
      );

      await supabase.auth.signOut();

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );

      setTimeout(() => {
        setIsPasswordRecovery(false);
        setNewPassword("");
        setConfirmPassword("");
        setResetSuccess("");
        setIsLoggedIn(false);
      }, 1500);
    } catch (error) {
      console.error("Password reset error:", error);

      setResetError(
        "Unable to update your password. Please try again."
      );
    } finally {
      setIsResettingPassword(false);
    }
  };

  const [currentPage, setCurrentPage] = useState("dashboard");
  const isDashboard = currentPage.toLowerCase() === "dashboard";
  const isAdmin = userRole === "admin";

  // Factory Floor Height state & Admin Resizing (fills screen by default, adjustable by admin)
  const getScreenFillHeight = () => {
    if (typeof window === "undefined") return 720;
    return Math.max(520, Math.min(2400, Math.round(window.innerHeight - 130)));
  };

  const [floorHeight, setFloorHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("factoryos_floor_height");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 360 && parsed <= 2400) {
          return parsed;
        }
      }
    } catch {}
    return getScreenFillHeight();
  });

  const [isDraggingFloorHeight, setIsDraggingFloorHeight] = useState<boolean>(false);
  const heightDragStartYRef = useRef<number | null>(null);
  const heightDragStartHeightRef = useRef<number>(720);

  const handleHeightResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isAdmin) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsDraggingFloorHeight(true);
    heightDragStartYRef.current = e.clientY;
    heightDragStartHeightRef.current = floorHeight;
  };

  const handleHeightResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingFloorHeight || heightDragStartYRef.current === null) return;
    e.preventDefault();
    const delta = e.clientY - heightDragStartYRef.current;
    const newHeight = Math.max(380, Math.min(2400, Math.round(heightDragStartHeightRef.current + delta)));
    setFloorHeight(newHeight);
  };

  const handleHeightResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingFloorHeight) return;
    e.preventDefault();
    setIsDraggingFloorHeight(false);
    heightDragStartYRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    try {
      localStorage.setItem("factoryos_floor_height", String(floorHeight));
    } catch {}
  };

  const handleAdjustFloorHeight = (delta: number) => {
    setFloorHeight((prev) => {
      const next = Math.max(380, Math.min(2400, prev + delta));
      try {
        localStorage.setItem("factoryos_floor_height", String(next));
      } catch {}
      return next;
    });
  };

  const handleFillScreenHeight = () => {
    const fillHeight = getScreenFillHeight();
    setFloorHeight(fillHeight);
    setIsBottomPanelMinimized(true);
    try {
      localStorage.setItem("factoryos_floor_height", String(fillHeight));
    } catch {}
  };

  const handleResetFloorHeight = () => {
    const compactH = 520;
    setFloorHeight(compactH);
    try {
      localStorage.setItem("factoryos_floor_height", String(compactH));
    } catch {}
  };



  const updateActivePresetBlueprint = async (updates: Partial<LayoutPreset>) => {
    if (!activePreset) return;
    const updatedPreset: LayoutPreset = {
      ...activePreset,
      ...updates,
    };
    setLayoutPresets((prev) =>
      prev.map((p) => (p.id === activePreset.id ? updatedPreset : p))
    );
    await saveLayoutPresetToDb(updatedPreset);
  };

  // Auto-fit blueprint maintaining exact aspect ratio without distortion
  const handleAutoFitBlueprint = () => {
    setBlueprintScale(1);
    setBlueprintOffsetX(0);
    setBlueprintOffsetY(0);
    setBlueprintFit("contain");
    updateActivePresetBlueprint({
      blueprintScale: 1,
      blueprintOffsetX: 0,
      blueprintOffsetY: 0,
      blueprintFit: "contain",
    });
  };

  const handleBlueprintUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }

    const reader = new FileReader();

    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setBlueprint(dataUrl);
      setBlueprintScale(1);
      setBlueprintOffsetX(0);
      setBlueprintOffsetY(0);
      setBlueprintFit("contain");
      setBlueprintOpacity(0.70);
      setShowBlueprint(true);
      setShowAdjustPanel(false);

      if (activePreset) {
        const updatedPreset: LayoutPreset = {
          ...activePreset,
          blueprint: dataUrl,
          blueprintScale: 1,
          blueprintOffsetX: 0,
          blueprintOffsetY: 0,
          blueprintOpacity: 0.70,
          blueprintFit: "contain",
        };
        await saveLayoutPresetToDb(updatedPreset);
        setLayoutPresets((prev) =>
          prev.map((p) => (p.id === activePreset.id ? updatedPreset : p))
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBlueprint = async () => {
    setBlueprint(null);
    setShowBlueprint(true);
    setBlueprintScale(1);
    setBlueprintOffsetX(0);
    setBlueprintOffsetY(0);
    setShowAdjustPanel(false);

    if (activePreset) {
      const updatedPreset: LayoutPreset = {
        ...activePreset,
        blueprint: null,
      };
      await saveLayoutPresetToDb(updatedPreset);
      setLayoutPresets((prev) =>
        prev.map((p) => (p.id === activePreset.id ? updatedPreset : p))
      );
    }
  };

  // KPI counts
  const healthyMachines = currentFloorMachines.filter(
    (machine) => machine.status === "running"
  ).length;

  const warningMachines = currentFloorMachines.filter(
    (machine) => machine.status === "warning"
  ).length;

  const criticalMachines = currentFloorMachines.filter(
    (machine) => machine.status === "critical"
  ).length;

  const healthClass =
    selectedMachine.status === "critical"
      ? "critical"
      : selectedMachine.status === "warning"
      ? "warning"
      : "healthy";

  // Drag & Move Pointer Handlers
  const handleMachinePointerDown = (
    e: React.PointerEvent,
    machineId: string
  ) => {
    if (e.button !== 0) return;

    setSelectedMachineId(machineId);
    setIsBottomPanelMinimized(false);

    // Only draggable by Admin in Layout Mode, when on Factory Layout (not Dashboard), and if the machine is not locked!
    if (!isAdmin || isDashboard || !isLayoutMode) return;

    const target = machineList.find((m) => m.id === machineId);
    if (!target || target.isLocked) return;

    // Prevent default and stop propagation ONLY when actually initiating drag
    e.preventDefault();
    e.stopPropagation();

    if (!factoryFloorRef.current) return;
    const rect = factoryFloorRef.current.getBoundingClientRect();

    const curXPercent = parseFloat(target.x) || 50;
    const curYPercent = parseFloat(target.y) || 50;

    const curXpx = (curXPercent / 100) * rect.width;
    const curYpx = (curYPercent / 100) * rect.height;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    dragOffsetRef.current = {
      offsetX: clickX - curXpx,
      offsetY: clickY - curYpx,
      rect,
    };

    setDraggingMachineId(machineId);
    setShowDragHint(false);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleMachinePointerMove = (e: React.PointerEvent) => {
    if (!draggingMachineId || !dragOffsetRef.current) return;
    const { offsetX, offsetY, rect } = dragOffsetRef.current;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const newXpx = clickX - offsetX;
    const newYpx = clickY - offsetY;

    // Clamped boundary: 2% to 94% on X, 8% to 90% on Y
    const newXPercent = Math.max(2, Math.min(94, (newXpx / rect.width) * 100));
    const newYPercent = Math.max(8, Math.min(90, (newYpx / rect.height) * 100));

    setLayoutPresets((prev) =>
      prev.map((p) =>
        p.id === activePreset.id
          ? {
              ...p,
              machines: p.machines.map((m) =>
                m.id === draggingMachineId
                  ? {
                      ...m,
                      x: `${newXPercent.toFixed(1)}%`,
                      y: `${newYPercent.toFixed(1)}%`,
                    }
                  : m
              ),
            }
          : p
      )
    );
  };

  const handleMachinePointerUp = (e: React.PointerEvent) => {
    if (draggingMachineId) {
      if (activePreset) {
        saveLayoutPresetToDb(activePreset);
      }
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setDraggingMachineId(null);
      dragOffsetRef.current = null;
    }
  };

  // RESIZE POINTER HANDLERS
  const handleResizePointerDown = (
    e: React.PointerEvent,
    machineId: string
  ) => {
    if (!isLayoutMode) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const target = machineList.find((m) => m.id === machineId);
    if (!target || target.isLocked) return;

    const curWidth = target.width ?? 135;
    const curHeight = target.height ?? 92;

    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: curWidth,
      startHeight: curHeight,
    };

    setResizingMachineId(machineId);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleResizePointerMove = (e: React.PointerEvent) => {
    if (!resizingMachineId || !resizeStartRef.current) return;
    const { startX, startY, startWidth, startHeight } = resizeStartRef.current;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    // Clamped width: 90px to 320px; height: 65px to 240px
    const newWidth = Math.max(90, Math.min(320, Math.round(startWidth + deltaX)));
    const newHeight = Math.max(65, Math.min(240, Math.round(startHeight + deltaY)));

    setLayoutPresets((prev) =>
      prev.map((p) =>
        p.id === activePreset.id
          ? {
              ...p,
              machines: p.machines.map((m) =>
                m.id === resizingMachineId
                  ? {
                      ...m,
                      width: newWidth,
                      height: newHeight,
                    }
                  : m
              ),
            }
          : p
      )
    );
  };

  const handleResizePointerUp = (e: React.PointerEvent) => {
    if (resizingMachineId) {
      if (activePreset) {
        saveLayoutPresetToDb(activePreset);
      }
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setResizingMachineId(null);
      resizeStartRef.current = null;
    }
  };

  // Combined Pointer Move / Up for floor canvas
  const handleFloorPointerMove = (e: React.PointerEvent) => {
    if (draggingMachineId) {
      handleMachinePointerMove(e);
    } else if (resizingMachineId) {
      handleResizePointerMove(e);
    }
  };

  const handleFloorPointerUp = (e: React.PointerEvent) => {
    if (draggingMachineId) {
      handleMachinePointerUp(e);
    }
    if (resizingMachineId) {
      handleResizePointerUp(e);
    }
  };

  // Fine Alignment / Nudge Handlers
  const handleNudgeMachine = (dx: number, dy: number) => {
    if (!selectedMachineId || !isLayoutMode) return;
    updateActivePresetMachines((prev) =>
      prev.map((m) => {
        if (m.id !== selectedMachineId || m.isLocked) return m;
        const curX = parseFloat(m.x) || 50;
        const curY = parseFloat(m.y) || 50;
        const newX = Math.max(2, Math.min(94, +(curX + dx).toFixed(1)));
        const newY = Math.max(8, Math.min(90, +(curY + dy).toFixed(1)));
        return { ...m, x: `${newX}%`, y: `${newY}%` };
      })
    );
  };

  const handleSnapToGrid = () => {
    if (!selectedMachineId || !isLayoutMode) return;
    updateActivePresetMachines((prev) =>
      prev.map((m) => {
        if (m.id !== selectedMachineId || m.isLocked) return m;
        const curX = parseFloat(m.x) || 50;
        const curY = parseFloat(m.y) || 50;
        const snapX = Math.round(curX / 5) * 5;
        const snapY = Math.round(curY / 5) * 5;
        return {
          ...m,
          x: `${Math.max(5, Math.min(90, snapX))}%`,
          y: `${Math.max(10, Math.min(85, snapY))}%`,
        };
      })
    );
  };

  const handleCenterMachine = () => {
    if (!selectedMachineId || !isLayoutMode) return;
    updateActivePresetMachines((prev) =>
      prev.map((m) =>
        m.id === selectedMachineId && !m.isLocked
          ? { ...m, x: "48%", y: "45%" }
          : m
      )
    );
  };

  const handleSetSizePreset = (preset: "S" | "M" | "L" | "XL") => {
    if (!selectedMachineId || !isLayoutMode) return;
    const sizes = {
      S: { width: 105, height: 75 },
      M: { width: 135, height: 92 },
      L: { width: 180, height: 115 },
      XL: { width: 230, height: 140 },
    };
    const { width, height } = sizes[preset];
    updateActivePresetMachines((prev) =>
      prev.map((m) =>
        m.id === selectedMachineId && !m.isLocked
          ? { ...m, width, height }
          : m
      )
    );
  };

  const handleResetMachineSize = () => {
    if (!selectedMachineId || !isLayoutMode) return;
    updateActivePresetMachines((prev) =>
      prev.map((m) =>
        m.id === selectedMachineId && !m.isLocked
          ? { ...m, width: 135, height: 92 }
          : m
      )
    );
  };

  const handleToggleMachineLock = (id: string) => {
    updateActivePresetMachines((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, isLocked: !m.isLocked } : m
      )
    );
  };

  if (isPasswordRecovery) {
    return (
      <div className="login-page">
        <div className="login-grid"></div>

        <div className="login-glow login-glow-one"></div>
        <div className="login-glow login-glow-two"></div>

        <div className="login-container">
          <div className="login-brand">
            <div className="login-brand-icon">F</div>

            <div>
              <h1>FactoryOS</h1>
              <p>Industrial Intelligence Platform</p>
            </div>
          </div>

          <div className="login-card">
            <div className="login-heading">
              <h2>Set new password</h2>

              <p>
                Create a new password for your FactoryOS account.
              </p>
            </div>

            <form onSubmit={handlePasswordReset}>
              <div className="login-field">
                <label htmlFor="new-password">New Password</label>

                <div className="input-wrapper">
                  <span className="input-icon">◈</span>

                  <input
                    id="new-password"
                    type="password"
                    placeholder="Enter your new password"
                    value={newPassword}
                    onChange={(event) =>
                      setNewPassword(event.target.value)
                    }
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="confirm-password">Confirm Password</label>

                <div className="input-wrapper">
                  <span className="input-icon">◈</span>

                  <input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {resetError && (
                <div className="login-error">{resetError}</div>
              )}

              {resetSuccess && (
                <div
                  className="login-error"
                  style={{
                    borderColor: "#22c55e",
                    color: "#22c55e",
                  }}
                >
                  {resetSuccess}
                </div>
              )}

              <button
                type="submit"
                className="login-button"
                disabled={isResettingPassword}
              >
                <span>
                  {isResettingPassword
                    ? "Updating..."
                    : "Update Password"}
                </span>

                <span className="login-arrow">→</span>
              </button>
            </form>

            <div className="login-security">
              <span className="security-icon">✓</span>
              <span>Secure password recovery</span>
            </div>
          </div>

          <div className="login-footer">
            <span>FactoryOS</span>
            <span>•</span>
            <span>Industrial Intelligence Platform</span>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthLoading) {
    return null;
  }

  if (!isLoggedIn) {
    return (
      <Login
        onLogin={(role) => {
          setUserRole(role);
          setIsLoggedIn(true);
        }}
      />
    );
  }

  return (
    <Layout
      userRole={userRole}
      userName={userName}
      alerts={alerts}
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      onSignOut={async () => {
        await supabase.auth.signOut();
        setIsLoggedIn(false);
        setUserRole("operator");
        setCurrentPage("dashboard");
      }}
    >
      {currentPage === "User Management" ? (
        <UserManagement
          currentUserRole={userRole}
          onNavigate={setCurrentPage}
        />
      ) : currentPage === "AI Assistant" ? (
        <AIAssistant
          machines={allFactoryMachines}
          alerts={alerts}
          onNavigate={(page, machineId) => {
            setCurrentPage(page);
            if (machineId) {
              setSelectedMachineId(machineId);
              setIsBottomPanelMinimized(false);
            }
          }}
          onResetMaintenance={handleResetMaintenance}
          onCloneMachine={handleCloneMachine}
          onSetTimeMultiplier={setTimeMultiplier}
          timeMultiplier={timeMultiplier}
          activePresetName={activePreset?.name}
        />
      ) : currentPage === "Reports" ? (
        <Reports
          machines={machineList}
          alerts={alerts}
          onNavigate={setCurrentPage}
        />
      ) : currentPage === "Alerts" ? (
        <Alerts
          machines={machineList}
          alerts={alerts}
          onNavigate={setCurrentPage}
        />
      ) : currentPage === "Machines" ? (
        <Machines
          machines={machineList}
          onNavigate={setCurrentPage}
        />
      ) : currentPage === "Maintenance" ? (
        <Maintenance
          machines={machineList}
          onNavigate={setCurrentPage}
        />
      ) : currentPage === "Analytics" ? (
        <Analytics
          machines={machineList}
          alerts={alerts}
          onNavigate={setCurrentPage}
        />
      ) : (
        <div className={`factory-dashboard ${!isAlertsPanelOpen ? "alerts-collapsed" : ""}`}>

          {/* FACTORY FLOOR & MAP */}
          <section
            className={`factory-area ${isLayoutMode ? "layout-mode-active" : ""}`}
            ref={factoryFloorRef}
            style={{
              height: `${floorHeight}px`,
              minHeight: `${floorHeight}px`,
            }}
            onPointerMove={handleFloorPointerMove}
            onPointerUp={handleFloorPointerUp}
          >
            {/* TIME ACCELERATION & DIGITAL TWIN SIMULATION DOCK */}
            {isSimPanelOpen && (
              <div className="sim-control-bar" onClick={(e) => e.stopPropagation()}>
                <div className="sim-speed-section">
                  <div className="sim-badge">
                    <span className={`sim-dot ${timeMultiplier > 0 ? "running" : "paused"}`}></span>
                    <strong>NASA MC-510V SIMULATOR</strong>
                    <span className="sim-multiplier-label">
                      {timeMultiplier === 0 ? "PAUSED" : `${timeMultiplier}x ACCELERATION`}
                    </span>
                  </div>

                  <div className="sim-speed-buttons">
                    <button
                      type="button"
                      className="btn-sim-minimize-drawer"
                      onClick={() => setIsSimPanelOpen(false)}
                      title="Minimize simulation drawer (Simulation continues in background)"
                    >
                      ▼ Minimize Settings
                    </button>
                    <button
                      type="button"
                      className={`btn-sim-speed ${timeMultiplier === 0 ? "active" : ""}`}
                      onClick={() => setTimeMultiplier(0)}
                      title="Pause wear simulation"
                    >
                      ⏸ Pause
                    </button>
                    <button
                      type="button"
                      className={`btn-sim-speed ${timeMultiplier === 1 ? "active" : ""}`}
                      onClick={() => setTimeMultiplier(1)}
                      title="1s real = 1s simulated"
                    >
                      1x (Realtime)
                    </button>
                    <button
                      type="button"
                      className={`btn-sim-speed ${timeMultiplier === 5 ? "active" : ""}`}
                      onClick={() => setTimeMultiplier(5)}
                      title="5x acceleration"
                    >
                      5x
                    </button>
                    <button
                      type="button"
                      className={`btn-sim-speed ${timeMultiplier === 10 ? "active" : ""}`}
                      onClick={() => setTimeMultiplier(10)}
                      title="10x acceleration"
                    >
                      10x
                    </button>
                    <button
                      type="button"
                      className={`btn-sim-speed ${timeMultiplier === 60 ? "active" : ""}`}
                      onClick={() => setTimeMultiplier(60)}
                      title="Rapid Wear Demo: 1s real = 1min cutting wear"
                    >
                      60x (1s = 1m)
                    </button>
                    <button
                      type="button"
                      className={`btn-sim-speed ${timeMultiplier === 360 ? "active" : ""}`}
                      onClick={() => setTimeMultiplier(360)}
                      title="Full Shift Demo: 1s real = 6min cutting wear"
                    >
                      360x (1s = 6m)
                    </button>
                  </div>
                </div>

                {selectedMachine && selectedMachine.id !== "NO-MACHINE" && (
                  <div className="sim-machine-controls">
                    <div className="sim-machine-header">
                      <div className="sim-machine-title">
                        <strong>{selectedMachine.id}</strong> {selectedMachine.name}
                        <span className={`sim-status-pill ${selectedMachine.status}`}>
                          {selectedMachine.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="sim-machine-badges">
                        <span className="sim-vb-pill">
                          Flank Wear VB: <strong>{(selectedMachine.flankWearMm ?? 0.08).toFixed(3)} mm</strong>
                        </span>
                        <span className="sim-rul-pill">
                          RUL: <strong>{selectedMachine.failureTime}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="sim-sliders-grid">
                      <div className="sim-slider-group">
                        <div className="sim-slider-label">
                          <span>Tool Flank Wear (VB)</span>
                          <strong>{(selectedMachine.flankWearMm ?? 0.08).toFixed(3)} mm</strong>
                        </div>
                        <input
                          type="range"
                          min="0.02"
                          max="0.60"
                          step="0.01"
                          value={selectedMachine.flankWearMm ?? 0.08}
                          onChange={(e) => handleSensorSliderChange(selectedMachine.id, "flankWearMm", parseFloat(e.target.value))}
                        />
                      </div>

                      <div className="sim-slider-group">
                        <div className="sim-slider-label">
                          <span>Process Temperature</span>
                          <strong>{selectedMachine.temperature}°C</strong>
                        </div>
                        <input
                          type="range"
                          min="35"
                          max="95"
                          step="0.5"
                          value={selectedMachine.temperature}
                          onChange={(e) => handleSensorSliderChange(selectedMachine.id, "temperature", parseFloat(e.target.value))}
                        />
                      </div>

                      <div className="sim-slider-group">
                        <div className="sim-slider-label">
                          <span>Vibration RMS</span>
                          <strong>{selectedMachine.vibration} mm/s</strong>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="7.0"
                          step="0.1"
                          value={selectedMachine.vibration}
                          onChange={(e) => handleSensorSliderChange(selectedMachine.id, "vibration", parseFloat(e.target.value))}
                        />
                      </div>

                      <div className="sim-slider-group">
                        <div className="sim-slider-label">
                          <span>Spindle Motor Current</span>
                          <strong>{selectedMachine.current} A</strong>
                        </div>
                        <input
                          type="range"
                          min="4.0"
                          max="18.0"
                          step="0.2"
                          value={selectedMachine.current}
                          onChange={(e) => handleSensorSliderChange(selectedMachine.id, "current", parseFloat(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="sim-actions-bar">
                      <div className="sim-fault-triggers">
                        <span className="sim-section-tag">Inject Fault:</span>
                        <button
                          type="button"
                          className="btn-sim-fault"
                          onClick={() => handleInjectFault(selectedMachine.id, "tool_wear")}
                          title="Tool flank wear VB jumps to 0.48mm"
                        >
                          ⚠️ Tool Wear
                        </button>
                        <button
                          type="button"
                          className="btn-sim-fault"
                          onClick={() => handleInjectFault(selectedMachine.id, "thermal_choke")}
                          title="Simulate coolant failure & thermal buildup"
                        >
                          ♨ Thermal Choke
                        </button>
                        <button
                          type="button"
                          className="btn-sim-fault"
                          onClick={() => handleInjectFault(selectedMachine.id, "bearing_fatigue")}
                          title="Simulate bearing race spalling & vibration"
                        >
                          🌀 Bearing Damage
                        </button>
                        <button
                          type="button"
                          className="btn-sim-fault"
                          onClick={() => handleInjectFault(selectedMachine.id, "overcurrent")}
                          title="Heavy cutting overcurrent spike"
                        >
                          ⚡ Spindle Overload
                        </button>
                      </div>

                      <div className="sim-maint-triggers">
                        <button
                          type="button"
                          className="btn-sim-clone"
                          onClick={() => handleCloneMachine(selectedMachine.id)}
                          title="Create twin machine to test stress conditions side-by-side"
                        >
                          ⎘ Clone Twin
                        </button>
                        <button
                          type="button"
                          className="btn-sim-service-reset"
                          onClick={() => handleResetMaintenance(selectedMachine.id)}
                          title="Complete tool change & overhaul (Restores 98% Health)"
                        >
                          🔧 Tool Change & Reset
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Floating Background Simulation Indicator when drawer is minimized */}
            {timeMultiplier > 0 && !isSimPanelOpen && (
              <div
                className="sim-floating-pill"
                onClick={() => setIsSimPanelOpen(true)}
                title="Simulation active in background. Click to open controls drawer."
              >
                <span className="sim-dot running"></span>
                <span>Simulating: <strong>{timeMultiplier}x</strong></span>
                <span className="sim-pill-btn">⚙ Controls</span>
              </div>
            )}

            {/* Blueprint Background */}
            {blueprint && showBlueprint ? (
              <img
                src={blueprint}
                alt={`${activePreset.name} Blueprint`}
                className="factory-blueprint"
                style={{
                  transform: `translate(${blueprintOffsetX}px, ${blueprintOffsetY}px) scale(${blueprintScale})`,
                  opacity: blueprintOpacity,
                  objectFit: blueprintFit,
                }}
              />
            ) : currentFloorMachines.length === 0 ? (
              <div className="blueprint-bay-empty-card">
                <div className="blueprint-bay-icon">📐</div>
                <h3>{activePreset.name}</h3>
                <p>
                  No equipment deployed or blueprint uploaded for this room layout. Upload an architectural floor plan specific to this bay to position equipment with millimeter accuracy.
                </p>
                <div className="blueprint-bay-btn-row">
                  <label htmlFor="blueprint-upload" className="blueprint-bay-upload-btn">
                    <span>↑</span> Upload Blueprint for this Room
                  </label>
                  <button
                    type="button"
                    className="blueprint-bay-equip-btn"
                    onClick={() => setShowAddMachineModal(true)}
                  >
                    <span>＋</span> Add Machine to Bay
                  </button>
                  <button
                    type="button"
                    className="blueprint-bay-equip-btn"
                    style={{ borderColor: "#10b981", color: "#34d399" }}
                    onClick={handleSeedNasaMachines}
                  >
                    <span>📥</span> Seed Default Bay Equipment
                  </button>
                </div>
              </div>
            ) : null}

            {/* Blueprint Calibration Drawer */}
            {showAdjustPanel && blueprint && (
              <div className="blueprint-adjust-drawer" onClick={(e) => e.stopPropagation()}>
                <div className="blueprint-adjust-header">
                  <h4><span>⚙</span> Blueprint Calibration</h4>
                  <button
                    type="button"
                    className="blueprint-adjust-close"
                    onClick={() => setShowAdjustPanel(false)}
                    title="Close adjustment drawer"
                  >
                    ✕
                  </button>
                </div>

                <div className="adjust-control-group">
                  <div className="adjust-control-label">
                    <span>Scale</span>
                    <span>{blueprintScale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.05"
                    value={blueprintScale}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setBlueprintScale(val);
                      updateActivePresetBlueprint({ blueprintScale: val });
                    }}
                    className="adjust-control-slider"
                  />
                </div>

                <div className="adjust-control-group">
                  <div className="adjust-control-label">
                    <span>Opacity</span>
                    <span>{Math.round(blueprintOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={blueprintOpacity}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setBlueprintOpacity(val);
                      updateActivePresetBlueprint({ blueprintOpacity: val });
                    }}
                    className="adjust-control-slider"
                  />
                </div>

                <div className="adjust-control-group">
                  <div className="adjust-control-label">
                    <span>Pan Position</span>
                    <span>X: {blueprintOffsetX}px | Y: {blueprintOffsetY}px</span>
                  </div>
                  <div className="adjust-dpad-row">
                    <div></div>
                    <button
                      type="button"
                      className="adjust-dpad-btn"
                      onClick={() => {
                        const val = blueprintOffsetY - 20;
                        setBlueprintOffsetY(val);
                        updateActivePresetBlueprint({ blueprintOffsetY: val });
                      }}
                      title="Move blueprint up"
                    >
                      ▲
                    </button>
                    <div></div>
                    <button
                      type="button"
                      className="adjust-dpad-btn"
                      onClick={() => {
                        const val = blueprintOffsetX - 20;
                        setBlueprintOffsetX(val);
                        updateActivePresetBlueprint({ blueprintOffsetX: val });
                      }}
                      title="Move blueprint left"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      className="adjust-dpad-btn"
                      onClick={handleAutoFitBlueprint}
                      title="Reset pan & zoom"
                    >
                      ⛶
                    </button>
                    <button
                      type="button"
                      className="adjust-dpad-btn"
                      onClick={() => {
                        const val = blueprintOffsetX + 20;
                        setBlueprintOffsetX(val);
                        updateActivePresetBlueprint({ blueprintOffsetX: val });
                      }}
                      title="Move blueprint right"
                    >
                      ▶
                    </button>
                    <div></div>
                    <button
                      type="button"
                      className="adjust-dpad-btn"
                      onClick={() => {
                        const val = blueprintOffsetY + 20;
                        setBlueprintOffsetY(val);
                        updateActivePresetBlueprint({ blueprintOffsetY: val });
                      }}
                      title="Move blueprint down"
                    >
                      ▼
                    </button>
                    <div></div>
                  </div>
                </div>

                <div className="adjust-control-group">
                  <div className="adjust-control-label">
                    <span>Aspect Ratio Fit</span>
                  </div>
                  <div className="adjust-fit-pills">
                    <button
                      type="button"
                      className={`adjust-fit-btn ${blueprintFit === "contain" ? "active" : ""}`}
                      onClick={() => {
                        setBlueprintFit("contain");
                        updateActivePresetBlueprint({ blueprintFit: "contain" });
                      }}
                    >
                      Contain (Preserve Ratio)
                    </button>
                    <button
                      type="button"
                      className={`adjust-fit-btn ${blueprintFit === "cover" ? "active" : ""}`}
                      onClick={() => {
                        setBlueprintFit("cover");
                        updateActivePresetBlueprint({ blueprintFit: "cover" });
                      }}
                    >
                      Cover
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: "8px", borderTop: "1px solid #1f374e", paddingTop: "10px" }}>
                  <button
                    type="button"
                    className="btn-bp-delete"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={handleRemoveBlueprint}
                    title="Delete blueprint for this room layout"
                  >
                    🗑 Delete Blueprint
                  </button>
                </div>
              </div>
            )}

            {/* Drag & Align Hint - Hidden in Dashboard */}
            {!isDashboard && showDragHint && (
              <div className="layout-drag-hint">
                <span>{isLayoutMode ? "📐 Layout Mode:" : "🔒 Locked:"}</span>
                {isLayoutMode
                  ? "Drag any machine to move. Drag bottom-right corner ⤡ to resize."
                  : "Floor is locked. Click 'Locked (View Mode)' in toolbar to enable moving & resizing."}
              </div>
            )}

            {/* Machines on Floor Layout */}
            {currentFloorMachines.map((machine) => {
              const isSelected = selectedMachineId === machine.id;
              const isDragging = draggingMachineId === machine.id;
              const isResizing = resizingMachineId === machine.id;
              const width = machine.width ?? 135;
              const height = machine.height ?? 92;

              return (
                <div
                  key={machine.id}
                  className={`machine machine-${machine.status} ${
                    isSelected ? "machine-selected" : ""
                  } ${isDragging ? "is-dragging" : ""}`}
                  style={{
                    left: machine.x,
                    top: machine.y,
                    width: `${width}px`,
                    minHeight: `${height}px`,
                    height: `${height}px`,
                    cursor: isDashboard || !isLayoutMode
                      ? "pointer"
                      : machine.isLocked
                      ? "not-allowed"
                      : isDragging
                      ? "grabbing"
                      : "grab",
                  }}
                  onPointerDown={(e) => handleMachinePointerDown(e, machine.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMachineId(machine.id);
                    setIsBottomPanelMinimized(false);
                    setQuickInspectorMachineId((prev) => (prev === machine.id ? null : machine.id));
                  }}
                  title={
                    isLayoutMode
                      ? machine.isLocked
                        ? `Machine ${machine.id} is Locked (Cannot move or resize)`
                        : `Machine ${machine.id}: Drag to move • Corner ⤡ to resize`
                      : `Machine ${machine.id}: ${machine.name} (${machine.status}) • Click to inspect`
                  }
                >
                  {/* Lock Badge if machine is locked */}
                  {machine.isLocked && (
                    <span className="machine-lock-badge" title="Machine locked in place">
                      🔒
                    </span>
                  )}

                  <div className="machine-symbol">
                    {getMachineIcon(machine.name)}
                  </div>
                  <div className="machine-text">
                    <strong>{machine.id}</strong>
                    <small>{machine.name}</small>
                  </div>
                  <span className="machine-light" />

                  {/* Corner Resize Grip (Admin only in Layout Mode on Factory Layout) */}
                  {!isDashboard && isAdmin && isLayoutMode && isSelected && !machine.isLocked && (
                    <div
                      className="machine-resize-handle"
                      onPointerDown={(e) => handleResizePointerDown(e, machine.id)}
                      title="Click and drag to resize machine"
                    >
                      ⤡
                    </div>
                  )}

                  {/* Coordinates & Size tag */}
                  {isSelected && (
                    <div className="machine-coords-tag">
                      {machine.x}, {machine.y}
                      {!isDashboard && isLayoutMode && !machine.isLocked && ` • ${width}×${height}px`}
                      {!isDashboard && machine.isLocked && " • 🔒 Locked"}
                      {isDragging && " • Moving"}
                      {isResizing && " • Resizing"}
                    </div>
                  )}

                  {/* Floating Quick Popout Telemetry Menu */}
                  {quickInspectorMachineId === machine.id && (
                    <div className="machine-quick-popout" onClick={(e) => e.stopPropagation()}>
                      <div className="popout-header">
                        <div className="popout-title">
                          <span className={`critical-dot ${machine.status}`}></span>
                          <strong>{machine.id}</strong> {machine.name}
                        </div>
                        <button
                          type="button"
                          className="popout-close-btn"
                          onClick={() => setQuickInspectorMachineId(null)}
                          title="Close popout inspector"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="popout-telemetry-grid">
                        <div className="popout-telemetry-item">
                          <span>Temperature</span>
                          <strong className={machine.temperature > 65 ? "yellow-text" : "green-text"}>{machine.temperature}°C</strong>
                        </div>
                        <div className="popout-telemetry-item">
                          <span>Vibration</span>
                          <strong className={machine.vibration > 3.0 ? "yellow-text" : "green-text"}>{machine.vibration} mm/s</strong>
                        </div>
                        <div className="popout-telemetry-item">
                          <span>Current</span>
                          <strong>{machine.current} A</strong>
                        </div>
                        <div className="popout-telemetry-item">
                          <span>Tool VB</span>
                          <strong className={(machine.flankWearMm ?? 0.08) >= 0.40 ? "red-text" : "green-text"}>
                            {(machine.flankWearMm ?? 0.08).toFixed(3)} mm
                          </strong>
                        </div>
                      </div>

                      <div className="popout-health-row">
                        <span className={`popout-health-badge ${machine.status}`}>
                          Health: <strong>{machine.health}%</strong>
                        </span>
                        <span className="popout-rul-badge">
                          RUL: <strong>{machine.failureTime}</strong>
                        </span>
                      </div>

                      <div className="popout-actions-row">
                        <button
                          type="button"
                          className="btn-popout-service"
                          onClick={() => handleResetMaintenance(machine.id)}
                          title="Quick tool replacement and service"
                        >
                          🔧 Reset Wear
                        </button>
                        <button
                          type="button"
                          className="btn-popout-clone"
                          onClick={() => handleCloneMachine(machine.id)}
                          title="Clone twin machine for simulation"
                        >
                          ⎘ Clone Twin
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Floating Machine Inspector - Admin Only in Layout Mode when a machine is selected */}
            {!isDashboard && isAdmin && isLayoutMode && selectedMachine && (
              <div className="layout-floating-inspector" onClick={(e) => e.stopPropagation()}>
                <div className="inspector-badge">
                  <span className="inspector-icon">{getMachineIcon(selectedMachine.name)}</span>
                  <div className="inspector-text">
                    <strong>{selectedMachine.name}</strong>
                    <span>{selectedMachine.id} • {selectedMachine.x}, {selectedMachine.y}</span>
                  </div>
                </div>

                <div className="inspector-btn-row">
                  <button
                    type="button"
                    className={`inspector-lock-btn ${selectedMachine.isLocked ? "locked" : ""}`}
                    onClick={() => handleToggleMachineLock(selectedMachine.id)}
                    title={selectedMachine.isLocked ? "Unlock machine to move/resize" : "Lock machine position"}
                  >
                    {selectedMachine.isLocked ? "🔒 Locked" : "🔓 Unlocked"}
                  </button>

                  {/* Nudge Alignment */}
                  <div className="inspector-btn-group" title="Nudge position">
                    <button
                      type="button"
                      onClick={() => handleNudgeMachine(-1, 0)}
                      disabled={selectedMachine.isLocked}
                      title="Nudge Left 1%"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudgeMachine(0, -1)}
                      disabled={selectedMachine.isLocked}
                      title="Nudge Up 1%"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudgeMachine(0, 1)}
                      disabled={selectedMachine.isLocked}
                      title="Nudge Down 1%"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudgeMachine(1, 0)}
                      disabled={selectedMachine.isLocked}
                      title="Nudge Right 1%"
                    >
                      ▶
                    </button>
                  </div>

                  {/* Size Presets */}
                  <div className="inspector-btn-group" title="Quick size presets">
                    <button
                      type="button"
                      onClick={() => handleSetSizePreset("S")}
                      disabled={selectedMachine.isLocked}
                      title="Small Cell (105×75)"
                    >
                      S
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetSizePreset("M")}
                      disabled={selectedMachine.isLocked}
                      title="Medium Cell (135×92)"
                    >
                      M
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetSizePreset("L")}
                      disabled={selectedMachine.isLocked}
                      title="Large Cell (180×115)"
                    >
                      L
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetSizePreset("XL")}
                      disabled={selectedMachine.isLocked}
                      title="Extra Large Cell (230×140)"
                    >
                      XL
                    </button>
                    <button
                      type="button"
                      onClick={handleResetMachineSize}
                      disabled={selectedMachine.isLocked}
                      title="Reset machine size to default (135×92)"
                    >
                      ↺
                    </button>
                  </div>

                  {/* Grid Snap & Center */}
                  <button
                    type="button"
                    className="inspector-action-btn"
                    onClick={handleSnapToGrid}
                    disabled={selectedMachine.isLocked}
                    title="Snap machine to 5% floor grid"
                  >
                    ⊞ Snap
                  </button>

                  <button
                    type="button"
                    className="inspector-action-btn"
                    onClick={handleCenterMachine}
                    disabled={selectedMachine.isLocked}
                    title="Center machine on floor"
                  >
                    ⊙ Center
                  </button>

                  <button
                    type="button"
                    className="inspector-action-btn"
                    onClick={() => handleCloneMachine(selectedMachine.id)}
                    title="Clone twin machine to test scenarios"
                  >
                    ⎘ Clone
                  </button>

                  {/* Delete Machine from this specific layout */}
                  <button
                    type="button"
                    className="inspector-delete-btn"
                    onClick={() => handleDeleteMachine(selectedMachine.id)}
                    title={`Remove ${selectedMachine.name} from ${activePreset.name}`}
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            )}

            {/* Floor Toolbar */}
            <div className="factory-toolbar">
              <div className="factory-toolbar-title">
                <div>
                  <strong>
                    {isDashboard
                      ? "Factory Operational Floor"
                      : "Factory Layout & Floor Planner"}
                  </strong>
                  <span>
                    {isDashboard ? (
                      <>
                        <strong>{machineList.length} machines monitored</strong> • {healthyMachines} running, {warningMachines} warning, {criticalMachines} critical
                      </>
                    ) : (
                      <>
                        <strong>{machineList.length} machines deployed</strong> • {isLayoutMode ? "Layout Mode Active (Movable & Resizable)" : "Floor Locked (Click to Edit)"}
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="factory-toolbar-actions">
                {/* 1. Simulation Indicator Pill */}
                <button
                  type="button"
                  className={`btn-toolbar-sim ${timeMultiplier > 0 ? "active" : ""}`}
                  onClick={() => setIsSimPanelOpen((v) => !v)}
                  title="Toggle Simulation Drawer (Running in background)"
                >
                  <span className="sim-pulse-icon">{timeMultiplier > 0 ? "⚡" : "⏸"}</span>
                  <span>Sim: {timeMultiplier === 0 ? "PAUSED" : `${timeMultiplier}x`}</span>
                </button>

                {/* 2. Room / Layout Preset Dropdown */}
                <div className="toolbar-preset-selector">
                  <span className="preset-selector-icon">🏛</span>
                  <select
                    className="preset-selector-dropdown"
                    value={currentPresetId}
                    onChange={(e) => handleSwitchPreset(e.target.value)}
                    title="Switch between different factory room & bay layout configurations"
                  >
                    {layoutPresets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.machines ? p.machines.length : 0} machines)
                      </option>
                    ))}
                  </select>

                  {!isDashboard && isAdmin && (
                    <button
                      type="button"
                      className="btn-save-preset-toolbar"
                      onClick={handleSaveCurrentPreset}
                      title="Save current layout as a new preset"
                    >
                      ＋ Save Preset
                    </button>
                  )}

                  {!isDashboard && isAdmin && !activePreset.isDefault && (
                    <button
                      type="button"
                      className="btn-del-preset-toolbar"
                      onClick={() => handleDeletePreset(activePreset.id)}
                      title="Delete this custom preset"
                    >
                      🗑
                    </button>
                  )}
                </div>

                {/* Admin Floor Height Controls */}
                {isAdmin && (
                  <div className="toolbar-floor-height-controls" title="Admin floor height controls">
                    <span className="height-control-label">Height:</span>
                    <button
                      type="button"
                      className="btn-floor-height-step"
                      onClick={() => handleAdjustFloorHeight(-60)}
                      title="Decrease floor height (-60px)"
                    >
                      －
                    </button>
                    <span className="floor-height-badge">{floorHeight}px</span>
                    <button
                      type="button"
                      className="btn-floor-height-step"
                      onClick={() => handleAdjustFloorHeight(60)}
                      title="Increase floor height (+60px)"
                    >
                      ＋
                    </button>
                    <button
                      type="button"
                      className="btn-floor-height-fill"
                      onClick={handleFillScreenHeight}
                      title="Fill available screen height"
                    >
                      ⛶ Fill Screen
                    </button>
                    <button
                      type="button"
                      className="btn-floor-height-reset"
                      onClick={handleResetFloorHeight}
                      title="Reset floor height to compact (520px)"
                    >
                      ↺
                    </button>
                  </div>
                )}

                {/* 3. Add Machine to This Layout */}
                {!isDashboard && isAdmin && (
                  <button
                    type="button"
                    className="btn-add-machine-toolbar"
                    onClick={() => setShowAddMachineModal(true)}
                    title={`Add a new machine specifically to ${activePreset.name}`}
                  >
                    <span>＋</span>
                    <span>Add Machine</span>
                  </button>
                )}

                {/* 4. Blueprint Controls with Clear Delete Button */}
                {!isDashboard && isAdmin && (
                  <div className="toolbar-blueprint-group">
                    {blueprint ? (
                      <>
                        <button
                          type="button"
                          className="btn-bp-action"
                          onClick={handleAutoFitBlueprint}
                          title="Auto-fit blueprint to layout"
                        >
                          ⛶ Fit
                        </button>
                        <button
                          type="button"
                          className={`btn-bp-action ${showAdjustPanel ? "active" : ""}`}
                          onClick={() => setShowAdjustPanel((v) => !v)}
                          title="Adjust blueprint scale & offset"
                        >
                          ⚙ Adjust
                        </button>
                        <button
                          type="button"
                          className="btn-bp-delete"
                          onClick={handleRemoveBlueprint}
                          title="Delete blueprint for this room"
                        >
                          🗑 Delete Blueprint
                        </button>
                      </>
                    ) : (
                      <>
                        <label htmlFor="blueprint-upload" className="blueprint-upload-button">
                          <span>↑</span> Upload Blueprint
                        </label>
                        <input
                          id="blueprint-upload"
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          onChange={handleBlueprintUpload}
                          hidden
                        />
                      </>
                    )}
                  </div>
                )}

                {/* 5. Layout Mode Toggle */}
                {!isDashboard && isAdmin && (
                  <button
                    type="button"
                    className={`btn-layout-mode-pill ${isLayoutMode ? "active" : ""}`}
                    onClick={() => setIsLayoutMode((m) => !m)}
                    title={isLayoutMode ? "Click to lock floor (finish editing)" : "Click to enter Layout Edit Mode (move & resize)"}
                  >
                    {isLayoutMode ? "🔓 Layout Mode (Edit)" : "🔒 Floor Locked"}
                  </button>
                )}

                {/* 6. Alerts Side Panel Toggle */}
                <button
                  type="button"
                  className={`btn-toolbar-alerts-toggle ${isAlertsPanelOpen ? "panel-open" : "panel-closed"}`}
                  onClick={() => setIsAlertsPanelOpen((v) => !v)}
                  title={isAlertsPanelOpen ? "Collapse alerts panel" : "Show live alerts"}
                >
                  <span className="alerts-btn-bell">🔔</span>
                  <span>Alerts ({alerts.length})</span>
                </button>
              </div>
            </div>

            {/* Draggable Floor Height Splitter Handle (Admin Only) */}
            {isAdmin && (
              <div
                className={`floor-height-drag-bar ${isDraggingFloorHeight ? "dragging" : ""}`}
                onPointerDown={handleHeightResizePointerDown}
                onPointerMove={handleHeightResizePointerMove}
                onPointerUp={handleHeightResizePointerUp}
                onPointerCancel={handleHeightResizePointerUp}
                title="Click and drag up or down to adjust floor height"
              >
                <div className="drag-bar-grip">
                  <span className="drag-bar-dots">══════</span>
                  <span className="drag-bar-label">↕ Resize Floor ({floorHeight}px)</span>
                  <span className="drag-bar-dots">══════</span>
                </div>
              </div>
            )}
          </section>

          {/* ALERT PANEL (Collapsible to expand blueprint) */}
          {isAlertsPanelOpen && (
            <section
              className="alerts-panel"
              style={{
                height: `${floorHeight}px`,
                minHeight: `${floorHeight}px`,
              }}
            >
              <div className="panel-heading">
                <strong>Live Alerts ({alerts.length})</strong>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{ cursor: "pointer", color: "#38bdf8", fontSize: "12px", fontWeight: 600 }}
                    onClick={() => setCurrentPage("Alerts")}
                  >
                    View All →
                  </span>
                  <button
                    type="button"
                    className="btn-dock-minimize"
                    onClick={() => setIsAlertsPanelOpen(false)}
                    title="Minimize alerts panel to maximize floor blueprint canvas"
                  >
                    ⇥ Minimize
                  </button>
                </div>
              </div>

              {alerts.length === 0 ? (
                <div className="alerts-empty-dock">
                  <span className="alerts-empty-icon">✓</span>
                  <strong>Zero Active Alerts</strong>
                  <p>All machines currently running nominal telemetry.</p>
                </div>
              ) : (
                alerts.map((alert, index) => (
                  <div className="alert-item" key={index}>
                    <div className={`alert-icon ${alert.type}`}>
                      {alert.type === "critical"
                        ? "♨"
                        : alert.type === "warning"
                        ? "⚠"
                        : "●"}
                    </div>

                    <div className="alert-content">
                      <div className="alert-title-row">
                        <strong>{alert.machine}</strong>
                        <small>{alert.time}</small>
                      </div>

                      <p>{alert.message}</p>
                    </div>
                  </div>
                ))
              )}
            </section>
          )}

          {/* BOTTOM PANELS (Minimizable & Streamlined) */}
          {isBottomPanelMinimized ? (
            <section className="bottom-panel-collapsed">
              <div className="collapsed-left">
                <span className={`collapsed-dot ${selectedMachine.status}`}></span>
                <strong>{selectedMachine.id}</strong>
                <span className="collapsed-name">{selectedMachine.name}</span>
                <span className={`collapsed-health-tag ${healthClass}`}>{selectedMachine.health}% Health</span>
                <span className="collapsed-sensor-strip">
                  Temp: <strong>{selectedMachine.temperature}°C</strong> • Vib: <strong>{selectedMachine.vibration} mm/s</strong> • Current: <strong>{selectedMachine.current}A</strong> • Tool VB: <strong>{(selectedMachine.flankWearMm ?? 0.08).toFixed(3)}mm</strong>
                </span>
              </div>
              <button
                type="button"
                className="btn-toggle-bottom"
                onClick={() => setIsBottomPanelMinimized(false)}
                title="Expand Telemetry Dashboard"
              >
                ▲ Expand Telemetry
              </button>
            </section>
          ) : (
            <section className="bottom-panels">
              <div className="bottom-panels-header">
                <div className="bottom-panels-title">
                  <span className="bottom-live-indicator">●</span>
                  <strong>TELEMETRY & MACHINE INTELLIGENCE</strong>
                </div>
                <button
                  type="button"
                  className="btn-toggle-bottom"
                  onClick={() => setIsBottomPanelMinimized(true)}
                  title="Minimize bottom panel to maximize floor blueprint canvas"
                >
                  ▼ Minimize Panel
                </button>
              </div>

              <div className="bottom-panels-grid">
                {/* Card 1: Equipment Identity & Fleet Status */}
                <div className="info-card selected-machine-card">
                  <div className="machine-card-header">
                    <div className="machine-header-title">
                      <span className={`critical-dot ${selectedMachine.status}`}></span>
                      <span className="machine-header-title-text">
                        <strong>{selectedMachine.id}</strong>
                        <span className="machine-header-hyphen">-</span>
                        <span className="machine-header-name">{selectedMachine.name}</span>
                      </span>
                    </div>
                    <span className={`status-label ${selectedMachine.status}`}>
                      {getStatusLabel(selectedMachine.status)}
                    </span>
                  </div>

                  <div className="detail-list-clean">
                    <div className="detail-row">
                      <span>Location</span>
                      <strong>{selectedMachine.location}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Department</span>
                      <strong>{selectedMachine.department || "Machining Bay 1"}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Dimensions</span>
                      <strong>{selectedMachine.width ?? 135} × {selectedMachine.height ?? 92} px</strong>
                    </div>
                    <div className="detail-row">
                      <span>Last Service</span>
                      <strong>{selectedMachine.lastMaintenance}</strong>
                    </div>
                  </div>

                  <div className="fleet-quick-overview">
                    <span className="fleet-pill green">● {healthyMachines} Running</span>
                    <span className="fleet-pill yellow">▲ {warningMachines} Warning</span>
                    <span className="fleet-pill red">♨ {criticalMachines} Critical</span>
                  </div>
                </div>

                {/* Card 2: Live Parameters & Tool Wear Progression */}
                <div className="info-card parameters-card">
                  <div className="info-card-header-row">
                    <h3>Live Parameters</h3>
                    <span className="telemetry-live-tag">● Live Telemetry</span>
                  </div>

                  <div className="parameter">
                    <div>
                      <span>Process Temperature</span>
                      <strong className={selectedMachine.temperature > 80 ? "red-text" : selectedMachine.temperature > 65 ? "yellow-text" : "green-text"}>
                        {selectedMachine.temperature} °C
                      </strong>
                    </div>
                    <svg className="param-sparkline" viewBox="0 0 64 22" fill="none">
                      <path d="M 2 16 Q 16 6, 32 14 T 62 8" stroke={selectedMachine.temperature > 65 ? "#f59e0b" : "#38bdf8"} strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>

                  <div className="parameter">
                    <div>
                      <span>Spindle Vibration RMS</span>
                      <strong className={selectedMachine.vibration > 4.8 ? "red-text" : selectedMachine.vibration > 3.0 ? "yellow-text" : "green-text"}>
                        {selectedMachine.vibration} mm/s
                      </strong>
                    </div>
                    <svg className="param-sparkline" viewBox="0 0 64 22" fill="none">
                      <path d="M 2 12 Q 18 20, 34 8 T 62 14" stroke={selectedMachine.vibration > 3 ? "#ef4444" : "#10b981"} strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>

                  <div className="parameter">
                    <div>
                      <span>Spindle Current (DC+AC)</span>
                      <strong className={selectedMachine.current > 13.5 ? "red-text" : selectedMachine.current > 10.5 ? "yellow-text" : "green-text"}>
                        {selectedMachine.current} A
                      </strong>
                    </div>
                    <svg className="param-sparkline" viewBox="0 0 64 22" fill="none">
                      <path d="M 2 14 Q 20 4, 38 16 T 62 6" stroke={selectedMachine.current > 10.5 ? "#f59e0b" : "#38bdf8"} strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>

                  <div className="parameter-row">
                    <div>
                      <span>Spindle Speed</span>
                      <strong className="yellow-text">{selectedMachine.speed.toLocaleString()} RPM</strong>
                    </div>
                    <div>
                      <span>Runtime</span>
                      <strong className="green-text">{selectedMachine.runtime} h</strong>
                    </div>
                  </div>

                  {/* Tool Flank Wear (NASA MC-510V Benchmark) */}
                  <div className="parameter-flank-wear">
                    <div className="flank-wear-header">
                      <span>Tool Flank Wear (VB)</span>
                      <strong className={(selectedMachine.flankWearMm ?? 0.08) >= 0.40 ? "red-text" : (selectedMachine.flankWearMm ?? 0.08) >= 0.30 ? "yellow-text" : "green-text"}>
                        {(selectedMachine.flankWearMm ?? 0.08).toFixed(3)} mm
                      </strong>
                    </div>
                    <div className="wear-bar-track">
                      <div
                        className={`wear-bar-fill ${(selectedMachine.flankWearMm ?? 0.08) >= 0.40 ? "critical" : (selectedMachine.flankWearMm ?? 0.08) >= 0.30 ? "warning" : "nominal"}`}
                        style={{ width: `${Math.min(100, ((selectedMachine.flankWearMm ?? 0.08) / 0.50) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="wear-threshold-markers">
                      <span>0.00 Initial</span>
                      <span>0.30 Steady</span>
                      <span>0.40 Limit</span>
                    </div>
                  </div>
                </div>

                {/* Card 3: Multimodal AI Health & Recommendation */}
                <div className="info-card health-recommendation-card">
                  <div className="health-score-top">
                    <div className={`health-circle-clean ${healthClass}`}>
                      <strong>{selectedMachine.health}%</strong>
                      <span>HEALTH</span>
                    </div>

                    <div className="health-stats-col">
                      <div className="health-stat-item">
                        <span>Failure Probability</span>
                        <strong className={healthClass}>{selectedMachine.failureProbability}%</strong>
                      </div>
                      <div className="health-stat-item">
                        <span>Remaining Useful Life</span>
                        <strong>{selectedMachine.failureTime}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="recommendation-content">
                    <div className="diagnosis-box">
                      <span className="diagnosis-tag">AI DIAGNOSIS</span>
                      <p>{selectedMachine.diagnosis}</p>
                    </div>

                    <div className="rec-action-row">
                      <button
                        className="btn-create-wo"
                        type="button"
                        onClick={() => setCurrentPage("Maintenance")}
                      >
                        + Create Work Order
                      </button>
                      <button
                        className="btn-quick-service"
                        type="button"
                        onClick={() => handleResetMaintenance(selectedMachine.id)}
                        title="Simulate immediate tool replacement and service"
                      >
                        🔧 Service Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Add Machine & Equipment Modal */}
          <AddMachineModal
            isOpen={showAddMachineModal}
            onClose={() => setShowAddMachineModal(false)}
            onAddMachine={handleAddMachine}
            existingCount={currentFloorMachines.length}
            existingMachines={currentFloorMachines}
          />
        </div>
      )}
    
      </Layout>
  );
}

export default App;
