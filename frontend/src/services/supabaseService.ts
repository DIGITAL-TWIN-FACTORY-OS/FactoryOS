import { supabase } from "../lib/supabaseClient";
import type { Machine, MachineStatus } from "../components/AddMachineModal/AddMachineModal";
import type { ManagedUser } from "../pages/UserManagement/UserManagement";
import { predictMachineHealthScore } from "./aiHealthScoreModel";

export const SUPABASE_PROJECT_ID = "bsiazqbjrwaxgpzxhhqh";

const MACHINES_STORAGE_KEY = "factoryos_supabase_machines_cache";
const PROFILES_STORAGE_KEY = "factoryos_supabase_profiles_cache";
const LAYOUT_POSITIONS_KEY = "factoryos_layout_positions_v2";

interface LayoutCoordinates {
  x: string;
  y: string;
  width?: number;
  height?: number;
  isLocked?: boolean;
}

function getCachedLayoutPositions(): Record<string, LayoutCoordinates> {
  try {
    const raw = localStorage.getItem(LAYOUT_POSITIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveLayoutPosition(id: string, coords: LayoutCoordinates) {
  try {
    const current = getCachedLayoutPositions();
    current[id] = { ...current[id], ...coords };
    localStorage.setItem(LAYOUT_POSITIONS_KEY, JSON.stringify(current));
  } catch (e) {
    console.error("Failed to save layout position to storage", e);
  }
}

/**
 * Maps a Supabase `machines` row to the FactoryOS frontend `Machine` model,
 * enriching it with the Multimodal AI Model predictions.
 */
function mapDbRowToMachine(row: any, index: number): Machine {
  const layoutCache = getCachedLayoutPositions();
  const cachedPos = layoutCache[row.id];

  // Default grid position if not cached
  const defaultCols = 4;
  const col = index % defaultCols;
  const rowNum = Math.floor(index / defaultCols);
  const defaultX = `${8 + col * 22}%`;
  const defaultY = `${12 + rowNum * 26}%`;

  // Multimodal AI evaluation
  const aiResult = predictMachineHealthScore({
    name: row.machine_name || row.name || row.id,
    type: row.machine_type || "CNC Milling",
    temperature: row.temperature || 52.0,
    vibration: row.vibration || (row.status === "critical" ? 4.8 : row.status === "warning" ? 3.2 : 2.1),
    current: row.current || 8.4,
    speed: row.speed || 1400,
    runtime: row.runtime || 24,
  });

  return {
    id: row.id,
    name: row.machine_name || row.name || "Industrial Equipment",
    status: (row.status as MachineStatus) || aiResult.status,
    x: cachedPos?.x || row.x || defaultX,
    y: cachedPos?.y || row.y || defaultY,
    width: cachedPos?.width || row.width || 135,
    height: cachedPos?.height || row.height || 92,
    temperature: row.temperature || (row.status === "critical" ? 72.4 : 52.4),
    vibration: row.vibration || (row.status === "critical" ? 4.9 : 2.1),
    current: row.current || 8.4,
    speed: row.speed || 1450,
    runtime: row.runtime || 7.2,
    health: typeof row.health_score === "number" ? Math.round(row.health_score) : aiResult.healthScore,
    failureProbability: aiResult.failureProbability,
    failureTime: aiResult.remainingUsefulLifeDays,
    location: row.location || "Production Area 1",
    installedOn: row.installation_date || "12 Jan 2024",
    lastMaintenance: row.last_maintenance_date || "02 Oct 2026",
    recommendation: aiResult.recommendations[0] || "Continue normal operation.",
    diagnosis: aiResult.diagnosis,
    isLocked: cachedPos?.isLocked ?? false,
    department: row.department || "Production Bay",
    type: row.machine_type || "CNC Milling",
    flankWearMm: aiResult.predictedFlankWearMm,
  };
}

/**
 * 1. Fetch all machines from Supabase database `machines` table
 */
export async function fetchMachinesFromDb(): Promise<Machine[]> {
  try {
    const { data, error } = await supabase
      .from("machines")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && Array.isArray(data)) {
      if (data.length > 0) {
        const machines = data.map((row, idx) => mapDbRowToMachine(row, idx));
        // Cache locally for offline resiliency
        localStorage.setItem(MACHINES_STORAGE_KEY, JSON.stringify(machines));
        return machines;
      } else {
        // Table is empty in Supabase
        return [];
      }
    } else if (error) {
      console.warn("Supabase machines query error (using fallback cache):", error.message);
    }
  } catch (err) {
    console.warn("Supabase network error:", err);
  }

  // Fallback to local cache if offline
  try {
    const cached = localStorage.getItem(MACHINES_STORAGE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    // Ignore
  }
  return [];
}

/**
 * 2. Add a new machine to Supabase database
 */
export async function addMachineToDb(machineData: Partial<Machine>): Promise<Machine> {
  const machineId = machineData.id || `M-${Date.now().toString().slice(-4)}`;
  const machineName = machineData.name || "CNC Equipment";
  const machineType = machineData.type || machineName;

  // Run Multimodal AI Health Score Prediction
  const aiResult = predictMachineHealthScore({
    name: machineName,
    type: machineType,
    temperature: machineData.temperature,
    vibration: machineData.vibration,
    current: machineData.current,
    speed: machineData.speed,
    runtime: machineData.runtime,
  });

  const dbPayload = {
    id: machineId,
    machine_name: machineName,
    machine_type: machineType,
    status: machineData.status || aiResult.status,
    health_score: aiResult.healthScore,
    location: machineData.location || "Production Area 1",
    department: machineData.department || "Machining Bay",
    installation_date: machineData.installedOn || new Date().toISOString().split("T")[0],
    last_maintenance_date: machineData.lastMaintenance || new Date().toISOString().split("T")[0],
  };

  try {
    const { data, error } = await supabase.from("machines").insert(dbPayload).select();
    if (error) {
      console.warn("Supabase insert notice (RLS or policy):", error.message);
    } else {
      console.log("✓ Successfully added machine to Supabase:", data);
    }
  } catch (err) {
    console.warn("Supabase insert error:", err);
  }

  // Save layout position
  saveLayoutPosition(machineId, {
    x: machineData.x || "15%",
    y: machineData.y || "15%",
    width: machineData.width || 135,
    height: machineData.height || 92,
    isLocked: machineData.isLocked ?? false,
  });

  const fullMachine: Machine = {
    id: machineId,
    name: machineName,
    status: (machineData.status as MachineStatus) || aiResult.status,
    x: machineData.x || "15%",
    y: machineData.y || "15%",
    width: machineData.width || 135,
    height: machineData.height || 92,
    temperature: machineData.temperature || 52.0,
    vibration: machineData.vibration || 2.1,
    current: machineData.current || 8.4,
    speed: machineData.speed || 1400,
    runtime: machineData.runtime || 6.5,
    health: aiResult.healthScore,
    failureProbability: aiResult.failureProbability,
    failureTime: aiResult.remainingUsefulLifeDays,
    location: machineData.location || "Production Area 1",
    installedOn: machineData.installedOn || new Date().toLocaleDateString("en-GB"),
    lastMaintenance: machineData.lastMaintenance || new Date().toLocaleDateString("en-GB"),
    recommendation: aiResult.recommendations[0],
    diagnosis: aiResult.diagnosis,
    isLocked: machineData.isLocked ?? false,
    department: machineData.department || "Production Bay",
    type: machineType,
    flankWearMm: aiResult.predictedFlankWearMm,
  };

  // Update local cache
  try {
    const current = await fetchMachinesFromDb();
    const updated = [fullMachine, ...current.filter((m) => m.id !== machineId)];
    localStorage.setItem(MACHINES_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    // Ignore
  }

  return fullMachine;
}

/**
 * 3. Update machine layout coordinates, size, or status in Supabase database
 */
export async function updateMachineInDb(
  id: string,
  updates: Partial<Machine>
): Promise<void> {
  // Update layout coordinates cache
  if (
    updates.x !== undefined ||
    updates.y !== undefined ||
    updates.width !== undefined ||
    updates.height !== undefined ||
    updates.isLocked !== undefined
  ) {
    saveLayoutPosition(id, {
      x: updates.x || "15%",
      y: updates.y || "15%",
      width: updates.width,
      height: updates.height,
      isLocked: updates.isLocked,
    });
  }

  // Update database row
  try {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.machine_name = updates.name;
    if (updates.type) dbUpdates.machine_type = updates.type;
    if (updates.status) dbUpdates.status = updates.status;
    if (typeof updates.health === "number") dbUpdates.health_score = updates.health;
    if (updates.location) dbUpdates.location = updates.location;
    if (updates.department) dbUpdates.department = updates.department;

    if (Object.keys(dbUpdates).length > 0) {
      await supabase.from("machines").update(dbUpdates).eq("id", id);
    }
  } catch (err) {
    console.warn("Supabase update error:", err);
  }

  // Update local cache
  try {
    const raw = localStorage.getItem(MACHINES_STORAGE_KEY);
    if (raw) {
      const list: Machine[] = JSON.parse(raw);
      const updatedList = list.map((m) => (m.id === id ? { ...m, ...updates } : m));
      localStorage.setItem(MACHINES_STORAGE_KEY, JSON.stringify(updatedList));
    }
  } catch (e) {
    // Ignore
  }
}

/**
 * 4. Delete machine from Supabase database
 */
export async function deleteMachineFromDb(id: string): Promise<void> {
  try {
    const { error } = await supabase.from("machines").delete().eq("id", id);
    if (error) console.warn("Supabase delete error:", error.message);
  } catch (err) {
    console.warn("Supabase delete error:", err);
  }

  // Update local cache
  try {
    const raw = localStorage.getItem(MACHINES_STORAGE_KEY);
    if (raw) {
      const list: Machine[] = JSON.parse(raw);
      const updatedList = list.filter((m) => m.id !== id);
      localStorage.setItem(MACHINES_STORAGE_KEY, JSON.stringify(updatedList));
    }
  } catch (e) {
    // Ignore
  }
}

/**
 * 5. Fetch authorized user profiles from Supabase `profiles` table
 */
export async function fetchProfilesFromDb(): Promise<ManagedUser[]> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      const users: ManagedUser[] = data.map((p, idx) => ({
        id: p.id || `USR-${(idx + 1).toString().padStart(3, "0")}`,
        name: p.full_name || p.email?.split("@")[0] || "Authorized Personnel",
        email: p.email || "",
        role: p.role || "operator",
        department: p.department || "Plant Floor",
        shift: "General Day (08:00 - 17:00)",
        status: "active",
        createdAt: p.created_at ? new Date(p.created_at).toLocaleDateString("en-GB") : "Recently",
        createdBy: "Administrator (Supabase)",
        lastLogin: "Active in session",
      }));

      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(users));
      return users;
    }
  } catch (err) {
    console.warn("Supabase profiles query error:", err);
  }

  // Fallback to local cache
  try {
    const cached = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    // Ignore
  }
  return [];
}

