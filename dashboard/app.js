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

const STORAGE_KEYS = {
  themeMode: "settings_theme_mode",
  ratePerKwh: "settings_rate_per_kwh",
  rateMonth: "settings_rate_month",
  refreshMs: "settings_refresh_ms",
  showNodeCosts: "settings_show_node_costs",
  exportIncludeChart: "settings_export_include_chart",
  exportIncludeSnapshot: "settings_export_include_snapshot"
};

const DEFAULTS = {
  themeMode: "light",
  ratePerKwh: 13.3,
  refreshMs: 5000,
  showNodeCosts: "yes",
  exportIncludeChart: "yes",
  exportIncludeSnapshot: "yes"
};

const elements = {
  navButtons: document.querySelectorAll(".nav-btn"),
  views: {
    dashboard: document.getElementById("view-dashboard"),
    settings: document.getElementById("view-settings")
  },
  refreshMs: document.getElementById("refresh-ms"),
  applyBtn: document.getElementById("apply-btn"),
  badge: document.getElementById("connection-badge"),
  updatedAt: document.getElementById("updated-at"),
  apiBaseLabel: document.getElementById("api-base-label"),
  metricTotalToday: document.getElementById("metric-total-today"),
  metricTotalYesterday: document.getElementById("metric-total-yesterday"),
  metricTotalCost: document.getElementById("metric-total-cost"),
  insightMessage: document.getElementById("insight-message"),
  nodeCards: document.getElementById("node-cards"),
  settingsRatePerKwh: document.getElementById("settings-rate-per-kwh"),
  settingsRateMonth: document.getElementById("settings-rate-month"),
  settingsThemeMode: document.getElementById("settings-theme-mode"),
  settingsRefreshMs: document.getElementById("settings-refresh-ms"),
  settingsShowNodeCosts: document.getElementById("settings-show-node-costs"),
  settingsExportStart: document.getElementById("settings-export-start"),
  settingsExportEnd: document.getElementById("settings-export-end"),
  settingsExportIncludeChart: document.getElementById("settings-export-include-chart"),
  settingsExportIncludeSnapshot: document.getElementById("settings-export-include-snapshot"),
  settingsSaveBtn: document.getElementById("settings-save-btn"),
  settingsExportPdfBtn: document.getElementById("settings-export-pdf-btn"),
  settingsResetBtn: document.getElementById("settings-reset-btn"),
  settingsFeedback: document.getElementById("settings-feedback")
};

let refreshTimer = null;
let lastAnalysis = null;

function setBadge(state, text) {
  elements.badge.classList.remove("ok", "warn", "error");
  elements.badge.classList.add(state);
  elements.badge.textContent = text;
}

function parseNumberOrDefault(raw, fallback) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    return fallback;
  }
  return value;
}

function getStorageValue(key, fallback) {
  const raw = window.localStorage.getItem(key);
  return raw === null ? fallback : raw;
}

function currentSettings() {
  return {
    themeMode: elements.settingsThemeMode.value,
    ratePerKwh: parseNumberOrDefault(elements.settingsRatePerKwh.value, DEFAULTS.ratePerKwh),
    rateMonth: elements.settingsRateMonth.value,
    refreshMs: parseNumberOrDefault(elements.settingsRefreshMs.value, DEFAULTS.refreshMs),
    showNodeCosts: elements.settingsShowNodeCosts.value,
    exportIncludeChart: elements.settingsExportIncludeChart.value,
    exportIncludeSnapshot: elements.settingsExportIncludeSnapshot.value
  };
}

function applyTheme(theme) {
  const normalized = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", normalized);
}

