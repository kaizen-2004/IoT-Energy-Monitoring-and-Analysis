import { useEffect, useState } from "react";
import { Bell, DollarSign, MapPin, Palette, Save, Tag } from "lucide-react";
import { toast } from "sonner";
import { API_BASE, fetchAppSettings, saveAppSettings } from "../utils/mockData";
import { getSavedThemeMode, saveTheme, type ThemeMode } from "../utils/theme";

function defaultMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" }
];

function getEffectiveYear(value: string) {
  const year = value.slice(0, 4);
  return /^\d{4}$/.test(year) ? year : String(new Date().getFullYear());
}

function getEffectiveMonthValue(value: string) {
  const month = value.slice(5, 7);
  return /^(0[1-9]|1[0-2])$/.test(month) ? month : String(new Date().getMonth() + 1).padStart(2, "0");
}

function getYearOptions(selectedYear: string) {
  const currentYear = new Date().getFullYear();
  const selected = Number(selectedYear);
  const safeSelected = Number.isFinite(selected) ? selected : currentYear;
  const minYear = Math.min(currentYear - 5, safeSelected);
  const maxYear = Math.max(currentYear + 5, safeSelected);
  const years: string[] = [];
  for (let year = maxYear; year >= minYear; year -= 1) {
    years.push(String(year));
  }
  return years;
}

