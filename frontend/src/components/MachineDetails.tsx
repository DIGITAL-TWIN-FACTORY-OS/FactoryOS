import type { Machine } from "../data/machines";

interface MachineDetailsProps {
  machine: Machine | null;
}

export default function MachineDetails({
  machine,
}: MachineDetailsProps) {
  if (!machine) {
    return (
      <div className="machine-details empty">
        <h3>Select a Machine</h3>
        <p>
          Click any machine on the factory layout to view
          its live information.
        </p>
      </div>
    );
  }

  return (
    <div className="machine-details">
      <div className="details-header">
        <div>
          <span className="eyebrow">SELECTED MACHINE</span>
          <h2>{machine.id} {machine.name}</h2>
          <p>{machine.type}</p>
        </div>

        <span className={`status-label ${machine.status}`}>
          {machine.status.toUpperCase()}
        </span>
      </div>

      <div className="machine-stats">
        <div>
          <span>Temperature</span>
          <strong>{machine.temperature} °C</strong>
        </div>

        <div>
          <span>Vibration</span>
          <strong>{machine.vibration} mm/s</strong>
        </div>

        <div>
          <span>Current</span>
          <strong>{machine.current} A</strong>
        </div>

        <div>
          <span>Speed</span>
          <strong>{machine.speed} RPM</strong>
        </div>
      </div>

      <div className="health-section">
        <div>
          <span>Health Score</span>
          <strong>{machine.healthScore}%</strong>
        </div>

        <div>
          <span>Failure Probability</span>
          <strong>{machine.failureProbability}%</strong>
        </div>
      </div>

      {machine.status === "critical" && (
        <div className="maintenance-warning">
          <strong>⚠ Immediate Maintenance Required</strong>
          <p>
            Abnormal operating parameters detected.
            Inspect the machine and create a maintenance
            work order.
          </p>

          <button className="work-order-button">
            Create Work Order
          </button>
        </div>
      )}
    </div>
  );
}