import { useEffect, useState } from "react";
import "./App.css";
import Layout from "./components/Layout/Layout";
import Login, { type UserRole } from "./components/Login/Login";
import AIAssistant from "./pages/AIAssistant/AIAssistant";
import Reports from "./pages/Reports/Reports";
import Alerts from "./pages/Alerts/Alerts";
import Machines from "./pages/Machines/Machines";
import Maintenance from "./pages/Maintenance/Maintenance";
import Analytics from "./pages/Analytics/Analytics";
type MachineStatus = "running" | "warning" | "critical";
import { supabase } from "./lib/supabaseClient";
import "./components/Login/Login.css";
interface Machine {
  id: string;
  name: string;
  status: MachineStatus;
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

interface Alert {
  machine: string;
  message: string;
  time: string;
  type: "critical" | "warning" | "info";
}

const machines: Machine[] = [
  {
    id: "M-01",
    name: "CNC Milling",
    status: "running",
    x: "8%",
    y: "12%",
    temperature: 52.4,
    vibration: 2.1,
    current: 8.4,
    speed: 1450,
    runtime: 7.2,
    health: 94,
    failureProbability: 3,
    failureTime: "14 days",
    location: "Production Area 1",
    installedOn: "12 Jan 2024",
    lastMaintenance: "02 Oct 2026",
    recommendation: "Continue normal operation.",
    diagnosis: "Machine parameters are within normal operating range.",
  },
  {
    id: "M-02",
    name: "CNC Turning",
    status: "running",
    x: "25%",
    y: "12%",
    temperature: 55.1,
    vibration: 2.4,
    current: 9.1,
    speed: 1380,
    runtime: 6.8,
    health: 91,
    failureProbability: 5,
    failureTime: "12 days",
    location: "Production Area 1",
    installedOn: "18 Jan 2024",
    lastMaintenance: "01 Oct 2026",
    recommendation: "Continue normal operation.",
    diagnosis: "No significant abnormality detected.",
  },
  {
    id: "M-03",
    name: "Drilling",
    status: "running",
    x: "42%",
    y: "12%",
    temperature: 50.8,
    vibration: 2.0,
    current: 7.8,
    speed: 1320,
    runtime: 7.5,
    health: 96,
    failureProbability: 2,
    failureTime: "18 days",
    location: "Production Area 1",
    installedOn: "20 Jan 2024",
    lastMaintenance: "03 Oct 2026",
    recommendation: "Continue normal operation.",
    diagnosis: "All monitored parameters are stable.",
  },
  {
    id: "M-04",
    name: "Grinding",
    status: "warning",
    x: "59%",
    y: "12%",
    temperature: 68.3,
    vibration: 4.7,
    current: 10.2,
    speed: 1510,
    runtime: 7.9,
    health: 72,
    failureProbability: 24,
    failureTime: "2 days",
    location: "Production Area 1",
    installedOn: "25 Jan 2024",
    lastMaintenance: "28 Sep 2026",
    recommendation: "Schedule preventive maintenance.",
    diagnosis: "Elevated vibration trend detected during recent operation.",
  },
  {
    id: "M-05",
    name: "Assembly Robot 1",
    status: "running",
    x: "15%",
    y: "38%",
    temperature: 48.2,
    vibration: 1.8,
    current: 6.9,
    speed: 980,
    runtime: 6.4,
    health: 93,
    failureProbability: 4,
    failureTime: "15 days",
    location: "Assembly Area",
    installedOn: "03 Feb 2024",
    lastMaintenance: "30 Sep 2026",
    recommendation: "Continue normal operation.",
    diagnosis: "Robot operating within expected parameters.",
  },
  {
    id: "M-06",
    name: "Assembly Robot 2",
    status: "running",
    x: "32%",
    y: "38%",
    temperature: 49.6,
    vibration: 2.0,
    current: 7.1,
    speed: 1010,
    runtime: 6.7,
    health: 90,
    failureProbability: 6,
    failureTime: "11 days",
    location: "Assembly Area",
    installedOn: "05 Feb 2024",
    lastMaintenance: "29 Sep 2026",
    recommendation: "Continue normal operation.",
    diagnosis: "Operating normally with stable readings.",
  },
  {
    id: "M-07",
    name: "Welding Robot",
    status: "warning",
    x: "49%",
    y: "38%",
    temperature: 71.5,
    vibration: 4.2,
    current: 15.8,
    speed: 860,
    runtime: 7.1,
    health: 68,
    failureProbability: 31,
    failureTime: "36 hours",
    location: "Assembly Area",
    installedOn: "10 Feb 2024",
    lastMaintenance: "25 Sep 2026",
    recommendation: "Inspect welding current and cooling system.",
    diagnosis: "High current detected with a rising temperature trend.",
  },
  {
    id: "M-08",
    name: "Conveyor A",
    status: "running",
    x: "8%",
    y: "65%",
    temperature: 45.3,
    vibration: 1.5,
    current: 5.8,
    speed: 720,
    runtime: 8.1,
    health: 95,
    failureProbability: 2,
    failureTime: "20 days",
    location: "Material Handling",
    installedOn: "15 Feb 2024",
    lastMaintenance: "01 Oct 2026",
    recommendation: "Continue normal operation.",
    diagnosis: "Conveyor performance is stable.",
  },
  {
    id: "M-09",
    name: "Heat Treatment",
    status: "critical",
    x: "25%",
    y: "65%",
    temperature: 91.8,
    vibration: 7.6,
    current: 14.2,
    speed: 1180,
    runtime: 8.4,
    health: 24,
    failureProbability: 88,
    failureTime: "5.1 hours",
    location: "Production Area 2",
    installedOn: "10 Feb 2024",
    lastMaintenance: "20 Sep 2026",
    recommendation: "Stop machine and inspect heating assembly.",
    diagnosis:
      "Temperature and vibration have exceeded safe operating limits.",
  },
  {
    id: "M-10",
    name: "Conveyor B",
    status: "running",
    x: "42%",
    y: "65%",
    temperature: 46.7,
    vibration: 1.7,
    current: 6.1,
    speed: 740,
    runtime: 7.9,
    health: 92,
    failureProbability: 4,
    failureTime: "16 days",
    location: "Material Handling",
    installedOn: "18 Feb 2024",
    lastMaintenance: "30 Sep 2026",
    recommendation: "Continue normal operation.",
    diagnosis: "Normal conveyor operation detected.",
  },
  {
    id: "M-11",
    name: "Packaging",
    status: "critical",
    x: "59%",
    y: "65%",
    temperature: 86.4,
    vibration: 8.2,
    current: 13.6,
    speed: 1420,
    runtime: 6.2,
    health: 18,
    failureProbability: 92,
    failureTime: "7.3 hours",
    location: "Production Area 2",
    installedOn: "15 Feb 2024",
    lastMaintenance: "05 May 2025",
    recommendation: "Replace motor bearing and check belt tension.",
    diagnosis:
      "High vibration and temperature trend detected in the last 2 hours indicates possible bearing wear.",
  },
];

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

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("operator");
  const [isAuthLoading, setIsAuthLoading] = useState(true);
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
      setCurrentPage("Dashboard");
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
const [isResettingPassword, setIsResettingPassword] =
  useState(false);
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
    setResetError(
      "Password must be at least 8 characters long."
    );
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
  const [currentPage, setCurrentPage] =
    useState("dashboard");
  const [selectedMachineId] = useState("M-11");

