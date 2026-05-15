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

export interface ApiDailyEnergy {
  applianceId: string;
  date: string;
  kWh: number;
}

export interface NodeSummary {
  nodeId: number;
  label: string;
  deviceId: string;
  todayKWh: number;
  yesterdayKWh: number;
  monthKWh: number;
  monthlyLimitKWh: number;
  monthlyLimitExceeded: boolean;
  currentPower: number;
  estimatedCost: number;
  monthEstimatedCost: number;
}

export interface DailyData {
  date: string;
  node1: number;
  node2: number;
  node3: number;
  total: number;
}

export interface MonthlyRate {
  month: string;
  rate: number;
  source: string;
  sourceUrl?: string | null;
  verified: boolean;
  lastUpdated: string;
}

export interface Alert {
  id: string;
  timestamp: string;
  nodeId: number;
  nodeLabel: string;
  value: number;
  threshold: number;
  message: string;
}

export interface CombinedMetrics {
  todayKWh: number;
  monthKWh: number;
  todayCost: number;
  monthCost: number;
  totalMonthlyLimitKWh: number;
  enabledMonthlyLimitCount: number;
  monthlyLimitAlertCount: number;
  remainingMonthlyLimitKWh: number;
  exceededMonthlyLimitKWh: number;
  currentPowerW: number;
  overMonthlyLimit: boolean;
}

export interface ComparisonData {
  currentValue: number;
  baselineValue: number;
  difference: number;
  percentChange: number;
  hasBaseline: boolean;
  label: string;
}

export type ChartMode = "7-day" | "whole-month";
export type ComparisonMode =
  | "today-vs-yesterday"
  | "7days-vs-prev7days"
  | "month-vs-lastmonth";

export interface AppSettings {
  electricityRate: number;
  effectiveMonth: string;
  nodeLabels: string[];
  nodeMonthlyLimitsKWh: number[];
  timezone: string;
  updatedAt: string | null;
  rateHistory: MonthlyRate[];
  customerAccountNumberConfigured: boolean;
}

export interface DashboardViewData {
  rate: number;
  selectedMonth: string;
  chartData: DailyData[];
  nodeSummaries: NodeSummary[];
  alerts: Alert[];
  comparisonData: ComparisonData;
  combinedMetrics: CombinedMetrics;
}

const PHT_TIMEZONE = "Asia/Manila";
const DEFAULT_NODE_LABELS = ["Refrigerator", "Air Conditioner", "Water Heater"];
const DEFAULT_NODE_MONTHLY_LIMITS_KWH = [0, 0, 0];
const DEFAULT_NODE_IDS = ["node-01", "node-02", "node-03"];
const DEFAULT_RATE = 11.5;
const MONITORED_APPLIANCES = ["appliance-01", "appliance-02", "appliance-03"];

