import { useCallback, useEffect, useState } from "react";
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
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { API_BASE, fetchDashboardData, getPHTTime } from "../utils/mockData";
import type { Alert, DailyData, NodeSummary } from "../utils/mockData";

export default function Dashboard() {
  const [lastUpdated, setLastUpdated] = useState<string>(getPHTTime());
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(30);
  const [chartData, setChartData] = useState<DailyData[]>([]);
  const [nodeSummaries, setNodeSummaries] = useState<NodeSummary[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rate, setRate] = useState<number>(11.5);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const loadData = useCallback(async () => {
    try {
      const savedRate = window.localStorage.getItem("electricityRate");
      const currentRate = savedRate ? Number(savedRate) : 11.5;
      setRate(Number.isFinite(currentRate) && currentRate >= 0 ? currentRate : 11.5);

      const dashboardData = await fetchDashboardData(currentRate);
      setChartData(dashboardData.chartData);
      setNodeSummaries(dashboardData.nodeSummaries);
      setAlerts(dashboardData.alerts);
      setLastUpdated(getPHTTime());
      setIsConnected(true);
      setErrorMessage("");
    } catch (error) {
      setIsConnected(false);
      setErrorMessage(error instanceof Error ? error.message : "Unable to fetch data");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const intervalId = window.setInterval(loadData, refreshInterval * 1000);
    return () => window.clearInterval(intervalId);
  }, [loadData, refreshInterval]);

  const todayTotal = nodeSummaries.reduce((sum, node) => sum + node.todayKWh, 0);
  const yesterdayTotal = nodeSummaries.reduce((sum, node) => sum + node.yesterdayKWh, 0);
  const todayCostTotal = todayTotal * rate;
  const difference = todayTotal - yesterdayTotal;
  const percentChange = yesterdayTotal > 0 ? (difference / yesterdayTotal) * 100 : 0;

  let insightIcon = Minus;
  let insightColor = "text-gray-600";
  let insightText = "";

  if (difference > 0.0001 && yesterdayTotal > 0) {
    insightIcon = TrendingUp;
    insightColor = "text-red-600";
    insightText = `You have consumed ${Math.abs(difference).toFixed(3)} kWh (${Math.abs(percentChange).toFixed(1)}%) more today compared to yesterday.`;
  } else if (difference < -0.0001 && yesterdayTotal > 0) {
    insightIcon = TrendingDown;
    insightColor = "text-green-600";
    insightText = `You have consumed ${Math.abs(difference).toFixed(3)} kWh (${Math.abs(percentChange).toFixed(1)}%) less today compared to yesterday.`;
  } else if (yesterdayTotal === 0 && todayTotal > 0) {
    insightText = `You have consumed ${todayTotal.toFixed(3)} kWh today. No baseline data for yesterday yet.`;
  } else {
    insightText = "Your consumption today is about the same as yesterday.";
  }

  const InsightIcon = insightIcon;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">IoT Household Energy Monitoring Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Philippine context • Unit: kWh • Timezone: PHT (UTC+8)</p>
          </div>

          <div className="flex items-center gap-3">
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
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-700" />
            <div className="text-sm text-gray-600 dark:text-gray-400">Last updated: {lastUpdated}</div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
            <label htmlFor="refresh-interval" className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
              Refresh Interval:
            </label>
            <input
              id="refresh-interval"
              type="number"
              min="5"
              max="300"
              value={refreshInterval}
              onChange={(event) => setRefreshInterval(Number.parseInt(event.target.value, 10) || 30)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg w-24 bg-white dark:bg-gray-950 dark:text-gray-100"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">seconds</span>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Now
            </button>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            Data Source: {API_BASE}
          </div>
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
              <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{todayTotal.toFixed(3)}</p>
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Yesterday</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{yesterdayTotal.toFixed(3)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">kWh</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Est. Cost Today</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mt-1">₱{todayCostTotal.toFixed(2)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">@ ₱{rate}/kWh</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-950 rounded-lg flex items-center justify-center">
              <span className="text-2xl">₱</span>
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Individual Nodes</h2>
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
                  <p className="text-sm text-gray-600 dark:text-gray-400">Today's Consumption</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{node.todayKWh.toFixed(3)} kWh</p>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Current Power</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{Math.round(node.currentPower)} W</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Est. Cost Today</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">₱{node.estimatedCost.toFixed(2)}</span>
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">7-Day Energy Consumption Trend</h2>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis label={{ value: "kWh", angle: -90, position: "insideLeft" }} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb" }} />
              <Legend />
              <Line key="node1-line" type="monotone" dataKey="node1" stroke="#9333ea" strokeWidth={2} name={`Node 1 (${nodeSummaries[0]?.label || "Node 1"})`} dot={{ r: 4 }} />
              <Line key="node2-line" type="monotone" dataKey="node2" stroke="#f97316" strokeWidth={2} name={`Node 2 (${nodeSummaries[1]?.label || "Node 2"})`} dot={{ r: 4 }} />
              <Line key="node3-line" type="monotone" dataKey="node3" stroke="#06b6d4" strokeWidth={2} name={`Node 3 (${nodeSummaries[2]?.label || "Node 3"})`} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Recent Alerts</h2>
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