function saveSettingsToStorage(settings) {
  window.localStorage.setItem(STORAGE_KEYS.themeMode, settings.themeMode);
  window.localStorage.setItem(STORAGE_KEYS.ratePerKwh, String(settings.ratePerKwh));
  window.localStorage.setItem(STORAGE_KEYS.rateMonth, settings.rateMonth || "");
  window.localStorage.setItem(STORAGE_KEYS.refreshMs, String(settings.refreshMs));
  window.localStorage.setItem(STORAGE_KEYS.showNodeCosts, settings.showNodeCosts);
  window.localStorage.setItem(STORAGE_KEYS.exportIncludeChart, settings.exportIncludeChart);
  window.localStorage.setItem(STORAGE_KEYS.exportIncludeSnapshot, settings.exportIncludeSnapshot);
}

function defaultRateMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function loadSettingsFromStorage() {
  const themeMode = getStorageValue(STORAGE_KEYS.themeMode, DEFAULTS.themeMode);
  const ratePerKwh = parseNumberOrDefault(getStorageValue(STORAGE_KEYS.ratePerKwh, DEFAULTS.ratePerKwh), DEFAULTS.ratePerKwh);
  const rateMonth = getStorageValue(STORAGE_KEYS.rateMonth, defaultRateMonth());
  const refreshMs = parseNumberOrDefault(getStorageValue(STORAGE_KEYS.refreshMs, DEFAULTS.refreshMs), DEFAULTS.refreshMs);
  const showNodeCosts = getStorageValue(STORAGE_KEYS.showNodeCosts, DEFAULTS.showNodeCosts);
  const exportIncludeChart = getStorageValue(STORAGE_KEYS.exportIncludeChart, DEFAULTS.exportIncludeChart);
  const exportIncludeSnapshot = getStorageValue(STORAGE_KEYS.exportIncludeSnapshot, DEFAULTS.exportIncludeSnapshot);

  elements.settingsThemeMode.value = themeMode;
  elements.settingsRatePerKwh.value = Number(ratePerKwh).toFixed(2);
  elements.settingsRateMonth.value = rateMonth;
  elements.settingsRefreshMs.value = String(refreshMs);
  elements.settingsShowNodeCosts.value = showNodeCosts;
  elements.settingsExportIncludeChart.value = exportIncludeChart;
  elements.settingsExportIncludeSnapshot.value = exportIncludeSnapshot;
  elements.refreshMs.value = String(refreshMs);

  applyTheme(themeMode);
}

function showFeedback(message) {
  elements.settingsFeedback.textContent = message;
}

function formatKwh(value) {
  return `${value.toFixed(3)} kWh`;
}

