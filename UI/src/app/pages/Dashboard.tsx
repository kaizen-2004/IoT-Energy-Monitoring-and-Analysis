import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  defaultMonth,
  fetchDashboardViewData,
  getPHTTime,
} from '../utils/mockData';
import type {
  NodeSummary,
  DailyData,
  Alert,
  ComparisonData,
  CombinedMetrics,
  ChartMode,
  ComparisonMode,
} from '../utils/mockData';
import MonthPicker from '../components/MonthPicker';

const QUICK_INTERVALS = [15, 30, 60] as const;

const NODE_ACCENT_STYLES = [
  {
    iconWrap: 'bg-emerald-100',
    icon: 'text-emerald-700',
    estimateWrap: 'bg-emerald-50 border-emerald-200',
    estimateText: 'text-emerald-700',
  },
  {
    iconWrap: 'bg-orange-100',
    icon: 'text-orange-700',
    estimateWrap: 'bg-orange-50 border-orange-200',
    estimateText: 'text-orange-700',
  },
  {
    iconWrap: 'bg-sky-100',
    icon: 'text-sky-700',
    estimateWrap: 'bg-sky-50 border-sky-200',
    estimateText: 'text-sky-700',
  },
] as const;

const EMPTY_COMBINED_METRICS: CombinedMetrics = {
  todayKWh: 0,
  monthKWh: 0,
  todayCost: 0,
  monthCost: 0,
  totalThresholdW: 0,
  currentPowerW: 0,
  remainingThresholdW: 0,
  overThreshold: false,
};

