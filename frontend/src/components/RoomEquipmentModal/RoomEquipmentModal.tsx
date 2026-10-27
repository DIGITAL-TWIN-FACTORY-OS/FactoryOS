import React, { useState, useMemo } from "react";
import "./RoomEquipmentModal.css";
import type { Machine } from "../AddMachineModal/AddMachineModal";

interface RoomEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetName: string;
  presetId: string;
  allMachines: Machine[];
  currentMachineIds: string[];
  onSave: (selectedMachineIds: string[]) => void;
}

export const RoomEquipmentModal: React.FC<RoomEquipmentModalProps> = ({
  isOpen,
  onClose,
  presetName,
  presetId,
  allMachines,
  currentMachineIds,
  onSave,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(currentMachineIds)
  );
  const [search, setSearch] = useState("");

  // Keep state synced when opened
  React.useEffect(() => {
    setSelectedIds(new Set(currentMachineIds));
    setSearch("");
  }, [currentMachineIds, isOpen]);

  const filteredMachines = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allMachines;
    return allMachines.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        (m.type && m.type.toLowerCase().includes(q)) ||
        (m.department && m.department.toLowerCase().includes(q)) ||
        (m.location && m.location.toLowerCase().includes(q))
    );
  }, [allMachines, search]);

  if (!isOpen) return null;

  const toggleMachine = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(allMachines.map((m) => m.id)));
  };

  const handleClearAll = () => {
    setSelectedIds(new Set());
  };

  const handleAutoMatchDepartment = () => {
    const lowerName = presetName.toLowerCase();
    const matched = allMachines.filter((m) => {
      const dept = (m.department || "").toLowerCase();
      const type = (m.type || "").toLowerCase();
      const name = m.name.toLowerCase();

      if (lowerName.includes("machin") || lowerName.includes("milling") || lowerName.includes("turning")) {
        return dept.includes("machin") || dept.includes("mill") || type.includes("mill") || type.includes("cnc") || type.includes("lathe") || type.includes("drill");
      }
      if (lowerName.includes("robot") || lowerName.includes("weld")) {
        return dept.includes("robot") || dept.includes("weld") || type.includes("robot") || type.includes("weld") || name.includes("arm");
      }
      if (lowerName.includes("thermal") || lowerName.includes("pack") || lowerName.includes("furnace")) {
        return dept.includes("thermal") || dept.includes("pack") || dept.includes("heat") || type.includes("furnace") || type.includes("heat");
      }
      return true;
    });

    if (matched.length > 0) {
      setSelectedIds(new Set(matched.map((m) => m.id)));
    } else {
      handleSelectAll();
    }
  };

  const handleConfirm = () => {
    onSave(Array.from(selectedIds));
    onClose();
  };

  return (
    <div className="room-equip-overlay" onClick={onClose} data-preset-id={presetId}>
      <div className="room-equip-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="room-equip-header">
          <div className="room-equip-title-wrap">
            <span className="room-equip-icon">🏛</span>
            <div>
              <h3>Equipment Deployed in {presetName}</h3>
              <p>
                Select which machines from the factory fleet are stationed in this room layout.
              </p>
            </div>
          </div>
          <button type="button" className="room-equip-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Toolbar & Filter */}
        <div className="room-equip-toolbar">
          <div className="room-equip-search">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Search equipment by name, ID, or bay..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="room-equip-clear-search"
                onClick={() => setSearch("")}
              >
                ✕
              </button>
            )}
          </div>

          <div className="room-equip-actions">
            <button
              type="button"
              className="room-equip-btn-sec"
              onClick={handleSelectAll}
            >
              Select All ({allMachines.length})
            </button>
            <button
              type="button"
              className="room-equip-btn-sec"
              onClick={handleAutoMatchDepartment}
              title="Automatically match machines by bay type"
            >
              ⚡ Auto-Match Bay
            </button>
            <button
              type="button"
              className="room-equip-btn-sec"
              onClick={handleClearAll}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Machine List Grid */}
        <div className="room-equip-list">
          {filteredMachines.length === 0 ? (
            <div className="room-equip-empty">
              <span>No machines match "{search}"</span>
            </div>
          ) : (
            filteredMachines.map((m) => {
              const isChecked = selectedIds.has(m.id);
              return (
                <div
                  key={m.id}
                  className={`room-equip-item ${isChecked ? "selected" : ""}`}
                  onClick={() => toggleMachine(m.id)}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}} // Handled by container onClick
                    className="room-equip-checkbox"
                  />
                  <span className="room-equip-m-icon">
                    {m.name.toLowerCase().includes("robot") || m.name.toLowerCase().includes("weld") ? "🤖" :
                     m.name.toLowerCase().includes("heat") || m.name.toLowerCase().includes("furnace") ? "♨" : "⚙"}
                  </span>
                  <div className="room-equip-m-info">
                    <div className="room-equip-m-main">
                      <strong className="room-equip-m-name">{m.name}</strong>
                      <span className="room-equip-m-id">#{m.id}</span>
                      <span className={`room-equip-m-status ${m.status}`}>
                        {m.status}
                      </span>
                    </div>
                    <div className="room-equip-m-sub">
                      <span>{m.type || "Industrial Machine"}</span>
                      <span>•</span>
                      <span>{m.department || m.location || "Production Floor"}</span>
                      <span>•</span>
                      <span style={{ color: (m.health ?? 100) > 80 ? "#10b981" : (m.health ?? 100) > 60 ? "#f59e0b" : "#ef4444" }}>
                        Health: {m.health ?? 95}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="room-equip-footer">
          <span className="room-equip-summary">
            <strong>{selectedIds.size}</strong> of {allMachines.length} equipment deployed in this room layout
          </span>
          <div className="room-equip-footer-btns">
            <button
              type="button"
              className="room-equip-btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="room-equip-btn-save"
              onClick={handleConfirm}
            >
              ✓ Save Room Layout Equipment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomEquipmentModal;
