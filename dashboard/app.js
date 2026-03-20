function resolveApiBase() {
  const configured =
    window.APP_CONFIG && typeof window.APP_CONFIG.API_BASE === "string"
      ? window.APP_CONFIG.API_BASE.trim()
      : "";

  if (configured) {
    return configured;
  }

  if (window.location && /onrender\.com$/.test(window.location.hostname)) {
    const guessedHost = window.location.hostname.replace("dashboard", "api");
    return `https://${guessedHost}`;
  }

  return "http://localhost:8080";
}

const API_BASE = resolveApiBase();
const PHT_TIMEZONE = "Asia/Manila";
const NODE_COLORS = ["#1f6b55", "#3464c4", "#c46a17"];
const FALLBACK_APPLIANCE_IDS = ["appliance-01", "appliance-02", "appliance-03"];

const elements = {
  refreshMs: document.getElementById("refresh-ms"),
  applyBtn: document.getElementById("apply-btn"),
  badge: document.getElementById("connection-badge"),
  updatedAt: document.getElementById("updated-at"),
  apiBaseLabel: document.getElementById("api-base-label"),
  metricTotalToday: document.getElementById("metric-total-today"),
  metricTotalYesterday: document.getElementById("metric-total-yesterday"),
  insightMessage: document.getElementById("insight-message"),
  nodeCards: document.getElementById("node-cards")
};

let refreshTimer = null;

function createChartSafely() {
  const canvas = document.getElementById("power-chart");
  if (!canvas) {
    return null;
  }

  if (typeof window.Chart === "undefined") {
    const note = document.createElement("p");
    note.className = "muted";
    note.textContent = "Chart library unavailable. Metrics and node cards are still active.";
    canvas.parentElement.appendChild(note);
    return null;
  }

  return new Chart(canvas, {
    type: "line",
    data: {
      labels: [],
      datasets: []
    },
    options: {
      maintainAspectRatio: false,
      interaction: {
        mode: "nearest",
        intersect: false
      },
      plugins: {
        legend: {
          position: "bottom"
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "kWh"
          }
        }
      }
    }
  });
}

const energyChart = createChartSafely();

function setBadge(state, text) {
  elements.badge.classList.remove("ok", "warn", "error");
  elements.badge.classList.add(state);
  elements.badge.textContent = text;
}

function formatKwh(value) {
  return `${value.toFixed(3)} kWh`;
}

function getPhtDayKey(dateInput) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PHT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(dateInput));

  const map = {};
  parts.forEach((p) => {
    map[p.type] = p.value;
  });
  return `${map.year}-${map.month}-${map.day}`;
}