/**
 * 6. Add new user profile to Supabase database
 */
export async function addProfileToDb(user: ManagedUser): Promise<void> {
  try {
    const dbPayload: any = {
      email: user.email,
      full_name: user.name,
      role: user.role,
      department: user.department,
    };
    // Include id if it exists
    if (user.id) dbPayload.id = user.id;

    const { error } = await supabase.from("profiles").upsert(dbPayload, { onConflict: "email" });
    if (error) {
      console.warn("Supabase profile upsert error:", error.message);
      // Fallback try simple insert
      await supabase.from("profiles").insert(dbPayload);
    }
  } catch (err) {
    console.warn("Supabase profile insert error:", err);
  }

  // Update local cache
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    const list: ManagedUser[] = raw ? JSON.parse(raw) : [];
    const updated = [user, ...list.filter((u) => u.email !== user.email)];
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    // Ignore
  }
}

/**
 * 7. Update user profile role in Supabase database
 */
export async function updateProfileRoleInDb(
  userId: string,
  newRole: string
): Promise<void> {
  try {
    await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
  } catch (err) {
    console.warn("Supabase profile role update error:", err);
  }

  // Update local cache
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (raw) {
      const list: ManagedUser[] = JSON.parse(raw);
      const updated = list.map((u) => (u.id === userId ? { ...u, role: newRole as any } : u));
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    // Ignore
  }
}

