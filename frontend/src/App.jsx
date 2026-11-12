
import React, { useEffect, useState } from "react";

const API = "http://localhost:5000/api";

const fmt = n => Number(n || 0).toLocaleString("en-IN");

function App() {
  const [vehicles, setVehicles] = useState([]);
  const [selected, setSelected] = useState("");
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // LOAD VEHICLES
  async function load() {
    try {
      const response = await fetch(`${API}/vehicles`);

      if (!response.ok) {
        throw new Error("Could not load vehicles. Is Flask running?");
      }

      const data = await response.json();

      setVehicles(data);
      setSelected(old =>
        data.some(v => v.id === old) ? old : data[0]?.id || ""
      );

      setError("");
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const vehicle = vehicles.find(v => v.id === selected);

  // FLEET STATISTICS
  const count = level =>
    vehicles.filter(v => v.analysis?.risk === level).length;

  const totalLoad = vehicles.reduce(
    (sum, v) => sum + Number(v.loadKg || 0), 0
  );

  const totalCapacity = vehicles.reduce(
    (sum, v) => sum + Number(v.capacityKg || 0), 0
  );

  const fleetUtilization = totalCapacity
    ? ((totalLoad / totalCapacity) * 100).toFixed(1)
    : "0.0";

  // ALL CURRENT FLEET ALERTS
  const currentAlerts = vehicles.flatMap(v =>
    (v.analysis?.alerts || []).map((a, i) => ({
      ...a,
      vehicleId: v.id,
      vehicleName: v.name,
      eventKey: `${v.id}-${i}-${a.title}`
    }))
  );

  // SIMULATION
  async function simulate(scenario) {
    if (!selected || busy) return;

    setBusy(true);

    try {
      const response = await fetch(
        `${API}/vehicles/${selected}/simulate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ scenario })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Simulation failed");
      }

      setVehicles(old =>
        old.map(v => v.id === data.id ? data : v)
      );

      const timestamp = new Date().toLocaleTimeString();

      // RECORD SIMULATION EVENTS
      if (scenario === "normal") {
        setHistory(old => [{
          title: "Load reset to normal",
          detail: `${data.id} · Demo vehicle readings returned to normal.`,
          level: "normal",
          vehicleId: data.id,
          time: timestamp
        }, ...old]);
      } else {
        const alerts = data.analysis?.alerts || [];

        const newEvents = alerts.map(a => ({
          title: a.title,
          detail: `${data.id} · ${a.detail}`,
          level: a.level,
          vehicleId: data.id,
          time: timestamp
        }));

        setHistory(old => [...newEvents, ...old]);
      }

      setError("");

    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // DOWNLOAD VEHICLE SAFETY REPORT AS PDF
  function downloadReport() {
    if (!vehicle) return;

    // Escape text before placing it into HTML
    const safe = value =>
      String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]);

    const alerts = vehicle.analysis?.alerts || [];

    const report = window.open("", "_blank");

    if (!report) {
      setError("Allow pop-ups in your browser to generate the report.");
      return;
    }

    report.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>CargoGuard Safety Report</title>

        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 35px;
            color: #17243b;
          }

          .header {
            background: #101e35;
            color: white;
            padding: 22px;
            border-radius: 10px;
          }

          .header h1 {
            margin: 0;
          }

          h2 {
            border-bottom: 2px solid #477bd0;
            padding-bottom: 8px;
            margin-top: 30px;
          }

          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          .item {
            background: #f1f5fa;
            padding: 14px;
            border-radius: 8px;
          }

          .label {
            color: #64748b;
            font-size: 12px;
          }

          .value {
            font-weight: bold;
            margin-top: 7px;
          }

          .alert {
            background: #fff0f0;
            padding: 13px;
            margin: 10px 0;
            border-radius: 7px;
          }

          .normal {
            background: #e8f8ef;
          }

          footer {
            margin-top: 40px;
            color: #64748b;
            font-size: 12px;
            line-height: 1.6;
          }

          @media print {
            body {
              padding: 15px;
            }
          }
        </style>
      </head>

      <body>

        <div class="header">
          <h1>🛡 CargoGuard</h1>
          <p>Intelligent Load Safety Monitoring</p>
          <p>Vehicle Safety Assessment Report</p>
        </div>

        <h2>Vehicle Information</h2>

        <div class="grid">
          <div class="item">
            <div class="label">Vehicle name</div>
            <div class="value">${safe(vehicle.name)}</div>
          </div>

          <div class="item">
            <div class="label">Registration number</div>
            <div class="value">${safe(vehicle.id)}</div>
          </div>

          <div class="item">
            <div class="label">Route</div>
            <div class="value">${safe(vehicle.route)}</div>
          </div>

          <div class="item">
            <div class="label">Report generated</div>
            <div class="value">${safe(new Date().toLocaleString())}</div>
          </div>
        </div>

        <h2>Cargo Measurements</h2>

        <div class="grid">

          <div class="item">
            <div class="label">Recorded cargo load</div>
            <div class="value">${fmt(vehicle.loadKg)} kg</div>
          </div>

          <div class="item">
            <div class="label">Configured capacity</div>
            <div class="value">${fmt(vehicle.capacityKg)} kg</div>
          </div>

          <div class="item">
            <div class="label">Load percentage</div>
            <div class="value">${safe(vehicle.analysis?.loadPercent)}%</div>
          </div>

          <div class="item">
            <div class="label">Axle reading difference</div>
            <div class="value">${safe(vehicle.analysis?.axleImbalancePercent)}%</div>
          </div>

          <div class="item">
            <div class="label">Front axle reading</div>
            <div class="value">${fmt(vehicle.frontAxleKg)} kg</div>
          </div>

          <div class="item">
            <div class="label">Rear axle reading</div>
            <div class="value">${fmt(vehicle.rearAxleKg)} kg</div>
          </div>

          <div class="item">
            <div class="label">Movement score</div>
            <div class="value">${safe(vehicle.movementScore)}/100</div>
          </div>

          <div class="item">
            <div class="label">Safety status</div>
            <div class="value">${safe(vehicle.analysis?.risk?.toUpperCase())}</div>
          </div>

        </div>

        <h2>Safety Analysis</h2>

        ${
          alerts.length
            ? alerts.map(a => `
              <div class="alert">
                <b>${safe(a.title)}</b>
                <p>${safe(a.detail)}</p>
                <small>Severity: ${safe(a.level)}</small>
              </div>
            `).join("")
            : '<div class="alert normal">No demo rules triggered.</div>'
        }

        <h2>Safety Recommendation</h2>

        <p>${safe(vehicle.analysis?.recommendation)}</p>

        <footer>
          CargoGuard prototype · Synthetic sensor data.<br>
          This report is for demonstration purposes only.
          It is not a certified real-world vehicle safety assessment.
        </footer>

      </body>
      </html>
    `);

    report.document.close();
    report.focus();

    setTimeout(() => {
      report.print();
    }, 700);

    setError("");
  }

  // EXPORT FLEET DATA TO CSV
  function exportFleetCSV() {
    if (!vehicles.length) {
      setError("No vehicle data available to export.");
      return;
    }

    const headers = [
      "Vehicle Name",
      "Registration Number",
      "Route",
      "Cargo Load (kg)",
      "Capacity (kg)",
      "Load Percentage",
      "Axle Difference (%)",
      "Front Axle (kg)",
      "Rear Axle (kg)",
      "Movement Score",
      "Safety Status",
      "Safety Alerts"
    ];

    const rows = vehicles.map(v => [
      v.name,
      v.id,
      v.route,
      v.loadKg,
      v.capacityKg,
      v.analysis?.loadPercent,
      v.analysis?.axleImbalancePercent,
      v.frontAxleKg,
      v.rearAxleKg,
      v.movementScore,
      v.analysis?.risk,
      (v.analysis?.alerts || []).map(a => a.title).join("; ")
    ]);

    const csv = [headers, ...rows]
      .map(row =>
        row.map(value =>
          `"${String(value ?? "").replace(/"/g, '""')}"`
        ).join(",")
      )
      .join("\r\n");

    const blob = new Blob(
      ["\uFEFF" + csv],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "CargoGuard_Fleet_Report.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
    setError("");
  }

  // MAIN WEBSITE
  return (
    <main className="shell">

      {/* HEADER */}
      <header className="top">
        <div>
          <div className="brand">🛡️ CargoGuard</div>
          <div className="muted">
            Intelligent load safety monitoring
          </div>
        </div>

        <span className="live">● DEMO SYSTEM</span>
      </header>

      {/* PAGE INTRO */}
      <section className="intro">
        <div>
          <p className="eyebrow">FLEET SAFETY CENTER</p>
          <h1>Vehicle overview</h1>
          <p className="muted">
            Monitor vehicle loads, analyze safety readings and review cargo alerts.
          </p>
        </div>

        <button onClick={load}>↻ Refresh</button>
      </section>

      {error && <div className="error">{error}</div>}

      {/* SUMMARY CARDS */}
      <section className="stats">

        <Stat label="Vehicles monitored" value={vehicles.length} icon="🚛" />

        <Stat label="Normal" value={count("normal")} icon="✓" />

        <Stat label="Warnings" value={count("warning")} icon="⚠" />

        <Stat label="Critical" value={count("critical")} icon="!" />

      </section>

      {/* FLEET ANALYTICS */}
      <section className="panel">

        <div className="section-title">
          <div>
            <h2>Fleet analytics</h2>
            <p className="muted">
              Cargo load comparison across monitored vehicles.
            </p>
          </div>

          <span className="tag">LIVE DEMO DATA</span>
        </div>

        <div className="analytics-summary">

          <div className="analytic-card">
            <span>Total cargo</span>
            <strong>{fmt(totalLoad)} kg</strong>
          </div>

          <div className="analytic-card">
            <span>Total capacity</span>
            <strong>{fmt(totalCapacity)} kg</strong>
          </div>

          <div className="analytic-card">
            <span>Fleet utilization</span>
            <strong>{fleetUtilization}%</strong>
          </div>

        </div>

        <h3>Vehicle load comparison</h3>

        {vehicles.map(v => {
          const percentage = v.capacityKg
            ? (v.loadKg / v.capacityKg) * 100
            : 0;

          return (
            <div className="chart-row" key={v.id}>

              <div className="chart-label">
                <span>{v.name}</span>
                <b>{percentage.toFixed(1)}%</b>
              </div>

              <div className="chart-track">
                <div
                  className="chart-fill"
                  style={{
                    width: `${Math.min(percentage, 100)}%`,
                    background:
                      percentage > 100 ? "#e74b4b" :
                      percentage > 85 ? "#e7a23b" :
                      "#477bd0"
                  }}
                />
              </div>

              <small>
                {fmt(v.loadKg)} kg / {fmt(v.capacityKg)} kg
              </small>

            </div>
          );
        })}

      </section>

      {/* VEHICLE MONITORING */}
      <section className="panel">

        <div className="panelhead">
          <div>
            <h2>Vehicle monitoring</h2>
            <p className="muted">
              Select a vehicle to inspect its latest readings.
            </p>
          </div>

          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
          >
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.id}
              </option>
            ))}
          </select>
        </div>

        {vehicle && (
          <>

            <div className="vehicleline">

              <div>
                <h3>{vehicle.name}</h3>
                <p className="muted">
                  {vehicle.route} · {vehicle.id}
                </p>
              </div>

              <div className="report-actions">

                
<div className="report-actions">

  <button onClick={downloadReport}>
    📄 Download Safety Report
  </button>

  <button onClick={exportFleetCSV}>
    📊 Export Fleet CSV
  </button>

  <span className={`pill ${vehicle.analysis?.risk || "normal"}`}>
    {(vehicle.analysis?.risk || "normal").toUpperCase()}
  </span>

</div>


                <span className={`pill ${vehicle.analysis?.risk || "normal"}`}>
                  {(vehicle.analysis?.risk || "normal").toUpperCase()}
                </span>

              </div>

            </div>

            {/* VEHICLE METRICS */}
            <div className="metrics">

              <Metric
                label="Recorded cargo load"
                value={`${fmt(vehicle.loadKg)} kg`}
              />

              <Metric
                label="Configured capacity"
                value={`${fmt(vehicle.capacityKg)} kg`}
              />

              <Metric
                label="Load percentage"
                value={`${vehicle.analysis?.loadPercent ?? 0}%`}
              />

              <Metric
                label="Axle reading difference"
                value={`${vehicle.analysis?.axleImbalancePercent ?? 0}%`}
              />

              <Metric
                label="Front axle reading"
                value={`${fmt(vehicle.frontAxleKg)} kg`}
              />

              <Metric
                label="Rear axle reading"
                value={`${fmt(vehicle.rearAxleKg)} kg`}
              />

              <Metric
                label="Movement score"
                value={`${vehicle.movementScore}/100`}
              />

              <Metric
                label="Last update"
                value={vehicle.updatedAt || "Just now"}
              />

            </div>

            {/* LOAD PROGRESS */}
            <div className="progress-heading">
              <b>Vehicle capacity utilization</b>

              <span>
                {vehicle.analysis?.loadPercent ?? 0}%
              </span>
            </div>

            <div className="bar">
              <div
                style={{
                  width: `${Math.min(
                    Number(vehicle.analysis?.loadPercent || 0),
                    100
                  )}%`,
                  background:
                    vehicle.analysis?.risk === "critical"
                      ? "#e74b4b"
                      : vehicle.analysis?.risk === "warning"
                      ? "#e7a23b"
                      : "#477bd0"
                }}
              />
            </div>

            <p className="muted small">
              Load percentage against configured demo capacity.
            </p>

            {/* AXLE DISTRIBUTION */}
            <h3>Axle load distribution</h3>

            <div className="axle-grid">

              <AxleCard
                label="Front axle"
                value={vehicle.frontAxleKg}
                total={vehicle.loadKg}
                color="front"
              />

              <AxleCard
                label="Rear axle"
                value={vehicle.rearAxleKg}
                total={vehicle.loadKg}
                color="rear"
              />

            </div>

            {/* SAFETY ANALYSIS */}
            <h3>Safety analysis</h3>

            {(vehicle.analysis?.alerts || []).length > 0
              ? vehicle.analysis.alerts.map((a, i) => (
                <div className={`alert ${a.level}`} key={i}>
                  <b>{a.title}</b>
                  <p>{a.detail}</p>
                </div>
              ))
              : (
                <div className="alert normal">
                  <b>No demo rules triggered</b>
                  <p>
                    No configured alert condition was detected in these simulated readings.
                  </p>
                </div>
              )
            }

            <p className="recommend">
              {vehicle.analysis?.recommendation}
            </p>

          </>
        )}

      </section>

      {/* SIMULATION CONTROLS */}
      <section className="panel">

        <h2>Simulation controls</h2>

        <p className="muted">
          Choose a synthetic scenario to demonstrate how alerts work.
        </p>

        <div className="actions">

          <button
            className="normal"
            disabled={busy || !vehicle}
            onClick={() => simulate("normal")}
          >
            ✓ Reset to normal
          </button>

          <button
            className="overload"
            disabled={busy || !vehicle}
            onClick={() => simulate("overload")}
          >
            ⚠ Simulate overload
          </button>

          <button
            className="uneven"
            disabled={busy || !vehicle}
            onClick={() => simulate("uneven")}
          >
            ⇄ Simulate uneven load
          </button>

          <button
            className="shift"
            disabled={busy || !vehicle}
            onClick={() => simulate("shift")}
          >
            📦 Simulate cargo movement
          </button>

        </div>

        {busy && <p className="muted small">Updating vehicle readings...</p>}

      </section>

      {/* FLEET SAFETY ALERTS */}
      <section className="panel">

        <div className="section-title">
          <div>
            <h2>Fleet safety alerts</h2>
            <p className="muted">
              Current alerts across monitored vehicles.
            </p>
          </div>

          <span className="tag">
            {currentAlerts.length} ACTIVE
          </span>
        </div>

        {currentAlerts.length > 0 ? (
          currentAlerts.map((a, i) => (
            <div className={`alert ${a.level}`} key={a.eventKey}>
              <b>{a.title}</b>
              <p>{a.vehicleId} · {a.detail}</p>
            </div>
          ))
        ) : (
          <div className="empty">
            No active fleet alerts.
          </div>
        )}

      </section>

      {/* ALERT HISTORY */}
      <section className="panel">

        <div className="section-title">

          <div>
            <h2>Alert history</h2>
            <p className="muted">
              Recent events generated during this browser session.
            </p>
          </div>

          <button onClick={() => setHistory([])}>
            Clear history
          </button>

        </div>

        {history.length > 0 ? (

          <div className="history-list">

            {history.map((event, i) => (
              <div className="history-item" key={i}>

                <span className={`history-dot ${event.level}`} />

                <div className="history-content">
                  <b>{event.title}</b>
                  <p>{event.detail}</p>
                  <small>{event.time}</small>
                </div>

                <span className={`pill ${event.level}`}>
                  {event.level.toUpperCase()}
                </span>

              </div>
            ))}

          </div>

        ) : (
          <div className="empty">
            No events recorded yet. Try a simulation to generate alerts.
          </div>
        )}

      </section>

      <footer>
        CargoGuard Prototype · Synthetic sensor data
        <br />
        Not certified for real-world vehicle safety decisions.
      </footer>

    </main>
  );
}

// SUMMARY CARD
function Stat({ label, value, icon }) {
  return (
    <div className="stat">

      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>

      <strong>{value}</strong>

    </div>
  );
}

// VEHICLE METRIC
function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

// AXLE DISTRIBUTION CARD
function AxleCard({ label, value, total, color }) {
  const percentage = total > 0
    ? (Number(value || 0) / Number(total)) * 100
    : 0;

  return (
    <div className="axle-card">

      <span>{label}</span>

      <strong>{fmt(value)} kg</strong>

      <div className={`mini-track ${color}`}>
        <div
          style={{
            width: `${Math.min(percentage, 100)}%`
          }}
        />
      </div>

    </div>
  );
}

export default App;