function resolveApiBase() {
  const envValue =
    typeof import.meta.env.VITE_API_BASE === "string"
      ? import.meta.env.VITE_API_BASE.trim()
      : "";

  // Strip accidental wrapping quotes from dashboard environment variables.
  const normalizedEnvValue = envValue.replace(/^['"]|['"]$/g, "");
  const configured = normalizedEnvValue.replace(/\/+$/, "");
  if (configured) {
    const candidate = /^https?:\/\//i.test(configured)
      ? configured
      : `https://${configured}`;

    try {
      return new URL(candidate).origin;
    } catch {
      // Fall through to automatic host inference/local fallback.
    }
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

function isMonthKey(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function defaultMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function normalizeMonth(month?: string) {
  if (typeof month === "string" && isMonthKey(month)) {
    return month;
  }
  return defaultMonth();
}

function parsePhtParts(dateInput: Date | string) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PHT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const get = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value || "00";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day"))
  };
}

function getPhtDayKey(dateInput: Date | string) {
  const parts = parsePhtParts(dateInput);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function parseDayKey(dayKey: string): Date {
  const [yearText, monthText, dayText] = dayKey.split("-");
  return new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
}

function shiftDayKey(dayKey: string, offsetDays: number) {
  const date = parseDayKey(dayKey);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
}

function monthLabel(monthKey: string) {
  const [yearText, monthText] = monthKey.split("-");
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, 1));
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function dayLabel(dayKey: string) {
  const date = parseDayKey(dayKey);
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function getMonthDayKeys(monthKey: string) {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  });
}

function getPreviousMonth(monthKey: string) {
  const [yearText, monthText] = monthKey.split("-");
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, 1));
  date.setUTCMonth(date.getUTCMonth() - 1);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getDashboardAggregateRange(selectedMonth: string) {
  const selectedMonthKeys = getMonthDayKeys(selectedMonth);
  const previousMonthKeys = getMonthDayKeys(getPreviousMonth(selectedMonth));

  return {
    from: previousMonthKeys[0],
    to: selectedMonthKeys[selectedMonthKeys.length - 1]
  };
}

function getLastNDaysByMonthContext(days: number, selectedMonth: string) {
  const month = normalizeMonth(selectedMonth);
  const currentMonth = defaultMonth();

  if (month === currentMonth) {
    const endKey = getPhtDayKey(new Date());
    return Array.from({ length: days }, (_, idx) => shiftDayKey(endKey, -(days - 1) + idx));
  }

  const monthKeys = getMonthDayKeys(month);
  return monthKeys.slice(-days);
}

async function fetchJson(path: string, init: RequestInit = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const response = await fetch(url, init);
  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "message" in payload
        ? String((payload as { message?: unknown }).message || `HTTP ${response.status}`)
        : `HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload as Record<string, unknown>;
}

function mapRate(row: Record<string, unknown>): MonthlyRate {
  return {
    month: String(row.month || defaultMonth()),
    rate: Number(row.ratePerKwh ?? DEFAULT_RATE),
    source: typeof row.source === "string" ? row.source : "manual",
    sourceUrl: typeof row.sourceUrl === "string" ? row.sourceUrl : null,
    verified: Boolean(row.verified),
    lastUpdated:
      typeof row.updatedAt === "string" && row.updatedAt.length > 0
        ? row.updatedAt
        : getPHTTime()
  };
}

function normalizeLabels(input: unknown) {
  if (!Array.isArray(input)) return DEFAULT_NODE_LABELS;
  return [0, 1, 2].map((index) => {
    const value = input[index];
    if (typeof value !== "string") return DEFAULT_NODE_LABELS[index];
    const cleaned = value.trim();
    return cleaned || DEFAULT_NODE_LABELS[index];
  });
}

function normalizeMonthlyLimitsKWh(input: unknown) {
  if (!Array.isArray(input)) return DEFAULT_NODE_MONTHLY_LIMITS_KWH;
  return [0, 1, 2].map((index) => {
    const value = Number(input[index]);
    return Number.isFinite(value) && value >= 0 ? value : DEFAULT_NODE_MONTHLY_LIMITS_KWH[index];
  });
}

function mapSettingsPayload(data: Record<string, unknown>, rateHistoryRaw: unknown[]): AppSettings {
  return {
    electricityRate: Number(data.electricityRate ?? DEFAULT_RATE),
    effectiveMonth: normalizeMonth(typeof data.effectiveMonth === "string" ? data.effectiveMonth : undefined),
    nodeLabels: normalizeLabels(data.nodeLabels),
    nodeMonthlyLimitsKWh: normalizeMonthlyLimitsKWh(data.nodeMonthlyLimitsKWh),
    timezone: typeof data.timezone === "string" && data.timezone.trim() ? data.timezone : PHT_TIMEZONE,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
    rateHistory: rateHistoryRaw.map((row) => mapRate(row as Record<string, unknown>)),
    customerAccountNumberConfigured: Boolean(data.customerAccountNumberConfigured)
  };
}

export async function fetchAppSettings(): Promise<AppSettings> {
  const payload = await fetchJson("/api/settings");
  const data = (payload.data || {}) as Record<string, unknown>;
  const rateHistoryRaw = Array.isArray(data.rateHistory) ? data.rateHistory : [];

  return mapSettingsPayload(data, rateHistoryRaw);
}

export async function saveAppSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const payload = await fetchJson("/api/settings", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(patch)
  });

  const data = (payload.data || {}) as Record<string, unknown>;
  const rateHistoryRaw = Array.isArray(data.rateHistory) ? data.rateHistory : [];

  return mapSettingsPayload(data, rateHistoryRaw);
}

export async function fetchMonthlyRates(): Promise<MonthlyRate[]> {
  const payload = await fetchJson("/api/rates?limit=240");
  const data = Array.isArray(payload.data) ? payload.data : [];
  return data.map((row) => mapRate(row as Record<string, unknown>));
}

export async function saveMonthlyRate(
  month: string,
  rate: number,
  options: { source?: string; sourceUrl?: string | null; verified?: boolean } = {}
): Promise<MonthlyRate> {
  const requestBody: Record<string, unknown> = {
    ratePerKwh: rate
  };

  if (typeof options.source === "string" && options.source.trim().length > 0) {
    requestBody.source = options.source.trim();
  }

  if (typeof options.sourceUrl === "string" && options.sourceUrl.trim().length > 0) {
    requestBody.sourceUrl = options.sourceUrl.trim();
  }

  if (typeof options.verified === "boolean") {
    requestBody.verified = options.verified;
  }

  const payload = await fetchJson(`/api/rates/${normalizeMonth(month)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  return mapRate((payload.data || {}) as Record<string, unknown>);
}

export async function deleteMonthlyRate(month: string): Promise<void> {
  await fetchJson(`/api/rates/${normalizeMonth(month)}`, {
    method: "DELETE"
  });
}

function mapApiReading(row: unknown): ApiReading {
  const value = row as Record<string, unknown>;
  return {
    nodeId: String(value.nodeId || ""),
    applianceId: String(value.applianceId || ""),
    applianceName: String(value.applianceName || ""),
    currentRmsA: Number(value.currentRmsA || 0),
    voltageRefV: Number(value.voltageRefV || 0),
    powerW: Number(value.powerW || 0),
    energyWh: value.energyWh === null ? null : Number(value.energyWh || 0),
    frequencyHz: value.frequencyHz === null ? null : Number(value.frequencyHz || 0),
    thresholdW: Number(value.thresholdW || 0),
    abnormal: Boolean(value.abnormal),
    timestamp: String(value.timestamp || new Date().toISOString()),
    receivedAt: String(value.receivedAt || new Date().toISOString())
  };
}

export async function fetchReadings(limit = 5000): Promise<ApiReading[]> {
  const payload = await fetchJson(`/api/readings?limit=${limit}`);
  const data = Array.isArray(payload.data) ? payload.data : [];

  return data.map(mapApiReading);
}

export async function fetchReadingAggregates(
  fromDay: string,
  toDay: string
): Promise<{ daily: ApiDailyEnergy[]; latest: ApiReading[] }> {
  const params = new URLSearchParams({ from: fromDay, to: toDay });
  const payload = await fetchJson(`/api/readings/aggregate?${params.toString()}`);
  const dailyRows = Array.isArray(payload.daily) ? payload.daily : [];
  const latestRows = Array.isArray(payload.latest) ? payload.latest : [];

  return {
    daily: dailyRows.map((row) => {
      const value = row as Record<string, unknown>;
      return {
        applianceId: String(value.applianceId || ""),
        date: String(value.date || ""),
        kWh: Number(value.kWh || 0)
      };
    }),
    latest: latestRows.map(mapApiReading)
  };
}

function computeDailyByAppliance(readings: ApiReading[]) {
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
      const key = getPhtDayKey(current.timestamp);
      totals[key] = (totals[key] || 0) + incrementKwh;
    }

    dailyByAppliance.set(applianceId, totals);
  });

  return dailyByAppliance;
}