/**
 * 8. Delete user profile from Supabase database
 */
export async function deleteProfileFromDb(userId: string): Promise<void> {
  try {
    const { error } = await supabase.from("profiles").delete().or(`id.eq.${userId},email.eq.${userId}`);
    if (error) console.warn("Supabase profile delete error:", error.message);
  } catch (err) {
    console.warn("Supabase profile delete error:", err);
  }

  // Update local cache
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (raw) {
      const list: ManagedUser[] = JSON.parse(raw);
      const updated = list.filter((u) => u.id !== userId);
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    // Ignore
  }
}

/**
 * 9. NASA Ames / UC Berkeley MC-510V Seed Initializer
 * Seeds the Milling Center MC-510V and factory equipment to the Supabase database
 * if the database is currently empty.
 */
export const NASA_MILL_SEED_MACHINES: Partial<Machine>[] = [
  {
    id: "M-01",
    name: "Matsuura MC-510V Milling Center",
    type: "CNC Milling",
    status: "running",
    x: "8%",
    y: "12%",
    width: 145,
    height: 95,
    temperature: 52.4,
    vibration: 2.1,
    current: 8.4,
    speed: 1450,
    runtime: 7.2,
    location: "Machining Bay 1",
    department: "Matsuura Milling Cell",
    installedOn: "12 Jan 2024",
    lastMaintenance: "02 Oct 2026",
  },
  {
    id: "M-02",
    name: "CNC Turning Lathe",
    type: "CNC Turning",
    status: "running",
    x: "28%",
    y: "12%",
    width: 135,
    height: 92,
    temperature: 55.1,
    vibration: 2.4,
    current: 9.1,
    speed: 1380,
    runtime: 6.8,
    location: "Machining Bay 1",
    department: "CNC Turning",
    installedOn: "18 Jan 2024",
    lastMaintenance: "01 Oct 2026",
  },
  {
    id: "M-03",
    name: "Multi-Spindle Drilling Machine",
    type: "Drilling",
    status: "running",
    x: "48%",
    y: "12%",
    width: 135,
    height: 92,
    temperature: 50.8,
    vibration: 2.0,
    current: 7.8,
    speed: 1320,
    runtime: 7.5,
    location: "Machining Bay 1",
    department: "Drilling & Bore",
    installedOn: "20 Jan 2024",
    lastMaintenance: "03 Oct 2026",
  },
  {
    id: "M-04",
    name: "Surface & Spindle Grinding Cell",
    type: "Grinding",
    status: "warning",
    x: "68%",
    y: "12%",
    width: 135,
    height: 92,
    temperature: 68.3,
    vibration: 3.4,
    current: 11.2,
    speed: 1800,
    runtime: 11.2,
    location: "Machining Bay 2",
    department: "Precision Grinding",
    installedOn: "05 Feb 2024",
    lastMaintenance: "26 Sep 2026",
  },
  {
    id: "M-05",
    name: "Robotic Assembly Cell Alpha",
    type: "Assembly Robot 1",
    status: "running",
    x: "24%",
    y: "44%",
    width: 135,
    height: 92,
    temperature: 46.2,
    vibration: 1.8,
    current: 6.2,
    speed: 950,
    runtime: 8.0,
    location: "Assembly Line",
    department: "Robotics Cell",
    installedOn: "14 Feb 2024",
    lastMaintenance: "04 Oct 2026",
  },
  {
    id: "M-07",
    name: "High-Frequency Welding Robot",
    type: "Welding Robot",
    status: "warning",
    x: "54%",
    y: "44%",
    width: 135,
    height: 92,
    temperature: 71.0,
    vibration: 3.6,
    current: 12.8,
    speed: 1100,
    runtime: 9.4,
    location: "Welding Bay",
    department: "Thermal & Arc Joining",
    installedOn: "10 Mar 2024",
    lastMaintenance: "28 Sep 2026",
  },
  {
    id: "M-09",
    name: "Induction Heat Treatment Furnace",
    type: "Heat Treatment",
    status: "critical",
    x: "26%",
    y: "74%",
    width: 135,
    height: 92,
    temperature: 88.5,
    vibration: 4.8,
    current: 16.4,
    speed: 720,
    runtime: 14.1,
    location: "Thermal Treatment",
    department: "Thermal Processing",
    installedOn: "01 Feb 2024",
    lastMaintenance: "15 Sep 2026",
  },
  {
    id: "M-11",
    name: "Automated Packaging Station",
    type: "Packaging",
    status: "critical",
    x: "50%",
    y: "74%",
    width: 140,
    height: 95,
    temperature: 64.0,
    vibration: 4.6,
    current: 13.9,
    speed: 1650,
    runtime: 12.5,
    location: "Packaging Bay",
    department: "End-of-Line Logistics",
    installedOn: "25 Feb 2024",
    lastMaintenance: "20 Sep 2026",
  },
];

