import { useState, useEffect } from 'react';
import { Save, DollarSign, Tag, Bell, MapPin, Trash2, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  defaultMonth,
  deleteMonthlyRate,
  fetchSettingsViewData,
  saveAppSettings,
  saveMonthlyRate
} from '../utils/mockData';
import type { MonthlyRate, AppSettings } from '../utils/mockData';
import MonthPicker from '../components/MonthPicker';
import { changeCustomerAccountNumber } from '../utils/auth';

function resolveRateForMonth(rates: MonthlyRate[], month: string, fallback = 11.5) {
  const sorted = [...rates].sort((a, b) => a.month.localeCompare(b.month));
  const exact = sorted.find((item) => item.month === month);
  if (exact) {
    return exact.rate;
  }
  const previous = [...sorted].reverse().find((item) => item.month < month);
  if (previous) {
    return previous.rate;
  }
  return fallback;
}

export default function Settings() {
  const defaultMonthlyLimits = [0, 0, 0];

  // Billing Settings
  const [selectedRateMonth, setSelectedRateMonth] = useState<string>(defaultMonth());
  const [monthlyRateInput, setMonthlyRateInput] = useState<string>('11.5');
  const [monthlyRates, setMonthlyRates] = useState<MonthlyRate[]>([]);
  const [fallbackRate, setFallbackRate] = useState<number>(11.5);
  
  // Node Settings
  const [node1Label, setNode1Label] = useState<string>('Refrigerator');
  const [node2Label, setNode2Label] = useState<string>('Air Conditioner');
  const [node3Label, setNode3Label] = useState<string>('Water Heater');
  
  const [node1MonthlyLimit, setNode1MonthlyLimit] = useState<string>('0');
  const [node2MonthlyLimit, setNode2MonthlyLimit] = useState<string>('0');
  const [node3MonthlyLimit, setNode3MonthlyLimit] = useState<string>('0');
  
  // Insight Settings
  const [timezone, setTimezone] = useState<string>('Asia/Manila');

  // Security Settings
  const [securityCurrentCan, setSecurityCurrentCan] = useState<string>('');
  const [securityNewCan, setSecurityNewCan] = useState<string>('');

  const parsedMonthlyLimits = [node1MonthlyLimit, node2MonthlyLimit, node3MonthlyLimit].map((value, index) => {
    const monthlyLimit = Number.parseFloat(value);
    return Number.isFinite(monthlyLimit) && monthlyLimit >= 0 ? monthlyLimit : defaultMonthlyLimits[index];
  });

  const totalMonthlyLimit = parsedMonthlyLimits.reduce((sum, value) => sum + value, 0);

  const applySettings = (settings: AppSettings, rates: MonthlyRate[]) => {
    setMonthlyRates(rates);
    setFallbackRate(settings.electricityRate ?? 11.5);
    setSelectedRateMonth(settings.effectiveMonth || defaultMonth());

    setNode1Label(settings.nodeLabels[0] || 'Refrigerator');
    setNode2Label(settings.nodeLabels[1] || 'Air Conditioner');
    setNode3Label(settings.nodeLabels[2] || 'Water Heater');

    setNode1MonthlyLimit(String(settings.nodeMonthlyLimitsKWh[0] ?? 0));
    setNode2MonthlyLimit(String(settings.nodeMonthlyLimitsKWh[1] ?? 0));
    setNode3MonthlyLimit(String(settings.nodeMonthlyLimitsKWh[2] ?? 0));
    setTimezone(settings.timezone || 'Asia/Manila');
  };
  
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { settings, monthlyRates: rates } = await fetchSettingsViewData();
        applySettings(settings, rates);
      } catch (error) {
        toast.error(`Failed to load settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    void loadSettings();
  }, []);
  
  useEffect(() => {
    const resolved = resolveRateForMonth(monthlyRates, selectedRateMonth, fallbackRate);
    setMonthlyRateInput(String(resolved));
  }, [selectedRateMonth, monthlyRates, fallbackRate]);
  
  const handleSaveMonthlyRate = async () => {
    const rateValue = parseFloat(monthlyRateInput);
    if (isNaN(rateValue) || rateValue <= 0) {
      toast.error('Please enter a valid rate');
      return;
    }

    try {
      await saveAppSettings({ effectiveMonth: selectedRateMonth });
      await saveMonthlyRate(selectedRateMonth, rateValue, { source: 'manual', verified: true });
      const { settings, monthlyRates: rates } = await fetchSettingsViewData();
      applySettings(settings, rates);
      toast.success('Rate saved successfully');
    } catch (error) {
      toast.error(`Could not save monthly rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const handleDeleteRate = async (month: string) => {
    try {
      await deleteMonthlyRate(month);
      const { settings, monthlyRates: rates } = await fetchSettingsViewData();
      applySettings(settings, rates);
      toast.success('Rate deleted');
    } catch (error) {
      toast.error(`Could not delete rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const handleToggleVerified = async (month: string) => {
    const target = monthlyRates.find((rate) => rate.month === month);
    if (!target) return;

    try {
      await saveMonthlyRate(month, target.rate, {
        source: target.source || 'manual',
        sourceUrl: target.sourceUrl || null,
        verified: !target.verified
      });
      const { settings, monthlyRates: rates } = await fetchSettingsViewData();
      applySettings(settings, rates);
      toast.success('Rate verification updated');
    } catch (error) {
      toast.error(`Could not update verification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const handleSaveNodes = async () => {
    const labels = [node1Label, node2Label, node3Label];
    const monthlyLimits = parsedMonthlyLimits;

    try {
      const settings = await saveAppSettings({
        nodeLabels: labels,
        nodeMonthlyLimitsKWh: monthlyLimits
      });
      applySettings(settings, settings.rateHistory || monthlyRates);
      toast.success('Node settings saved');
    } catch (error) {
      toast.error(`Could not save node settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const handleSaveInsight = async () => {
    try {
      const settings = await saveAppSettings({ timezone });
      applySettings(settings, settings.rateHistory || monthlyRates);
      toast.success('Insight settings saved');
    } catch (error) {
      toast.error(`Could not save insight settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleChangeCan = async () => {
    if (!securityCurrentCan || !securityNewCan) {
      toast.error('Enter your current CAN and the new CAN');
      return;
    }

    try {
      await changeCustomerAccountNumber(securityCurrentCan, securityNewCan);
      setSecurityCurrentCan('');
      setSecurityNewCan('');
      toast.success('Customer Account Number updated');
    } catch (error) {
      toast.error(`Could not update CAN: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="w-full space-y-4">
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
            <MonthPicker
              id="rate-month"
              value={selectedRateMonth}
              onChange={setSelectedRateMonth}
              minYear={2020}
              maxYear={2035}
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
                <label htmlFor="node1-monthly-limit" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Monthly Limit (kWh)
                </label>
                <input
                  id="node1-monthly-limit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={node1MonthlyLimit}
                  onChange={(e) => setNode1MonthlyLimit(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[44px]"
                  placeholder="0"
                />
                <p className="mt-1 text-[11px] text-gray-500">Set 0 to disable monthly alerts for this device.</p>
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
                <label htmlFor="node2-monthly-limit" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Monthly Limit (kWh)
                </label>
                <input
                  id="node2-monthly-limit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={node2MonthlyLimit}
                  onChange={(e) => setNode2MonthlyLimit(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
                  placeholder="0"
                />
                <p className="mt-1 text-[11px] text-gray-500">Set 0 to disable monthly alerts for this device.</p>
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
                <label htmlFor="node3-monthly-limit" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Monthly Limit (kWh)
                </label>
                <input
                  id="node3-monthly-limit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={node3MonthlyLimit}
                  onChange={(e) => setNode3MonthlyLimit(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 min-h-[44px]"
                  placeholder="0"
                />
                <p className="mt-1 text-[11px] text-gray-500">Set 0 to disable monthly alerts for this device.</p>
               </div>
             </div>
           </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Monthly Energy Limits</h3>
                <p className="mt-1 text-xs text-gray-600">
                  Alerts trigger when a device exceeds its own configured monthly kWh limit.
                </p>
              </div>
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {totalMonthlyLimit.toFixed(2)} kWh
              </span>
            </div>
            <p className="mt-3 text-xs text-blue-800">
              A 0 kWh limit disables monthly alerts for that device.
            </p>
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

      {/* Security Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-slate-700" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Security</h2>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Change Customer Account Number</h3>
          <div className="space-y-3">
            <input
              type="text"
              inputMode="numeric"
              value={securityCurrentCan}
              onChange={(e) => setSecurityCurrentCan(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Current CAN"
            />
            <input
              type="text"
              inputMode="numeric"
              value={securityNewCan}
              onChange={(e) => setSecurityNewCan(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="New CAN"
            />
            <p className="text-xs text-slate-500">
              CAN values are stored as backend hashes. If you forget the CAN, reset it from the database/admin console.
            </p>
            <button
              onClick={handleChangeCan}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-medium active:bg-slate-800 transition-colors min-h-[48px]"
            >
              <Save className="w-4 h-4" />
              Save New CAN
            </button>
          </div>
        </div>
      </div>
       
      {/* Future Cloud Sync Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <p className="text-sm text-blue-800 font-medium mb-1">💡 Settings Management</p>
        <p className="text-xs text-blue-700">
          Settings are now synced with your cloud backend database in real time.
        </p>
      </div>
    </div>
  );
}
