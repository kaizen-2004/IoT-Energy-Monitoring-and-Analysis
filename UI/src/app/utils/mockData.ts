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

export interface MonthlyRate {
  month: string;
  ratePerKwh: number;
  source: string;
  sourceUrl: string | null;
  verified: boolean;
  updatedAt: string | null;
}

export interface RateResolution {
  ratePerKwh: number;
  fromMonth: string | null;
  fallback: boolean;
}

export interface NodeSummary {
  nodeId: number;
  label: string;
  deviceId: string;
  applianceId: string;
  currentDayKWh: number;
  currentDayEstimatedCost: number;
  periodKWh: number;
  previousMonthKWh: number;
  currentPower: number;
  estimatedCost: number;
}

export interface DailyData {
  date: string;
  dayKey: string;
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
  availableMonths: string[];
  selectedMonth: string;
  selectedMonthCoverageLabel: string;
  selectedMonthTotalKWh: number;
  selectedMonthTotalCost: number;
  previousMonthKey: string;
  previousMonthTotalKWh: number;
  resolvedRate: RateResolution;
}

export interface AppSettings {
  electricityRate: number;
  effectiveMonth: string;
  nodeLabels: string[];
  nodeThresholds: number[];
  timezone: string;
  updatedAt: string | null;
  rateHistory: MonthlyRate[];
}

interface FetchDashboardOptions {
  settings?: AppSettings;
  selectedMonth?: string;
}

interface RateDraftResult {
  month: string;
  sourceUrl: string;
  candidates: number[];
  recommendedRate: number | null;
  fallbackRate: number;
}

const PHT_TIMEZONE = "Asia/Manila";
const FALLBACK_APPLIANCE_IDS = ["appliance-01", "appliance-02", "appliance-03"];
const DEFAULT_NODE_LABELS = ["Node 1", "Node 2", "Node 3"];
const DEFAULT_NODE_THRESHOLDS = [500, 800, 600];
const DEFAULT_ELECTRICITY_RATE = 11.5;
const DEFAULT_TIMEZONE = "Asia/Manila";

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

function parsePhtParts(dateInput: Date | string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PHT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(dateInput));

  return parts.reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});
}

export function defaultMonth() {
  const parts = parsePhtParts(new Date());
  return `${parts.year}-${parts.month}`;
}