export async function seedNasaMachinesToDb(): Promise<Machine[]> {
  const seeded: Machine[] = [];
  for (const m of NASA_MILL_SEED_MACHINES) {
    const res = await addMachineToDb(m);
    seeded.push(res);
  }
  return seeded;
}


export const DEFAULT_PLANT_PROFILES: ManagedUser[] = [
  {
    id: "USR-001",
    name: "System Administrator",
    email: "admin@factoryos.internal",
    role: "admin",
    department: "Plant Management & IT",
    shift: "General Day (08:00 - 17:00)",
    status: "active",
    createdAt: "01 Jan 2026",
    createdBy: "System (Supabase)",
    lastLogin: "Active now",
  },
  {
    id: "USR-002",
    name: "Marcus Vance",
    email: "m.vance@factoryos.internal",
    role: "supervisor",
    department: "Production Area 1 (Machining)",
    shift: "Morning (06:00 - 14:00)",
    status: "active",
    createdAt: "15 Jan 2026",
    createdBy: "System Administrator",
    lastLogin: "2 hours ago",
  },
  {
    id: "USR-003",
    name: "Elena Rostova",
    email: "e.rostova@factoryos.internal",
    role: "maintenance",
    department: "Robotics & Automation Cells",
    shift: "General Day (08:00 - 17:00)",
    status: "active",
    createdAt: "20 Jan 2026",
    createdBy: "System Administrator",
    lastLogin: "1 day ago",
  },
  {
    id: "USR-004",
    name: "David Kim",
    email: "d.kim@factoryos.internal",
    role: "operator",
    department: "CNC Milling & Turning",
    shift: "Morning (06:00 - 14:00)",
    status: "active",
    createdAt: "02 Feb 2026",
    createdBy: "System Administrator",
    lastLogin: "3 hours ago",
  },
];

