import type { Machine } from "../data/machines";

interface MachineCardProps {
  machine: Machine;
  onClick: () => void;
  selected: boolean;
}

export default function MachineCard({
  machine,
  onClick,
  selected,
}: MachineCardProps) {
  return (
    <button
      className={`machine-card ${machine.status} ${
        selected ? "selected" : ""
      }`}
      style={{
        left: `${machine.x}%`,
        top: `${machine.y}%`,
      }}
      onClick={onClick}
    >
      <div className="machine-icon">⚙</div>

      <div className="machine-info">
        <strong>{machine.id}</strong>
        <span>{machine.name}</span>
      </div>

      <div className="status-dot" />
    </button>
  );
}