function getPhtDayLabel(dayKey) {
  const utcDate = new Date(`${dayKey}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: PHT_TIMEZONE,
    month: "short",
    day: "numeric"
  }).format(utcDate);
}

function getLastNDayKeys(n) {
  const now = new Date();
  const keys = [];
  for (let i = n - 1; i >= 0; i--) {
    keys.push(getPhtDayKey(new Date(now.getTime() - i * 24 * 60 * 60 * 1000)));
  }
  return keys;
}

function analyzeEnergy(readings) {
  const sorted = [...readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const byAppliance = new Map();
  const applianceMeta = new Map();
  const latestByAppliance = new Map();
  const dailyKwhByAppliance = new Map();

  sorted.forEach((row) => {
    if (!byAppliance.has(row.applianceId)) {
      byAppliance.set(row.applianceId, []);
    }
    byAppliance.get(row.applianceId).push(row);
    applianceMeta.set(row.applianceId, {
      applianceName: row.applianceName || row.applianceId,
      nodeId: row.nodeId || "-"
    });
    latestByAppliance.set(row.applianceId, row);
  });

  byAppliance.forEach((rows, applianceId) => {
    const dailyTotals = {};
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1];
      const curr = rows[i];

      const dtHours = (new Date(curr.timestamp) - new Date(prev.timestamp)) / 3600000;
      if (dtHours <= 0 || dtHours > 6) {
        continue;
      }

      const incKwh = (prev.powerW * dtHours) / 1000;
      const dayKey = getPhtDayKey(curr.timestamp);
      dailyTotals[dayKey] = (dailyTotals[dayKey] || 0) + incKwh;
    }
    dailyKwhByAppliance.set(applianceId, dailyTotals);
  });

  return {
    applianceMeta,
    latestByAppliance,
    dailyKwhByAppliance
  };
}

function pickThreeAppliances(applianceMeta) {
  const ids = [...applianceMeta.keys()].sort();
  const selected = [...ids];

  FALLBACK_APPLIANCE_IDS.forEach((id) => {
    if (selected.length < 3 && !selected.includes(id)) {
      selected.push(id);
    }
  });

  return selected.slice(0, 3);
}

function updateKpis(analysis) {
  const todayKey = getPhtDayKey(new Date());
  const yesterdayKey = getPhtDayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));

  let totalToday = 0;
  let totalYesterday = 0;

  analysis.dailyKwhByAppliance.forEach((daily) => {
    totalToday += daily[todayKey] || 0;
    totalYesterday += daily[yesterdayKey] || 0;
  });

  elements.metricTotalToday.textContent = formatKwh(totalToday);
  elements.metricTotalYesterday.textContent = `Yesterday: ${formatKwh(totalYesterday)}`;

  const diff = totalToday - totalYesterday;
  if (totalYesterday === 0) {
    if (totalToday === 0) {
      elements.insightMessage.textContent =
        "No measurable kWh usage yet for today and yesterday (PHT).";
    } else {
      elements.insightMessage.textContent =
        `You have consumed ${formatKwh(totalToday)} today. No baseline data for yesterday yet.`;
    }
    return;
  }

  const percent = Math.abs((diff / totalYesterday) * 100);
  if (diff > 0) {
    elements.insightMessage.textContent =
      `You have consumed ${formatKwh(Math.abs(diff))} more today than yesterday (+${percent.toFixed(1)}%).`;
  } else if (diff < 0) {
    elements.insightMessage.textContent =
      `You have consumed ${formatKwh(Math.abs(diff))} less today than yesterday (-${percent.toFixed(1)}%).`;
  } else {
    elements.insightMessage.textContent = "You have consumed the same kWh today as yesterday.";
  }
}

function updateNodeCards(analysis) {
  const todayKey = getPhtDayKey(new Date());
  const selectedIds = pickThreeAppliances(analysis.applianceMeta);

  elements.nodeCards.innerHTML = "";

  selectedIds.forEach((applianceId, index) => {
    const meta = analysis.applianceMeta.get(applianceId) || {
      applianceName: `Node ${index + 1}`,
      nodeId: `node-${index + 1}`
    };
    const latest = analysis.latestByAppliance.get(applianceId);
    const todayKwh = (analysis.dailyKwhByAppliance.get(applianceId) || {})[todayKey] || 0;

    const article = document.createElement("article");
    article.className = "card node-card";
    article.innerHTML = `
      <h3>Node ${index + 1}: ${meta.applianceName}</h3>
      <p class="node-kwh">${formatKwh(todayKwh)}</p>
      <p class="node-meta">Latest power: ${latest ? `${latest.powerW.toFixed(2)} W` : "No reading yet"}</p>
      <p class="node-meta">Device ID: ${meta.nodeId}</p>
    `;
    elements.nodeCards.appendChild(article);
  });
}

function updateChart(analysis) {
  if (!energyChart) {
    return;
  }

  const selectedIds = pickThreeAppliances(analysis.applianceMeta);
  const dayKeys = getLastNDayKeys(7);

  energyChart.data.labels = dayKeys.map(getPhtDayLabel);
  energyChart.data.datasets = selectedIds.map((applianceId, index) => {
    const meta = analysis.applianceMeta.get(applianceId);
    const daily = analysis.dailyKwhByAppliance.get(applianceId) || {};

    return {
      label: `Node ${index + 1} (${meta ? meta.applianceName : applianceId})`,
      data: dayKeys.map((key) => Number((daily[key] || 0).toFixed(4))),
      borderColor: NODE_COLORS[index % NODE_COLORS.length],
      backgroundColor: NODE_COLORS[index % NODE_COLORS.length],
      borderWidth: 2.5,
      pointRadius: 2.8,
      tension: 0.25
    };
  });

  energyChart.update();
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
    const readingsRes = await fetchJson(`${API_BASE}/api/readings?limit=2000`);
    const readings = readingsRes.data || [];

    const analysis = analyzeEnergy(readings);
    updateKpis(analysis);
    updateNodeCards(analysis);
    updateChart(analysis);

    setBadge("ok", "Connected");
    elements.updatedAt.textContent = `Last update: ${new Date().toLocaleTimeString("en-PH", {
      hour12: true
    })}`;
  } catch (error) {
    setBadge("error", "Disconnected");
    elements.updatedAt.textContent = `Last update failed: ${new Date().toLocaleTimeString("en-PH", {
      hour12: true
    })}`;
  }
}

function startRefreshLoop() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  const interval = Math.max(Number(elements.refreshMs.value) || 5000, 1000);
  refreshTimer = setInterval(refresh, interval);
}

if (elements.applyBtn) {
  elements.applyBtn.addEventListener("click", () => {
    startRefreshLoop();
    refresh();
  });
}

if (elements.apiBaseLabel) {
  elements.apiBaseLabel.textContent = API_BASE;
}

setBadge("warn", "Waiting for data");
startRefreshLoop();
refresh();
