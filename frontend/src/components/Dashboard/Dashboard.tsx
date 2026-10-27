import "./Dashboard.css";

function Dashboard() {
  return (
    <div className="operator-dashboard">

      {/* PAGE HEADER */}

      <div className="dashboard-page-header">
        <div>
          <h1>Operator Dashboard</h1>
          <p>
            Factory operational overview
          </p>
        </div>

        <div className="dashboard-status">
          <span className="status-dot"></span>
          System Online
        </div>
      </div>

      {/* SUMMARY CARDS */}

      <div className="dashboard-summary">

        <div className="summary-card">
          <span className="summary-label">
            Total Machines
          </span>

          <strong>24</strong>

          <span className="summary-info">
            Factory machines
          </span>
        </div>

        <div className="summary-card">
          <span className="summary-label">
            Running
          </span>

          <strong className="green-text">
            16
          </strong>

          <span className="summary-info">
            Operating normally
          </span>
        </div>

        <div className="summary-card">
          <span className="summary-label">
            Warning
          </span>

          <strong className="yellow-text">
            5
          </strong>

          <span className="summary-info">
            Attention required
          </span>
        </div>

        <div className="summary-card">
          <span className="summary-label">
            Critical
          </span>

          <strong className="red-text">
            2
          </strong>

          <span className="summary-info">
            Immediate attention
          </span>
        </div>

      </div>

      {/* MAIN DASHBOARD GRID */}

      <div className="dashboard-main-grid">

        {/* PRODUCTION */}

        <section className="dashboard-panel production-panel">

          <div className="panel-header">
            <div>
              <h2>Current Production</h2>

              <p>
                Live factory production status
              </p>
            </div>

            <span className="panel-indicator">
              LIVE
            </span>
          </div>

          <div className="production-content">

            <div className="production-value">
              <strong>84%</strong>

              <span>
                Production efficiency
              </span>
            </div>

            <div className="production-bar">
              <div
                className="production-bar-fill"
                style={{ width: "84%" }}
              ></div>
            </div>

            <div className="production-details">

              <div>
                <span>Target</span>
                <strong>100%</strong>
              </div>

              <div>
                <span>Current</span>
                <strong>84%</strong>
              </div>

              <div>
                <span>Downtime</span>
                <strong>6%</strong>
              </div>

            </div>

          </div>

        </section>

        {/* ALERTS */}

        <section className="dashboard-panel alerts-panel">

          <div className="panel-header">
            <div>
              <h2>Recent Alerts</h2>

              <p>
                Latest operational alerts
              </p>
            </div>

            <span className="alert-count">
              6
            </span>
          </div>

          <div className="dashboard-alert">

            <span className="alert-status critical">
              !
            </span>

            <div>
              <strong>
                Machine M-04
              </strong>

              <p>
                High temperature detected
              </p>
            </div>

          </div>

          <div className="dashboard-alert">

            <span className="alert-status warning">
              !
            </span>

            <div>
              <strong>
                Machine M-07
              </strong>

              <p>
                Vibration above normal range
              </p>
            </div>

          </div>

          <div className="dashboard-alert">

            <span className="alert-status warning">
              !
            </span>

            <div>
              <strong>
                Machine M-11
              </strong>

              <p>
                Maintenance approaching
              </p>
            </div>

          </div>

        </section>

      </div>

      {/* WORK ORDERS */}

      <section className="dashboard-panel work-orders-panel">

        <div className="panel-header">

          <div>
            <h2>My Work Orders</h2>

            <p>
              Operational tasks assigned to you
            </p>
          </div>

          <span className="work-order-count">
            2 Active
          </span>

        </div>

        <div className="work-orders-list">

          <div className="work-order">

            <div className="work-order-id">
              WO-001
            </div>

            <div className="work-order-machine">
              <strong>
                Machine M-04
              </strong>

              <span>
                Temperature inspection
              </span>
            </div>

            <span className="work-order-status in-progress">
              In Progress
            </span>

          </div>

          <div className="work-order">

            <div className="work-order-id">
              WO-002
            </div>

            <div className="work-order-machine">
              <strong>
                Machine M-07
              </strong>

              <span>
                Vibration inspection
              </span>
            </div>

            <span className="work-order-status pending">
              Pending
            </span>

          </div>

        </div>

      </section>

    </div>
  );
}

export default Dashboard;