function isMonthString(value: unknown) {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function normalizeMonth(value: unknown) {
  if (!isMonthString(value)) {
    if (typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(value)) {
      return value.slice(0, 7);
    }
    return defaultMonth();
  }

  return value;
}

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

function normalizeNodeLabels(value: unknown) {
  if (!Array.isArray(value)) {
    return [...DEFAULT_NODE_LABELS];
  }

  return [0, 1, 2].map((index) => {
    const label = value[index];
    if (typeof label !== "string") {
      return DEFAULT_NODE_LABELS[index];
    }
    const cleaned = label.trim();
    return cleaned || DEFAULT_NODE_LABELS[index];
  });
}

function normalizeNodeThresholds(value: unknown) {
  if (!Array.isArray(value)) {
    return [...DEFAULT_NODE_THRESHOLDS];
  }

  return [0, 1, 2].map((index) => {
    const threshold = Number(value[index]);
    return Number.isFinite(threshold) && threshold >= 0 ? threshold : DEFAULT_NODE_THRESHOLDS[index];
  });
}

function normalizeRateHistory(
  value: unknown,
  fallbackMonth: string,
  fallbackRate: number
): MonthlyRate[] {
  const rows = Array.isArray(value) ? value : [];
  const normalized = rows
    .map((item) => {
      const source = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const month = normalizeMonth(source.month ?? source.month_key);
      const rateCandidate = Number(source.ratePerKwh ?? source.rate_per_kwh);
      if (!isMonthString(month) || !Number.isFinite(rateCandidate) || rateCandidate < 0) {
        return null;
      }

      return {
        month,
        ratePerKwh: rateCandidate,
        source:
          typeof source.source === "string" && source.source.trim().length > 0
            ? source.source.trim()
            : "manual",
        sourceUrl:
          typeof source.sourceUrl === "string" && source.sourceUrl.trim().length > 0
            ? source.sourceUrl.trim()
            : typeof source.source_url === "string" && source.source_url.trim().length > 0
              ? source.source_url.trim()
              : null,
        verified: source.verified === undefined ? true : Boolean(source.verified),
        updatedAt:
          typeof source.updatedAt === "string" && source.updatedAt.length > 0
            ? source.updatedAt
            : typeof source.updated_at === "string" && source.updated_at.length > 0
              ? source.updated_at
              : null
      };
    })
    .filter((item): item is MonthlyRate => item !== null)
    .sort((a, b) => b.month.localeCompare(a.month));

  if (!normalized.some((item) => item.month === fallbackMonth)) {
    normalized.unshift({
      month: fallbackMonth,
      ratePerKwh: fallbackRate,
      source: "manual",
      sourceUrl: null,
      verified: true,
      updatedAt: null
    });
  }

  return normalized;
}

function normalizeSettings(value: unknown): AppSettings {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rateCandidate = Number(source.electricityRate ?? source.electricity_rate);
  const effectiveMonth = normalizeMonth(source.effectiveMonth ?? source.effective_month);
  const electricityRate =
    Number.isFinite(rateCandidate) && rateCandidate >= 0 ? rateCandidate : DEFAULT_ELECTRICITY_RATE;
  const timezoneCandidate = source.timezone;
  const updatedAtCandidate = source.updatedAt ?? source.updated_at;

  return {
    electricityRate,
    effectiveMonth,
    nodeLabels: normalizeNodeLabels(source.nodeLabels ?? source.node_labels),
    nodeThresholds: normalizeNodeThresholds(source.nodeThresholds ?? source.node_thresholds),
    timezone:
      typeof timezoneCandidate === "string" && timezoneCandidate.trim().length > 0
        ? timezoneCandidate.trim()
        : DEFAULT_TIMEZONE,
    updatedAt:
      typeof updatedAtCandidate === "string" && updatedAtCandidate.length > 0
        ? updatedAtCandidate
        : null,
    rateHistory: normalizeRateHistory(
      source.rateHistory ?? source.rate_history,
      effectiveMonth,
      electricityRate
    )
  };
}

function readLocalSettings(): AppSettings {
  if (typeof window === "undefined") {
    return normalizeSettings({});
  }

  const rawRate = window.localStorage.getItem("electricityRate");
  const rawMonth = window.localStorage.getItem("effectiveMonth");
  const rawTimezone = window.localStorage.getItem("timezone");
  const rawLabels = parseJsonArray<string[]>(
    window.localStorage.getItem("nodeLabels"),
    DEFAULT_NODE_LABELS
  );
  const rawThresholds = parseJsonArray<number[]>(
    window.localStorage.getItem("nodeThresholds"),
    DEFAULT_NODE_THRESHOLDS
  );
  const rawRateHistory = parseJsonArray<MonthlyRate[]>(
    window.localStorage.getItem("rateHistory"),
    []
  );

  return normalizeSettings({
    electricityRate: rawRate ? Number(rawRate) : DEFAULT_ELECTRICITY_RATE,
    effectiveMonth: rawMonth || defaultMonth(),
    nodeLabels: rawLabels,
    nodeThresholds: rawThresholds,
    timezone: rawTimezone || DEFAULT_TIMEZONE,
    rateHistory: rawRateHistory
  });
}

function persistLocalSettings(settings: AppSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem("electricityRate", String(settings.electricityRate));
  window.localStorage.setItem("effectiveMonth", settings.effectiveMonth);
  window.localStorage.setItem("nodeLabels", JSON.stringify(settings.nodeLabels));
  window.localStorage.setItem("nodeThresholds", JSON.stringify(settings.nodeThresholds));
  window.localStorage.setItem("timezone", settings.timezone);
  window.localStorage.setItem("rateHistory", JSON.stringify(settings.rateHistory));
}

export function getPHTDayKey(dateInput: Date | string) {
  const byType = parsePhtParts(dateInput);
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function getMonthFromDayKey(dayKey: string) {
  return dayKey.slice(0, 7);
}

function getMonthDisplayLabel(monthKey: string) {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: PHT_TIMEZONE,
    month: "long",
    year: "numeric"
  }).format(date);
}

function extractMonthKeyFromTimestamp(timestamp: string) {
  return getPHTDayKey(timestamp).slice(0, 7);
}

function getPHTCurrentMonth() {
  const parts = parsePhtParts(new Date());
  return `${parts.year}-${parts.month}`;
}

function getPHTCurrentDay() {
  const parts = parsePhtParts(new Date());
  return Number(parts.day);
}