function shiftMonth(month: string, offset: number) {
  const [yearText, monthText] = month.split('-');
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + offset);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default function Dashboard() {
  const [lastUpdated, setLastUpdated] = useState<string>(getPHTTime());
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(30);
  const [chartData, setChartData] = useState<DailyData[]>([]);
  const [nodeSummaries, setNodeSummaries] = useState<NodeSummary[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [combinedMetrics, setCombinedMetrics] = useState<CombinedMetrics>(EMPTY_COMBINED_METRICS);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth());
  const [rate, setRate] = useState<number>(11.5);
  const [showControls, setShowControls] = useState<boolean>(false);
  const [chartMode, setChartMode] = useState<ChartMode>('7-day');
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('month-vs-lastmonth');
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const hasLoadedOnceRef = useRef<boolean>(false);

  const loadData = useCallback(async (backgroundRefresh = false) => {
    if (backgroundRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const dashboard = await fetchDashboardViewData({
        selectedMonth,
        chartMode,
        comparisonMode,
      });

      setRate(dashboard.rate);
      setChartData(dashboard.chartData);
      setNodeSummaries(dashboard.nodeSummaries);
      setAlerts(dashboard.alerts);
      setComparisonData(dashboard.comparisonData);
      setCombinedMetrics(dashboard.combinedMetrics);
      setLastUpdated(getPHTTime());
      setIsConnected(true);
    } catch (error) {
      console.error('Error loading data:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      hasLoadedOnceRef.current = true;
    }
  }, [selectedMonth, chartMode, comparisonMode]);

  useEffect(() => {
    const isBackgroundRefresh = hasLoadedOnceRef.current;
    void loadData(isBackgroundRefresh);

    const refreshVisibleData = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void loadData(true);
      }
    };

    const interval = window.setInterval(refreshVisibleData, refreshInterval * 1000);

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', refreshVisibleData);
    }

    return () => {
      window.clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', refreshVisibleData);
      }
    };
  }, [refreshInterval, loadData]);

  const handleApplyInterval = () => {
    void loadData(true);
    setShowControls(false);
  };

  const handlePrevMonth = () => {
    setSelectedMonth((current) => shiftMonth(current, -1));
  };

  const handleNextMonth = () => {
    setSelectedMonth((current) => shiftMonth(current, 1));
  };

  const todayTotal = combinedMetrics.todayKWh;
  const monthTotal = combinedMetrics.monthKWh;
  const todayCostTotal = combinedMetrics.todayCost;
  const monthCostTotal = combinedMetrics.monthCost;

  const selectedMonthLabel = useMemo(
    () =>
      new Date(`${selectedMonth}-01`).toLocaleDateString('en-PH', {
        month: 'long',
        year: 'numeric',
      }),
    [selectedMonth],
  );

  const nodeLabels = useMemo(
    () => ({
      node1: nodeSummaries[0]?.label || 'Node 1',
      node2: nodeSummaries[1]?.label || 'Node 2',
      node3: nodeSummaries[2]?.label || 'Node 3',
    }),
    [nodeSummaries],
  );

  const insightConfig = useMemo(() => {
    const fallback = {
      icon: Minus,
      color: 'text-slate-700',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
      text: 'No baseline data available for selected comparison period.',
      subLabel: comparisonData?.label || null,
    };

    if (!comparisonData || !comparisonData.hasBaseline) {
      return fallback;
    }

    const baselineLabel = comparisonData.label.includes(' vs ')
      ? comparisonData.label.split(' vs ')[1]
      : 'baseline period';

    if (comparisonData.difference > 0.1) {
      return {
        icon: TrendingUp,
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        text: `You consumed ${Math.abs(comparisonData.difference).toFixed(2)} kWh (${Math.abs(comparisonData.percentChange).toFixed(1)}%) more than ${baselineLabel}.`,
        subLabel: comparisonData.label,
      };
    }

    if (comparisonData.difference < -0.1) {
      return {
        icon: TrendingDown,
        color: 'text-emerald-700',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        text: `You consumed ${Math.abs(comparisonData.difference).toFixed(2)} kWh (${Math.abs(comparisonData.percentChange).toFixed(1)}%) less than ${baselineLabel}.`,
        subLabel: comparisonData.label,
      };
    }

    return {
      icon: Minus,
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      text: 'Consumption is nearly the same as the selected baseline period.',
      subLabel: comparisonData.label,
    };
  }, [comparisonData]);

  const InsightIcon = insightConfig.icon;

  if (!hasLoadedOnceRef.current && isLoading && chartData.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-12 w-12 animate-spin text-blue-600" />
          <p className="text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-blue-600 to-sky-600 p-5 text-white shadow-lg sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Energy Monitor</h1>
              <p className="text-xs text-blue-100">PHT • ₱{rate.toFixed(2)}/kWh</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-5 w-5 text-green-300" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-300" />
            )}
          </div>
        </div>

        <div className="mb-3">
          <label className="mb-2 block text-xs text-blue-100">Billing Month</label>
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={handlePrevMonth}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm active:bg-white/20"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 rounded-lg bg-white/10 px-4 py-2.5 text-center backdrop-blur-sm">
              <span className="text-sm font-medium">{selectedMonthLabel}</span>
            </div>
            <button
              onClick={handleNextMonth}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm active:bg-white/20"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="hidden lg:block">
            <MonthPicker
              id="dashboard-billing-month"
              value={selectedMonth}
              onChange={setSelectedMonth}
              minYear={2020}
              maxYear={2035}
              variant="dark"
            />
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
            <p className="mb-1 flex min-h-[2.5rem] items-start text-[11px] leading-tight text-blue-100">Today Total (3 Appliances)</p>
            <p className="text-2xl font-bold">{todayTotal.toFixed(2)}</p>
            <p className="text-xs">kWh</p>
          </div>

          <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
            <p className="mb-1 flex min-h-[2.5rem] items-start text-[11px] leading-tight text-blue-100">
              Total Estimated Cost Today
            </p>
            <p className="text-2xl font-bold">₱{todayCostTotal.toFixed(2)}</p>
            <p className="text-xs">PHP</p>
          </div>

          <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
            <p className="mb-1 flex min-h-[2.5rem] items-start text-[11px] leading-tight text-blue-100">
              Monthly Total (3 Appliances)
            </p>
            <p className="text-2xl font-bold">{monthTotal.toFixed(2)}</p>
            <p className="text-xs">kWh</p>
          </div>

          <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
            <p className="mb-1 flex min-h-[2.5rem] items-start text-[11px] leading-tight text-blue-100">
              Total Estimated Cost This Month
            </p>
            <p className="text-2xl font-bold">₱{monthCostTotal.toFixed(2)}</p>
            <p className="text-xs">PHP</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/15 bg-slate-950/15 p-4 backdrop-blur-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue-100/80">Combined Threshold</p>
              <h2 className="mt-1 text-lg font-semibold text-white">3-Appliance Load Budget</h2>
              <p className="mt-1 text-xs text-blue-100/90">
                One appliance can go above its own threshold as long as the combined load stays within the total limit.
              </p>
            </div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                combinedMetrics.overThreshold
                  ? 'bg-red-500/20 text-red-100'
                  : 'bg-emerald-500/20 text-emerald-100'
              }`}
            >
              {combinedMetrics.overThreshold ? 'Over Threshold' : 'Within Threshold'}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs text-blue-100">Total Threshold</p>
              <p className="mt-1 text-2xl font-bold text-white">{Math.round(combinedMetrics.totalThresholdW)}W</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs text-blue-100">Current Combined Load</p>
              <p className="mt-1 text-2xl font-bold text-white">{Math.round(combinedMetrics.currentPowerW)}W</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs text-blue-100">
                {combinedMetrics.overThreshold ? 'Exceeded By' : 'Remaining Capacity'}
              </p>
              <p className="mt-1 text-2xl font-bold text-white">
                {Math.round(Math.abs(combinedMetrics.remainingThresholdW))}W
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 text-xs text-blue-100 sm:flex-row sm:items-center sm:justify-between">
          <span>Updated: {lastUpdated}</span>
          <div className="flex items-center gap-2 sm:justify-end">
            {isRefreshing && (
              <span className="text-[11px] text-blue-100/90">Refreshing...</span>
            )}
            <button
              onClick={() => setShowControls(!showControls)}
              className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 active:bg-white/20"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Settings
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showControls ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {showControls && (
          <div className="mt-3 rounded-xl bg-white/10 p-4 backdrop-blur-sm">
            <label className="mb-2 block text-xs text-blue-100">
              Auto-refresh interval (seconds)
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="number"
                min="5"
                max="300"
                value={refreshInterval}
                onChange={(e) => {
                  const nextValue = Number.parseInt(e.target.value, 10);
                  if (!Number.isFinite(nextValue)) {
                    setRefreshInterval(30);
                    return;
                  }
                  setRefreshInterval(Math.max(5, Math.min(300, nextValue)));
                }}
                className="flex-1 rounded-lg border border-white/30 bg-white/20 px-3 py-2 text-white placeholder-blue-200"
              />
              <button
                onClick={handleApplyInterval}
                className="rounded-lg bg-white px-4 py-2 font-medium text-blue-600 active:bg-blue-50 sm:min-w-[96px]"
              >
                Apply
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_INTERVALS.map((seconds) => (
                <button
                  key={seconds}
                  onClick={() => {
                    setRefreshInterval(seconds);
                    void loadData(true);
                    setShowControls(false);
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    refreshInterval === seconds
                      ? 'border-white/60 bg-white text-blue-700'
                      : 'border-white/30 bg-white/10 text-blue-100 active:bg-white/20'
                  }`}
                >
                  {seconds}s
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Energy Trend</h2>

              <select
                value={chartMode}
                onChange={(e) => setChartMode(e.target.value as ChartMode)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:w-auto"
              >
                <option value="7-day">7-Day Trend</option>
                <option value="whole-month">Whole Month</option>
              </select>
            </div>

            <div className="-mx-2 h-64 sm:h-72 lg:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickMargin={8}
                    interval={chartMode === 'whole-month' ? 'preserveStartEnd' : 0}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickMargin={8}
                    width={44}
                    label={{ value: 'kWh', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} iconSize={10} />
                  <Line
                    id="dashboard-node1-line"
                    type="monotone"
                    dataKey="node1"
                    stroke="#0f766e"
                    strokeWidth={2}
                    name={nodeLabels.node1}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={!isRefreshing}
                  />
                  <Line
                    id="dashboard-node2-line"
                    type="monotone"
                    dataKey="node2"
                    stroke="#ea580c"
                    strokeWidth={2}
                    name={nodeLabels.node2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={!isRefreshing}
                  />
                  <Line
                    id="dashboard-node3-line"
                    type="monotone"
                    dataKey="node3"
                    stroke="#0284c7"
                    strokeWidth={2}
                    name={nodeLabels.node3}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={!isRefreshing}
                  />
                  <Line
                    id="dashboard-total-line"
                    type="monotone"
                    dataKey="total"
                    stroke="#0f172a"
                    strokeWidth={2.5}
                    name="Total"
                    dot={false}
                    activeDot={{ r: 5 }}
                    strokeDasharray="5 5"
                    isAnimationActive={!isRefreshing}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Insights</h2>
            </div>

            <div className="mb-3">
              <label className="mb-2 block text-xs text-gray-600">Comparison Period</label>
              <select
                value={comparisonMode}
                onChange={(e) => setComparisonMode(e.target.value as ComparisonMode)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              >
                <option value="today-vs-yesterday">Today vs Yesterday</option>
                <option value="7days-vs-prev7days">Current 7 Days vs Previous 7 Days</option>
                <option value="month-vs-lastmonth">Current Month vs Last Month</option>
              </select>
            </div>

            <div className={`${insightConfig.bgColor} ${insightConfig.borderColor} rounded-xl border p-4`}>
              <div className="flex items-start gap-3">
                <div className={`${insightConfig.bgColor} flex h-10 w-10 shrink-0 items-center justify-center rounded-lg`}>
                  <InsightIcon className={`${insightConfig.color} h-6 w-6`} />
                </div>
                <div className="flex-1">
                  <p className={`${insightConfig.color} mb-2 text-sm font-medium`}>{insightConfig.text}</p>
                  {insightConfig.subLabel && (
                    <p className="text-xs text-gray-500">
                      {insightConfig.subLabel}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start xl:max-h-[calc(100vh-7.5rem)] xl:overflow-y-auto xl:pr-1">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Active Alerts</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {alerts.length}
              </span>
            </div>

            {alerts.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center">
                <p className="text-sm font-medium text-slate-700">No active alerts</p>
                <p className="mt-1 text-xs text-slate-500">Combined load is within the total threshold budget.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div key={alert.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                        <AlertTriangle className="h-5 w-5 text-amber-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-sm font-medium text-gray-900">{alert.message}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span>{alert.nodeLabel}</span>
                          <span>•</span>
                          <span>{alert.value}W / {alert.threshold}W</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{alert.timestamp}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="px-1 text-lg font-semibold text-gray-900">Device Status</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              {nodeSummaries.map((node, index) => {
                const accent = NODE_ACCENT_STYLES[index % NODE_ACCENT_STYLES.length];

                return (
                  <div key={node.nodeId} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`${accent.iconWrap} flex h-12 w-12 items-center justify-center rounded-xl`}>
                          <Zap className={`${accent.icon} h-6 w-6`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{node.label}</h3>
                          <p className="text-xs text-gray-500">Node {node.nodeId}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="mb-1 text-xs text-gray-600">Today</p>
                        <p className="text-lg font-semibold text-gray-900">{node.todayKWh.toFixed(2)} kWh</p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="mb-1 text-xs text-gray-600">Current Power</p>
                        <p className="text-lg font-semibold text-gray-900">{Math.round(node.currentPower)}W</p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="mb-1 min-h-[2rem] text-xs leading-tight text-gray-600">Estimated Cost Today</p>
                        <p className="text-lg font-semibold text-gray-900">₱{node.estimatedCost.toFixed(2)}</p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="mb-1 text-xs text-gray-600">Month Total</p>
                        <p className="text-lg font-semibold text-gray-900">{node.monthKWh.toFixed(2)} kWh</p>
                      </div>
                    </div>

                    <div className={`${accent.estimateWrap} rounded-xl border p-3`}>
                      <p className="mb-1 min-h-[2rem] text-xs leading-tight text-gray-700">Estimated Cost This Month</p>
                      <p className={`${accent.estimateText} text-xl font-bold`}>₱{node.monthEstimatedCost.toFixed(2)}</p>
                    </div>

                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <p className="text-xs text-gray-400">Device ID: {node.deviceId}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
