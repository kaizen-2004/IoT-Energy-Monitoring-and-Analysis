// Mock data generator for the energy monitoring dashboard
// Simulates ESP32 + SCT-013 sensor data

export interface PowerReading {
  nodeId: number;
  timestamp: string;
  power: number; // Watts
  kWh: number;
}

export interface NodeSummary {
  nodeId: number;
  label: string;
  deviceId: string;
  todayKWh: number;
  yesterdayKWh: number;
  monthKWh: number;
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
  source: 'manual' | 'auto';
  verified: boolean;
  lastUpdated: string;
}

// Generate realistic power consumption patterns
function generatePowerReading(nodeId: number, hour: number): number {
  const baseLoad = nodeId === 1 ? 150 : nodeId === 2 ? 300 : 200; // Base watts per node
  
  // Simulate daily usage patterns (higher during day, lower at night)
  const timeMultiplier = 
    hour >= 6 && hour <= 22 ? 1.5 + Math.random() * 0.5 : 0.3 + Math.random() * 0.2;
  
  return baseLoad * timeMultiplier + (Math.random() - 0.5) * 50;
}

// Calculate kWh from power readings
export function calculateKWh(powerReadings: number[], intervalHours: number = 1): number {
  let totalKWh = 0;
  
  for (let i = 1; i < powerReadings.length; i++) {
    const avgPower = (powerReadings[i - 1] + powerReadings[i]) / 2;
    totalKWh += (avgPower * intervalHours) / 1000;
  }
  
  return totalKWh;
}

// Get data for the last N days (Philippine Time - UTC+8)
export function getLast7DaysData(): DailyData[] {
  const data: DailyData[] = [];
  const now = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Generate 24 hourly readings for each node
    const node1Readings: number[] = [];
    const node2Readings: number[] = [];
    const node3Readings: number[] = [];
    
    for (let hour = 0; hour < 24; hour++) {
      node1Readings.push(generatePowerReading(1, hour));
      node2Readings.push(generatePowerReading(2, hour));
      node3Readings.push(generatePowerReading(3, hour));
    }
    
    const node1kWh = parseFloat(calculateKWh(node1Readings, 1).toFixed(2));
    const node2kWh = parseFloat(calculateKWh(node2Readings, 1).toFixed(2));
    const node3kWh = parseFloat(calculateKWh(node3Readings, 1).toFixed(2));
    
    data.push({
      date: date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
      node1: node1kWh,
      node2: node2kWh,
      node3: node3kWh,
      total: parseFloat((node1kWh + node2kWh + node3kWh).toFixed(2)),
    });
  }
  
  return data;
}

// Get whole month data for a specific month
export function getWholeMonthData(year: number, month: number): DailyData[] {
  const data: DailyData[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    
    // Generate 24 hourly readings for each node
    const node1Readings: number[] = [];
    const node2Readings: number[] = [];
    const node3Readings: number[] = [];
    
    for (let hour = 0; hour < 24; hour++) {
      node1Readings.push(generatePowerReading(1, hour));
      node2Readings.push(generatePowerReading(2, hour));
      node3Readings.push(generatePowerReading(3, hour));
    }
    
    const node1kWh = parseFloat(calculateKWh(node1Readings, 1).toFixed(2));
    const node2kWh = parseFloat(calculateKWh(node2Readings, 1).toFixed(2));
    const node3kWh = parseFloat(calculateKWh(node3Readings, 1).toFixed(2));
    
    data.push({
      date: date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
      node1: node1kWh,
      node2: node2kWh,
      node3: node3kWh,
      total: parseFloat((node1kWh + node2kWh + node3kWh).toFixed(2)),
    });
  }
  
  return data;
}

// Get current node summaries
export function getNodeSummaries(rate: number = 11.5, selectedMonth?: string): NodeSummary[] {
  const last7Days = getLast7DaysData();
  const today = last7Days[last7Days.length - 1];
  const yesterday = last7Days[last7Days.length - 2];
  
  const nodeLabels = JSON.parse(localStorage.getItem('nodeLabels') || '[\"Refrigerator\", \"Air Conditioner\", \"Water Heater\"]');
  
  // Calculate month totals
  let monthData: DailyData[] = [];
  if (selectedMonth) {
    const [year, month] = selectedMonth.split('-').map(Number);
    monthData = getWholeMonthData(year, month);
  } else {
    const now = new Date();
    monthData = getWholeMonthData(now.getFullYear(), now.getMonth() + 1);
  }
  
  const monthNode1Total = monthData.reduce((sum, day) => sum + day.node1, 0);
  const monthNode2Total = monthData.reduce((sum, day) => sum + day.node2, 0);
  const monthNode3Total = monthData.reduce((sum, day) => sum + day.node3, 0);
  
  return [
    {
      nodeId: 1,
      label: nodeLabels[0],
      deviceId: 'ESP32-NODE-001',
      todayKWh: today.node1,
      yesterdayKWh: yesterday.node1,
      monthKWh: monthNode1Total,
      currentPower: generatePowerReading(1, new Date().getHours()),
      estimatedCost: today.node1 * rate,
      monthEstimatedCost: monthNode1Total * rate,
    },
    {
      nodeId: 2,
      label: nodeLabels[1],
      deviceId: 'ESP32-NODE-002',
      todayKWh: today.node2,
      yesterdayKWh: yesterday.node2,
      monthKWh: monthNode2Total,
      currentPower: generatePowerReading(2, new Date().getHours()),
      estimatedCost: today.node2 * rate,
      monthEstimatedCost: monthNode2Total * rate,
    },
    {
      nodeId: 3,
      label: nodeLabels[2],
      deviceId: 'ESP32-NODE-003',
      todayKWh: today.node3,
      yesterdayKWh: yesterday.node3,
      monthKWh: monthNode3Total,
      currentPower: generatePowerReading(3, new Date().getHours()),
      estimatedCost: today.node3 * rate,
      monthEstimatedCost: monthNode3Total * rate,
    },
  ];
}