function formatPhp(value) {
  return `PHP ${value.toFixed(2)}`;
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
      if (dtHours <= 0 || dtHours > 24) {
        continue;
      }

      const incKwh = ((prev.powerW + curr.powerW) / 2) * dtHours / 1000;
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

function updateKpis(analysis, ratePerKwh) {
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
  elements.metricTotalCost.textContent =
    `Estimated cost today: ${formatPhp(totalToday * ratePerKwh)} (rate ${formatPhp(ratePerKwh)}/kWh)`;

  const diff = totalToday - totalYesterday;
  if (totalYesterday === 0) {
    if (totalToday === 0) {
      elements.insightMessage.textContent =
        "No measurable kWh usage yet for today and yesterday (PHT).";
    } else {
      elements.insightMessage.textContent =
        `You have consumed ${formatKwh(totalToday)} today. No baseline data for yesterday yet.`;
    }
    return { totalToday, totalYesterday };
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

  return { totalToday, totalYesterday };
}

function updateNodeCards(analysis, ratePerKwh, showNodeCosts) {
  const todayKey = getPhtDayKey(new Date());
  const selectedIds = pickThreeAppliances(analysis.applianceMeta);
  const nodeSummaries = [];

  elements.nodeCards.innerHTML = "";

  selectedIds.forEach((applianceId, index) => {
    const meta = analysis.applianceMeta.get(applianceId) || {
      applianceName: `Node ${index + 1}`,
      nodeId: `node-${index + 1}`
    };
    const latest = analysis.latestByAppliance.get(applianceId);
    const todayKwh = (analysis.dailyKwhByAppliance.get(applianceId) || {})[todayKey] || 0;
    const estimatedCost = todayKwh * ratePerKwh;

    const article = document.createElement("article");
    article.className = "card node-card";
    article.innerHTML = `
      <h3>Node ${index + 1}: ${meta.applianceName}</h3>
      <p class="node-kwh">${formatKwh(todayKwh)}</p>
      ${showNodeCosts ? `<p class="node-meta">Estimated cost today: ${formatPhp(estimatedCost)}</p>` : ""}
      <p class="node-meta">Latest power: ${latest ? `${latest.powerW.toFixed(2)} W` : "No reading yet"}</p>
      <p class="node-meta">Device ID: ${meta.nodeId}</p>
    `;
    elements.nodeCards.appendChild(article);

    nodeSummaries.push({
      nodeLabel: `Node ${index + 1}`,
      applianceName: meta.applianceName,
      todayKwh,
      estimatedCost,
      latestPowerW: latest ? latest.powerW : null
    });
  });

  return nodeSummaries;
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

function switchView(target) {
  Object.keys(elements.views).forEach((key) => {
    const active = key === target;
    elements.views[key].classList.toggle("view-active", active);
  });

  elements.navButtons.forEach((btn) => {
    btn.classList.toggle("nav-btn-active", btn.dataset.viewTarget === target);
  });
}

function startRefreshLoop() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  const interval = parseNumberOrDefault(elements.refreshMs.value, DEFAULTS.refreshMs);
  refreshTimer = setInterval(refresh, interval);
}

async function refresh() {
  try {
    const settings = currentSettings();
    const readingsRes = await fetchJson(`${API_BASE}/api/readings?limit=2000`);
    const readings = readingsRes.data || [];

    const analysis = analyzeEnergy(readings);
    const totals = updateKpis(analysis, settings.ratePerKwh);
    const nodes = updateNodeCards(analysis, settings.ratePerKwh, settings.showNodeCosts === "yes");
    updateChart(analysis);

    lastAnalysis = {
      totals,
      nodes,
      settings,
      generatedAt: new Date().toISOString()
    };

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

function setDefaultExportRange() {
  const end = new Date();
  const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
  const iso = (d) => d.toISOString().slice(0, 10);
  elements.settingsExportStart.value = iso(start);
  elements.settingsExportEnd.value = iso(end);
}

async function exportPdfReport() {
  if (!lastAnalysis) {
    showFeedback("No data available yet. Please wait for dashboard refresh.");
    return;
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    showFeedback("PDF library not loaded.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;
  let y = 44;

  const settings = currentSettings();
  const startDate = elements.settingsExportStart.value || "-";
  const endDate = elements.settingsExportEnd.value || "-";

  doc.setFontSize(16);
  doc.text("Household Energy Report", marginX, y);
  y += 18;
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString("en-PH", { timeZone: PHT_TIMEZONE })} (PHT)`, marginX, y);
  y += 14;
  doc.text(`Coverage: ${startDate} to ${endDate}`, marginX, y);
  y += 14;
  doc.text(`Rate: ${formatPhp(settings.ratePerKwh)}/kWh (Month: ${settings.rateMonth || "-"})`, marginX, y);
  y += 22;

  doc.setFontSize(12);
  doc.text("Summary", marginX, y);
  y += 14;
  doc.setFontSize(10);
  doc.text(`Total kWh today: ${formatKwh(lastAnalysis.totals.totalToday)}`, marginX, y);
  y += 13;
  doc.text(`Total kWh yesterday: ${formatKwh(lastAnalysis.totals.totalYesterday)}`, marginX, y);
  y += 13;
  doc.text(`Estimated cost today: ${formatPhp(lastAnalysis.totals.totalToday * settings.ratePerKwh)}`, marginX, y);
  y += 20;

  doc.setFontSize(12);
  doc.text("Node Breakdown", marginX, y);
  y += 14;
  doc.setFontSize(10);
  lastAnalysis.nodes.forEach((node) => {
    doc.text(
      `${node.nodeLabel} (${node.applianceName}): ${formatKwh(node.todayKwh)} | Cost: ${formatPhp(node.estimatedCost)} | Latest W: ${node.latestPowerW !== null ? node.latestPowerW.toFixed(2) : "-"}`,
      marginX,
      y
    );
    y += 12;
  });

  if (settings.exportIncludeChart === "yes" && energyChart) {
    y += 12;
    const chartCanvas = document.getElementById("power-chart");
    const chartImage = chartCanvas.toDataURL("image/png", 1.0);
    const imgWidth = 515;
    const imgHeight = 230;

    if (y + imgHeight > 790) {
      doc.addPage();
      y = 44;
    }
    doc.setFontSize(12);
    doc.text("Energy Trend Chart", marginX, y);
    y += 8;
    doc.addImage(chartImage, "PNG", marginX, y, imgWidth, imgHeight);
    y += imgHeight + 14;
  }

  if (settings.exportIncludeSnapshot === "yes" && window.html2canvas) {
    const target = document.getElementById("view-dashboard");
    const canvas = await window.html2canvas(target, {
      backgroundColor: null,
      scale: 1.2
    });
    const snap = canvas.toDataURL("image/png", 0.95);
    const imgWidth = 515;
    const imgHeight = 240;

    if (y + imgHeight > 790) {
      doc.addPage();
      y = 44;
    }
    doc.setFontSize(12);
    doc.text("Dashboard Snapshot", marginX, y);
    y += 8;
    doc.addImage(snap, "PNG", marginX, y, imgWidth, imgHeight);
  }

  const fileDate = new Date().toISOString().slice(0, 10);
  doc.save(`energy-report-${fileDate}.pdf`);
  showFeedback("PDF exported successfully.");
}

function bindEvents() {
  elements.navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.viewTarget;
      switchView(target);
    });
  });

  elements.applyBtn.addEventListener("click", () => {
    const settings = currentSettings();
    saveSettingsToStorage(settings);
    applyTheme(settings.themeMode);
    elements.refreshMs.value = String(settings.refreshMs);
    startRefreshLoop();
    refresh();
    showFeedback("Dashboard settings applied.");
  });

  elements.settingsSaveBtn.addEventListener("click", () => {
    const settings = currentSettings();
    saveSettingsToStorage(settings);
    applyTheme(settings.themeMode);
    elements.refreshMs.value = String(settings.refreshMs);
    startRefreshLoop();
    refresh();
    showFeedback("Settings saved.");
  });

  elements.settingsResetBtn.addEventListener("click", () => {
    window.localStorage.removeItem(STORAGE_KEYS.themeMode);
    window.localStorage.removeItem(STORAGE_KEYS.ratePerKwh);
    window.localStorage.removeItem(STORAGE_KEYS.rateMonth);
    window.localStorage.removeItem(STORAGE_KEYS.refreshMs);
    window.localStorage.removeItem(STORAGE_KEYS.showNodeCosts);
    window.localStorage.removeItem(STORAGE_KEYS.exportIncludeChart);
    window.localStorage.removeItem(STORAGE_KEYS.exportIncludeSnapshot);
    loadSettingsFromStorage();
    saveSettingsToStorage(currentSettings());
    startRefreshLoop();
    refresh();
    showFeedback("Settings reset to defaults.");
  });

  elements.settingsThemeMode.addEventListener("change", () => {
    applyTheme(elements.settingsThemeMode.value);
  });

  elements.settingsExportPdfBtn.addEventListener("click", exportPdfReport);
}

function init() {
  loadSettingsFromStorage();
  setDefaultExportRange();
  bindEvents();

  elements.apiBaseLabel.textContent = API_BASE;
  setBadge("warn", "Waiting for data");
  startRefreshLoop();
  refresh();
}

init();

