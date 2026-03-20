export interface ApiReading {
  nodeId: string;
  applianceId: string;
  applianceName: string;
  currentRmsA: number;
  voltageRefV: number;
  powerW: number;
  energyWh: number | null;
  frequencyHz: number | null;
  thresholdW: number;
  abnormal: boolean;
  timestamp: string;
  receivedAt: string;
}

export interface NodeSummary {
  nodeId: number;
  label: string;
  deviceId: string;
  applianceId: string;
  todayKWh: number;
  yesterdayKWh: number;
  currentPower: number;
  estimatedCost: number;
}

export interface DailyData {
  date: string;
  node1: number;
  node2: number;
  node3: number;
}

export interface Alert {
  id: string;
  timestamp: string;
  nodeId: number;
  nodeLabel: string;
  applianceId: string;
  value: number;
  threshold: number;
  message: string;
}

export interface DashboardData {
  chartData: DailyData[];
  nodeSummaries: NodeSummary[];
  alerts: Alert[];
  readings: ApiReading[];
}

const PHT_TIMEZONE = "Asia/Manila";
const FALLBACK_APPLIANCE_IDS = ["appliance-01", "appliance-02", "appliance-03"];
const DEFAULT_NODE_LABELS = ["Node 1", "Node 2", "Node 3"];
const DEFAULT_NODE_THRESHOLDS = [500, 800, 600];

function resolveApiBase() {
  const envValue =
    typeof import.meta.env.VITE_API_BASE === "string"
      ? import.meta.env.VITE_API_BASE.trim()
      : "";
  const appConfigValue =
    typeof window !== "undefined" &&
    window.APP_CONFIG &&
    typeof window.APP_CONFIG.API_BASE === "string"
      ? window.APP_CONFIG.API_BASE.trim()
      : "";

  const configured = appConfigValue || envValue;
  if (configured) {
    const normalized = configured.replace(/\/+$/, "");
    return /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;
  }

  if (typeof window !== "undefined" && /onrender\.com$/i.test(window.location.hostname)) {
    const host = window.location.hostname;
    if (host.includes("-dashboard")) {
      return `https://${host.replace("-dashboard", "-api")}`;
    }
  }

  return "http://localhost:8080";
}

export const API_BASE = resolveApiBase();

function parseJsonArray<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T) : fallback;
  } catch (_error) {
    return fallback;
  }
}

function getNodeLabels() {
  if (typeof window === "undefined") {
    return DEFAULT_NODE_LABELS;
  }
  const parsed = parseJsonArray<string[]>(window.localStorage.getItem("nodeLabels"), DEFAULT_NODE_LABELS);
  return [0, 1, 2].map((index) => (parsed[index] || DEFAULT_NODE_LABELS[index]).trim() || DEFAULT_NODE_LABELS[index]);
}

function getNodeThresholds() {
  if (typeof window === "undefined") {
    return DEFAULT_NODE_THRESHOLDS;
  }
  const parsed = parseJsonArray<number[]>(window.localStorage.getItem("nodeThresholds"), DEFAULT_NODE_THRESHOLDS);
  return [0, 1, 2].map((index) => {
    const value = Number(parsed[index]);
    return Number.isFinite(value) && value >= 0 ? value : DEFAULT_NODE_THRESHOLDS[index];
  });
}

function getPHTDayKey(dateInput: Date | string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PHT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(dateInput));

  const byType = parts.reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});

  return `${byType.year}-${byType.month}-${byType.day}`;
}

function getPHTDayLabel(dayKey: string) {
  const utcDate = new Date(`${dayKey}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: PHT_TIMEZONE,
    month: "short",
    day: "numeric"
  }).format(utcDate);
}

function getLastNDayKeys(n: number) {
  const keys: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    keys.push(getPHTDayKey(new Date(now.getTime() - i * 24 * 60 * 60 * 1000)));
  }
  return keys;
}

function formatPHTTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-PH", {
    timeZone: PHT_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short"
  });
}

async function fetchJson(path: string) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${path}`);
  }
  return response.json();
}

function pickThreeAppliances(applianceIds: string[]) {
  const selected = [...applianceIds].sort();
  FALLBACK_APPLIANCE_IDS.forEach((id) => {
    if (selected.length < 3 && !selected.includes(id)) {
      selected.push(id);
    }
  });
  return selected.slice(0, 3);
}

function computeDailyKwh(readings: ApiReading[]) {
  const byAppliance = new Map<string, ApiReading[]>();

  readings.forEach((reading) => {
    if (!byAppliance.has(reading.applianceId)) {
      byAppliance.set(reading.applianceId, []);
    }
    byAppliance.get(reading.applianceId)?.push(reading);
  });

  const dailyByAppliance = new Map<string, Record<string, number>>();
  byAppliance.forEach((rows, applianceId) => {
    const sortedRows = [...rows].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const totals: Record<string, number> = {};

    for (let i = 1; i < sortedRows.length; i += 1) {
      const previous = sortedRows[i - 1];
      const current = sortedRows[i];
      const dtHours =
        (new Date(current.timestamp).getTime() - new Date(previous.timestamp).getTime()) / 3600000;

      if (dtHours <= 0 || dtHours > 24) {
        continue;
      }

      const incrementKwh = ((previous.powerW + current.powerW) / 2) * dtHours / 1000;
      const dayKey = getPHTDayKey(current.timestamp);
      totals[dayKey] = (totals[dayKey] || 0) + incrementKwh;
    }

    dailyByAppliance.set(applianceId, totals);
  });

  return dailyByAppliance;
}