export async function seedDefaultProfilesToDb(): Promise<ManagedUser[]> {
  for (const u of DEFAULT_PLANT_PROFILES) {
    await addProfileToDb(u);
  }
  return DEFAULT_PLANT_PROFILES;
}


/**
 * 10. Room & Factory Layout Preset Configurations with Independent Machines & Blueprints
 */
export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  roomFilter?: string; // "all", "machining", "robotics", "thermal", "custom"
  blueprint?: string | null;
  blueprintScale?: number;
  blueprintOffsetX?: number;
  blueprintOffsetY?: number;
  blueprintOpacity?: number;
  blueprintFit?: "contain" | "cover";
  machines: Machine[]; // Fully independent array of machines belonging strictly to this layout!
  isDefault?: boolean;
  createdAt: string;
}

export const DEFAULT_LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: "preset-all",
    name: "🏭 Main Plant Floor (All Equipment)",
    description: "Default full plant floor layout with all production bays and digital twin equipment.",
    roomFilter: "all",
    isDefault: true,
    createdAt: "2026-10-28",
    blueprint: null,
    blueprintScale: 1,
    blueprintOffsetX: 0,
    blueprintOffsetY: 0,
    blueprintOpacity: 0.65,
    blueprintFit: "contain",
    machines: [
      {
        id: "M-01",
        name: "Matsuura MC-510V Milling Center",
        type: "CNC Milling",
        status: "running",
        x: "8%",
        y: "12%",
        width: 145,
        height: 95,
        temperature: 52.4,
        vibration: 2.1,
        current: 8.4,
        speed: 1450,
        runtime: 7.2,
        health: 96,
        failureProbability: 4,
        failureTime: "48 days",
        location: "Machining Bay 1",
        department: "Matsuura Milling Cell",
        installedOn: "12 Jan 2024",
        lastMaintenance: "02 Oct 2026",
        recommendation: "Operational vibration and coolant within nominal range.",
        diagnosis: "Nominal operational envelope verified.",
        flankWearMm: 0.082,
      },
      {
        id: "M-02",
        name: "CNC Turning Lathe",
        type: "CNC Turning",
        status: "running",
        x: "28%",
        y: "12%",
        width: 135,
        height: 92,
        temperature: 55.1,
        vibration: 2.4,
        current: 9.1,
        speed: 1380,
        runtime: 6.8,
        health: 94,
        failureProbability: 6,
        failureTime: "42 days",
        location: "Machining Bay 1",
        department: "CNC Turning",
        installedOn: "18 Jan 2024",
        lastMaintenance: "01 Oct 2026",
        recommendation: "Spindle load stable.",
        diagnosis: "Nominal operational envelope.",
        flankWearMm: 0.095,
      },
      {
        id: "M-03",
        name: "Multi-Spindle Drilling Machine",
        type: "Drilling",
        status: "running",
        x: "48%",
        y: "12%",
        width: 135,
        height: 92,
        temperature: 50.8,
        vibration: 2.0,
        current: 7.8,
        speed: 1320,
        runtime: 7.5,
        health: 95,
        failureProbability: 5,
        failureTime: "45 days",
        location: "Machining Bay 1",
        department: "Drilling & Bore",
        installedOn: "20 Jan 2024",
        lastMaintenance: "03 Oct 2026",
        recommendation: "Hydraulic guide pressure nominal.",
        diagnosis: "Nominal operational envelope.",
        flankWearMm: 0.078,
      },
      {
        id: "M-04",
        name: "Surface & Spindle Grinding Cell",
        type: "Grinding",
        status: "warning",
        x: "68%",
        y: "12%",
        width: 135,
        height: 92,
        temperature: 68.3,
        vibration: 3.4,
        current: 11.2,
        speed: 1800,
        runtime: 11.2,
        health: 78,
        failureProbability: 22,
        failureTime: "18 days",
        location: "Machining Bay 2",
        department: "Precision Grinding",
        installedOn: "05 Feb 2024",
        lastMaintenance: "26 Sep 2026",
        recommendation: "Check wheel dressing and hydraulic spindle bearing.",
        diagnosis: "Slight harmonic frequency elevation observed on spindle.",
        flankWearMm: 0.220,
      },
      {
        id: "M-05",
        name: "Robotic Assembly Cell Alpha",
        type: "Assembly Robot",
        status: "running",
        x: "24%",
        y: "44%",
        width: 135,
        height: 92,
        temperature: 46.2,
        vibration: 1.8,
        current: 6.2,
        speed: 950,
        runtime: 8.0,
        health: 98,
        failureProbability: 2,
        failureTime: "60 days",
        location: "Assembly Line",
        department: "Robotics Cell",
        installedOn: "14 Feb 2024",
        lastMaintenance: "04 Oct 2026",
        recommendation: "Joint harmonic drive torque verified.",
        diagnosis: "Nominal operational envelope.",
        flankWearMm: 0.045,
      },
      {
        id: "M-07",
        name: "High-Frequency Welding Robot",
        type: "Welding Robot",
        status: "warning",
        x: "54%",
        y: "44%",
        width: 135,
        height: 92,
        temperature: 71.0,
        vibration: 3.6,
        current: 12.8,
        speed: 1100,
        runtime: 9.4,
        health: 74,
        failureProbability: 26,
        failureTime: "14 days",
        location: "Welding Bay",
        department: "Thermal & Arc Joining",
        installedOn: "10 Mar 2024",
        lastMaintenance: "28 Sep 2026",
        recommendation: "Inspect torch tip nozzle and wire feeder friction.",
        diagnosis: "Elevated thermal dissipation on arc feed assembly.",
        flankWearMm: 0.260,
      },
      {
        id: "M-09",
        name: "Induction Heat Treatment Furnace",
        type: "Heat Treatment",
        status: "critical",
        x: "26%",
        y: "74%",
        width: 135,
        height: 92,
        temperature: 88.5,
        vibration: 4.8,
        current: 16.4,
        speed: 720,
        runtime: 14.1,
        health: 54,
        failureProbability: 46,
        failureTime: "4 days",
        location: "Thermal Treatment",
        department: "Thermal Processing",
        installedOn: "01 Feb 2024",
        lastMaintenance: "15 Sep 2026",
        recommendation: "Schedule immediate coil inspection and coolant purge.",
        diagnosis: "Thermal barrier degradation and high induction coil eddy current.",
        flankWearMm: 0.485,
      },
      {
        id: "M-11",
        name: "Automated Packaging Station",
        type: "Packaging",
        status: "critical",
        x: "50%",
        y: "74%",
        width: 140,
        height: 95,
        temperature: 64.0,
        vibration: 4.6,
        current: 13.9,
        speed: 1650,
        runtime: 12.5,
        health: 58,
        failureProbability: 42,
        failureTime: "5 days",
        location: "Packaging Bay",
        department: "End-of-Line Logistics",
        installedOn: "25 Feb 2024",
        lastMaintenance: "20 Sep 2026",
        recommendation: "Inspect strap tensioner and conveyor motor bearing.",
        diagnosis: "Mechanical friction and belt slippage threshold exceeded.",
        flankWearMm: 0.420,
      },
    ],
  },
  {
    id: "preset-machining",
    name: "⚙ Machining Bay 1 (Heavy Milling & Turning)",
    description: "High-precision machining cell focusing on CNC Milling, Turning, Drilling, and Surface Grinding.",
    roomFilter: "machining",
    isDefault: true,
    createdAt: "2026-10-28",
    blueprint: null,
    blueprintScale: 1,
    blueprintOffsetX: 0,
    blueprintOffsetY: 0,
    blueprintOpacity: 0.65,
    blueprintFit: "contain",
    machines: [
      {
        id: "MB-01",
        name: "Matsuura MC-510V Milling Center",
        type: "CNC Milling",
        status: "running",
        x: "15%",
        y: "22%",
        width: 155,
        height: 105,
        temperature: 52.4,
        vibration: 2.1,
        current: 8.4,
        speed: 1450,
        runtime: 7.2,
        health: 96,
        failureProbability: 4,
        failureTime: "48 days",
        location: "Machining Bay 1",
        department: "Heavy Milling Cell",
        installedOn: "12 Jan 2024",
        lastMaintenance: "02 Oct 2026",
        recommendation: "Operational vibration and coolant within nominal range.",
        diagnosis: "Nominal operational envelope verified.",
        flankWearMm: 0.082,
      },
      {
        id: "MB-02",
        name: "Haas VF-2 Vertical Machining Center",
        type: "CNC Milling",
        status: "running",
        x: "42%",
        y: "22%",
        width: 145,
        height: 100,
        temperature: 54.2,
        vibration: 2.3,
        current: 8.9,
        speed: 1400,
        runtime: 6.5,
        health: 95,
        failureProbability: 5,
        failureTime: "44 days",
        location: "Machining Bay 1",
        department: "Vertical Milling",
        installedOn: "18 Jan 2024",
        lastMaintenance: "01 Oct 2026",
        recommendation: "Spindle load stable.",
        diagnosis: "Nominal operational envelope.",
        flankWearMm: 0.091,
      },
      {
        id: "MB-03",
        name: "Mazak Quick Turn 250 Lathe",
        type: "CNC Turning",
        status: "running",
        x: "68%",
        y: "22%",
        width: 145,
        height: 100,
        temperature: 51.5,
        vibration: 2.0,
        current: 7.9,
        speed: 1350,
        runtime: 7.1,
        health: 96,
        failureProbability: 4,
        failureTime: "50 days",
        location: "Machining Bay 1",
        department: "Precision Turning",
        installedOn: "20 Jan 2024",
        lastMaintenance: "03 Oct 2026",
        recommendation: "Turret index alignment nominal.",
        diagnosis: "Nominal operational envelope.",
        flankWearMm: 0.075,
      },
      {
        id: "MB-04",
        name: "Makino a51nx Horizontal Machining",
        type: "Horizontal Milling",
        status: "warning",
        x: "42%",
        y: "62%",
        width: 145,
        height: 100,
        temperature: 66.8,
        vibration: 3.2,
        current: 11.5,
        speed: 1650,
        runtime: 10.4,
        health: 79,
        failureProbability: 21,
        failureTime: "20 days",
        location: "Machining Bay 1",
        department: "Horizontal Milling",
        installedOn: "05 Feb 2024",
        lastMaintenance: "26 Sep 2026",
        recommendation: "Monitor pallet changer hydraulics and spindle chiller.",
        diagnosis: "Moderate cutting load current elevation.",
        flankWearMm: 0.210,
      },
    ],
  },
  {
    id: "preset-robotics",
    name: "🤖 Robotics & Arc Welding Cell",
    description: "Automated fabrication and welding line featuring robotic arms and joining stations.",
    roomFilter: "robotics",
    isDefault: true,
    createdAt: "2026-10-28",
    blueprint: null,
    blueprintScale: 1,
    blueprintOffsetX: 0,
    blueprintOffsetY: 0,
    blueprintOpacity: 0.65,
    blueprintFit: "contain",
    machines: [
      {
        id: "RB-01",
        name: "KUKA KR-10 Cybertech 6-Axis",
        type: "Industrial Robotics",
        status: "running",
        x: "22%",
        y: "30%",
        width: 160,
        height: 110,
        temperature: 46.2,
        vibration: 1.8,
        current: 6.2,
        speed: 950,
        runtime: 8.0,
        health: 98,
        failureProbability: 2,
        failureTime: "60 days",
        location: "Robotics Cell",
        department: "Robotic Articulation",
        installedOn: "14 Feb 2024",
        lastMaintenance: "04 Oct 2026",
        recommendation: "Joint harmonic drive torque verified.",
        diagnosis: "Nominal operational envelope.",
        flankWearMm: 0.045,
      },
      {
        id: "RB-02",
        name: "Fanuc ARC Mate 120iD Welding Cell",
        type: "Welding Robot",
        status: "warning",
        x: "58%",
        y: "30%",
        width: 160,
        height: 110,
        temperature: 71.0,
        vibration: 3.6,
        current: 12.8,
        speed: 1100,
        runtime: 9.4,
        health: 74,
        failureProbability: 26,
        failureTime: "14 days",
        location: "Robotics Cell",
        department: "Thermal & Arc Joining",
        installedOn: "10 Mar 2024",
        lastMaintenance: "28 Sep 2026",
        recommendation: "Inspect torch tip nozzle and wire feeder friction.",
        diagnosis: "Elevated thermal dissipation on arc feed assembly.",
        flankWearMm: 0.260,
      },
      {
        id: "RB-03",
        name: "Zeiss Prismo CMM Quality Station",
        type: "CMM QA",
        status: "running",
        x: "40%",
        y: "65%",
        width: 150,
        height: 100,
        temperature: 42.1,
        vibration: 0.8,
        current: 3.4,
        speed: 400,
        runtime: 4.2,
        health: 99,
        failureProbability: 1,
        failureTime: "90 days",
        location: "Robotics Cell",
        department: "Metrology & QA",
        installedOn: "01 Mar 2024",
        lastMaintenance: "05 Oct 2026",
        recommendation: "Optical stylus calibration verified.",
        diagnosis: "Sub-micron calibration nominal.",
        flankWearMm: 0.012,
      },
    ],
  },
  {
    id: "preset-thermal",
    name: "♨ Thermal Treatment & Packaging Bay",
    description: "High-temperature induction furnace and final packaging logistics cell.",
    roomFilter: "thermal",
    isDefault: true,
    createdAt: "2026-10-28",
    blueprint: null,
    blueprintScale: 1,
    blueprintOffsetX: 0,
    blueprintOffsetY: 0,
    blueprintOpacity: 0.65,
    blueprintFit: "contain",
    machines: [
      {
        id: "TH-01",
        name: "Induction Heat Treatment Furnace",
        type: "Heat Treatment",
        status: "critical",
        x: "28%",
        y: "38%",
        width: 165,
        height: 115,
        temperature: 88.5,
        vibration: 4.8,
        current: 16.4,
        speed: 720,
        runtime: 14.1,
        health: 54,
        failureProbability: 46,
        failureTime: "4 days",
        location: "Thermal Treatment",
        department: "Thermal Processing",
        installedOn: "01 Feb 2024",
        lastMaintenance: "15 Sep 2026",
        recommendation: "Schedule immediate coil inspection and coolant purge.",
        diagnosis: "Thermal barrier degradation and high induction coil eddy current.",
        flankWearMm: 0.485,
      },
      {
        id: "TH-02",
        name: "Automated Strapping & Packaging Cell",
        type: "Packaging",
        status: "critical",
        x: "62%",
        y: "38%",
        width: 155,
        height: 105,
        temperature: 64.0,
        vibration: 4.6,
        current: 13.9,
        speed: 1650,
        runtime: 12.5,
        health: 58,
        failureProbability: 42,
        failureTime: "5 days",
        location: "Packaging Bay",
        department: "End-of-Line Logistics",
        installedOn: "25 Feb 2024",
        lastMaintenance: "20 Sep 2026",
        recommendation: "Inspect strap tensioner and conveyor motor bearing.",
        diagnosis: "Mechanical friction and belt slippage threshold exceeded.",
        flankWearMm: 0.420,
      },
    ],
  },
];