// Get alert logs
export interface Alert {
  id: string;
  timestamp: string;
  nodeId: number;
  nodeLabel: string;
  value: number;
  threshold: number;
  message: string;
}

export function getAlerts(): Alert[] {
  const thresholds = JSON.parse(localStorage.getItem('nodeThresholds') || '[500, 800, 600]');
  const nodeLabels = JSON.parse(localStorage.getItem('nodeLabels') || '["Refrigerator", "Air Conditioner", "Water Heater"]');
  const alerts: Alert[] = [];
  
  // Simulate some threshold exceedance alerts
  const now = new Date();
  
  // Node 2 exceeded threshold 2 hours ago
  if (generatePowerReading(2, now.getHours() - 2) > thresholds[1]) {
    const alertTime = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    alerts.push({
      id: '1',
      timestamp: alertTime.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
      nodeId: 2,
      nodeLabel: nodeLabels[1],
      value: Math.round(generatePowerReading(2, now.getHours() - 2)),
      threshold: thresholds[1],
      message: `${nodeLabels[1]} power consumption exceeded ${thresholds[1]}W`,
    });
  }
  
  return alerts;
}

// Get current time in PHT
export function getPHTTime(): string {
  return new Date().toLocaleString('en-PH', { 
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

// Get monthly rates from localStorage
export function getMonthlyRates(): MonthlyRate[] {
  const stored = localStorage.getItem('monthlyRates');
  if (stored) {
    return JSON.parse(stored);
  }
  
  // Default rates
  const defaultRates: MonthlyRate[] = [
    {
      month: '2026-03',
      rate: 11.5,
      source: 'auto',
      verified: true,
      lastUpdated: getPHTTime(),
    },
    {
      month: '2026-02',
      rate: 11.2,
      source: 'auto',
      verified: true,
      lastUpdated: getPHTTime(),
    },
  ];
  
  localStorage.setItem('monthlyRates', JSON.stringify(defaultRates));
  return defaultRates;
}

// Save monthly rates to localStorage
export function saveMonthlyRates(rates: MonthlyRate[]): void {
  localStorage.setItem('monthlyRates', JSON.stringify(rates));
}

// Get rate for a specific month
export function getRateForMonth(month: string): number {
  const rates = getMonthlyRates();
  const rate = rates.find(r => r.month === month);
  return rate ? rate.rate : parseFloat(localStorage.getItem('electricityRate') || '11.5');
}

// Calculate comparison data
export interface ComparisonData {
  currentValue: number;
  baselineValue: number;
  difference: number;
  percentChange: number;
  hasBaseline: boolean;
  label: string;
}

export function getComparisonData(mode: 'today-vs-yesterday' | '7days-vs-prev7days' | 'month-vs-lastmonth', selectedMonth?: string): ComparisonData {
  const last7Days = getLast7DaysData();
  
  switch (mode) {
    case 'today-vs-yesterday': {
      const today = last7Days[last7Days.length - 1];
      const yesterday = last7Days[last7Days.length - 2];
      const currentValue = today.total;
      const baselineValue = yesterday.total;
      const difference = currentValue - baselineValue;
      const percentChange = baselineValue > 0 ? ((difference / baselineValue) * 100) : 0;
      
      return {
        currentValue,
        baselineValue,
        difference,
        percentChange,
        hasBaseline: true,
        label: 'Today vs Yesterday',
      };
    }
    
    case '7days-vs-prev7days': {
      // Current 7 days
      const current7DaysTotal = last7Days.reduce((sum, day) => sum + day.total, 0);
      
      // Previous 7 days (mock data for demo)
      const prev7DaysTotal = current7DaysTotal * (0.9 + Math.random() * 0.2);
      
      const difference = current7DaysTotal - prev7DaysTotal;
      const percentChange = prev7DaysTotal > 0 ? ((difference / prev7DaysTotal) * 100) : 0;
      
      return {
        currentValue: current7DaysTotal,
        baselineValue: prev7DaysTotal,
        difference,
        percentChange,
        hasBaseline: true,
        label: 'Current 7 Days vs Previous 7 Days',
      };
    }
    
    case 'month-vs-lastmonth': {
      const currentMonthStr = selectedMonth || new Date().toISOString().slice(0, 7);
      const [year, month] = currentMonthStr.split('-').map(Number);
      
      const currentMonthData = getWholeMonthData(year, month);
      const currentMonthTotal = currentMonthData.reduce((sum, day) => sum + day.total, 0);
      
      // Previous month
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const prevMonthData = getWholeMonthData(prevYear, prevMonth);
      const prevMonthTotal = prevMonthData.reduce((sum, day) => sum + day.total, 0);
      
      const difference = currentMonthTotal - prevMonthTotal;
      const percentChange = prevMonthTotal > 0 ? ((difference / prevMonthTotal) * 100) : 0;
      
      const currentMonthLabel = new Date(year, month - 1).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
      const prevMonthLabel = new Date(prevYear, prevMonth - 1).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
      
      return {
        currentValue: currentMonthTotal,
        baselineValue: prevMonthTotal,
        difference,
        percentChange,
        hasBaseline: prevMonthTotal > 0,
        label: `${currentMonthLabel} vs ${prevMonthLabel}`,
      };
    }
  }
}