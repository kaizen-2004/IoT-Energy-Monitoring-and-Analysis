import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wifi,
  WifiOff,
  Zap
} from "lucide-react";
import {
  Bar,
  ComposedChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  API_BASE,
  defaultMonth,
  fetchAppSettings,
  fetchDashboardData,
  getMonthLabel,
  getPHTTime,
  type Alert,
  type DailyData,
  type NodeSummary,
  type RateResolution
} from "../utils/mockData";

type LegendPayloadItem = {
  color?: string;
  value?: string | number;
};

function toShortLegendLabel(value: string) {
  if (value.startsWith("Node 1")) return "Node 1";
  if (value.startsWith("Node 2")) return "Node 2";
  if (value.startsWith("Node 3")) return "Node 3";
  if (value.toLowerCase().includes("total")) return "Total";
  return value;
}

function renderCompactLegend(props: { payload?: LegendPayloadItem[] }) {
  const payload = props.payload || [];

  return (
    <div className="w-full grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-x-4 gap-y-2 pt-1">
      {payload.map((entry, index) => (
        <div key={`${entry.value || "legend"}-${index}`} className="inline-flex items-center gap-2 min-w-0">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
            style={{ backgroundColor: entry.color || "#94a3b8" }}
          />
          <span className="text-xs sm:hidden text-gray-700 dark:text-gray-300 truncate">
            {toShortLegendLabel(String(entry.value || ""))}
          </span>
          <span className="hidden sm:inline text-sm text-gray-700 dark:text-gray-300 truncate">
            {String(entry.value || "")}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [lastUpdated, setLastUpdated] = useState<string>(getPHTTime());
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(30);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth());
  const [availableMonths, setAvailableMonths] = useState<string[]>([defaultMonth()]);
  const [chartData, setChartData] = useState<DailyData[]>([]);
  const [nodeSummaries, setNodeSummaries] = useState<NodeSummary[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [coverageLabel, setCoverageLabel] = useState<string>("");
  const [selectedMonthTotalKWh, setSelectedMonthTotalKWh] = useState<number>(0);
  const [selectedMonthTotalCost, setSelectedMonthTotalCost] = useState<number>(0);
  const [previousMonthTotalKWh, setPreviousMonthTotalKWh] = useState<number>(0);
  const [previousMonthKey, setPreviousMonthKey] = useState<string>("");
  const [resolvedRate, setResolvedRate] = useState<RateResolution>({
    ratePerKwh: 11.5,
    fromMonth: null,
    fallback: false
  });

  useEffect(() => {
    fetchAppSettings()
      .then((settings) => {
        setSelectedMonth(settings.effectiveMonth || defaultMonth());
      })
      .catch(() => {
        setSelectedMonth(defaultMonth());
      });
  }, []);

  const loadData = useCallback(async () => {
    try {
      const settings = await fetchAppSettings();
      const dashboardData = await fetchDashboardData({
        settings,
        selectedMonth
      });

      setChartData(dashboardData.chartData);
      setNodeSummaries(dashboardData.nodeSummaries);
      setAlerts(dashboardData.alerts);
      setAvailableMonths(dashboardData.availableMonths);
      setCoverageLabel(dashboardData.selectedMonthCoverageLabel);
      setSelectedMonthTotalKWh(dashboardData.selectedMonthTotalKWh);
      setSelectedMonthTotalCost(dashboardData.selectedMonthTotalCost);
      setPreviousMonthTotalKWh(dashboardData.previousMonthTotalKWh);
      setPreviousMonthKey(dashboardData.previousMonthKey);
      setResolvedRate(dashboardData.resolvedRate);
      setLastUpdated(getPHTTime());
      setIsConnected(true);
      setErrorMessage("");
    } catch (error) {
      setIsConnected(false);
      setErrorMessage(error instanceof Error ? error.message : "Unable to fetch data");
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const intervalId = window.setInterval(loadData, refreshInterval * 1000);
    return () => window.clearInterval(intervalId);
  }, [loadData, refreshInterval]);

  const chartDataWithTotals = useMemo(
    () =>
      chartData.map((row) => ({
        ...row,
        total: Number((row.node1 + row.node2 + row.node3).toFixed(4))
      })),
    [chartData]
  );

  const hasChartData = chartDataWithTotals.some(
    (row) => row.node1 > 0 || row.node2 > 0 || row.node3 > 0 || row.total > 0
  );
  const totalTodayKWh = nodeSummaries.reduce((sum, node) => sum + node.currentDayKWh, 0);
  const totalTodayCost = nodeSummaries.reduce((sum, node) => sum + node.currentDayEstimatedCost, 0);

  const difference = selectedMonthTotalKWh - previousMonthTotalKWh;
  const percentChange = previousMonthTotalKWh > 0 ? (difference / previousMonthTotalKWh) * 100 : 0;

  let insightIcon = Minus;
  let insightColor = "text-gray-600";
  let insightText = "";

  if (difference > 0.0001 && previousMonthTotalKWh > 0) {
    insightIcon = TrendingUp;
    insightColor = "text-red-600";
    insightText = `You consumed ${Math.abs(difference).toFixed(3)} kWh (${Math.abs(percentChange).toFixed(1)}%) more than ${getMonthLabel(previousMonthKey)}.`;
  } else if (difference < -0.0001 && previousMonthTotalKWh > 0) {
    insightIcon = TrendingDown;
    insightColor = "text-green-600";
    insightText = `You consumed ${Math.abs(difference).toFixed(3)} kWh (${Math.abs(percentChange).toFixed(1)}%) less than ${getMonthLabel(previousMonthKey)}.`;
  } else if (previousMonthTotalKWh === 0 && selectedMonthTotalKWh > 0) {
    insightText = `You consumed ${selectedMonthTotalKWh.toFixed(3)} kWh for ${getMonthLabel(selectedMonth)}. No complete baseline from ${getMonthLabel(previousMonthKey)}.`;
  } else {
    insightText = `Consumption for ${getMonthLabel(selectedMonth)} is about the same as ${getMonthLabel(previousMonthKey)}.`;
  }

  const rateCaption = resolvedRate.fallback && resolvedRate.fromMonth
    ? `Using fallback rate from ${getMonthLabel(resolvedRate.fromMonth)}: PHP ${resolvedRate.ratePerKwh.toFixed(2)}/kWh`
    : `Rate for ${getMonthLabel(selectedMonth)}: PHP ${resolvedRate.ratePerKwh.toFixed(2)}/kWh`;

  const InsightIcon = insightIcon;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl leading-tight break-words font-semibold text-gray-900 dark:text-gray-100">IoT Household Energy Monitoring Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Philippine context • Unit: kWh • Timezone: PHT (UTC+8)</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <Wifi className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-600">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-red-600">Disconnected</span>
                </>
              )}
            </div>
            <div className="hidden sm:block h-6 w-px bg-gray-300 dark:bg-gray-700" />
            <div className="text-sm text-gray-600 dark:text-gray-400 break-words min-w-0">Last updated: {lastUpdated}</div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
            <label htmlFor="month-selector" className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
              Billing Month:
            </label>
            <select
              id="month-selector"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="w-full sm:w-56 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 dark:text-gray-100"
            >
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {getMonthLabel(month)}
                </option>
              ))}
            </select>

            <label htmlFor="refresh-interval" className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap lg:ml-3">
              Refresh Interval:
            </label>
            <div className="relative w-28">
              <input
                id="refresh-interval"
                type="number"
                min="5"
                max="300"
                value={refreshInterval}
                onChange={(event) => setRefreshInterval(Number.parseInt(event.target.value, 10) || 30)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 dark:text-gray-100"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">sec</span>
            </div>

            <button
              onClick={loadData}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Now
            </button>
          </div>

          <div className="w-full lg:w-auto text-sm text-gray-600 dark:text-gray-400 break-all">
            Data Source: {API_BASE}
          </div>
        </div>

        <div className="mt-4 space-y-1">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Historical view: <span className="font-medium">{coverageLabel || getMonthLabel(selectedMonth)}</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{rateCaption}</p>
        </div>

        {!isConnected && (
          <p className="mt-3 text-sm text-red-600">
            API error: {errorMessage}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Today</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{totalTodayKWh.toFixed(3)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">kWh</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Est. Cost Today</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mt-1">PHP {totalTodayCost.toFixed(2)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Live daily cost estimate</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-950 rounded-lg flex items-center justify-center">
              <span className="text-lg font-semibold text-green-700 dark:text-green-400">PHP</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Cost ({getMonthLabel(selectedMonth)})</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mt-1">PHP {selectedMonthTotalCost.toFixed(2)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedMonthTotalKWh.toFixed(3)} kWh selected month</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-950 rounded-lg flex items-center justify-center">
              <span className="text-lg font-semibold text-green-700 dark:text-green-400">PHP</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                difference > 0.0001 ? "bg-red-100 dark:bg-red-950" : difference < -0.0001 ? "bg-green-100 dark:bg-green-950" : "bg-gray-100 dark:bg-gray-800"
              }`}
            >
              <InsightIcon className={`w-5 h-5 ${insightColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Insight</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">{insightText}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Individual Nodes (Live Daily)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {nodeSummaries.map((node, index) => (
            <div key={node.applianceId} className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Node {node.nodeId}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{node.label}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  index === 0 ? "bg-purple-100 dark:bg-purple-950" : index === 1 ? "bg-orange-100 dark:bg-orange-950" : "bg-cyan-100 dark:bg-cyan-950"
                }`}>
                  <Zap className={`w-5 h-5 ${
                    index === 0 ? "text-purple-600" : index === 1 ? "text-orange-600" : "text-cyan-600"
                  }`} />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Today&apos;s Consumption</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{node.currentDayKWh.toFixed(3)} kWh</p>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Current Power</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{Math.round(node.currentPower)} W</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Est. Cost Today</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">PHP {node.currentDayEstimatedCost.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Selected Month Total</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{node.periodKWh.toFixed(3)} kWh</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Est. Cost ({getMonthLabel(selectedMonth)})</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">PHP {node.estimatedCost.toFixed(2)}</span>
                </div>

                <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Device ID: {node.deviceId}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Monthly Energy Profile (kWh)</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Daily node usage for {getMonthLabel(selectedMonth)} with total trend line</p>

        <div className="h-80 lg:h-96">
          {hasChartData ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartDataWithTotals}
                margin={{ top: 24, right: 20, left: 12, bottom: 20 }}
                barCategoryGap="26%"
                barGap={6}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={10} />
                <YAxis
                  label={{ value: "kWh", angle: -90, position: "insideLeft" }}
                  tick={{ fontSize: 12 }}
                  tickMargin={8}
                />
                <Tooltip
                  cursor={{ fill: "rgba(148, 163, 184, 0.14)" }}
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px" }}
                  labelFormatter={(label: string | number) => `Day ${label}`}
                  formatter={(value: number | string, name: string) => [
                    `${Number(value).toFixed(3)} kWh`,
                    name
                  ]}
                />
                <Legend
                  verticalAlign="top"
                  height={54}
                  content={renderCompactLegend}
                />
                <Bar
                  dataKey="node1"
                  name={`Node 1 (${nodeSummaries[0]?.label || "Node 1"})`}
                  fill="#7c3aed"
                  radius={[4, 4, 0, 0]}
                  barSize={14}
                />
                <Bar
                  dataKey="node2"
                  name={`Node 2 (${nodeSummaries[1]?.label || "Node 2"})`}
                  fill="#ea580c"
                  radius={[4, 4, 0, 0]}
                  barSize={14}
                />
                <Bar
                  dataKey="node3"
                  name={`Node 3 (${nodeSummaries[2]?.label || "Node 3"})`}
                  fill="#0891b2"
                  radius={[4, 4, 0, 0]}
                  barSize={14}
                />
                <Line
                  key="total-line"
                  type="linear"
                  dataKey="total"
                  stroke="#facc15"
                  strokeWidth={3}
                  name="Total Daily kWh"
                  dot={{ r: 2.5, fill: "#facc15", stroke: "#fef3c7", strokeWidth: 1 }}
                  activeDot={{ r: 4.5, fill: "#facc15", stroke: "#fef3c7", strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
              No readings found for {getMonthLabel(selectedMonth)}. Data will appear after ingest starts.
            </div>
          )}
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Alerts ({getMonthLabel(selectedMonth)})</h2>
          </div>

          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">{alert.message}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-600 dark:text-gray-400">
                    <span>{alert.timestamp}</span>
                    <span>•</span>
                    <span>{alert.nodeLabel}</span>
                    <span>•</span>
                    <span>{alert.value}W / {alert.threshold}W</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