function buildDailyByApplianceFromSummaries(summaries: ApiDailyEnergy[]) {
  const dailyByAppliance = new Map<string, Record<string, number>>();

  summaries.forEach((summary) => {
    if (!summary.applianceId || !summary.date) {
      return;
    }

    const totals = dailyByAppliance.get(summary.applianceId) || {};
    totals[summary.date] = (totals[summary.date] || 0) + summary.kWh;
    dailyByAppliance.set(summary.applianceId, totals);
  });

  return dailyByAppliance;
}

function buildLatestByAppliance(readings: ApiReading[]) {
  const map = new Map<string, ApiReading>();

  readings.forEach((reading) => {
    const current = map.get(reading.applianceId);
    if (!current) {
      map.set(reading.applianceId, reading);
      return;
    }

    if (new Date(reading.timestamp).getTime() > new Date(current.timestamp).getTime()) {
      map.set(reading.applianceId, reading);
    }
  });

  return map;
}

function sumByKeys(record: Record<string, number>, keys: string[]) {
  return keys.reduce((sum, key) => sum + (record[key] || 0), 0);
}

function resolveRateForMonth(rates: MonthlyRate[], month: string, fallbackRate: number) {
  const sorted = [...rates]
    .filter((item) => isMonthKey(item.month) && Number.isFinite(item.rate))
    .sort((a, b) => a.month.localeCompare(b.month));

  const exact = sorted.find((item) => item.month === month);
  if (exact) {
    return exact.rate;
  }

  const previous = [...sorted].reverse().find((item) => item.month < month);
  if (previous) {
    return previous.rate;
  }

  return fallbackRate;
}

