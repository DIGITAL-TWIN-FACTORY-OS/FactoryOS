import React, { useState, useMemo } from "react";
import "./AddMachineModal.css";
import { predictMachineHealthScore } from "../../services/aiHealthScoreModel";

export type MachineStatus = "running" | "warning" | "critical";

export interface Machine {
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
  width?: number;
  height?: number;
  scale?: number;
  isLocked?: boolean;
  department?: string;
  type?: string;
  flankWearMm?: number;
}

export interface EquipmentPreset {
  id: string;
  name: string;
  category: "Machining" | "Robotics" | "Press & Forming" | "Thermal & Coating" | "Material Handling" | "Quality & Inspection" | "Facility & Utilities";
  icon: string;
  defaultLocation: string;
  description: string;
  defaultTemp: number;
  defaultVib: number;
  defaultCurrent: number;
  defaultSpeed: number;
  health: number;
  status: MachineStatus;
}

const EQUIPMENT_CATALOG: EquipmentPreset[] = [
  {
    id: "CNC-MILL",
    name: "5-Axis CNC Milling Center",
    category: "Machining",
    icon: "⚙",
    defaultLocation: "Production Area 1",
    description: "High-precision 5-axis simultaneous milling for titanium and alloy components.",
    defaultTemp: 52.5,
    defaultVib: 2.2,
    defaultCurrent: 8.8,
    defaultSpeed: 14500,
    health: 95,
    status: "running",
  },
  {
    id: "CNC-LATHE",
    name: "CNC Precision Lathe",
    category: "Machining",
    icon: "⚙",
    defaultLocation: "Production Area 1",
    description: "Dual-spindle live tooling turning center for shaft and cylindrical fabrication.",
    defaultTemp: 54.0,
    defaultVib: 2.1,
    defaultCurrent: 9.2,
    defaultSpeed: 4200,
    health: 93,
    status: "running",
  },
  {
    id: "SURF-GRIND",
    name: "High-Precision Surface Grinder",
    category: "Machining",
    icon: "⚙",
    defaultLocation: "Production Area 1",
    description: "Reciprocating surface grinding station with electromagnetic chuck table.",
    defaultTemp: 64.2,
    defaultVib: 3.8,
    defaultCurrent: 7.5,
    defaultSpeed: 2850,
    health: 86,
    status: "running",
  },
  {
    id: "LASER-CUT",
    name: "Fiber Laser Cutting System (6kW)",
    category: "Machining",
    icon: "✦",
    defaultLocation: "Production Area 1",
    description: "Continuous wave fiber laser for 25mm mild steel and stainless sheet cutting.",
    defaultTemp: 44.5,
    defaultVib: 1.4,
    defaultCurrent: 22.0,
    defaultSpeed: 1800,
    health: 96,
    status: "running",
  },
  {
    id: "HYD-PRESS",
    name: "500-Ton Hydraulic Stamping Press",
    category: "Press & Forming",
    icon: "▼",
    defaultLocation: "Production Area 2",
    description: "Heavy tonnage deep drawing and sheet stamping press with proportional servo valves.",
    defaultTemp: 58.7,
    defaultVib: 3.5,
    defaultCurrent: 28.4,
    defaultSpeed: 45,
    health: 89,
    status: "running",
  },
  {
    id: "CNC-BRAKE",
    name: "CNC Servo Press Brake (200T)",
    category: "Press & Forming",
    icon: "▼",
    defaultLocation: "Production Area 2",
    description: "Multi-axis synchronized backgauge press brake for sheet metal bending.",
    defaultTemp: 46.8,
    defaultVib: 1.9,
    defaultCurrent: 11.2,
    defaultSpeed: 80,
    health: 94,
    status: "running",
  },
  {
    id: "ROBOT-ARM",
    name: "6-Axis Articulated Assembly Robot",
    category: "Robotics",
    icon: "🤖",
    defaultLocation: "Assembly Area",
    description: "High-speed pick-and-place manipulator with pneumatic vacuum gripper.",
    defaultTemp: 48.0,
    defaultVib: 1.7,
    defaultCurrent: 6.8,
    defaultSpeed: 980,
    health: 94,
    status: "running",
  },
  {
    id: "ROBOT-WELD",
    name: "Robotic MIG/TIG Welding Cell",
    category: "Robotics",
    icon: "⚡",
    defaultLocation: "Assembly Area",
    description: "Automated welding station with seam tracking laser optics and fume extractor.",
    defaultTemp: 68.4,
    defaultVib: 3.6,
    defaultCurrent: 16.5,
    defaultSpeed: 860,
    health: 82,
    status: "running",
  },
  {
    id: "COBOT-PACK",
    name: "Collaborative Palletizing Cobot",
    category: "Robotics",
    icon: "🤖",
    defaultLocation: "Assembly Area",
    description: "Safe human-robot collaborative arm for end-of-line pallet box stacking.",
    defaultTemp: 43.1,
    defaultVib: 1.2,
    defaultCurrent: 4.5,
    defaultSpeed: 750,
    health: 97,
    status: "running",
  },
  {
    id: "BELT-CONV",
    name: "Heavy-Duty Variable Belt Conveyor",
    category: "Material Handling",
    icon: "⇄",
    defaultLocation: "Material Handling",
    description: "Inverter-driven modular link conveyor for raw billet and cast transfer.",
    defaultTemp: 45.0,
    defaultVib: 1.5,
    defaultCurrent: 5.6,
    defaultSpeed: 720,
    health: 95,
    status: "running",
  },
  {
    id: "ROLL-CONV",
    name: "Powered Roller Conveyor System",
    category: "Material Handling",
    icon: "⇄",
    defaultLocation: "Material Handling",
    description: "Zone-controlled 24V motorized roller conveyor for totes and boxes.",
    defaultTemp: 42.8,
    defaultVib: 1.3,
    defaultCurrent: 4.2,
    defaultSpeed: 680,
    health: 96,
    status: "running",
  },
  {
    id: "AGV-DOCK",
    name: "Autonomous Mobile Robot (AMR) Dock",
    category: "Material Handling",
    icon: "⇶",
    defaultLocation: "Material Handling",
    description: "Fleet charging station and automated payload transfer station for mobile robots.",
    defaultTemp: 39.5,
    defaultVib: 0.8,
    defaultCurrent: 14.0,
    defaultSpeed: 0,
    health: 98,
    status: "running",
  },
  {
    id: "HEAT-FURN",
    name: "Vacuum Heat Treatment Furnace",
    category: "Thermal & Coating",
    icon: "♨",
    defaultLocation: "Production Area 2",
    description: "Horizontal quenching and tempering vacuum furnace rated to 1,200 °C.",
    defaultTemp: 88.0,
    defaultVib: 4.5,
    defaultCurrent: 35.0,
    defaultSpeed: 600,
    health: 79,
    status: "warning",
  },
  {
    id: "INJ-MOLD",
    name: "Plastic Injection Molding Machine (350T)",
    category: "Thermal & Coating",
    icon: "♨",
    defaultLocation: "Production Area 2",
    description: "Servo-hydraulic clamping injection molder with 5-zone PID barrel heating.",
    defaultTemp: 76.5,
    defaultVib: 3.1,
    defaultCurrent: 24.0,
    defaultSpeed: 1200,
    health: 88,
    status: "running",
  },
  {
    id: "AUTO-PACK",
    name: "High-Speed Automated Packaging Station",
    category: "Thermal & Coating",
    icon: "▣",
    defaultLocation: "Production Area 2",
    description: "Continuous motion cartoning, hot-melt adhesive sealing, and shrink wrapper.",
    defaultTemp: 62.0,
    defaultVib: 4.8,
    defaultCurrent: 12.5,
    defaultSpeed: 1400,
    health: 84,
    status: "running",
  },
  {
    id: "AOI-SCAN",
    name: "Automated Optical Inspection (AOI)",
    category: "Quality & Inspection",
    icon: "🔍",
    defaultLocation: "Quality Lab",
    description: "Multi-camera telecentric vision inspection system with AI defect detection.",
    defaultTemp: 36.2,
    defaultVib: 0.5,
    defaultCurrent: 3.2,
    defaultSpeed: 0,
    health: 99,
    status: "running",
  },
  {
    id: "CMM-SCAN",
    name: "Coordinate Measuring Machine (CMM)",
    category: "Quality & Inspection",
    icon: "⌖",
    defaultLocation: "Quality Lab",
    description: "Granite bridge 3D coordinate measuring system with 0.8um scanning probe.",
    defaultTemp: 21.0,
    defaultVib: 0.2,
    defaultCurrent: 2.4,
    defaultSpeed: 0,
    health: 99,
    status: "running",
  },
  {
    id: "AIR-COMP",
    name: "Rotary Screw Air Compressor (75kW)",
    category: "Facility & Utilities",
    icon: "💨",
    defaultLocation: "Utility Bay",
    description: "Variable speed lubricated screw compressor delivering 10.5 bar dry pneumatic air.",
    defaultTemp: 68.0,
    defaultVib: 3.2,
    defaultCurrent: 18.5,
    defaultSpeed: 3000,
    health: 91,
    status: "running",
  },
  {
    id: "WTR-CHILL",
    name: "Industrial Process Water Chiller",
    category: "Facility & Utilities",
    icon: "❄",
    defaultLocation: "Utility Bay",
    description: "150 kW dual-circuit scroll compressor water chiller with electronic expansion valve.",
    defaultTemp: 41.5,
    defaultVib: 2.0,
    defaultCurrent: 15.2,
    defaultSpeed: 2900,
    health: 94,
    status: "running",
  },
];

