import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Calendar, Download, FileText, Image as ImageIcon, RefreshCw, Table } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import {
  API_BASE,
  defaultMonth,
  fetchAppSettings,
  fetchDashboardData,
  getMonthLabel,
  type Alert,
  type DailyData,
  type NodeSummary
} from "../utils/mockData";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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

function drawSectionHeader(pdf: jsPDF, title: string, x: number, y: number, width: number) {
  pdf.setFillColor(32, 92, 195);
  pdf.roundedRect(x, y - 5, width, 10, 2, 2, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.text(title, x + 4, y + 1.5);
}

function drawMetricCard(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  title: string,
  value: string,
  color: [number, number, number]
) {
  pdf.setFillColor(color[0], color[1], color[2]);
  pdf.roundedRect(x, y, width, 26, 3, 3, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.text(title, x + 4, y + 8);
  pdf.setFontSize(13);
  pdf.text(value, x + 4, y + 18);
}

function fitTextToWidth(pdf: jsPDF, text: string, maxWidth: number) {
  if (pdf.getTextWidth(text) <= maxWidth) {
    return text;
  }

  const ellipsis = "...";
  let value = text;
  while (value.length > 0 && pdf.getTextWidth(value + ellipsis) > maxWidth) {
    value = value.slice(0, -1);
  }

  return value.length > 0 ? `${value}${ellipsis}` : ellipsis;
}

function drawSeriesOnPdf(
  pdf: jsPDF,
  values: number[],
  areaX: number,
  areaY: number,
  areaWidth: number,
  areaHeight: number,
  maxValue: number,
  color: [number, number, number]
) {
  if (values.length < 2) {
    return;
  }

  const stepX = areaWidth / (values.length - 1);
  pdf.setDrawColor(color[0], color[1], color[2]);
  pdf.setLineWidth(0.8);

  for (let index = 1; index < values.length; index += 1) {
    const prevX = areaX + stepX * (index - 1);
    const prevY = areaY + areaHeight - (values[index - 1] / maxValue) * areaHeight;
    const currX = areaX + stepX * index;
    const currY = areaY + areaHeight - (values[index] / maxValue) * areaHeight;
    pdf.line(prevX, prevY, currX, currY);
  }
}

function drawTrendChartPdf(
  pdf: jsPDF,
  chartData: DailyData[],
  nodeSummaries: NodeSummary[],
  x: number,
  startY: number,
  width: number,
  height: number
) {
  const chartX = x;
  const chartWidth = width;
  const chartHeight = height;
  const padding = { top: 10, right: 10, bottom: 28, left: 10 };
  const areaX = chartX + padding.left;
  const areaY = startY + padding.top;
  const areaWidth = chartWidth - padding.left - padding.right;
  const areaHeight = Math.max(24, chartHeight - padding.top - padding.bottom);

  const node1 = chartData.map((row) => row.node1);
  const node2 = chartData.map((row) => row.node2);
  const node3 = chartData.map((row) => row.node3);
  const maxValue = Math.max(1, ...node1, ...node2, ...node3);

  pdf.setFillColor(244, 248, 255);
  pdf.roundedRect(chartX, startY, chartWidth, chartHeight, 3, 3, "F");
  pdf.setDrawColor(188, 207, 245);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(chartX, startY, chartWidth, chartHeight, 3, 3);

  for (let i = 1; i <= 4; i += 1) {
    const y = areaY + (areaHeight * i) / 4;
    pdf.setDrawColor(220, 232, 250);
    pdf.setLineWidth(0.3);
    pdf.line(areaX, y, areaX + areaWidth, y);
  }

  drawSeriesOnPdf(pdf, node1, areaX, areaY, areaWidth, areaHeight, maxValue, [147, 51, 234]);
  drawSeriesOnPdf(pdf, node2, areaX, areaY, areaWidth, areaHeight, maxValue, [249, 115, 22]);
  drawSeriesOnPdf(pdf, node3, areaX, areaY, areaWidth, areaHeight, maxValue, [6, 182, 212]);

  const labels = chartData.map((row) => row.date);
  if (labels.length > 0) {
    pdf.setTextColor(76, 85, 99);
    pdf.setFontSize(8);
    const first = labels[0];
    const mid = labels[Math.floor(labels.length / 2)];
    const last = labels[labels.length - 1];
    const labelsY = areaY + areaHeight + 6;
    pdf.text(first, areaX, labelsY);
    pdf.text(mid, areaX + areaWidth / 2 - 8, labelsY);
    pdf.text(last, areaX + areaWidth - 12, labelsY);
  }

  const legendY = startY + chartHeight - 8;
  const legendItems: Array<{ label: string; color: [number, number, number] }> = [
    { label: `Node 1 (${nodeSummaries[0]?.label || "Node 1"})`, color: [147, 51, 234] },
    { label: `Node 2 (${nodeSummaries[1]?.label || "Node 2"})`, color: [249, 115, 22] },
    { label: `Node 3 (${nodeSummaries[2]?.label || "Node 3"})`, color: [6, 182, 212] }
  ];

  const compactItems = legendItems.map((item, index) => ({
    ...item,
    label: fitTextToWidth(pdf, item.label, areaWidth / 3 - 14) || `Node ${index + 1}`
  }));
  const segmentWidth = areaWidth / 3;
  compactItems.forEach((item, index) => {
    const legendX = areaX + segmentWidth * index;
    pdf.setDrawColor(item.color[0], item.color[1], item.color[2]);
    pdf.setLineWidth(1.2);
    pdf.line(legendX, legendY, legendX + 8, legendY);
    pdf.setTextColor(55, 65, 81);
    pdf.setFontSize(8);
    pdf.text(item.label, legendX + 10, legendY + 1.5);
  });
}

export default function Reports() {
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth());
  const [coverageLabel, setCoverageLabel] = useState<string>("");
  const [includeCharts, setIncludeCharts] = useState<boolean>(true);
  const [includeNodeTable, setIncludeNodeTable] = useState<boolean>(true);
  const [includeAlerts, setIncludeAlerts] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [rate, setRate] = useState<number>(11.5);
  const [chartData, setChartData] = useState<DailyData[]>([]);
  const [nodeSummaries, setNodeSummaries] = useState<NodeSummary[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [totalKWh, setTotalKWh] = useState<number>(0);
  const [totalCost, setTotalCost] = useState<number>(0);

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
      setIsLoading(true);
      const settings = await fetchAppSettings();
      const dashboardData = await fetchDashboardData({
        settings,
        selectedMonth
      });

      setRate(dashboardData.resolvedRate.ratePerKwh);
      setChartData(dashboardData.chartData);
      setNodeSummaries(dashboardData.nodeSummaries);
      setAlerts(dashboardData.alerts);
      setCoverageLabel(dashboardData.selectedMonthCoverageLabel);
      setTotalKWh(dashboardData.selectedMonthTotalKWh);
      setTotalCost(dashboardData.selectedMonthTotalCost);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to fetch report data");
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedSectionCount =
    (includeCharts ? 1 : 0) + (includeNodeTable ? 1 : 0) + (includeAlerts ? 1 : 0);

  const chartDataWithTotals = useMemo(
    () =>
      chartData.map((row) => ({
        ...row,
        total: Number((row.node1 + row.node2 + row.node3).toFixed(4))
      })),
    [chartData]
  );

  const handleGeneratePDF = async () => {
    if (isLoading && nodeSummaries.length === 0) {
      toast.info("Data is still loading. Please wait a moment then export.");
      return;
    }

    setIsGenerating(true);
    toast.info("Generating PDF report...");

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginX = 10;
      const contentWidth = pageWidth - marginX * 2;
      const footerLineY = pageHeight - 14;
      const footerTextY = pageHeight - 9;
      let yPos = 8;

      pdf.setFillColor(16, 42, 108);
      pdf.rect(0, 0, pageWidth, 36, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.text("IoT Household Energy Monitoring Report", marginX + 2, 14);
      pdf.setFontSize(10);
      pdf.text("Home Energy Summary • Philippine Context (kWh)", marginX + 2, 21);

      const generatedDate = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
      pdf.setFontSize(8.5);
      pdf.text(`Generated: ${generatedDate}`, pageWidth - marginX, 14, { align: "right" });
      pdf.text(`Month: ${getMonthLabel(selectedMonth)}`, pageWidth - marginX, 20, { align: "right" });
      pdf.text(`Coverage: ${coverageLabel}`, pageWidth - marginX, 26, { align: "right" });

      yPos = 44;
      drawSectionHeader(pdf, "Summary Highlights", marginX, yPos, contentWidth);
      yPos += 10;

      const cardGap = 4;
      const cardWidth = (contentWidth - cardGap * 2) / 3;
      drawMetricCard(pdf, marginX, yPos, cardWidth, "Total kWh", `${totalKWh.toFixed(3)} kWh`, [37, 99, 235]);
      drawMetricCard(pdf, marginX + cardWidth + cardGap, yPos, cardWidth, "Estimated Cost", `PHP ${totalCost.toFixed(2)}`, [5, 150, 105]);
      drawMetricCard(pdf, marginX + cardWidth * 2 + cardGap * 2, yPos, cardWidth, "Active Nodes", `${nodeSummaries.length}`, [124, 58, 237]);

      yPos += 33;
      pdf.setTextColor(31, 41, 55);
      pdf.setFontSize(10);
      pdf.text(`Rate Applied: PHP ${rate.toFixed(4)} per kWh`, marginX, yPos);

      if (includeNodeTable) {
        yPos += 10;
        drawSectionHeader(pdf, "Node Details", marginX, yPos, contentWidth);

        yPos += 10;
        pdf.setFontSize(10);

        const headers = ["Node", "Appliance", "kWh (Month)", "Current Power", "Est. Cost", "Device ID"];
        const colWidths = [0.12, 0.36, 0.13, 0.15, 0.14, 0.1].map((ratio) =>
          Number((contentWidth * ratio).toFixed(2))
        );
        let xPos = marginX;

        pdf.setFillColor(37, 99, 235);
        pdf.rect(marginX, yPos - 5, contentWidth, 8, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);

        headers.forEach((header, index) => {
          const displayHeader = fitTextToWidth(pdf, header, colWidths[index] - 1.5);
          pdf.text(displayHeader, xPos, yPos);
          xPos += colWidths[index];
        });

        yPos += 8;
        pdf.setTextColor(31, 41, 55);
        pdf.setFontSize(9);

        nodeSummaries.forEach((node, index) => {
          if (yPos > pageHeight - 24) {
            pdf.addPage();
            yPos = 18;
          }

          xPos = marginX;
          const rowData = [
            `Node ${node.nodeId}`,
            node.label,
            `${node.periodKWh.toFixed(3)}`,
            `${Math.round(node.currentPower)} W`,
            `PHP ${node.estimatedCost.toFixed(2)}`,
            node.deviceId
          ];

          if (index % 2 === 0) {
            pdf.setFillColor(240, 247, 255);
            pdf.rect(marginX, yPos - 5, contentWidth, 8, "F");
          }

          rowData.forEach((data, valueIndex) => {
            const displayValue = fitTextToWidth(pdf, data, colWidths[valueIndex] - 1.5);
            pdf.text(displayValue, xPos, yPos);
            xPos += colWidths[valueIndex];
          });

          yPos += 8;
        });
      }

      if (includeCharts) {
        const minChartHeight = 120;
        const maxChartHeight = 170;
        if (yPos + minChartHeight + 14 > pageHeight - 18) {
          pdf.addPage();
          yPos = 18;
        } else {
          yPos += 10;
        }

        drawSectionHeader(pdf, "Monthly Energy Consumption Trend", marginX, yPos, contentWidth);
        yPos += 10;
        const availableHeight = pageHeight - 18 - yPos;
        const chartHeight = Math.max(minChartHeight, Math.min(maxChartHeight, availableHeight));
        drawTrendChartPdf(pdf, chartData, nodeSummaries, marginX, yPos, contentWidth, chartHeight);
        yPos += chartHeight;
      }

      if (includeAlerts && alerts.length > 0) {
        if (yPos + 36 > pageHeight - 18) {
          pdf.addPage();
          yPos = 18;
        } else {
          yPos += 10;
        }

        drawSectionHeader(pdf, "Recent Alerts", marginX, yPos, contentWidth);
        yPos += 10;
        pdf.setFontSize(10);
        pdf.setTextColor(31, 41, 55);

        alerts.forEach((alert) => {
          if (yPos > pageHeight - 24) {
            pdf.addPage();
            yPos = 18;
          }

          pdf.setFillColor(255, 244, 230);
          pdf.roundedRect(marginX, yPos - 5, contentWidth, 15, 2, 2, "F");
          pdf.setDrawColor(249, 115, 22);
          pdf.setLineWidth(0.8);
          pdf.line(marginX + 2, yPos - 3, marginX + 2, yPos + 8);

          pdf.text(`! ${fitTextToWidth(pdf, alert.message, contentWidth - 18)}`, marginX + 5, yPos);
          yPos += 6;
          pdf.setFontSize(9);
          pdf.setTextColor(75, 85, 99);
          const detailText = `${alert.timestamp} | ${alert.nodeLabel} | ${alert.value}W / ${alert.threshold}W`;
          pdf.text(fitTextToWidth(pdf, detailText, contentWidth - 8), marginX + 5, yPos);
          pdf.setFontSize(10);
          pdf.setTextColor(31, 41, 55);
          yPos += 12;
        });
      }

      const pageCount = pdf.internal.pages.length - 1;
      for (let index = 1; index <= pageCount; index += 1) {
        pdf.setPage(index);
        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.3);
        pdf.line(marginX, footerLineY, pageWidth - marginX, footerLineY);
        pdf.setFontSize(8);
        pdf.setTextColor(71, 85, 105);
        pdf.text(`Page ${index} of ${pageCount} • Data Source: ${API_BASE}`, pageWidth / 2, footerTextY, {
          align: "center"
        });
      }

      pdf.save(`energy-report-${selectedMonth}.pdf`);
      toast.success("PDF report generated");
    } catch (error) {
      console.error("Error generating PDF:", error);
      const details = error instanceof Error ? error.message : "Unknown export error";
      toast.error(`Failed to generate PDF report: ${details}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Reports & Export</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Generate and export monthly energy consumption reports</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <FileText className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Export Settings</h2>
          <button
            type="button"
            onClick={loadData}
            className="w-full sm:w-auto sm:ml-auto inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Data
          </button>
        </div>

        {errorMessage && <p className="text-sm text-red-600 mb-4">API error: {errorMessage}</p>}
        {isLoading && <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Loading latest report data...</p>}

        <div className="space-y-6 max-w-none">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Billing Month
              </div>
            </label>

            <input
              id="report-month"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-72 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-950 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Coverage: {coverageLabel || getMonthLabel(selectedMonth)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Include in Report
            </label>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="checkbox"
                  checked={includeCharts}
                  onChange={(e) => setIncludeCharts(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <ImageIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">Trend Charts</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Include monthly energy consumption trend chart</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="checkbox"
                  checked={includeNodeTable}
                  onChange={(e) => setIncludeNodeTable(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <Table className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">Node Details Table</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Include detailed table of all nodes</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="checkbox"
                  checked={includeAlerts}
                  onChange={(e) => setIncludeAlerts(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <AlertTriangle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">Alert Logs</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Include threshold exceedance alerts</div>
                </div>
              </label>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              {isGenerating ? "Generating PDF..." : "Generate PDF Report"}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">Selected Month</p>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-1">{getMonthLabel(selectedMonth)}</p>
            </div>
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">Sections Included</p>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-1">{selectedSectionCount} / 3 enabled</p>
            </div>
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">Applied Rate</p>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-1">PHP {rate.toFixed(4)} per kWh</p>
            </div>
          </div>
        </div>
      </div>

      {!isLoading && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Monthly Snapshot</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total kWh</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{totalKWh.toFixed(3)}</p>
            </div>
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Cost</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">PHP {totalCost.toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">Coverage</p>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-1">{coverageLabel || getMonthLabel(selectedMonth)}</p>
            </div>
          </div>

          <div className="mt-6 h-80 overflow-x-auto">
            <div className="h-full min-w-[880px] sm:min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartDataWithTotals}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.35} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis />
                  <Tooltip formatter={(value: number | string) => `${Number(value).toFixed(3)} kWh`} />
                  <Legend content={renderCompactLegend} />
                  <Line type="monotone" dataKey="node1" stroke="#7c3aed" name={`Node 1 (${nodeSummaries[0]?.label || "Node 1"})`} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="node2" stroke="#ea580c" name={`Node 2 (${nodeSummaries[1]?.label || "Node 2"})`} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="node3" stroke="#0891b2" name={`Node 3 (${nodeSummaries[2]?.label || "Node 3"})`} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="total" stroke="#eab308" name="Total Daily kWh" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