function buildChartData(
  mode: ChartMode,
  selectedMonth: string,
  selectedAppliances: string[],
  dailyByAppliance: Map<string, Record<string, number>>
): DailyData[] {
  const keys =
    mode === "7-day"
      ? getLastNDaysByMonthContext(7, selectedMonth)
      : getMonthDayKeys(selectedMonth);

  return keys.map((key) => {
    const node1 = Number(((dailyByAppliance.get(selectedAppliances[0]) || {})[key] || 0).toFixed(3));
    const node2 = Number(((dailyByAppliance.get(selectedAppliances[1]) || {})[key] || 0).toFixed(3));
    const node3 = Number(((dailyByAppliance.get(selectedAppliances[2]) || {})[key] || 0).toFixed(3));

    return {
      date: dayLabel(key),
      node1,
      node2,
      node3,
      total: Number((node1 + node2 + node3).toFixed(3))
    };
  });
}

function buildNodeSummaries(
  selectedMonth: string,
  rate: number,
  labels: string[],
  monthlyLimitsKWh: number[],
  selectedAppliances: string[],
  dailyByAppliance: Map<string, Record<string, number>>,
  latestByAppliance: Map<string, ApiReading>
): NodeSummary[] {
  const todayKey = getPhtDayKey(new Date());
  const yesterdayKey = shiftDayKey(todayKey, -1);
  const monthKeys = getMonthDayKeys(selectedMonth);

  return selectedAppliances.map((applianceId, index) => {
    const latest = latestByAppliance.get(applianceId);
    const daily = dailyByAppliance.get(applianceId) || {};
    const todayKWh = daily[todayKey] || 0;
    const yesterdayKWh = daily[yesterdayKey] || 0;
    const monthKWh = sumByKeys(daily, monthKeys);
    const monthlyLimitKWh = monthlyLimitsKWh[index] || 0;

    return {
      nodeId: index + 1,
      label: labels[index] || latest?.applianceName || DEFAULT_NODE_LABELS[index],
      deviceId: latest?.nodeId || DEFAULT_NODE_IDS[index],
      todayKWh,
      yesterdayKWh,
      monthKWh,
      monthlyLimitKWh,
      monthlyLimitExceeded: monthlyLimitKWh > 0 && monthKWh > monthlyLimitKWh,
      currentPower: latest?.powerW || 0,
      estimatedCost: todayKWh * rate,
      monthEstimatedCost: monthKWh * rate
    };
  });
}

