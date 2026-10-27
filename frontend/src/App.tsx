import { useEffect, useState, useRef } from "react";
import "./App.css";
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
  fetchMachinesFromDb,
  addMachineToDb,
  updateMachineInDb,
  deleteMachineFromDb,
  seedNasaMachinesToDb,
  SUPABASE_PROJECT_ID,
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

// Dummy machines removed. Live machine data connects directly to Supabase database (bsiazqbjrwaxgpzxhhqh).
const alerts: Alert[] = [
  {
    machine: "M-09 Heat Treatment",
    message: "Temperature exceeded limit",
    time: "11:40 AM",
    type: "critical",
  },
  {
    machine: "M-11 Packaging",
    message: "Vibration level high",
    time: "11:38 AM",
    type: "critical",
  },
  {
    machine: "M-07 Welding Robot",
    message: "High current detected",
    time: "11:32 AM",
    type: "warning",
  },
  {
    machine: "M-04 Grinding",
    message: "Maintenance due in 8 hrs",
    time: "11:20 AM",
    type: "warning",
  },
  {
    machine: "M-21 Air Compressor",
    message: "Scheduled maintenance",
    time: "10:55 AM",
    type: "info",
  },
  {
    machine: "M-15 Conveyor",
    message: "Speed fluctuation",
    time: "10:40 AM",
    type: "warning",
  },
];

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
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Live Machine list fetched from Supabase database
  const [machineList, setMachineList] = useState<Machine[]>([]);
  const [isDbLoading, setIsDbLoading] = useState(true);

  // Fetch machines from Supabase on mount
  useEffect(() => {
    async function loadMachines() {
      setIsDbLoading(true);
      try {
        const dbMachines = await fetchMachinesFromDb();
        setMachineList(dbMachines);
        if (dbMachines.length > 0) {
          setSelectedMachineId(dbMachines[0].id);
        }
      } catch (err) {
        console.error("Failed to load machines from Supabase database:", err);
      } finally {
        setIsDbLoading(false);
      }
    }
    loadMachines();
  }, []);

  // Selected Machine & Add Modal state
  const [selectedMachineId, setSelectedMachineId] = useState("M-11");
  const [showAddMachineModal, setShowAddMachineModal] = useState(false);
  const [showDragHint, setShowDragHint] = useState(true);

  // LAYOUT EDIT MODE (Lock / Unlock)
  // When false: layout is locked (view mode: machines cannot be dragged or resized)
  // When true: layout mode is active (machines can be moved and resized)
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
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profile?.role) {
          setUserRole(profile.role as UserRole);
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
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profile?.role) {
          setUserRole(profile.role as UserRole);
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

  const selectedMachine =
    machineList.find((machine) => machine.id === selectedMachineId) ??
    machineList[0] ??
    { id: 'NO-MACHINE', name: 'No Equipment Registered', status: 'running', x: '50%', y: '50%', temperature: 50, vibration: 2, current: 8, speed: 1400, runtime: 0, health: 100, failureProbability: 0, failureTime: 'N/A', location: 'N/A', installedOn: 'N/A', lastMaintenance: 'N/A', recommendation: 'Register equipment in database', diagnosis: 'Database is empty' };

  // Blueprint Controls
  const [blueprint, setBlueprint] = useState<string | null>(null);
  const [showBlueprint, setShowBlueprint] = useState(true);
  const [blueprintScale, setBlueprintScale] = useState(1);
  const [blueprintOffsetX, setBlueprintOffsetX] = useState(0);
  const [blueprintOffsetY, setBlueprintOffsetY] = useState(0);
  const [blueprintOpacity, setBlueprintOpacity] = useState(0.65);
  const [blueprintFit, setBlueprintFit] = useState<"contain" | "cover">("contain");
  const [showAdjustPanel, setShowAdjustPanel] = useState(false);

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

    reader.onload = () => {
      setBlueprint(reader.result as string);
      setBlueprintScale(1);
      setBlueprintOffsetX(0);
      setBlueprintOffsetY(0);
      setBlueprintOpacity(0.65);
      setShowBlueprint(true);
      setShowAdjustPanel(true);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBlueprint = () => {
    setBlueprint(null);
    setShowBlueprint(true);
    setBlueprintScale(1);
    setBlueprintOffsetX(0);
    setBlueprintOffsetY(0);
    setShowAdjustPanel(false);
  };

  // KPI counts
  const healthyMachines = machineList.filter(
    (machine) => machine.status === "running"
  ).length;

  const warningMachines = machineList.filter(
    (machine) => machine.status === "warning"
  ).length;

  const criticalMachines = machineList.filter(
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
    e.preventDefault();
    e.stopPropagation();

    setSelectedMachineId(machineId);

    // Only draggable by Admin in Layout Mode, when on Factory Layout (not Dashboard), and if the machine is not locked!
    if (!isAdmin || isDashboard || !isLayoutMode) return;

    const target = machineList.find((m) => m.id === machineId);
    if (!target || target.isLocked) return;

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

    setMachineList((prev) =>
      prev.map((m) =>
        m.id === draggingMachineId
          ? {
              ...m,
              x: `${newXPercent.toFixed(1)}%`,
              y: `${newYPercent.toFixed(1)}%`,
            }
          : m
      )
    );
  };

  const handleMachinePointerUp = (e: React.PointerEvent) => {
    if (draggingMachineId) {
      const moved = machineList.find((m) => m.id === draggingMachineId);
      if (moved) {
        updateMachineInDb(draggingMachineId, { x: moved.x, y: moved.y }).catch((err) =>
          console.warn("Supabase pos update:", err)
        );
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

    setMachineList((prev) =>
      prev.map((m) =>
        m.id === resizingMachineId
          ? {
              ...m,
              width: newWidth,
              height: newHeight,
            }
          : m
      )
    );
  };

  const handleResizePointerUp = (e: React.PointerEvent) => {
    if (resizingMachineId) {
      const resized = machineList.find((m) => m.id === resizingMachineId);
      if (resized) {
        updateMachineInDb(resizingMachineId, {
          width: resized.width,
          height: resized.height,
        }).catch((err) => console.warn("Supabase size update:", err));
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
    setMachineList((prev) =>
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
    setMachineList((prev) =>
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
    setMachineList((prev) =>
      prev.map((m) =>
        m.id === selectedMachineId && !m.isLocked
          ? { ...m, x: "48%", y: "45%" }
          : m
      )
    );
  };

  // Resize Stepper & Preset Handlers
  const handleAdjustMachineSize = (dWidth: number, dHeight: number) => {
    if (!selectedMachineId || !isLayoutMode) return;
    setMachineList((prev) =>
      prev.map((m) => {
        if (m.id !== selectedMachineId || m.isLocked) return m;
        const curW = m.width ?? 135;
        const curH = m.height ?? 92;
        const newW = Math.max(90, Math.min(320, curW + dWidth));
        const newH = Math.max(65, Math.min(240, curH + dHeight));
        return { ...m, width: newW, height: newH };
      })
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
    setMachineList((prev) =>
      prev.map((m) =>
        m.id === selectedMachineId && !m.isLocked
          ? { ...m, width, height }
          : m
      )
    );
  };

  const handleResetMachineSize = () => {
    if (!selectedMachineId || !isLayoutMode) return;
    setMachineList((prev) =>
      prev.map((m) =>
        m.id === selectedMachineId && !m.isLocked
          ? { ...m, width: 135, height: 92 }
          : m
      )
    );
  };

  const handleToggleMachineLock = (id: string) => {
    setMachineList((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, isLocked: !m.isLocked } : m
      )
    );
  };

  const handleDeleteMachine = (id: string) => {
    if (
      window.confirm(
        `Are you sure you want to remove machine ${id} from the floor layout?`
      )
    ) {
      deleteMachineFromDb(id).catch((err) => console.warn("Supabase delete:", err));
      setMachineList((prev) => {
        const next = prev.filter((m) => m.id !== id);
        if (selectedMachineId === id && next.length > 0) {
          setSelectedMachineId(next[0].id);
        }
        return next;
      });
    }
  };

  const handleResetDefaultLayout = async () => {
    if (
      window.confirm(
        "Reset all machines and equipment to the original factory default positions and sizes?"
      )
    ) {
      const fresh = await fetchMachinesFromDb(); setMachineList(fresh);
      localStorage.removeItem("factoryos_machines");
      setSelectedMachineId("M-11");
    }
  };

  const handleAddMachine = async (newMachine: Machine) => {
    // Write directly to Supabase database
    const saved = await addMachineToDb(newMachine);
    setMachineList((prev) => [saved, ...prev.filter((m) => m.id !== saved.id)]);
    setSelectedMachineId(saved.id);
    setIsLayoutMode(true);
  };

  const handleSeedNasaMachines = async () => {
    setIsDbLoading(true);
    try {
      const seeded = await seedNasaMachinesToDb();
      setMachineList(seeded);
      if (seeded.length > 0) setSelectedMachineId(seeded[0].id);
    } catch (err) {
      console.error("Failed to seed NASA machines to Supabase:", err);
    } finally {
      setIsDbLoading(false);
    }
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
          machines={machineList}
          alerts={alerts}
          onNavigate={setCurrentPage}
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
        <div className="factory-dashboard">
          {/* FACTORY FLOOR & MAP */}
          <section
            className={`factory-area ${isLayoutMode ? "layout-mode-active" : ""}`}
            ref={factoryFloorRef}
            onPointerMove={handleFloorPointerMove}
            onPointerUp={handleFloorPointerUp}
          >
            {/* Blueprint Background */}
            {blueprint && showBlueprint && (
              <img
                src={blueprint}
                alt="Factory Blueprint"
                className="factory-blueprint"
                style={{
                  transform: `translate(${blueprintOffsetX}px, ${blueprintOffsetY}px) scale(${blueprintScale})`,
                  opacity: blueprintOpacity,
                  objectFit: blueprintFit,
                }}
              />
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

            {/* Empty State when no machines exist in Supabase database */}
            {machineList.length === 0 && !isDbLoading && (
              <div className="supabase-empty-floor">
                <div className="empty-floor-badge">
                  <span className="live-dot green"></span>
                  <span>SUPABASE CONNECTED: {SUPABASE_PROJECT_ID}</span>
                </div>
                <h3>No Equipment Registered in Database</h3>
                <p>
                  The Supabase <code>machines</code> table currently contains 0 records. Add equipment from the catalog or seed the digital twin with the NASA Matsuura MC-510V milling equipment.
                </p>
                <div className="empty-floor-actions">
                  <button
                    type="button"
                    className="btn-empty-add"
                    onClick={() => setShowAddMachineModal(true)}
                  >
                    ＋ Add New Machine to Database
                  </button>
                  <button
                    type="button"
                    className="btn-empty-seed"
                    onClick={handleSeedNasaMachines}
                  >
                    📥 Seed NASA MC-510V Digital Twin Equipment
                  </button>
                </div>
              </div>
            )}

            {/* Machines on Floor Layout */}
            {machineList.map((machine) => {
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
                </div>
              );
            })}

            {/* Floating Machine Alignment & Resizing Dock - Admin Only on Factory Layout */}
            {!isDashboard && isAdmin && selectedMachine && (
              <div className="layout-align-dock" onClick={(e) => e.stopPropagation()}>
                <div className="align-dock-info">
                  <span className={`align-dock-status ${selectedMachine.status}`}>●</span>
                  <strong>{selectedMachine.id}</strong>
                  <span className="align-dock-name">{selectedMachine.name}</span>
                  <span className="align-dock-coords">
                    {selectedMachine.x}, {selectedMachine.y}
                  </span>
                </div>

                {!isLayoutMode ? (
                  /* VIEW ONLY / LOCKED DOCK */
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "11px", color: "#8da4be" }}>
                      🔒 Layout Locked (View Mode)
                    </span>
                    <button
                      type="button"
                      className="btn-layout-mode locked"
                      style={{ padding: "4px 10px", fontSize: "11px" }}
                      onClick={() => setIsLayoutMode(true)}
                      title="Enter Layout Mode to move, align, and resize machines"
                    >
                      🔓 Unlock Layout Mode
                    </button>
                  </div>
                ) : (
                  /* LAYOUT EDIT MODE (MOVABLE & RESIZABLE) */
                  <>
                    {/* Per-Machine Lock Toggle */}
                    <button
                      type="button"
                      className={`btn-align-lock ${selectedMachine.isLocked ? "is-locked" : ""}`}
                      onClick={() => handleToggleMachineLock(selectedMachine.id)}
                      title={
                        selectedMachine.isLocked
                          ? "Unlock this machine so it can be moved and resized"
                          : "Lock this machine in place"
                      }
                    >
                      <span>{selectedMachine.isLocked ? "🔒 Locked" : "🔓 Unlocked"}</span>
                    </button>

                    {/* Nudge Alignment (◀ ▲ ▼ ▶) */}
                    <div className="align-dock-nudges">
                      <button
                        type="button"
                        onClick={() => handleNudgeMachine(-1, 0)}
                        title="Nudge Left 1%"
                        disabled={selectedMachine.isLocked}
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNudgeMachine(0, -1)}
                        title="Nudge Up 1%"
                        disabled={selectedMachine.isLocked}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNudgeMachine(0, 1)}
                        title="Nudge Down 1%"
                        disabled={selectedMachine.isLocked}
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNudgeMachine(1, 0)}
                        title="Nudge Right 1%"
                        disabled={selectedMachine.isLocked}
                      >
                        ▶
                      </button>
                    </div>

                    {/* Resize Controls */}
                    <div className="align-dock-resizing">
                      <span className="align-dock-resizing-label">Size:</span>
                      <button
                        type="button"
                        onClick={() => handleAdjustMachineSize(-10, 0)}
                        title="Narrower (-10px)"
                        disabled={selectedMachine.isLocked}
                      >
                        W−
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustMachineSize(10, 0)}
                        title="Wider (+10px)"
                        disabled={selectedMachine.isLocked}
                      >
                        W+
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustMachineSize(0, -10)}
                        title="Shorter (-10px)"
                        disabled={selectedMachine.isLocked}
                      >
                        H−
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustMachineSize(0, 10)}
                        title="Taller (+10px)"
                        disabled={selectedMachine.isLocked}
                      >
                        H+
                      </button>

                      {/* Size Presets */}
                      <button
                        type="button"
                        onClick={() => handleSetSizePreset("S")}
                        title="Small Preset (105×75)"
                        disabled={selectedMachine.isLocked}
                      >
                        S
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetSizePreset("M")}
                        title="Medium / Default Preset (135×92)"
                        disabled={selectedMachine.isLocked}
                      >
                        M
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetSizePreset("L")}
                        title="Large Preset (180×115)"
                        disabled={selectedMachine.isLocked}
                      >
                        L
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetSizePreset("XL")}
                        title="Extra Large Cell (230×140)"
                        disabled={selectedMachine.isLocked}
                      >
                        XL
                      </button>
                      <button
                        type="button"
                        onClick={handleResetMachineSize}
                        title="Reset machine size to default"
                        disabled={selectedMachine.isLocked}
                      >
                        ↺
                      </button>
                    </div>

                    {/* Alignment Tools */}
                    <div className="align-dock-tools">
                      <button
                        type="button"
                        onClick={handleSnapToGrid}
                        title="Snap to 5% Floor Grid"
                        disabled={selectedMachine.isLocked}
                      >
                        ⊞ Snap Grid
                      </button>
                      <button
                        type="button"
                        onClick={handleCenterMachine}
                        title="Center on Floor"
                        disabled={selectedMachine.isLocked}
                      >
                        ⊙ Center
                      </button>
                      <button
                        type="button"
                        className="btn-align-delete"
                        onClick={() => handleDeleteMachine(selectedMachine.id)}
                        title="Remove machine from layout"
                      >
                        🗑
                      </button>
                      <button
                        type="button"
                        style={{
                          background: "#00b4d8",
                          color: "#04101b",
                          fontWeight: 700,
                        }}
                        onClick={() => setIsLayoutMode(false)}
                        title="Lock layout and finish editing"
                      >
                        🔒 Lock Floor
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Floor Toolbar */}
            <div className="factory-toolbar">
              <div className="factory-toolbar-title">
                <span className="factory-toolbar-icon">{isDashboard ? "▦" : "▥"}</span>
                <div>
                  <strong>
                    {isDashboard
                      ? "Factory Operational Floor"
                      : "Factory Layout & Floor Planner"}
                  </strong>
                  <span>
                    {isDashboard
                      ? `${machineList.length} machines monitored • ${healthyMachines} running, ${warningMachines} warning, ${criticalMachines} critical`
                      : `${machineList.length} machines deployed • ${
                          isLayoutMode
                            ? "Layout Mode Active (Movable & Resizable)"
                            : "Floor Locked (Click to Edit)"
                        }`}
                  </span>
                </div>
              </div>

              <div className="factory-toolbar-actions">
                {/* Dashboard View Indicator */}
                {isDashboard && (
                  <div className="dashboard-live-indicator">
                    <span className="live-pulse-dot"></span>
                    <span>Live Telemetry Stream</span>
                  </div>
                )}

                {/* Non-Admin View Only Notice on Factory Layout */}
                {!isDashboard && !isAdmin && (
                  <div className="view-only-role-badge">
                    <span>🔒</span>
                    <span>View Only ({userRole.toUpperCase()}) • Admin clearance required to modify</span>
                  </div>
                )}

                {/* Layout Mode Lock/Unlock Master Toggle - Admin Only */}
                {!isDashboard && isAdmin && (
                  <button
                    type="button"
                    className={`btn-layout-mode ${isLayoutMode ? "active" : "locked"}`}
                    onClick={() => setIsLayoutMode((v) => !v)}
                    title={
                      isLayoutMode
                        ? "Layout Mode is ACTIVE (Movable & Resizable). Click to Lock."
                        : "Layout is LOCKED. Click to enter Layout Mode and edit positions & sizes."
                    }
                  >
                    <span className="mode-icon">{isLayoutMode ? "🔓" : "🔒"}</span>
                    <span>{isLayoutMode ? "Layout Mode: ON" : "Locked (View Mode)"}</span>
                  </button>
                )}

                {/* Plus Sign Add Machine Button - Admin Only */}
                {!isDashboard && isAdmin && (
                  <button
                    type="button"
                    className="btn-add-machine-toolbar"
                    onClick={() => setShowAddMachineModal(true)}
                    title="Search & Add Machines / Equipment to Layout"
                  >
                    <span className="btn-add-plus">＋</span>
                    <span>Add Machine</span>
                  </button>
                )}

                {/* Blueprint Controls - Admin Only on Factory Layout */}
                {!isDashboard && isAdmin && (
                  <>
                    {blueprint && (
                      <>
                        <button
                          type="button"
                          className="blueprint-action-button"
                          onClick={() => setShowBlueprint((current) => !current)}
                        >
                          {showBlueprint ? "Hide Blueprint" : "Show Blueprint"}
                        </button>

                        <div className="blueprint-scale-controls">
                          <button
                            type="button"
                            className="blueprint-scale-button"
                            title="Zoom Out"
                            onClick={() =>
                              setBlueprintScale((s) =>
                                Math.max(0.2, +(s - 0.1).toFixed(2))
                              )
                            }
                          >
                            −
                          </button>
                          <span className="blueprint-scale-value">
                            {Math.round(blueprintScale * 100)}%
                          </span>
                          <button
                            type="button"
                            className="blueprint-scale-button"
                            title="Zoom In"
                            onClick={() =>
                              setBlueprintScale((s) =>
                                Math.min(3, +(s + 0.1).toFixed(2))
                              )
                            }
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          className="blueprint-action-button"
                          style={{
                            borderColor: showAdjustPanel ? "#00b4d8" : undefined,
                            color: showAdjustPanel ? "#ffffff" : undefined,
                            background: showAdjustPanel
                              ? "rgba(0,180,216,0.15)"
                              : undefined,
                          }}
                          onClick={() => setShowAdjustPanel((v) => !v)}
                          title="Adjust Blueprint Scale, Position, and Opacity"
                        >
                          ⚙ Adjust
                        </button>
                      </>
                    )}

                    <label
                      htmlFor="blueprint-upload"
                      className="blueprint-upload-button"
                    >
                      <span>↑</span>
                      Upload Blueprint
                    </label>

                    <input
                      id="blueprint-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleBlueprintUpload}
                      hidden
                    />

                    {blueprint && (
                      <button
                        type="button"
                        className="blueprint-delete-button"
                        onClick={handleRemoveBlueprint}
                        title="Remove Blueprint"
                        aria-label="Remove Blueprint"
                      >
                        🗑
                      </button>
                    )}
                  </>
                )}

                {/* Reset Layout Button - Admin Only */}
                {!isDashboard && isAdmin && (
                  <button
                    type="button"
                    className="blueprint-scale-button"
                    style={{ width: "auto", padding: "0 8px", fontSize: "11px" }}
                    onClick={handleResetDefaultLayout}
                    title="Reset machines to factory default layout"
                  >
                    ↺ Reset
                  </button>
                )}
              </div>
            </div>

            {/* Map Controls - Hidden in Dashboard */}
            {!isDashboard && (
              <div className="map-controls">
                <button
                  type="button"
                  title="Zoom In (+10%)"
                  onClick={() =>
                    setBlueprintScale((s) =>
                      Math.min(3, +(s + 0.1).toFixed(2))
                    )
                  }
                >
                  +
                </button>
                <button
                  type="button"
                  title="Zoom Out (-10%)"
                  onClick={() =>
                    setBlueprintScale((s) =>
                      Math.max(0.2, +(s - 0.1).toFixed(2))
                    )
                  }
                >
                  −
                </button>
                <button
                  type="button"
                  title="Reset Position & Zoom"
                  onClick={() => {
                    setBlueprintScale(1);
                    setBlueprintOffsetX(0);
                    setBlueprintOffsetY(0);
                  }}
                >
                  ⛶
                </button>
              </div>
            )}

            {/* Blueprint Adjustment Drawer - Hidden in Dashboard */}
            {!isDashboard && blueprint && showBlueprint && showAdjustPanel && (
              <div className="blueprint-adjust-drawer">
                <div className="blueprint-adjust-header">
                  <h4>⚙ Blueprint Alignment & Scale</h4>
                  <button
                    type="button"
                    className="blueprint-adjust-close"
                    onClick={() => setShowAdjustPanel(false)}
                  >
                    ✕
                  </button>
                </div>

                {/* Scale / Zoom */}
                <div className="adjust-control-group">
                  <div className="adjust-control-label">
                    <span>Zoom / Scale</span>
                    <strong style={{ color: "#00b4d8" }}>
                      {Math.round(blueprintScale * 100)}%
                    </strong>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.05"
                    className="adjust-control-slider"
                    value={blueprintScale}
                    onChange={(e) =>
                      setBlueprintScale(parseFloat(e.target.value))
                    }
                  />
                </div>

                {/* Opacity */}
                <div className="adjust-control-group">
                  <div className="adjust-control-label">
                    <span>Opacity</span>
                    <strong style={{ color: "#00ffc4" }}>
                      {Math.round(blueprintOpacity * 100)}%
                    </strong>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    className="adjust-control-slider"
                    value={blueprintOpacity}
                    onChange={(e) =>
                      setBlueprintOpacity(parseFloat(e.target.value))
                    }
                  />
                </div>

                {/* Position Offset X */}
                <div className="adjust-control-group">
                  <div className="adjust-control-label">
                    <span>Horizontal Pan (X)</span>
                    <span>{blueprintOffsetX}px</span>
                  </div>
                  <input
                    type="range"
                    min="-300"
                    max="300"
                    step="5"
                    className="adjust-control-slider"
                    value={blueprintOffsetX}
                    onChange={(e) =>
                      setBlueprintOffsetX(parseInt(e.target.value))
                    }
                  />
                </div>

                {/* Position Offset Y */}
                <div className="adjust-control-group">
                  <div className="adjust-control-label">
                    <span>Vertical Pan (Y)</span>
                    <span>{blueprintOffsetY}px</span>
                  </div>
                  <input
                    type="range"
                    min="-300"
                    max="300"
                    step="5"
                    className="adjust-control-slider"
                    value={blueprintOffsetY}
                    onChange={(e) =>
                      setBlueprintOffsetY(parseInt(e.target.value))
                    }
                  />
                </div>

                {/* D-Pad Nudge Buttons */}
                <div className="adjust-control-group">
                  <div className="adjust-control-label">
                    <span>Nudge Alignment (10px)</span>
                  </div>
                  <div className="adjust-dpad-row">
                    <div></div>
                    <button
                      type="button"
                      className="adjust-dpad-btn"
                      title="Nudge Up"
                      onClick={() => setBlueprintOffsetY((y) => y - 10)}
                    >
                      ▲
                    </button>
                    <div></div>
                    <button
                      type="button"
                      className="adjust-dpad-btn"
                      title="Nudge Left"
                      onClick={() => setBlueprintOffsetX((x) => x - 10)}
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      className="adjust-dpad-btn"
                      title="Center"
                      onClick={() => {
                        setBlueprintOffsetX(0);
                        setBlueprintOffsetY(0);
                      }}
                    >
                      •
                    </button>
                    <button
                      type="button"
                      className="adjust-dpad-btn"
                      title="Nudge Right"
                      onClick={() => setBlueprintOffsetX((x) => x + 10)}
                    >
                      ▶
                    </button>
                    <div></div>
                    <button
                      type="button"
                      className="adjust-dpad-btn"
                      title="Nudge Down"
                      onClick={() => setBlueprintOffsetY((y) => y + 10)}
                    >
                      ▼
                    </button>
                    <div></div>
                  </div>
                </div>

                {/* Fit Mode */}
                <div className="adjust-control-group">
                  <div className="adjust-control-label">
                    <span>Display Mode</span>
                  </div>
                  <div className="adjust-fit-pills">
                    <button
                      type="button"
                      className={`adjust-fit-btn ${
                        blueprintFit === "contain" ? "active" : ""
                      }`}
                      onClick={() => setBlueprintFit("contain")}
                    >
                      Fit (Aspect Ratio)
                    </button>
                    <button
                      type="button"
                      className={`adjust-fit-btn ${
                        blueprintFit === "cover" ? "active" : ""
                      }`}
                      onClick={() => setBlueprintFit("cover")}
                    >
                      Fill (Cover Floor)
                    </button>
                  </div>
                </div>

                {/* Reset All */}
                <button
                  type="button"
                  className="btn-maint-export"
                  style={{
                    marginTop: "4px",
                    textAlign: "center",
                    width: "100%",
                  }}
                  onClick={() => {
                    setBlueprintScale(1);
                    setBlueprintOffsetX(0);
                    setBlueprintOffsetY(0);
                    setBlueprintOpacity(0.65);
                    setBlueprintFit("contain");
                  }}
                >
                  ⛶ Reset Alignment & Zoom
                </button>
              </div>
            )}

            <div className="live-map-label">
              <span></span>
              Live Factory View
            </div>
          </section>

          {/* ALERT PANEL */}
          <section className="alerts-panel">
            <div className="panel-heading">
              <strong>Live Alerts ({alerts.length})</strong>
              <span
                style={{ cursor: "pointer", color: "#00b4d8" }}
                onClick={() => setCurrentPage("Alerts")}
              >
                View All
              </span>
            </div>

            {alerts.map((alert, index) => (
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
            ))}
          </section>

          {/* BOTTOM PANELS */}
          <section className="bottom-panels">
            {/* Production */}
            <div className="info-card production-card">
              <h3>Production</h3>

              <div className="production-row">
                <span>Today</span>
                <strong>2,481 Units</strong>
              </div>

              <div className="production-row">
                <span>Target</span>
                <strong>3,500 Units</strong>
              </div>

              <div className="progress">
                <div style={{ width: "71%" }}></div>
              </div>

              <div className="efficiency">
                <span>Efficiency</span>
                <strong>71%</strong>
              </div>

              <div className="machine-overview">
                <div>
                  <span className="overview-dot green"></span>
                  Running
                  <strong>{healthyMachines}</strong>
                </div>

                <div>
                  <span className="overview-dot yellow"></span>
                  Warning
                  <strong>{warningMachines}</strong>
                </div>

                <div>
                  <span className="overview-dot red"></span>
                  Critical
                  <strong>{criticalMachines}</strong>
                </div>
              </div>
            </div>

            {/* Selected Machine */}
            <div className="info-card selected-machine">
              <div className="machine-card-header">
                <div>
                  <span
                    className={`critical-dot ${selectedMachine.status}`}
                  ></span>

                  {selectedMachine.id} {selectedMachine.name}
                </div>

                <span className={`status-label ${selectedMachine.status}`}>
                  {getStatusLabel(selectedMachine.status)}
                </span>
              </div>

              <div className="machine-details">
                <div className="machine-visual">
                  <span>{getMachineIcon(selectedMachine.name)}</span>
                </div>

                <div className="detail-list">
                  <div>
                    <span>Machine ID</span>
                    <strong>{selectedMachine.id}</strong>
                  </div>

                  <div>
                    <span>Status</span>
                    <strong className={`status-text ${selectedMachine.status}`}>
                      {getStatusLabel(selectedMachine.status)}
                    </strong>
                  </div>

                  <div>
                    <span>Dimensions</span>
                    <strong>
                      {selectedMachine.width ?? 135} × {selectedMachine.height ?? 92} px
                    </strong>
                  </div>

                  <div>
                    <span>Location</span>
                    <strong>{selectedMachine.location}</strong>
                  </div>

                  <div>
                    <span>Installed On</span>
                    <strong>{selectedMachine.installedOn}</strong>
                  </div>

                  <div>
                    <span>Last Maintenance</span>
                    <strong>{selectedMachine.lastMaintenance}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Parameters */}
            <div className="info-card parameters-card">
              <h3>Live Parameters</h3>

              <div className="parameter">
                <div>
                  <span>Temperature</span>
                  <strong
                    className={
                      selectedMachine.temperature > 80
                        ? "red-text"
                        : selectedMachine.temperature > 65
                        ? "yellow-text"
                        : "green-text"
                    }
                  >
                    {selectedMachine.temperature} °C
                  </strong>
                </div>

                <div className="mini-chart red-chart">╱╲╱╲╲╱╲╱╲</div>
              </div>

              <div className="parameter">
                <div>
                  <span>Vibration</span>
                  <strong
                    className={
                      selectedMachine.vibration > 6
                        ? "red-text"
                        : selectedMachine.vibration > 3
                        ? "yellow-text"
                        : "green-text"
                    }
                  >
                    {selectedMachine.vibration} mm/s
                  </strong>
                </div>

                <div className="mini-chart red-chart">╲╱╲╱╱╲╱╲</div>
              </div>

              <div className="parameter">
                <div>
                  <span>Current</span>
                  <strong
                    className={
                      selectedMachine.current > 12
                        ? "red-text"
                        : selectedMachine.current > 10
                        ? "yellow-text"
                        : "green-text"
                    }
                  >
                    {selectedMachine.current} A
                  </strong>
                </div>

                <div className="mini-chart red-chart">╱╱╲╱╲╲╱</div>
              </div>

              <div className="parameter-row">
                <div>
                  <span>Speed</span>
                  <strong className="yellow-text">
                    {selectedMachine.speed.toLocaleString()} RPM
                  </strong>
                </div>

                <div>
                  <span>Runtime</span>
                  <strong className="green-text">
                    {selectedMachine.runtime} h
                  </strong>
                </div>
              </div>
            </div>

            {/* Health */}
            <div className="info-card health-card">
              <h3>Health Score</h3>

              <div className={`health-circle ${healthClass}`}>
                <div>
                  <strong>{selectedMachine.health}%</strong>

                  <span>{getStatusLabel(selectedMachine.status)}</span>
                </div>
              </div>

              <div className="failure">
                <span>Failure Probability</span>

                <strong className={healthClass}>
                  {selectedMachine.failureProbability}%
                </strong>
              </div>

              <div className="failure-time">
                Est. Failure In
                <strong>{selectedMachine.failureTime}</strong>
              </div>
            </div>

            {/* Maintenance Recommendation */}
            <div className="info-card recommendation-card">
              <h3>Maintenance Recommendation</h3>

              <div className="recommendation">
                <strong
                  className={`recommendation-title ${selectedMachine.status}`}
                >
                  ⚠ {selectedMachine.recommendation}
                </strong>

                <hr />

                <h4>AI Diagnosis</h4>

                <p>{selectedMachine.diagnosis}</p>

                <hr />

                <h4>Recommended Action</h4>

                <p>
                  {selectedMachine.status === "critical"
                    ? "Immediate maintenance required."
                    : selectedMachine.status === "warning"
                    ? "Maintenance should be scheduled soon."
                    : "No immediate maintenance action required."}
                </p>

                <button
                  className="work-order-button"
                  type="button"
                  onClick={() => setCurrentPage("Maintenance")}
                >
                  Create Work Order
                </button>
              </div>
            </div>
          </section>

          {/* Add Machine & Equipment Modal */}
          <AddMachineModal
            isOpen={showAddMachineModal}
            onClose={() => setShowAddMachineModal(false)}
            onAddMachine={handleAddMachine}
            existingCount={machineList.length}
          />
        </div>
      )}
    </Layout>
  );
}

export default App;