function getDaysInMonth(monthKey: string) {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function getMonthDayKeys(monthKey: string) {
  const days = getDaysInMonth(monthKey);
  const keys: string[] = [];
  for (let day = 1; day <= days; day += 1) {
    keys.push(`${monthKey}-${String(day).padStart(2, "0")}`);
  }
  return keys;
}

function getPreviousMonth(monthKey: string) {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() - 1);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getCoverageEndDay(monthKey: string) {
  if (monthKey === getPHTCurrentMonth()) {
    return getPHTCurrentDay();
  }
  return getDaysInMonth(monthKey);
}

export function formatMonthCoverageLabel(monthKey: string) {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const monthName = new Intl.DateTimeFormat("en-PH", {
    timeZone: PHT_TIMEZONE,
    month: "long"
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  const endDay = getCoverageEndDay(monthKey);
  return `${monthName} 1-${endDay}, ${year}`;
}

function getPHTDayLabel(dayKey: string) {
  return String(Number(dayKey.slice(8, 10)));
}

function formatPHTTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-PH", {
    timeZone: PHT_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function resolveRateForMonth(
  rateHistory: MonthlyRate[],
  monthKey: string,
  fallbackRate: number
): RateResolution {
  const sorted = [...rateHistory]
    .filter((item) => isMonthString(item.month) && Number.isFinite(item.ratePerKwh))
    .sort((a, b) => a.month.localeCompare(b.month));

  const exact = sorted.find((item) => item.month === monthKey);
  if (exact) {
    return {
      ratePerKwh: exact.ratePerKwh,
      fromMonth: exact.month,
      fallback: false
    };
  }

  const previous = [...sorted].reverse().find((item) => item.month < monthKey);
  if (previous) {
    return {
      ratePerKwh: previous.ratePerKwh,
      fromMonth: previous.month,
      fallback: true
    };
  }

  return {
    ratePerKwh: fallbackRate,
    fromMonth: null,
    fallback: false
  };
}

async function fetchJson(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${path}`);
  }
  return response.json();
}

export async function fetchAppSettings(): Promise<AppSettings> {
  try {
    const response = await fetchJson("/api/settings");
    const settings = normalizeSettings(response?.data ?? response);
    persistLocalSettings(settings);
    return settings;
  } catch (_error) {
    return readLocalSettings();
  }
}

export async function saveAppSettings(
  partialSettings: Partial<AppSettings>
): Promise<AppSettings> {
  const payload: Record<string, unknown> = {};

  if (partialSettings.electricityRate !== undefined) {
    payload.electricityRate = Number(partialSettings.electricityRate);
  }
  if (partialSettings.effectiveMonth !== undefined) {
    payload.effectiveMonth = partialSettings.effectiveMonth;
  }
  if (partialSettings.nodeLabels !== undefined) {
    payload.nodeLabels = partialSettings.nodeLabels;
  }
  if (partialSettings.nodeThresholds !== undefined) {
    payload.nodeThresholds = partialSettings.nodeThresholds;
  }
  if (partialSettings.timezone !== undefined) {
    payload.timezone = partialSettings.timezone;
  }

  if (Object.keys(payload).length === 0) {
    return fetchAppSettings();
  }

  try {
    await fetchJson("/api/settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    return fetchAppSettings();
  } catch (error) {
    const fallback = normalizeSettings({
      ...readLocalSettings(),
      ...partialSettings
    });
    persistLocalSettings(fallback);
    throw error;
  }
}

export async function saveMonthlyRate(
  month: string,
  ratePerKwh: number,
  options: { source?: string; sourceUrl?: string; verified?: boolean } = {}
) {
  const monthKey = normalizeMonth(month);
  await fetchJson(`/api/rates/${monthKey}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ratePerKwh: Number(ratePerKwh),
      source: options.source || "manual",
      sourceUrl: options.sourceUrl,
      verified: options.verified ?? true
    })
  });

  return fetchAppSettings();
}

export async function deleteMonthlyRate(month: string) {
  const monthKey = normalizeMonth(month);
  await fetchJson(`/api/rates/${monthKey}`, {
    method: "DELETE"
  });

  return fetchAppSettings();
}