function buildTotalByDay(
  selectedAppliances: string[],
  dailyByAppliance: Map<string, Record<string, number>>
) {
  const totals: Record<string, number> = {};

  selectedAppliances.forEach((applianceId) => {
    const perDay = dailyByAppliance.get(applianceId) || {};
    Object.entries(perDay).forEach(([key, value]) => {
      totals[key] = (totals[key] || 0) + value;
    });
  });

  return totals;
}

function buildCombinedMetrics(nodeSummaries: NodeSummary[], rate: number): CombinedMetrics {
  const todayKWh = nodeSummaries.reduce((sum, node) => sum + node.todayKWh, 0);
  const monthKWh = nodeSummaries.reduce((sum, node) => sum + node.monthKWh, 0);
  const currentPowerW = nodeSummaries.reduce((sum, node) => sum + node.currentPower, 0);
  const limitedNodes = nodeSummaries.filter((node) => node.monthlyLimitKWh > 0);
  const totalMonthlyLimitKWh = limitedNodes.reduce((sum, node) => sum + node.monthlyLimitKWh, 0);
  const remainingMonthlyLimitKWh = limitedNodes.reduce(
    (sum, node) => sum + Math.max(node.monthlyLimitKWh - node.monthKWh, 0),
    0
  );
  const exceededMonthlyLimitKWh = limitedNodes.reduce(
    (sum, node) => sum + Math.max(node.monthKWh - node.monthlyLimitKWh, 0),
    0
  );
  const monthlyLimitAlertCount = limitedNodes.filter((node) => node.monthlyLimitExceeded).length;

  return {
    todayKWh: Number(todayKWh.toFixed(3)),
    monthKWh: Number(monthKWh.toFixed(3)),
    todayCost: Number((todayKWh * rate).toFixed(2)),
    monthCost: Number((monthKWh * rate).toFixed(2)),
    totalMonthlyLimitKWh: Number(totalMonthlyLimitKWh.toFixed(3)),
    enabledMonthlyLimitCount: limitedNodes.length,
    monthlyLimitAlertCount,
    remainingMonthlyLimitKWh: Number(remainingMonthlyLimitKWh.toFixed(3)),
    exceededMonthlyLimitKWh: Number(exceededMonthlyLimitKWh.toFixed(3)),
    currentPowerW: Number(currentPowerW.toFixed(1)),
    overMonthlyLimit: monthlyLimitAlertCount > 0
  };
}

function buildCombinedAlerts(
  nodeSummaries: NodeSummary[],
  selectedMonth: string
): Alert[] {
  return nodeSummaries
    .filter((node) => node.monthlyLimitExceeded)
    .map((node) => ({
      id: `node-${node.nodeId}-monthly-limit-alert`,
      timestamp: monthLabel(selectedMonth),
      nodeId: node.nodeId,
      nodeLabel: node.label,
      value: Number(node.monthKWh.toFixed(2)),
      threshold: Number(node.monthlyLimitKWh.toFixed(2)),
      message: `${node.label} exceeded the monthly limit of ${node.monthlyLimitKWh.toFixed(2)} kWh (${node.monthKWh.toFixed(2)} kWh used).`
    }));
}

