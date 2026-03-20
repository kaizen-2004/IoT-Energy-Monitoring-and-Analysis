const API_BASE = "http://localhost:8080";

const elements = {
  applianceSelect: document.getElementById("appliance-select"),
  refreshMs: document.getElementById("refresh-ms"),
  applyBtn: document.getElementById("apply-btn"),
  badge: document.getElementById("connection-badge"),
  updatedAt: document.getElementById("updated-at"),
  metricCurrent: document.getElementById("metric-current"),
  metricPower: document.getElementById("metric-power"),
  metricVoltage: document.getElementById("metric-voltage"),
  metricAlerts: document.getElementById("metric-alerts"),
  alertsList: document.getElementById("alerts-list")
};

let refreshTimer = null;
let selectedAppliance = "";

const chart = new Chart(document.getElementById("power-chart"), {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Power (W)",
        data: [],
        borderWidth: 2,
        borderColor: "#355e3b",
        pointRadius: 1.6,
        tension: 0.22
      }
    ]
  },
  options: {
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: {
          maxRotation: 0
        }
      },
      y: {
        beginAtZero: true
      }
    }
  }
});

function setBadge(state, text) {
  elements.badge.classList.remove("ok", "warn", "error");
  elements.badge.classList.add(state);
  elements.badge.textContent = text;
}

function formatTimestamp(iso) {
  return new Date(iso).toLocaleTimeString();
}

function updateApplianceOptions(readings) {
  const currentValue = elements.applianceSelect.value;
  const unique = [...new Set(readings.map((r) => r.applianceId))];
  const names = new Map(readings.map((r) => [r.applianceId, r.applianceName]));

  elements.applianceSelect.innerHTML = '<option value="">All appliances</option>';
  unique.forEach((id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = names.get(id) || id;
    elements.applianceSelect.appendChild(opt);
  });

  if ([...elements.applianceSelect.options].some((o) => o.value === currentValue)) {
    elements.applianceSelect.value = currentValue;
  }
}

function updateMetrics(readings, alerts) {
  if (!readings.length) {
    elements.metricCurrent.textContent = "- A";
    elements.metricPower.textContent = "- W";
    elements.metricVoltage.textContent = "- V";
    elements.metricAlerts.textContent = String(alerts.length);
    return;
  }

  const latest = readings[0];
  elements.metricCurrent.textContent = `${latest.currentRmsA.toFixed(3)} A`;
  elements.metricPower.textContent = `${latest.powerW.toFixed(2)} W`;
  elements.metricVoltage.textContent = `${latest.voltageRefV.toFixed(1)} V`;
  elements.metricAlerts.textContent = String(alerts.length);
}

function updateChart(readings) {
  const sorted = [...readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  chart.data.labels = sorted.map((r) => formatTimestamp(r.timestamp));
  chart.data.datasets[0].data = sorted.map((r) => r.powerW);
  chart.update();
}

function updateAlerts(alerts) {
  elements.alertsList.innerHTML = "";
  if (!alerts.length) {
    const li = document.createElement("li");
    li.textContent = "No alerts in current data window.";
    elements.alertsList.appendChild(li);
    return;
  }

  alerts.forEach((row) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="title">${row.applianceName} - ${row.powerW.toFixed(2)} W</div>
      <div class="meta">
        Threshold: ${row.thresholdW.toFixed(2)} W |
        Abnormal: ${row.abnormal ? "Yes" : "No"} |
        ${new Date(row.timestamp).toLocaleString()}
      </div>
    `;
    elements.alertsList.appendChild(li);
  });
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

async function refresh() {
  try {
    const applianceFilter = selectedAppliance ? `&applianceId=${encodeURIComponent(selectedAppliance)}` : "";

    const [readingsRes, alertsRes] = await Promise.all([
      fetchJson(`${API_BASE}/api/readings?limit=120${applianceFilter}`),
      fetchJson(`${API_BASE}/api/alerts?limit=25`)
    ]);

    const readings = readingsRes.data || [];
    const alerts = alertsRes.data || [];

    updateApplianceOptions(readings);
    updateMetrics(readings, alerts);
    updateChart(readings);
    updateAlerts(alerts);

    setBadge("ok", "Connected");
    elements.updatedAt.textContent = `Last update: ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    setBadge("error", "Disconnected");
    elements.updatedAt.textContent = `Last update failed: ${new Date().toLocaleTimeString()}`;
  }
}

function startRefreshLoop() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  const interval = Math.max(Number(elements.refreshMs.value) || 5000, 1000);
  refreshTimer = setInterval(refresh, interval);
}

elements.applianceSelect.addEventListener("change", () => {
  selectedAppliance = elements.applianceSelect.value;
  refresh();
});

elements.applyBtn.addEventListener("click", () => {
  startRefreshLoop();
  refresh();
});

setBadge("warn", "Waiting for data");
startRefreshLoop();
refresh();