export default function Settings() {
  const [monthlyRate, setMonthlyRate] = useState<string>("11.5");
  const [effectiveMonth, setEffectiveMonth] = useState<string>(defaultMonth());
  const [node1Label, setNode1Label] = useState<string>("Node 1");
  const [node2Label, setNode2Label] = useState<string>("Node 2");
  const [node3Label, setNode3Label] = useState<string>("Node 3");
  const [node1Threshold, setNode1Threshold] = useState<string>("500");
  const [node2Threshold, setNode2Threshold] = useState<string>("800");
  const [node3Threshold, setNode3Threshold] = useState<string>("600");
  const [timezone, setTimezone] = useState<string>("Asia/Manila");
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [isSavingBilling, setIsSavingBilling] = useState<boolean>(false);
  const [isSavingNodes, setIsSavingNodes] = useState<boolean>(false);
  const [isSavingInsight, setIsSavingInsight] = useState<boolean>(false);
  const [supportsNativeMonthInput, setSupportsNativeMonthInput] = useState<boolean>(true);

  const effectiveYear = getEffectiveYear(effectiveMonth);
  const effectiveMonthValue = getEffectiveMonthValue(effectiveMonth);
  const yearOptions = getYearOptions(effectiveYear);

  useEffect(() => {
    setThemeMode(getSavedThemeMode());
    const monthProbe = document.createElement("input");
    monthProbe.setAttribute("type", "month");
    setSupportsNativeMonthInput(monthProbe.type === "month");

    const loadSettings = async () => {
      const settings = await fetchAppSettings();
      setMonthlyRate(String(settings.electricityRate));
      setEffectiveMonth(settings.effectiveMonth || defaultMonth());
      setNode1Label(settings.nodeLabels[0] || "Node 1");
      setNode2Label(settings.nodeLabels[1] || "Node 2");
      setNode3Label(settings.nodeLabels[2] || "Node 3");
      setNode1Threshold(String(settings.nodeThresholds[0] || 500));
      setNode2Threshold(String(settings.nodeThresholds[1] || 800));
      setNode3Threshold(String(settings.nodeThresholds[2] || 600));
      setTimezone(settings.timezone || "Asia/Manila");
    };

    loadSettings().catch((error) => {
      toast.error(
        `Could not load cloud settings. Using local fallback. ${error instanceof Error ? error.message : ""}`
      );
    });
  }, []);

  const handleSaveBilling = async () => {
    const rateValue = Number(monthlyRate);
    if (!Number.isFinite(rateValue) || rateValue < 0) {
      toast.error("Monthly rate must be a number greater than or equal to 0.");
      return;
    }

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(effectiveMonth)) {
      toast.error("Effective month must be in YYYY-MM format.");
      return;
    }

    setIsSavingBilling(true);
    try {
      const settings = await saveAppSettings({
        electricityRate: rateValue,
        effectiveMonth
      });
      setMonthlyRate(String(settings.electricityRate));
      setEffectiveMonth(settings.effectiveMonth);
      toast.success("Billing settings saved (cloud + local)");
    } catch (error) {
      toast.error(
        `Saved locally only. Cloud sync failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsSavingBilling(false);
    }
  };

  const handleSaveNodes = async () => {
    const labels = [node1Label, node2Label, node3Label].map((value, index) => value.trim() || `Node ${index + 1}`);
    const thresholds = [
      Number.parseInt(node1Threshold, 10) || 500,
      Number.parseInt(node2Threshold, 10) || 800,
      Number.parseInt(node3Threshold, 10) || 600
    ];

    setIsSavingNodes(true);
    try {
      const settings = await saveAppSettings({
        nodeLabels: labels,
        nodeThresholds: thresholds
      });
      setNode1Label(settings.nodeLabels[0] || "Node 1");
      setNode2Label(settings.nodeLabels[1] || "Node 2");
      setNode3Label(settings.nodeLabels[2] || "Node 3");
      setNode1Threshold(String(settings.nodeThresholds[0] || 500));
      setNode2Threshold(String(settings.nodeThresholds[1] || 800));
      setNode3Threshold(String(settings.nodeThresholds[2] || 600));
      toast.success("Node settings saved (cloud + local)");
    } catch (error) {
      toast.error(
        `Saved locally only. Cloud sync failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsSavingNodes(false);
    }
  };

  const handleSaveInsight = async () => {
    setIsSavingInsight(true);
    try {
      const settings = await saveAppSettings({ timezone });
      setTimezone(settings.timezone || "Asia/Manila");
      toast.success("Insight settings saved (cloud + local)");
    } catch (error) {
      toast.error(
        `Saved locally only. Cloud sync failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsSavingInsight(false);
    }
  };

  const handleSaveAppearance = () => {
    saveTheme(themeMode);
    toast.success("Appearance settings saved");
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Configure your energy monitoring preferences</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <DollarSign className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Billing Settings</h2>
        </div>

        <div className="space-y-4 max-w-none">
          <div>
            <label htmlFor="monthly-rate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Monthly Rate (PHP/kWh)
            </label>
            <div className="relative min-w-0">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400">₱</span>
              <input
                id="monthly-rate"
                type="number"
                step="0.01"
                min="0"
                value={monthlyRate}
                onChange={(event) => setMonthlyRate(event.target.value)}
                className="w-full min-w-0 pl-8 pr-28 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-950 dark:text-gray-100"
                placeholder="e.g., 13.80"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">per kWh</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter your electricity provider rate per kilowatt-hour</p>
          </div>

          <div>
            <label htmlFor="effective-month" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Effective Month
            </label>
            {supportsNativeMonthInput ? (
              <input
                id="effective-month"
                type="month"
                value={effectiveMonth}
                onChange={(event) => setEffectiveMonth(event.target.value)}
                onFocus={(event) => {
                  if ("showPicker" in event.currentTarget) {
                    try {
                      event.currentTarget.showPicker();
                    } catch (_error) {
                      // Native picker may be unavailable in some browsers.
                    }
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-950 dark:text-gray-100"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  id="effective-month-value"
                  value={effectiveMonthValue}
                  onChange={(event) => setEffectiveMonth(`${effectiveYear}-${event.target.value}`)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-950 dark:text-gray-100"
                >
                  {MONTH_OPTIONS.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
                <select
                  id="effective-month-year"
                  value={effectiveYear}
                  onChange={(event) => setEffectiveMonth(`${event.target.value}-${effectiveMonthValue}`)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-950 dark:text-gray-100"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This month label is used in exports and estimated costs</p>
            {!supportsNativeMonthInput && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Your browser does not provide a native month picker, so dropdown selectors are shown instead.
              </p>
            )}
          </div>

          <div className="pt-4">
            <button
              onClick={handleSaveBilling}
              disabled={isSavingBilling}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              {isSavingBilling ? "Saving..." : "Save Billing Settings"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Tag className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Node Settings</h2>
        </div>

        <div className="space-y-6 max-w-none">
            <div className="p-4 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Node 1 (ESP32-NODE-001)</h3>
              <div className="space-y-3">
                <div>
                  <label htmlFor="node1-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Appliance Label
                  </label>
                  <input
                    id="node1-label"
                    type="text"
                    value={node1Label}
                    onChange={(event) => setNode1Label(event.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-950 dark:text-gray-100"
                    placeholder="e.g., Node 1"
                  />
                </div>

                <div>
                  <label htmlFor="node1-threshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Power Threshold
                  </label>
                  <div className="relative min-w-0">
                    <input
                      id="node1-threshold"
                      type="number"
                      min="0"
                      value={node1Threshold}
                      onChange={(event) => setNode1Threshold(event.target.value)}
                      className="w-full pr-10 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-950 dark:text-gray-100"
                      placeholder="500"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">W</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Node 2 (ESP32-NODE-002)</h3>
              <div className="space-y-3">
                <div>
                  <label htmlFor="node2-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Appliance Label
                  </label>
                  <input
                    id="node2-label"
                    type="text"
                    value={node2Label}
                    onChange={(event) => setNode2Label(event.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-950 dark:text-gray-100"
                    placeholder="e.g., Node 2"
                  />
                </div>

                <div>
                  <label htmlFor="node2-threshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Power Threshold
                  </label>
                  <div className="relative min-w-0">
                    <input
                      id="node2-threshold"
                      type="number"
                      min="0"
                      value={node2Threshold}
                      onChange={(event) => setNode2Threshold(event.target.value)}
                      className="w-full pr-10 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-950 dark:text-gray-100"
                      placeholder="800"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">W</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-900 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Node 3 (ESP32-NODE-003)</h3>
              <div className="space-y-3">
                <div>
                  <label htmlFor="node3-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Appliance Label
                  </label>
                  <input
                    id="node3-label"
                    type="text"
                    value={node3Label}
                    onChange={(event) => setNode3Label(event.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-950 dark:text-gray-100"
                    placeholder="e.g., Node 3"
                  />
                </div>

                <div>
                  <label htmlFor="node3-threshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Power Threshold
                  </label>
                  <div className="relative min-w-0">
                    <input
                      id="node3-threshold"
                      type="number"
                      min="0"
                      value={node3Threshold}
                      onChange={(event) => setNode3Threshold(event.target.value)}
                      className="w-full pr-10 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-950 dark:text-gray-100"
                      placeholder="600"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">W</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handleSaveNodes}
                disabled={isSavingNodes}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                {isSavingNodes ? "Saving..." : "Save Node Settings"}
              </button>
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Insight Settings</h2>
        </div>

        <div className="space-y-4 max-w-none">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Comparison Window</label>
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <p className="text-sm text-gray-900 dark:text-gray-100">Today vs Yesterday (Fixed)</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Compares current day consumption with previous day</p>
              </div>
            </div>

            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Timezone
                </div>
              </label>
              <select
                id="timezone"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-950 dark:text-gray-100"
              >
                <option value="Asia/Manila">Asia/Manila (PHT, UTC+8)</option>
                <option value="UTC">UTC (GMT)</option>
                <option value="America/New_York">America/New York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
              </select>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">All timestamps and daily calculations use this timezone</p>
            </div>

            <div className="pt-4">
              <button
                onClick={handleSaveInsight}
                disabled={isSavingInsight}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                {isSavingInsight ? "Saving..." : "Save Insight Settings"}
              </button>
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Palette className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Appearance & API</h2>
        </div>

        <div className="space-y-4 max-w-none">
            <div>
              <label htmlFor="theme-mode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme Mode
              </label>
              <select
                id="theme-mode"
                value={themeMode}
                onChange={(event) => setThemeMode(event.target.value as ThemeMode)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-950 dark:text-gray-100"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>

            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">Current API Base</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-all">{API_BASE}</p>
            </div>

            <div className="pt-4">
              <button
                onClick={handleSaveAppearance}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Appearance
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}