  const selectedMachine =
    machines.find((machine) => machine.id === selectedMachineId) ??
    machines[0];
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
  const healthyMachines = machines.filter(
    (machine) => machine.status === "running"
  ).length;

  const warningMachines = machines.filter(
    (machine) => machine.status === "warning"
  ).length;

  const criticalMachines = machines.filter(
    (machine) => machine.status === "critical"
  ).length;

  const healthClass =
    selectedMachine.status === "critical"
      ? "critical"
      : selectedMachine.status === "warning"
      ? "warning"
      : "healthy";
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
              Create a new password for your FactoryOS
              account.
            </p>
          </div>

          <form onSubmit={handlePasswordReset}>
            <div className="login-field">
              <label htmlFor="new-password">
                New Password
              </label>

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
              <label htmlFor="confirm-password">
                Confirm Password
              </label>

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
              <div className="login-error">
                {resetError}
              </div>
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
    setCurrentPage("Dashboard");
  }}
>
      {currentPage === "AI Assistant" ? (
        <AIAssistant machines={machines} alerts={alerts} onNavigate={setCurrentPage} />
      ) : currentPage === "Reports" ? (
        <Reports machines={machines} alerts={alerts} onNavigate={setCurrentPage} />
      ) : currentPage === "Alerts" ? (
        <Alerts machines={machines} alerts={alerts} onNavigate={setCurrentPage} />
      ) : currentPage === "Machines" ? (
        <Machines machines={machines} onNavigate={setCurrentPage} />
      ) : currentPage === "Maintenance" ? (
        <Maintenance machines={machines} onNavigate={setCurrentPage} />
      ) : currentPage === "Analytics" ? (
        <Analytics machines={machines} alerts={alerts} onNavigate={setCurrentPage} />
      ) : (
        <div className="factory-dashboard">
        {/* FACTORY MAP */}
        <section className="factory-area">
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
          <div className="factory-toolbar">
  <div className="factory-toolbar-title">
    <span className="factory-toolbar-icon">▥</span>

    <div>
      <strong>Factory Layout</strong>
      <span>Digital factory floor</span>
    </div>
  </div>

  <div className="factory-toolbar-actions">
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
            onClick={() => setBlueprintScale((s) => Math.max(0.2, +(s - 0.1).toFixed(2)))}
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
            onClick={() => setBlueprintScale((s) => Math.min(3, +(s + 0.1).toFixed(2)))}
          >
            +
          </button>
        </div>

        <button
          type="button"
          className="blueprint-action-button"
          style={{ borderColor: showAdjustPanel ? "#00b4d8" : undefined, color: showAdjustPanel ? "#ffffff" : undefined, background: showAdjustPanel ? "rgba(0,180,216,0.15)" : undefined }}
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
  </div>
</div>


          {/* Map Controls */}
          <div className="map-controls">
            <button
              type="button"
              title="Zoom In (+10%)"
              onClick={() => setBlueprintScale((s) => Math.min(3, +(s + 0.1).toFixed(2)))}
            >
              +
            </button>
            <button
              type="button"
              title="Zoom Out (-10%)"
              onClick={() => setBlueprintScale((s) => Math.max(0.2, +(s - 0.1).toFixed(2)))}
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

          {/* Blueprint Adjustment Drawer */}
          {blueprint && showBlueprint && showAdjustPanel && (
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
                  <strong style={{ color: "#00b4d8" }}>{Math.round(blueprintScale * 100)}%</strong>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.05"
                  className="adjust-control-slider"
                  value={blueprintScale}
                  onChange={(e) => setBlueprintScale(parseFloat(e.target.value))}
                />
              </div>

              {/* Opacity */}
              <div className="adjust-control-group">
                <div className="adjust-control-label">
                  <span>Opacity</span>
                  <strong style={{ color: "#00ffc4" }}>{Math.round(blueprintOpacity * 100)}%</strong>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  className="adjust-control-slider"
                  value={blueprintOpacity}
                  onChange={(e) => setBlueprintOpacity(parseFloat(e.target.value))}
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
                  onChange={(e) => setBlueprintOffsetX(parseInt(e.target.value))}
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
                  onChange={(e) => setBlueprintOffsetY(parseInt(e.target.value))}
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
                    onClick={() => { setBlueprintOffsetX(0); setBlueprintOffsetY(0); }}
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
                    className={`adjust-fit-btn ${blueprintFit === "contain" ? "active" : ""}`}
                    onClick={() => setBlueprintFit("contain")}
                  >
                    Fit (Aspect Ratio)
                  </button>
                  <button
                    type="button"
                    className={`adjust-fit-btn ${blueprintFit === "cover" ? "active" : ""}`}
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
                style={{ marginTop: "4px", textAlign: "center", width: "100%" }}
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
            <span>View All</span>
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
                <span>⚙</span>
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

              <div className="mini-chart red-chart">
                ╱╲╱╲╲╱╲╱╲
              </div>
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

              <div className="mini-chart red-chart">
                ╲╱╲╱╱╲╱╲
              </div>
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

              <div className="mini-chart red-chart">
                ╱╱╲╱╲╲╱
              </div>
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

              <button className="work-order-button" type="button">
                Create Work Order
              </button>
            </div>
          </div>
        </section>
      </div>
      )}
    </Layout>
  );
}

export default App;