interface AddMachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMachine: (machine: Machine) => void;
  existingCount: number;
}

export const AddMachineModal: React.FC<AddMachineModalProps> = ({
  isOpen,
  onClose,
  onAddMachine,
  existingCount,
}) => {
  const [activeTab, setActiveTab] = useState<"catalog" | "custom">("catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Custom Machine Form State
  const nextNumber = existingCount + 1;
  const defaultCustomId = `M-${nextNumber < 10 ? "0" + nextNumber : nextNumber}`;
  const [customId, setCustomId] = useState(defaultCustomId);
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState("Machining");
  const [customIcon, setCustomIcon] = useState("⚙");
  const [customLocation, setCustomLocation] = useState("Production Area 1");
  const [customStatus, setCustomStatus] = useState<MachineStatus>("running");
  const [customTemp, setCustomTemp] = useState("50.0");
  const [customVib, setCustomVib] = useState("2.0");
  const [customCurrent, setCustomCurrent] = useState("8.0");
  const [customSpeed, setCustomSpeed] = useState("1400");
  const [customHealth, setCustomHealth] = useState("95");

  const categories = [
    "All",
    "Machining",
    "Robotics",
    "Press & Forming",
    "Material Handling",
    "Thermal & Coating",
    "Quality & Inspection",
    "Facility & Utilities",
  ];

  const filteredCatalog = useMemo(() => {
    return EQUIPMENT_CATALOG.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.defaultLocation.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === "All" || item.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [searchQuery, selectedCategory]);

  if (!isOpen) return null;

  const handleAddPreset = (preset: EquipmentPreset) => {
    const nextId = `M-${(existingCount + 1) < 10 ? "0" + (existingCount + 1) : existingCount + 1}`;
    
    // Stagger initial placement on the layout floor
    const staggerIndex = existingCount % 8;
    const defaultX = `${15 + (staggerIndex % 4) * 22}%`;
    const defaultY = `${20 + Math.floor(staggerIndex / 4) * 35}%`;

    // Multimodal AI Health Score Prediction
    const aiPrediction = predictMachineHealthScore({
      name: preset.name,
      type: preset.category,
      temperature: preset.defaultTemp,
      vibration: preset.defaultVib,
      current: preset.defaultCurrent,
      speed: preset.defaultSpeed,
      runtime: 6.5,
    });

    const newMachine: Machine = {
      id: nextId,
      name: preset.name,
      status: aiPrediction.status,
      x: defaultX,
      y: defaultY,
      temperature: preset.defaultTemp,
      vibration: preset.defaultVib,
      current: preset.defaultCurrent,
      speed: preset.defaultSpeed,
      runtime: +(Math.random() * 8 + 4).toFixed(1),
      health: aiPrediction.healthScore,
      failureProbability: aiPrediction.failureProbability,
      failureTime: aiPrediction.remainingUsefulLifeDays,
      location: preset.defaultLocation,
      installedOn: new Date().toLocaleDateString("en-GB"),
      lastMaintenance: new Date().toLocaleDateString("en-GB"),
      recommendation: aiPrediction.recommendations[0],
      diagnosis: aiPrediction.diagnosis,
      flankWearMm: aiPrediction.predictedFlankWearMm,
    };

    onAddMachine(newMachine);
    onClose();
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      alert("Please enter a machine name.");
      return;
    }

    const staggerIndex = existingCount % 8;
    const defaultX = `${18 + (staggerIndex % 4) * 20}%`;
    const defaultY = `${25 + Math.floor(staggerIndex / 4) * 30}%`;

    const parsedTemp = parseFloat(customTemp) || 50.0;
    const parsedVib = parseFloat(customVib) || 2.0;
    const parsedCurr = parseFloat(customCurrent) || 8.0;
    const parsedSpeed = parseInt(customSpeed) || 1200;

    const aiPrediction = predictMachineHealthScore({
      name: customName.trim(),
      temperature: parsedTemp,
      vibration: parsedVib,
      current: parsedCurr,
      speed: parsedSpeed,
      runtime: 5.0,
    });

    const newMachine: Machine = {
      id: customId.trim() || defaultCustomId,
      name: customName.trim(),
      status: customStatus || aiPrediction.status,
      x: defaultX,
      y: defaultY,
      temperature: parsedTemp,
      vibration: parsedVib,
      current: parsedCurr,
      speed: parsedSpeed,
      runtime: 5.0,
      health: aiPrediction.healthScore,
      failureProbability: aiPrediction.failureProbability,
      failureTime: aiPrediction.remainingUsefulLifeDays,
      location: customLocation,
      installedOn: new Date().toLocaleDateString("en-GB"),
      lastMaintenance: new Date().toLocaleDateString("en-GB"),
      recommendation: aiPrediction.recommendations[0],
      diagnosis: aiPrediction.diagnosis,
      flankWearMm: aiPrediction.predictedFlankWearMm,
    };

    onAddMachine(newMachine);
    onClose();
  };

  return (
    <div className="add-machine-backdrop" onClick={onClose}>
      <div className="add-machine-modal" onClick={(e) => e.stopPropagation()}>
        {/* MODAL HEADER */}
        <div className="add-machine-header">
          <div className="add-machine-title">
            <span className="add-machine-title-icon">＋</span>
            <div>
              <h3>Add Machine & Equipment to Layout</h3>
              <p>Deploy industrial equipment directly onto your factory floor map</p>
            </div>
          </div>
          <button
            type="button"
            className="add-machine-close-btn"
            onClick={onClose}
            title="Close modal"
          >
            ✕
          </button>
        </div>

        {/* SUB-TABS */}
        <div className="add-machine-tabs">
          <button
            type="button"
            className={`add-machine-tab-btn ${activeTab === "catalog" ? "active" : ""}`}
            onClick={() => setActiveTab("catalog")}
          >
            <span>▦</span>
            <span>Equipment Catalog ({EQUIPMENT_CATALOG.length})</span>
          </button>
          <button
            type="button"
            className={`add-machine-tab-btn ${activeTab === "custom" ? "active" : ""}`}
            onClick={() => setActiveTab("custom")}
          >
            <span>⚙</span>
            <span>Custom Machine Builder</span>
          </button>
        </div>

        {activeTab === "catalog" ? (
          <div className="catalog-content">
            {/* SEARCH & FILTERS */}
            <div className="catalog-search-bar">
              <div className="catalog-search-input-wrap">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search machines by name, type, department, or keywords (e.g. CNC, Robot, Press, Conveyor)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => setSearchQuery("")}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* CATEGORY PILLS */}
            <div className="catalog-category-pills">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`category-pill ${selectedCategory === cat ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* CATALOG GRID */}
            <div className="catalog-grid">
              {filteredCatalog.length === 0 ? (
                <div className="catalog-empty">
                  <span>⚙</span>
                  <h4>No matching equipment found</h4>
                  <p>Try searching for other keywords like "Milling", "Robot", "Press", or build a custom unit.</p>
                  <button
                    type="button"
                    className="btn-create-custom"
                    onClick={() => setActiveTab("custom")}
                  >
                    Build Custom Machine ➔
                  </button>
                </div>
              ) : (
                filteredCatalog.map((preset) => (
                  <div key={preset.id} className="catalog-card">
                    <div className="card-top-row">
                      <div className="catalog-icon-box">{preset.icon}</div>
                      <div className="card-meta">
                        <span className="card-category">{preset.category}</span>
                        <span className="card-location">📍 {preset.defaultLocation}</span>
                      </div>
                    </div>
                    <div className="card-body">
                      <h4>{preset.name}</h4>
                      <p>{preset.description}</p>
                    </div>
                    <div className="card-specs">
                      <div className="spec-pill">
                        <span>Temp</span>
                        <strong>{preset.defaultTemp}°C</strong>
                      </div>
                      <div className="spec-pill">
                        <span>Current</span>
                        <strong>{preset.defaultCurrent}A</strong>
                      </div>
                      <div className="spec-pill">
                        <span>Vib</span>
                        <strong>{preset.defaultVib} mm/s</strong>
                      </div>
                      <div className="spec-pill">
                        <span>Health</span>
                        <strong className="green-txt">{preset.health}%</strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="card-add-btn"
                      onClick={() => handleAddPreset(preset)}
                    >
                      <span>＋</span>
                      <span>Add to Floor Layout</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* CUSTOM MACHINE BUILDER */
          <form className="custom-builder-form" onSubmit={handleAddCustom}>
            <div className="builder-intro">
              <h4>Define Custom Equipment Specifications</h4>
              <p>Configure custom machine identifiers, sensor thresholds, and default factory location.</p>
            </div>

            <div className="builder-row">
              <div className="builder-field">
                <label>Machine ID *</label>
                <input
                  type="text"
                  value={customId}
                  onChange={(e) => setCustomId(e.target.value)}
                  placeholder="e.g. M-12"
                  required
                />
                <small>Unique digital twin asset tag</small>
              </div>

              <div className="builder-field">
                <label>Machine Name *</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. CNC Horizontal Milling"
                  required
                />
                <small>Descriptive asset title</small>
              </div>
            </div>

            <div className="builder-row">
              <div className="builder-field">
                <label>Department / Location</label>
                <select
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                >
                  <option value="Production Area 1">Production Area 1 (Machining)</option>
                  <option value="Production Area 2">Production Area 2 (Forming & Thermal)</option>
                  <option value="Assembly Area">Assembly Area (Robotics & Cell)</option>
                  <option value="Material Handling">Material Handling (Conveyors & AGV)</option>
                  <option value="Quality Lab">Quality Lab (Metrology & Inspection)</option>
                  <option value="Utility Bay">Utility Bay (Compressors & HVAC)</option>
                </select>
              </div>

              <div className="builder-field">
                <label>Equipment Category</label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                >
                  <option value="Machining">Machining (CNC / Lathe / Mill)</option>
                  <option value="Robotics">Robotics & Automation</option>
                  <option value="Press & Forming">Press & Metal Forming</option>
                  <option value="Thermal & Coating">Thermal & Heat Treatment</option>
                  <option value="Material Handling">Material Handling & Conveyor</option>
                  <option value="Quality & Inspection">Quality & Metrology</option>
                  <option value="Facility & Utilities">Facility & Utilities</option>
                </select>
              </div>
            </div>

            <div className="builder-row">
              <div className="builder-field">
                <label>Visual Symbol</label>
                <div className="icon-selector-pills">
                  {["⚙", "🤖", "⚡", "⇄", "♨", "📦", "▼", "✦", "🔍", "❄", "⌖"].map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      className={`icon-pill ${customIcon === icon ? "active" : ""}`}
                      onClick={() => setCustomIcon(icon)}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="builder-field">
                <label>Initial Status</label>
                <div className="status-selector-pills">
                  <button
                    type="button"
                    className={`status-pill running ${customStatus === "running" ? "active" : ""}`}
                    onClick={() => setCustomStatus("running")}
                  >
                    ● Running / Healthy
                  </button>
                  <button
                    type="button"
                    className={`status-pill warning ${customStatus === "warning" ? "active" : ""}`}
                    onClick={() => setCustomStatus("warning")}
                  >
                    ▲ Warning Alert
                  </button>
                  <button
                    type="button"
                    className={`status-pill critical ${customStatus === "critical" ? "active" : ""}`}
                    onClick={() => setCustomStatus("critical")}
                  >
                    ♨ Critical Alert
                  </button>
                </div>
              </div>
            </div>

            <div className="builder-telemetry-box">
              <h5>Initial Sensor Telemetry</h5>
              <div className="telemetry-inputs-grid">
                <div>
                  <label>Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={customTemp}
                    onChange={(e) => setCustomTemp(e.target.value)}
                  />
                </div>
                <div>
                  <label>Vibration (mm/s)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={customVib}
                    onChange={(e) => setCustomVib(e.target.value)}
                  />
                </div>
                <div>
                  <label>Current Draw (A)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={customCurrent}
                    onChange={(e) => setCustomCurrent(e.target.value)}
                  />
                </div>
                <div>
                  <label>Spindle Speed (RPM)</label>
                  <input
                    type="number"
                    value={customSpeed}
                    onChange={(e) => setCustomSpeed(e.target.value)}
                  />
                </div>
                <div>
                  <label>Health Score (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={customHealth}
                    onChange={(e) => setCustomHealth(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="builder-actions">
              <button
                type="button"
                className="builder-btn-cancel"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="builder-btn-submit"
              >
                <span>＋</span>
                <span>Deploy Machine to Layout Floor</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddMachineModal;
