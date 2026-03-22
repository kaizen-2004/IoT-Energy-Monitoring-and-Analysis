import { useState, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  defaultMonth,
  fetchDashboardViewData,
  getPHTTime,
} from '../utils/mockData';
import type { NodeSummary, DailyData, Alert, ComparisonData, ChartMode, ComparisonMode } from '../utils/mockData';

export default function Dashboard() {
  const [lastUpdated, setLastUpdated] = useState<string>(getPHTTime());
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(30);
  const [chartData, setChartData] = useState<DailyData[]>([]);
  const [nodeSummaries, setNodeSummaries] = useState<NodeSummary[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth());
  const [rate, setRate] = useState<number>(11.5);
  const [showControls, setShowControls] = useState<boolean>(false);
  const [chartMode, setChartMode] = useState<ChartMode>('7-day');
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('month-vs-lastmonth');
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  
  const loadData = async () => {
    setIsLoading(true);
    try {
      const dashboard = await fetchDashboardViewData({
        selectedMonth,
        chartMode,
        comparisonMode
      });

      setRate(dashboard.rate);
      setChartData(dashboard.chartData);
      setNodeSummaries(dashboard.nodeSummaries);
      setAlerts(dashboard.alerts);
      setComparisonData(dashboard.comparisonData);
      setLastUpdated(getPHTTime());
      setIsConnected(true);
    } catch (error) {
      console.error('Error loading data:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    void loadData();
    
    const interval = setInterval(() => {
      void loadData();
    }, refreshInterval * 1000);
    
    return () => clearInterval(interval);
  }, [refreshInterval, selectedMonth, chartMode, comparisonMode]);
  
  const handleApplyInterval = () => {
    void loadData();
    setShowControls(false);
  };
  
  const handlePrevMonth = () => {
    const date = new Date(selectedMonth + '-01');
    date.setMonth(date.getMonth() - 1);
    setSelectedMonth(date.toISOString().slice(0, 7));
  };
  
  const handleNextMonth = () => {
    const date = new Date(selectedMonth + '-01');
    date.setMonth(date.getMonth() + 1);
    setSelectedMonth(date.toISOString().slice(0, 7));
  };
  
  // Calculate totals
  const todayTotal = nodeSummaries.reduce((sum, node) => sum + node.todayKWh, 0);
  const monthTotal = nodeSummaries.reduce((sum, node) => sum + node.monthKWh, 0);
  const todayCostTotal = todayTotal * rate;
  const monthCostTotal = monthTotal * rate;
  
  // Format selected month label
  const selectedMonthLabel = new Date(selectedMonth + '-01').toLocaleDateString('en-PH', { 
    month: 'long', 
    year: 'numeric' 
  });
  
  // Insight rendering
  let insightIcon = Minus;
  let insightColor = 'text-gray-600';
  let insightBgColor = 'bg-gray-50';
  let insightBorderColor = 'border-gray-200';
  let insightText = '';
  
  if (comparisonData) {
    if (!comparisonData.hasBaseline) {
      insightText = 'No baseline data available for selected comparison.';
      insightColor = 'text-gray-600';
      insightBgColor = 'bg-gray-50';
      insightBorderColor = 'border-gray-200';
    } else if (comparisonData.difference > 0.1) {
      insightIcon = TrendingUp;
      insightColor = 'text-red-600';
      insightBgColor = 'bg-red-50';
      insightBorderColor = 'border-red-200';
      insightText = `You consumed ${Math.abs(comparisonData.difference).toFixed(2)} kWh (${Math.abs(comparisonData.percentChange).toFixed(1)}%) more than ${comparisonData.label.split(' vs ')[1]}.`;
    } else if (comparisonData.difference < -0.1) {
      insightIcon = TrendingDown;
      insightColor = 'text-green-600';
      insightBgColor = 'bg-green-50';
      insightBorderColor = 'border-green-200';
      insightText = `You consumed ${Math.abs(comparisonData.difference).toFixed(2)} kWh (${Math.abs(comparisonData.percentChange).toFixed(1)}%) less than ${comparisonData.label.split(' vs ')[1]}.`;
    } else {
      insightText = 'About the same as baseline period.';
    }
  }
  
  const InsightIcon = insightIcon;
  
  // Loading state
  if (isLoading && chartData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Header - Mobile Optimized */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-lg p-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Energy Monitor</h1>
              <p className="text-xs text-blue-100">PHT • ₱{rate.toFixed(2)}/kWh</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="w-5 h-5 text-green-300" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-300" />
            )}
          </div>
        </div>
        
        {/* Billing Month Selector */}
        <div className="mb-3">
          <label className="text-xs text-blue-100 block mb-2">Billing Month</label>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center active:bg-white/20"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2.5 text-center">
              <span className="text-sm font-medium">{selectedMonthLabel}</span>
            </div>
            <button
              onClick={handleNextMonth}
              className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center active:bg-white/20"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <p className="text-xs text-blue-100 mb-1">Today Total</p>
            <p className="text-2xl font-bold">{todayTotal.toFixed(2)}</p>
            <p className="text-xs">kWh</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <p className="text-xs text-blue-100 mb-1">Cost Today</p>
            <p className="text-2xl font-bold">₱{todayCostTotal.toFixed(2)}</p>
            <p className="text-xs">PHP</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <p className="text-xs text-blue-100 mb-1">Month Total</p>
            <p className="text-2xl font-bold">{monthTotal.toFixed(2)}</p>
            <p className="text-xs">kWh</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <p className="text-xs text-blue-100 mb-1">Month Cost</p>
            <p className="text-2xl font-bold">₱{monthCostTotal.toFixed(2)}</p>
            <p className="text-xs">PHP</p>
          </div>
        </div>
        
        {/* Last Updated */}
        <div className="mt-3 flex items-center justify-between text-xs text-blue-100">
          <span>Updated: {lastUpdated}</span>
          <button
            onClick={() => setShowControls(!showControls)}
            className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-lg active:bg-white/20"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Settings
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showControls ? 'rotate-180' : ''}`} />
          </button>
        </div>
        
        {/* Expandable Controls */}
        {showControls && (
          <div className="mt-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <label className="text-xs text-blue-100 block mb-2">
              Refresh Interval (seconds)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="5"
                max="300"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 30)}
                className="flex-1 px-3 py-2 rounded-lg bg-white/20 text-white placeholder-blue-200 border border-white/30"
              />
              <button
                onClick={handleApplyInterval}
                className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium active:bg-blue-50"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Alerts - Mobile Optimized */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert.id} className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 mb-1">{alert.message}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span>{alert.nodeLabel}</span>
                    <span>•</span>
                    <span>{alert.value}W / {alert.threshold}W</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{alert.timestamp}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Node Cards - Mobile Optimized */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 px-1">Device Status</h2>
        {nodeSummaries.map((node, index) => (
          <div key={node.nodeId} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  index === 0 ? 'bg-purple-100' : index === 1 ? 'bg-orange-100' : 'bg-cyan-100'
                }`}>
                  <Zap className={`w-6 h-6 ${
                    index === 0 ? 'text-purple-600' : index === 1 ? 'text-orange-600' : 'text-cyan-600'
                  }`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{node.label}</h3>
                  <p className="text-xs text-gray-500">Node {node.nodeId}</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-600 mb-1">Today</p>
                <p className="text-lg font-semibold text-gray-900">{node.todayKWh.toFixed(2)} kWh</p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-600 mb-1">Current Power</p>
                <p className="text-lg font-semibold text-gray-900">{Math.round(node.currentPower)}W</p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-600 mb-1">Cost Today</p>
                <p className="text-lg font-semibold text-gray-900">₱{node.estimatedCost.toFixed(2)}</p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-600 mb-1">Month Total</p>
                <p className="text-lg font-semibold text-gray-900">{node.monthKWh.toFixed(2)} kWh</p>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs text-gray-600 mb-1">Month Est. Cost</p>
              <p className="text-xl font-bold text-blue-600">₱{node.monthEstimatedCost.toFixed(2)}</p>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">Device ID: {node.deviceId}</p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Trend Chart - Mobile Optimized */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Energy Trend</h2>
          
          <select
            value={chartMode}
            onChange={(e) => setChartMode(e.target.value as ChartMode)}
            className="text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7-day">7-Day Trend</option>
            <option value="whole-month">Whole Month</option>
          </select>
        </div>
        
        <div className="h-64 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }}
                tickMargin={8}
                interval={chartMode === 'whole-month' ? 'preserveStartEnd' : 0}
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                tickMargin={8}
                width={40}
                label={{ value: 'kWh', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '11px' }}
                iconSize={10}
              />
              <Line 
                id="dashboard-node1-line"
                type="monotone" 
                dataKey="node1" 
                stroke="#9333ea" 
                strokeWidth={2}
                name="Refrigerator"
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line 
                id="dashboard-node2-line"
                type="monotone" 
                dataKey="node2" 
                stroke="#f97316" 
                strokeWidth={2}
                name="Air Conditioner"
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line 
                id="dashboard-node3-line"
                type="monotone" 
                dataKey="node3" 
                stroke="#06b6d4" 
                strokeWidth={2}
                name="Water Heater"
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line 
                id="dashboard-total-line"
                type="monotone" 
                dataKey="total" 
                stroke="#1f2937" 
                strokeWidth={2.5}
                name="Total"
                dot={false}
                activeDot={{ r: 5 }}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Insight Module - Mobile Optimized */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Insights</h2>
        </div>
        
        <div className="mb-3">
          <label className="text-xs text-gray-600 block mb-2">Comparison Period</label>
          <select
            value={comparisonMode}
            onChange={(e) => setComparisonMode(e.target.value as ComparisonMode)}
            className="w-full text-sm px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="today-vs-yesterday">Today vs Yesterday</option>
            <option value="7days-vs-prev7days">Current 7 Days vs Previous 7 Days</option>
            <option value="month-vs-lastmonth">Current Month vs Last Month</option>
          </select>
        </div>
        
        <div className={`${insightBgColor} border ${insightBorderColor} rounded-xl p-4`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 ${insightBgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <InsightIcon className={`w-6 h-6 ${insightColor}`} />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${insightColor} mb-2`}>{insightText}</p>
              {comparisonData && (
                <p className="text-xs text-gray-500">
                  {comparisonData.label}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