function computeComparisonData(
  mode: ComparisonMode,
  selectedMonth: string,
  totalsByDay: Record<string, number>
): ComparisonData {
  const sum = (keys: string[]) => keys.reduce((acc, key) => acc + (totalsByDay[key] || 0), 0);

  if (mode === "today-vs-yesterday") {
    const todayKey = getPhtDayKey(new Date());
    const yesterdayKey = shiftDayKey(todayKey, -1);
    const currentValue = totalsByDay[todayKey] || 0;
    const baselineValue = totalsByDay[yesterdayKey] || 0;
    const difference = currentValue - baselineValue;
    const percentChange = baselineValue > 0 ? (difference / baselineValue) * 100 : 0;

    return {
      currentValue,
      baselineValue,
      difference,
      percentChange,
      hasBaseline: baselineValue > 0,
      label: "Today vs Yesterday"
    };
  }

  if (mode === "7days-vs-prev7days") {
    const endKey =
      selectedMonth === defaultMonth()
        ? getPhtDayKey(new Date())
        : getMonthDayKeys(selectedMonth).slice(-1)[0];

    const current7 = Array.from({ length: 7 }, (_, idx) => shiftDayKey(endKey, -(6 - idx)));
    const previous7 = current7.map((key) => shiftDayKey(key, -7));

    const currentValue = sum(current7);
    const baselineValue = sum(previous7);
    const difference = currentValue - baselineValue;
    const percentChange = baselineValue > 0 ? (difference / baselineValue) * 100 : 0;

    return {
      currentValue,
      baselineValue,
      difference,
      percentChange,
      hasBaseline: baselineValue > 0,
      label: "Current 7 Days vs Previous 7 Days"
    };
  }

  const previousMonth = getPreviousMonth(selectedMonth);
  const currentValue = sum(getMonthDayKeys(selectedMonth));
  const baselineValue = sum(getMonthDayKeys(previousMonth));
  const difference = currentValue - baselineValue;
  const percentChange = baselineValue > 0 ? (difference / baselineValue) * 100 : 0;

  return {
    currentValue,
    baselineValue,
    difference,
    percentChange,
    hasBaseline: baselineValue > 0,
    label: `${monthLabel(selectedMonth)} vs ${monthLabel(previousMonth)}`
  };
}

export async function fetchDashboardViewData(options: {
  selectedMonth?: string;
  chartMode: ChartMode;
  comparisonMode: ComparisonMode;
}): Promise<DashboardViewData> {
  const settings = await fetchAppSettings();
  const selectedMonth = normalizeMonth(options.selectedMonth || settings.effectiveMonth);
  const rate = resolveRateForMonth(settings.rateHistory, selectedMonth, settings.electricityRate);
  const selectedAppliances = [...MONITORED_APPLIANCES];
  const aggregateRange = getDashboardAggregateRange(selectedMonth);
  const aggregates = await fetchReadingAggregates(aggregateRange.from, aggregateRange.to);
  const latestByAppliance = buildLatestByAppliance(aggregates.latest);
  const dailyByAppliance = buildDailyByApplianceFromSummaries(aggregates.daily);
  const chartData = buildChartData(options.chartMode, selectedMonth, selectedAppliances, dailyByAppliance);
  const nodeSummaries = buildNodeSummaries(
    selectedMonth,
    rate,
    settings.nodeLabels,
    settings.nodeMonthlyLimitsKWh,
    selectedAppliances,
    dailyByAppliance,
    latestByAppliance
  );
  const combinedMetrics = buildCombinedMetrics(nodeSummaries, rate);
  const alerts = buildCombinedAlerts(nodeSummaries, selectedMonth);
  const totalsByDay = buildTotalByDay(selectedAppliances, dailyByAppliance);
  const comparisonData = computeComparisonData(options.comparisonMode, selectedMonth, totalsByDay);

  return {
    rate,
    selectedMonth,
    chartData,
    nodeSummaries,
    alerts,
    comparisonData,
    combinedMetrics
  };
}

export async function fetchReportsViewData(options: {
  selectedMonth: string;
  viewMode: ChartMode;
}) {
  const dashboard = await fetchDashboardViewData({
    selectedMonth: options.selectedMonth,
    chartMode: options.viewMode,
    comparisonMode: "month-vs-lastmonth"
  });

  const totalKWh = dashboard.combinedMetrics.monthKWh;
  const totalCost = dashboard.combinedMetrics.monthCost;

  return {
    ...dashboard,
    totalKWh,
    totalCost
  };
}

export async function fetchSettingsViewData() {
  const settings = await fetchAppSettings();
  return {
    settings,
    monthlyRates: [...settings.rateHistory].sort((a, b) => b.month.localeCompare(a.month))
  };
}

export function getPHTTime(): string {
  return new Date().toLocaleString("en-PH", {
    timeZone: PHT_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short"
  });
}