const PRESETS_STORAGE_KEY = "factoryos_room_presets_cache_v3";

function openPresetDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open("FactoryOS_PresetDB_v3", 1);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("presets")) {
          db.createObjectStore("presets", { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function fetchLayoutPresetsFromDb(): Promise<LayoutPreset[]> {
  try {
    const db = await openPresetDb();
    if (db) {
      const storedPresets: LayoutPreset[] = await new Promise((resolve) => {
        try {
          const tx = db.transaction("presets", "readonly");
          const req = tx.objectStore("presets").getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        } catch {
          resolve([]);
        }
      });

      if (storedPresets && storedPresets.length > 0) {
        const merged = [...storedPresets];
        DEFAULT_LAYOUT_PRESETS.forEach((def) => {
          if (!merged.some((p) => p.id === def.id)) {
            merged.push(def);
          }
        });
        return merged;
      }
    }
  } catch (err) {
    console.warn("IndexedDB load notice:", err);
  }

  try {
    const cached = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (cached) {
      const list = JSON.parse(cached);
      if (Array.isArray(list) && list.length > 0) {
        const merged = [...list];
        DEFAULT_LAYOUT_PRESETS.forEach((def) => {
          if (!merged.some((p) => p.id === def.id)) {
            merged.push(def);
          }
        });
        return merged;
      }
    }
  } catch {
    // Ignore
  }

  // Seed IndexedDB with defaults
  try {
    const db = await openPresetDb();
    if (db) {
      const tx = db.transaction("presets", "readwrite");
      DEFAULT_LAYOUT_PRESETS.forEach((def) => tx.objectStore("presets").put(def));
    }
  } catch {
    // Ignore
  }

  return DEFAULT_LAYOUT_PRESETS;
}

export async function saveLayoutPresetToDb(preset: LayoutPreset): Promise<void> {
  try {
    const db = await openPresetDb();
    if (db) {
      const tx = db.transaction("presets", "readwrite");
      tx.objectStore("presets").put(preset);
    }
  } catch (err) {
    console.warn("IndexedDB write error:", err);
  }

  try {
    const cached = await fetchLayoutPresetsFromDb();
    const updated = [...cached.filter((p) => p.id !== preset.id), preset];
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      const lightweight = updated.map((p) => ({ ...p, blueprint: null }));
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(lightweight));
    }
  } catch {
    // Ignore
  }
}

export async function deleteLayoutPresetFromDb(presetId: string): Promise<void> {
  try {
    const db = await openPresetDb();
    if (db) {
      const tx = db.transaction("presets", "readwrite");
      tx.objectStore("presets").delete(presetId);
    }
  } catch (err) {
    console.warn("IndexedDB delete error:", err);
  }

  try {
    const cached = await fetchLayoutPresetsFromDb();
    const filtered = cached.filter((p) => p.id !== presetId);
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // Ignore
  }
}
