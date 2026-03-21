import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  DollarSign,
  Globe,
  MapPin,
  Palette,
  Save,
  Tag,
  Trash2,
  WandSparkles
} from "lucide-react";
import { toast } from "sonner";
import {
  API_BASE,
  defaultMonth,
  deleteMonthlyRate,
  fetchAppSettings,
  fetchRateDraft,
  getMonthLabel,
  saveAppSettings,
  saveMonthlyRate,
  type AppSettings,
  type MonthlyRate
} from "../utils/mockData";
import { getSavedThemeMode, saveTheme, type ThemeMode } from "../utils/theme";

function resolveRateForMonth(rateHistory: MonthlyRate[], month: string, fallbackRate: number) {
  const sorted = [...rateHistory].sort((a, b) => a.month.localeCompare(b.month));
  const exact = sorted.find((item) => item.month === month);
  if (exact) {
    return { rate: exact.ratePerKwh, fromMonth: exact.month, fallback: false };
  }

  const previous = [...sorted].reverse().find((item) => item.month < month);
  if (previous) {
    return { rate: previous.ratePerKwh, fromMonth: previous.month, fallback: true };
  }

  return { rate: fallbackRate, fromMonth: null, fallback: false };
}

function formatMonthTimestamp(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short"
  });
}

export default function Settings() {
  const [monthlyRate, setMonthlyRate] = useState<string>("11.5");
  const [effectiveMonth, setEffectiveMonth] = useState<string>(defaultMonth());
  const [rateHistory, setRateHistory] = useState<MonthlyRate[]>([]);
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
  const [isDeletingMonth, setIsDeletingMonth] = useState<string>("");
  const [draftUrl, setDraftUrl] = useState<string>("");
  const [isFetchingDraft, setIsFetchingDraft] = useState<boolean>(false);
  const [draftCandidates, setDraftCandidates] = useState<number[]>([]);

  const sortedRateHistory = useMemo(
    () => [...rateHistory].sort((a, b) => b.month.localeCompare(a.month)),
    [rateHistory]
  );

  const loadSettings = async () => {
    const settings = await fetchAppSettings();
    applySettings(settings);
  };

  const applySettings = (settings: AppSettings) => {
    setThemeMode(getSavedThemeMode());
    setRateHistory(settings.rateHistory || []);
    setNode1Label(settings.nodeLabels[0] || "Node 1");
    setNode2Label(settings.nodeLabels[1] || "Node 2");
    setNode3Label(settings.nodeLabels[2] || "Node 3");
    setNode1Threshold(String(settings.nodeThresholds[0] || 500));
    setNode2Threshold(String(settings.nodeThresholds[1] || 800));
    setNode3Threshold(String(settings.nodeThresholds[2] || 600));
    setTimezone(settings.timezone || "Asia/Manila");

    const monthToUse = settings.effectiveMonth || defaultMonth();
    setEffectiveMonth(monthToUse);
    const resolved = resolveRateForMonth(
      settings.rateHistory || [],
      monthToUse,
      settings.electricityRate
    );
    setMonthlyRate(String(resolved.rate));
  };

  useEffect(() => {
    loadSettings().catch((error) => {
      toast.error(
        `Could not load cloud settings. Using local fallback. ${error instanceof Error ? error.message : ""}`
      );
    });
  }, []);

  const handleMonthChange = (month: string) => {
    setEffectiveMonth(month);
    const resolved = resolveRateForMonth(rateHistory, month, Number(monthlyRate) || 11.5);
    setMonthlyRate(String(resolved.rate));
    setDraftCandidates([]);
  };

  const rateMeta = resolveRateForMonth(rateHistory, effectiveMonth, Number(monthlyRate) || 11.5);

  const handleSaveBilling = async () => {
    const rateValue = Number(monthlyRate);
    if (!Number.isFinite(rateValue) || rateValue < 0) {
      toast.error("Monthly rate must be a number greater than or equal to 0.");
      return;
    }

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(effectiveMonth)) {
      toast.error("Month must be in YYYY-MM format.");
      return;
    }

    setIsSavingBilling(true);
    try {
      await saveAppSettings({ effectiveMonth });
      const settings = await saveMonthlyRate(effectiveMonth, rateValue, {
        source: "manual",
        verified: true
      });
      applySettings(settings);
      toast.success(`Rate saved for ${getMonthLabel(effectiveMonth)}`);
    } catch (error) {
      toast.error(
        `Could not save billing settings. ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsSavingBilling(false);
    }
  };

  const handleFetchDraft = async () => {
    if (!draftUrl.trim()) {
      toast.error("Enter a Meralco advisory or archive URL first.");
      return;
    }

    setIsFetchingDraft(true);
    try {
      const draft = await fetchRateDraft(draftUrl.trim(), effectiveMonth);
      setDraftCandidates(draft.candidates || []);
      if (draft.recommendedRate !== null && Number.isFinite(draft.recommendedRate)) {
        setMonthlyRate(String(draft.recommendedRate));
        toast.success("Draft rate fetched. Review and click Save Billing Settings to confirm.");
      } else {
        toast.info("No kWh rate candidate found in the page. Enter rate manually.");
      }
    } catch (error) {
      toast.error(`Failed to fetch draft rate. ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsFetchingDraft(false);
    }
  };

  const handleDeleteRate = async (month: string) => {
    setIsDeletingMonth(month);
    try {
      const settings = await deleteMonthlyRate(month);
      applySettings(settings);
      toast.success(`Deleted historical rate for ${getMonthLabel(month)}`);
    } catch (error) {
      toast.error(`Could not delete rate. ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsDeletingMonth("");
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
      applySettings(settings);
      toast.success("Node settings saved.");
    } catch (error) {
      toast.error(`Could not save node settings. ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSavingNodes(false);
    }
  };

  const handleSaveInsight = async () => {
    setIsSavingInsight(true);
    try {
      const settings = await saveAppSettings({ timezone });
      applySettings(settings);
      toast.success("Insight settings saved.");
    } catch (error) {
      toast.error(`Could not save insight settings. ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSavingInsight(false);
    }
  };

  const handleSaveAppearance = () => {
    saveTheme(themeMode);
    toast.success("Appearance settings saved");
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Configure monthly rates, node behavior, and dashboard preferences</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-6">
          <DollarSign className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Billing Settings</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="effective-month" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Billing Month
            </label>
            <input
              id="effective-month"
              type="month"
              value={effectiveMonth}
              onChange={(event) => handleMonthChange(event.target.value)}
              className="w-full sm:w-72 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-950 dark:text-gray-100"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selected month: {getMonthLabel(effectiveMonth)}</p>
          </div>

          <div>
            <label htmlFor="monthly-rate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rate for {getMonthLabel(effectiveMonth)} (PHP/kWh)
            </label>
            <div className="relative min-w-0 max-w-xl">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400">₱</span>
              <input
                id="monthly-rate"
                type="number"
                step="0.01"
                min="0"
                value={monthlyRate}
                onChange={(event) => setMonthlyRate(event.target.value)}
                className="w-full min-w-0 pl-8 pr-28 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-950 dark:text-gray-100"
                placeholder="e.g., 13.81"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">per kWh</span>
            </div>
            {rateMeta.fallback && rateMeta.fromMonth ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                No exact rate stored for {getMonthLabel(effectiveMonth)}. Showing fallback from {getMonthLabel(rateMeta.fromMonth)}.
              </p>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This value is used for monthly cost computation.</p>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/70">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Auto-Fetch Draft Rate (Optional)</p>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              Hybrid mode: fetch a draft from Meralco page, then manually confirm by clicking Save Billing Settings.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={draftUrl}
                onChange={(event) => setDraftUrl(event.target.value)}
                placeholder="https://company.meralco.com.ph/news-and-advisories/..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 dark:text-gray-100"
              />
              <button
                type="button"
                onClick={handleFetchDraft}
                disabled={isFetchingDraft}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-blue-300 text-blue-700 dark:text-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              >
                <WandSparkles className="w-4 h-4" />
                {isFetchingDraft ? "Fetching..." : "Fetch Draft"}
              </button>
            </div>
            {draftCandidates.length > 0 && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Candidates found: {draftCandidates.map((value) => value.toFixed(4)).join(", ")} PHP/kWh
              </p>
            )}
          </div>

          <div className="pt-1">
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

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Historical Monthly Rates</h3>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full min-w-[680px]">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Month</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Rate (PHP/kWh)</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Source</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Updated</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedRateHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">No monthly rates yet.</td>
                  </tr>
                ) : (
                  sortedRateHistory.map((row) => (
                    <tr key={row.month} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">{getMonthLabel(row.month)}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">{row.ratePerKwh.toFixed(4)}</td>
                      <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{row.source || "manual"}</td>
                      <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{formatMonthTimestamp(row.updatedAt)}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleMonthChange(row.month)}
                            className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRate(row.month)}
                            disabled={isDeletingMonth === row.month}
                            className="px-2 py-1 text-xs rounded border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            {isDeletingMonth === row.month ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-6">
          <Tag className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Node Settings</h2>
        </div>

        <div className="space-y-6">
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

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Insight Settings</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Comparison Window</label>
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <p className="text-sm text-gray-900 dark:text-gray-100">Selected Month vs Previous Full Month (Fixed)</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Compares selected month consumption with the immediately preceding month.</p>
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
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">All timestamps and monthly calculations use this timezone</p>
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

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-6">
          <Palette className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Appearance & API</h2>
        </div>

        <div className="space-y-4">
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