export async function fetchRateDraft(url: string, month?: string): Promise<RateDraftResult> {
  const payload: Record<string, unknown> = { url };
  if (month) {
    payload.month = normalizeMonth(month);
  }

  const response = await fetchJson("/api/rates/fetch-draft", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return response?.data as RateDraftResult;
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

function sumByKeys(dailyTotals: Record<string, number>, keys: string[]) {
  return keys.reduce((sum, key) => sum + (dailyTotals[key] || 0), 0);
}

function buildNodeSummaries(
  selectedAppliances: string[],
  dailyByAppliance: Map<string, Record<string, number>>,
  latestByAppliance: Map<string, ApiReading>,
  selectedMonthDayKeys: string[],
  previousMonthDayKeys: string[],
  ratePerKwh: number,
  labels: string[]
): NodeSummary[] {
  const todayKey = getPHTDayKey(new Date());

  return selectedAppliances.map((applianceId, index) => {
    const latest = latestByAppliance.get(applianceId);
    const defaultLabel = latest?.applianceName || `Node ${index + 1}`;
    const label = labels[index] || defaultLabel;
    const daily = dailyByAppliance.get(applianceId) || {};
    const currentDayKWh = daily[todayKey] || 0;
    const periodKWh = sumByKeys(daily, selectedMonthDayKeys);
    const previousMonthKWh = sumByKeys(daily, previousMonthDayKeys);

    return {
      nodeId: index + 1,
      label,
      deviceId: latest?.nodeId || `ESP32-NODE-00${index + 1}`,
      applianceId,
      currentDayKWh,
      currentDayEstimatedCost: currentDayKWh * ratePerKwh,
      periodKWh,
      previousMonthKWh,
      currentPower: latest?.powerW || 0,
      estimatedCost: periodKWh * ratePerKwh
    };
  });
}

function buildAvailableMonths(readings: ApiReading[], rateHistory: MonthlyRate[], selectedMonth: string) {
  const months = new Set<string>();
  months.add(selectedMonth);
  months.add(defaultMonth());

  readings.forEach((row) => {
    months.add(extractMonthKeyFromTimestamp(row.timestamp));
  });

  rateHistory.forEach((row) => {
    if (isMonthString(row.month)) {
      months.add(row.month);
    }
  });

  return [...months]
    .filter((month) => isMonthString(month))
    .sort((a, b) => b.localeCompare(a));
}

function buildChartData(
  selectedAppliances: string[],
  dailyByAppliance: Map<string, Record<string, number>>,
  selectedMonthDayKeys: string[]
): DailyData[] {
  return selectedMonthDayKeys.map((dayKey) => ({
    dayKey,
    date: getPHTDayLabel(dayKey),
    node1: Number(((dailyByAppliance.get(selectedAppliances[0]) || {})[dayKey] || 0).toFixed(4)),
    node2: Number(((dailyByAppliance.get(selectedAppliances[1]) || {})[dayKey] || 0).toFixed(4)),
    node3: Number(((dailyByAppliance.get(selectedAppliances[2]) || {})[dayKey] || 0).toFixed(4))
  }));
}

function mapAlerts(
  alertRows: ApiReading[],
  selectedAppliances: string[],
  labels: string[],
  thresholds: number[]
) {
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

export async function fetchDashboardData(
  options: FetchDashboardOptions = {}
): Promise<DashboardData> {
  const settings = options.settings || (await fetchAppSettings());
  const selectedMonth = normalizeMonth(options.selectedMonth || settings.effectiveMonth);
  const resolvedRate = resolveRateForMonth(
    settings.rateHistory,
    selectedMonth,
    settings.electricityRate
  );

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
  const availableMonths = buildAvailableMonths(readings, settings.rateHistory, selectedMonth);

  const selectedMonthDayKeys = getMonthDayKeys(selectedMonth);
  const previousMonthKey = getPreviousMonth(selectedMonth);
  const previousMonthDayKeys = getMonthDayKeys(previousMonthKey);

  const nodeSummaries = buildNodeSummaries(
    selectedAppliances,
    dailyByAppliance,
    latestByAppliance,
    selectedMonthDayKeys,
    previousMonthDayKeys,
    resolvedRate.ratePerKwh,
    settings.nodeLabels
  );
  const chartData = buildChartData(selectedAppliances, dailyByAppliance, selectedMonthDayKeys);

  let alerts: Alert[] = [];
  try {
    const alertsRes = await fetchJson("/api/alerts?limit=200");
    const alertRows: ApiReading[] = Array.isArray(alertsRes?.data) ? alertsRes.data : [];
    const monthAlerts = alertRows.filter((row) => getMonthFromDayKey(getPHTDayKey(row.timestamp)) === selectedMonth);
    alerts = mapAlerts(
      monthAlerts,
      selectedAppliances,
      settings.nodeLabels,
      settings.nodeThresholds
    );
  } catch (_error) {
    const fallbackRows = readings
      .filter((reading) => reading.abnormal || reading.powerW > reading.thresholdW)
      .filter((reading) => getMonthFromDayKey(getPHTDayKey(reading.timestamp)) === selectedMonth);
    alerts = mapAlerts(
      fallbackRows,
      selectedAppliances,
      settings.nodeLabels,
      settings.nodeThresholds
    );
  }

  const selectedMonthTotalKWh = nodeSummaries.reduce((sum, node) => sum + node.periodKWh, 0);
  const previousMonthTotalKWh = nodeSummaries.reduce((sum, node) => sum + node.previousMonthKWh, 0);
  const selectedMonthTotalCost = selectedMonthTotalKWh * resolvedRate.ratePerKwh;

  return {
    chartData,
    nodeSummaries,
    alerts,
    readings,
    availableMonths,
    selectedMonth,
    selectedMonthCoverageLabel: formatMonthCoverageLabel(selectedMonth),
    selectedMonthTotalKWh,
    selectedMonthTotalCost,
    previousMonthKey,
    previousMonthTotalKWh,
    resolvedRate
  };
}

export function getMonthLabel(monthKey: string) {
  return getMonthDisplayLabel(normalizeMonth(monthKey));
}

export function getPHTTime() {
  return new Date().toLocaleString("en-PH", {
    timeZone: PHT_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short"
  });
}