function buildNodeSummaries(
  selectedAppliances: string[],
  dailyByAppliance: Map<string, Record<string, number>>,
  latestByAppliance: Map<string, ApiReading>,
  rate: number
): NodeSummary[] {
  const labels = getNodeLabels();
  const todayKey = getPHTDayKey(new Date());
  const yesterdayKey = getPHTDayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));

  return selectedAppliances.map((applianceId, index) => {
    const latest = latestByAppliance.get(applianceId);
    const defaultLabel = latest?.applianceName || `Node ${index + 1}`;
    const label = labels[index] || defaultLabel;
    const daily = dailyByAppliance.get(applianceId) || {};
    const todayKWh = daily[todayKey] || 0;
    const yesterdayKWh = daily[yesterdayKey] || 0;

    return {
      nodeId: index + 1,
      label,
      deviceId: latest?.nodeId || `ESP32-NODE-00${index + 1}`,
      applianceId,
      todayKWh,
      yesterdayKWh,
      currentPower: latest?.powerW || 0,
      estimatedCost: todayKWh * rate
    };
  });
}

function buildChartData(
  selectedAppliances: string[],
  dailyByAppliance: Map<string, Record<string, number>>
): DailyData[] {
  const dayKeys = getLastNDayKeys(7);
  return dayKeys.map((dayKey) => ({
    date: getPHTDayLabel(dayKey),
    node1: Number(((dailyByAppliance.get(selectedAppliances[0]) || {})[dayKey] || 0).toFixed(4)),
    node2: Number(((dailyByAppliance.get(selectedAppliances[1]) || {})[dayKey] || 0).toFixed(4)),
    node3: Number(((dailyByAppliance.get(selectedAppliances[2]) || {})[dayKey] || 0).toFixed(4))
  }));
}

function mapAlerts(alertRows: ApiReading[], selectedAppliances: string[]) {
  const labels = getNodeLabels();
  const thresholds = getNodeThresholds();
  const indexByAppliance = new Map<string, number>(
    selectedAppliances.map((applianceId, index) => [applianceId, index])
  );

  return alertRows.map((row, index) => {
    const selectedIndex = indexByAppliance.get(row.applianceId) ?? 0;
    const nodeLabel = labels[selectedIndex] || row.applianceName || `Node ${selectedIndex + 1}`;
    const threshold = Number.isFinite(row.thresholdW) ? row.thresholdW : thresholds[selectedIndex];
    const message =
      row.abnormal || row.powerW > threshold
        ? `${nodeLabel} power consumption exceeded ${threshold}W`
        : `${nodeLabel} abnormal reading detected`;

    return {
      id: `${row.applianceId}-${row.timestamp}-${index}`,
      timestamp: formatPHTTimestamp(row.timestamp),
      nodeId: selectedIndex + 1,
      nodeLabel,
      applianceId: row.applianceId,
      value: Number(row.powerW || 0),
      threshold,
      message
    };
  });
}

export async function fetchDashboardData(rate = 11.5): Promise<DashboardData> {
  const readingsRes = await fetchJson("/api/readings?limit=5000");
  const readings: ApiReading[] = Array.isArray(readingsRes?.data) ? readingsRes.data : [];

  const latestByAppliance = new Map<string, ApiReading>();
  readings.forEach((reading) => {
    const current = latestByAppliance.get(reading.applianceId);
    if (!current || new Date(reading.timestamp).getTime() > new Date(current.timestamp).getTime()) {
      latestByAppliance.set(reading.applianceId, reading);
    }
  });

  const selectedAppliances = pickThreeAppliances([...latestByAppliance.keys()]);
  const dailyByAppliance = computeDailyKwh(readings);
  const nodeSummaries = buildNodeSummaries(selectedAppliances, dailyByAppliance, latestByAppliance, rate);
  const chartData = buildChartData(selectedAppliances, dailyByAppliance);

  let alerts: Alert[] = [];
  try {
    const alertsRes = await fetchJson("/api/alerts?limit=50");
    const alertRows: ApiReading[] = Array.isArray(alertsRes?.data) ? alertsRes.data : [];
    alerts = mapAlerts(alertRows, selectedAppliances);
  } catch (_error) {
    const fallbackRows = readings.filter((reading) => reading.abnormal || reading.powerW > reading.thresholdW);
    alerts = mapAlerts(fallbackRows.slice(0, 50), selectedAppliances);
  }

  return {
    chartData,
    nodeSummaries,
    alerts,
    readings
  };
}

export function getPHTTime() {
  return new Date().toLocaleString("en-PH", {
    timeZone: PHT_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short"
  });
}
