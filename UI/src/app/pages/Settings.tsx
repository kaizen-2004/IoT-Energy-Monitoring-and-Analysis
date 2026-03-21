import { useState, useEffect } from 'react';
import { Save, DollarSign, Tag, Bell, MapPin, Trash2, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getMonthlyRates, saveMonthlyRates, getPHTTime } from '../utils/mockData';
import type { MonthlyRate } from '../utils/mockData';

export default function Settings() {
  // Billing Settings
  const [selectedRateMonth, setSelectedRateMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [monthlyRateInput, setMonthlyRateInput] = useState<string>('11.5');
  const [monthlyRates, setMonthlyRates] = useState<MonthlyRate[]>([]);
  
  // Node Settings
  const [node1Label, setNode1Label] = useState<string>('Refrigerator');
  const [node2Label, setNode2Label] = useState<string>('Air Conditioner');
  const [node3Label, setNode3Label] = useState<string>('Water Heater');
  
  const [node1Threshold, setNode1Threshold] = useState<string>('500');
  const [node2Threshold, setNode2Threshold] = useState<string>('800');
  const [node3Threshold, setNode3Threshold] = useState<string>('600');
  
  // Insight Settings
  const [timezone, setTimezone] = useState<string>('Asia/Manila');
  
  useEffect(() => {
    // Load saved settings
    const savedLabels = localStorage.getItem('nodeLabels');
    if (savedLabels) {
      const labels = JSON.parse(savedLabels);
      setNode1Label(labels[0]);
      setNode2Label(labels[1]);
      setNode3Label(labels[2]);
    }
    
    const savedThresholds = localStorage.getItem('nodeThresholds');
    if (savedThresholds) {
      const thresholds = JSON.parse(savedThresholds);
      setNode1Threshold(thresholds[0].toString());
      setNode2Threshold(thresholds[1].toString());
      setNode3Threshold(thresholds[2].toString());
    }
    
    const savedTimezone = localStorage.getItem('timezone');
    if (savedTimezone) setTimezone(savedTimezone);
    
    // Load monthly rates
    const rates = getMonthlyRates();
    setMonthlyRates(rates);
    
    // Set input value to selected month's rate if exists
    const selectedRate = rates.find(r => r.month === selectedRateMonth);
    if (selectedRate) {
      setMonthlyRateInput(selectedRate.rate.toString());
    }
  }, []);
  
  useEffect(() => {
    // Update input when selected month changes
    const selectedRate = monthlyRates.find(r => r.month === selectedRateMonth);
    if (selectedRate) {
      setMonthlyRateInput(selectedRate.rate.toString());
    } else {
      setMonthlyRateInput('11.5');
    }
  }, [selectedRateMonth, monthlyRates]);
  
  const handleSaveMonthlyRate = () => {
    const rateValue = parseFloat(monthlyRateInput);
    if (isNaN(rateValue) || rateValue <= 0) {
      toast.error('Please enter a valid rate');
      return;
    }
    
    const existingRateIndex = monthlyRates.findIndex(r => r.month === selectedRateMonth);
    const updatedRates = [...monthlyRates];
    
    if (existingRateIndex >= 0) {
      // Update existing rate
      updatedRates[existingRateIndex] = {
        ...updatedRates[existingRateIndex],
        rate: rateValue,
        source: 'manual',
        lastUpdated: getPHTTime(),
      };
    } else {
      // Add new rate
      updatedRates.push({
        month: selectedRateMonth,
        rate: rateValue,
        source: 'manual',
        verified: true,
        lastUpdated: getPHTTime(),
      });
    }
    
    // Sort by month descending
    updatedRates.sort((a, b) => b.month.localeCompare(a.month));
    
    setMonthlyRates(updatedRates);
    saveMonthlyRates(updatedRates);
    
    // Also update the legacy electricityRate for backward compatibility
    if (selectedRateMonth === new Date().toISOString().slice(0, 7)) {
      localStorage.setItem('electricityRate', rateValue.toString());
    }
    
    toast.success('Rate saved successfully');
  };
  
  const handleDeleteRate = (month: string) => {
    const updatedRates = monthlyRates.filter(r => r.month !== month);
    setMonthlyRates(updatedRates);
    saveMonthlyRates(updatedRates);
    toast.success('Rate deleted');
  };
  
  const handleToggleVerified = (month: string) => {
    const updatedRates = monthlyRates.map(r => 
      r.month === month ? { ...r, verified: !r.verified } : r
    );
    setMonthlyRates(updatedRates);
    saveMonthlyRates(updatedRates);
    toast.success('Rate verification updated');
  };
  
  const handleSaveNodes = () => {
    const labels = [node1Label, node2Label, node3Label];
    const thresholds = [
      parseInt(node1Threshold) || 500,
      parseInt(node2Threshold) || 800,
      parseInt(node3Threshold) || 600,
    ];
    
    localStorage.setItem('nodeLabels', JSON.stringify(labels));
    localStorage.setItem('nodeThresholds', JSON.stringify(thresholds));
    toast.success('Node settings saved');
  };
  
  const handleSaveInsight = () => {
    localStorage.setItem('timezone', timezone);
    toast.success('Insight settings saved');
  };
  
  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Header */}
      <div className="px-1">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-600 mt-1">Configure your energy monitor</p>
      </div>
      
      {/* Billing Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Billing Rates</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="rate-month" className="block text-sm font-medium text-gray-700 mb-2">
              Select Month
            </label>
            <input
              id="rate-month"
              type="month"
              value={selectedRateMonth}
              onChange={(e) => setSelectedRateMonth(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="monthly-rate" className="block text-sm font-medium text-gray-700 mb-2">
              Rate per kWh
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 font-medium">₱</span>
              <input
                id="monthly-rate"
                type="number"
                step="0.01"
                min="0"
                value={monthlyRateInput}
                onChange={(e) => setMonthlyRateInput(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="11.50"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Your electricity provider's rate</p>
          </div>
          
          <button
            onClick={handleSaveMonthlyRate}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium active:bg-blue-700 transition-colors min-h-[48px]"
          >
            <Save className="w-4 h-4" />
            Save Rate
          </button>
        </div>
      </div>
      
      {/* Historical Monthly Rates */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Rate History</h3>
          <span className="text-xs text-gray-500">{monthlyRates.length} records</span>
        </div>
        
        {monthlyRates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No rate history available</p>
            <p className="text-xs mt-1">Add a rate to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {monthlyRates.map((rate) => {
              const monthLabel = new Date(rate.month + '-01').toLocaleDateString('en-PH', { 
                month: 'long', 
                year: 'numeric' 
              });
              
              return (
                <div key={rate.month} className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">{monthLabel}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          rate.source === 'manual' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {rate.source}
                        </span>
                      </div>
                      <p className="text-xl font-bold text-blue-600">₱{rate.rate.toFixed(2)}/kWh</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleVerified(rate.month)}
                        className="w-10 h-10 flex items-center justify-center rounded-lg active:bg-gray-200 transition-colors"
                      >
                        {rate.verified ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      
                      <button
                        onClick={() => handleDeleteRate(rate.month)}
                        className="w-10 h-10 flex items-center justify-center rounded-lg active:bg-red-100 transition-colors min-h-[44px] min-w-[44px]"
                      >
                        <Trash2 className="w-5 h-5 text-red-600" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
                    <span>Updated: {rate.lastUpdated}</span>
                    <span>{rate.verified ? 'Verified' : 'Unverified'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Node Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Tag className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Devices</h2>
        </div>
        
        <div className="space-y-4">
          {/* Node 1 */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Node 1</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="node1-label" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Device Name
                </label>
                <input
                  id="node1-label"
                  type="text"
                  value={node1Label}
                  onChange={(e) => setNode1Label(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[44px]"
                  placeholder="e.g., Refrigerator"
                />
              </div>
              
              <div>
                <label htmlFor="node1-threshold" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Alert Threshold (Watts)
                </label>
                <input
                  id="node1-threshold"
                  type="number"
                  min="0"
                  value={node1Threshold}
                  onChange={(e) => setNode1Threshold(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[44px]"
                  placeholder="500"
                />
              </div>
            </div>
          </div>
          
          {/* Node 2 */}
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Node 2</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="node2-label" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Device Name
                </label>
                <input
                  id="node2-label"
                  type="text"
                  value={node2Label}
                  onChange={(e) => setNode2Label(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
                  placeholder="e.g., Air Conditioner"
                />
              </div>
              
              <div>
                <label htmlFor="node2-threshold" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Alert Threshold (Watts)
                </label>
                <input
                  id="node2-threshold"
                  type="number"
                  min="0"
                  value={node2Threshold}
                  onChange={(e) => setNode2Threshold(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
                  placeholder="800"
                />
              </div>
            </div>
          </div>
          
          {/* Node 3 */}
          <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-xl">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Node 3</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="node3-label" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Device Name
                </label>
                <input
                  id="node3-label"
                  type="text"
                  value={node3Label}
                  onChange={(e) => setNode3Label(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 min-h-[44px]"
                  placeholder="e.g., Water Heater"
                />
              </div>
              
              <div>
                <label htmlFor="node3-threshold" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Alert Threshold (Watts)
                </label>
                <input
                  id="node3-threshold"
                  type="number"
                  min="0"
                  value={node3Threshold}
                  onChange={(e) => setNode3Threshold(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 min-h-[44px]"
                  placeholder="600"
                />
              </div>
            </div>
          </div>
          
          <button
            onClick={handleSaveNodes}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium active:bg-blue-700 transition-colors min-h-[48px]"
          >
            <Save className="w-4 h-4" />
            Save Devices
          </button>
        </div>
      </div>
      
      {/* Insight Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Insights</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Timezone
              </div>
            </label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-h-[48px]"
            >
              <option value="Asia/Manila">PHT (UTC+8)</option>
              <option value="UTC">UTC (GMT)</option>
              <option value="America/New_York">EST (UTC-5)</option>
              <option value="Europe/London">GMT</option>
            </select>
          </div>
          
          <button
            onClick={handleSaveInsight}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium active:bg-blue-700 transition-colors min-h-[48px]"
          >
            <Save className="w-4 h-4" />
            Save Insights
          </button>
        </div>
      </div>
      
      {/* Future Cloud Sync Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <p className="text-sm text-blue-800 font-medium mb-1">💡 Settings Management</p>
        <p className="text-xs text-blue-700">
          Currently using local storage. Cloud sync capability will be available in future updates.
        </p>
      </div>
    </div>
  );
}
