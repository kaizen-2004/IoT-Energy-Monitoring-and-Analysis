import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Calendar, Download, FileText, Image as ImageIcon, RefreshCw, Table } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { API_BASE, fetchAppSettings, fetchDashboardData } from "../utils/mockData";
import type { Alert, DailyData, NodeSummary } from "../utils/mockData";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function isoDate(daysFromToday: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

function drawSectionHeader(pdf: jsPDF, title: string, y: number) {
  pdf.setFillColor(32, 92, 195);
  pdf.roundedRect(20, y - 5, 170, 10, 2, 2, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.text(title, 24, y + 1.5);
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
  pageWidth: number,
  startY: number
) {
  const chartX = 20;
  const chartWidth = pageWidth - 40;
  const chartHeight = 90;
  const plotPadding = 12;
  const areaX = chartX + plotPadding;
  const areaY = startY + plotPadding;
  const areaWidth = chartWidth - plotPadding * 2;
  const areaHeight = chartHeight - plotPadding * 2;

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
    pdf.text(first, areaX, startY + chartHeight + 5);
    pdf.text(mid, areaX + areaWidth / 2 - 8, startY + chartHeight + 5);
    pdf.text(last, areaX + areaWidth - 12, startY + chartHeight + 5);
  }

  const legendY = startY + chartHeight + 12;
  const legendItems: Array<{ label: string; color: [number, number, number] }> = [
    { label: `Node 1 (${nodeSummaries[0]?.label || "Node 1"})`, color: [147, 51, 234] },
    { label: `Node 2 (${nodeSummaries[1]?.label || "Node 2"})`, color: [249, 115, 22] },
    { label: `Node 3 (${nodeSummaries[2]?.label || "Node 3"})`, color: [6, 182, 212] }
  ];

  let legendX = chartX;
  legendItems.forEach((item) => {
    pdf.setDrawColor(item.color[0], item.color[1], item.color[2]);
    pdf.setLineWidth(1.2);
    pdf.line(legendX, legendY, legendX + 8, legendY);
    pdf.setTextColor(55, 65, 81);
    pdf.setFontSize(8);
    pdf.text(item.label, legendX + 10, legendY + 1.5);
    legendX += 58;
  });
}

export default function Reports() {
  const [startDate, setStartDate] = useState<string>(isoDate(-6));
  const [endDate, setEndDate] = useState<string>(isoDate(0));
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

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const settings = await fetchAppSettings();
      const currentRate =
        Number.isFinite(settings.electricityRate) && settings.electricityRate >= 0
          ? settings.electricityRate
          : 11.5;
      setRate(currentRate);

      const dashboardData = await fetchDashboardData({
        settings,
        rate: currentRate
      });
      setChartData(dashboardData.chartData);
      setNodeSummaries(dashboardData.nodeSummaries);
      setAlerts(dashboardData.alerts);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to fetch report data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalKWh = nodeSummaries.reduce((sum, node) => sum + node.todayKWh, 0);
  const totalCost = totalKWh * rate;

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
      let yPos = 8;

      pdf.setFillColor(16, 42, 108);
      pdf.rect(0, 0, pageWidth, 36, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.text("IoT Household Energy Monitoring Report", 20, 14);
      pdf.setFontSize(10);
      pdf.text("Home Energy Summary • Philippine Context (kWh)", 20, 21);

      const generatedDate = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
      pdf.setFontSize(8.5);
      pdf.text(`Generated: ${generatedDate}`, pageWidth - 20, 14, { align: "right" });
      pdf.text(`Period: ${startDate} to ${endDate}`, pageWidth - 20, 20, { align: "right" });
      pdf.text(`Rate: ₱${rate.toFixed(2)} per kWh`, pageWidth - 20, 26, { align: "right" });

      yPos = 44;
      drawSectionHeader(pdf, "Summary Highlights", yPos);
      yPos += 10;

      drawMetricCard(pdf, 20, yPos, 54, "Total Today", `${totalKWh.toFixed(3)} kWh`, [37, 99, 235]);
      drawMetricCard(pdf, 78, yPos, 54, "Estimated Cost", `₱${totalCost.toFixed(2)}`, [5, 150, 105]);
      drawMetricCard(pdf, 136, yPos, 54, "Active Nodes", `${nodeSummaries.length}`, [124, 58, 237]);

      yPos += 33;
      pdf.setTextColor(31, 41, 55);
      pdf.setFontSize(10);
      pdf.text("This report summarizes latest node-level readings, estimated daily consumption, and threshold alerts.", 20, yPos);

      if (includeNodeTable) {
        yPos += 10;
        drawSectionHeader(pdf, "Node Details", yPos);

        yPos += 10;
        pdf.setFontSize(10);

        const headers = ["Node", "Appliance", "kWh Today", "Current Power", "Est. Cost", "Device ID"];
        const colWidths = [15, 40, 25, 28, 25, 37];
        let xPos = 20;

        pdf.setFillColor(37, 99, 235);
        pdf.rect(20, yPos - 5, pageWidth - 40, 8, "F");
        pdf.setTextColor(255, 255, 255);

        headers.forEach((header, index) => {
          pdf.text(header, xPos, yPos);
          xPos += colWidths[index];
        });

        yPos += 8;
        pdf.setTextColor(31, 41, 55);

        nodeSummaries.forEach((node, index) => {
          if (yPos > pageHeight - 30) {
            pdf.addPage();
            yPos = 20;
          }

          xPos = 20;
          const rowData = [
            `Node ${node.nodeId}`,
            node.label,
            `${node.todayKWh.toFixed(3)}`,
            `${Math.round(node.currentPower)} W`,
            `₱${node.estimatedCost.toFixed(2)}`,
            node.deviceId
          ];

          if (index % 2 === 0) {
            pdf.setFillColor(240, 247, 255);
            pdf.rect(20, yPos - 5, pageWidth - 40, 8, "F");
          }

          rowData.forEach((data, valueIndex) => {
            pdf.text(data, xPos, yPos);
            xPos += colWidths[valueIndex];
          });

          yPos += 8;
        });
      }

      if (includeCharts) {
        pdf.addPage();
        yPos = 20;

        drawSectionHeader(pdf, "7-Day Energy Consumption Trend", yPos);
        yPos += 10;
        drawTrendChartPdf(pdf, chartData, nodeSummaries, pageWidth, yPos);
      }

      if (includeAlerts && alerts.length > 0) {
        pdf.addPage();
        yPos = 20;

        drawSectionHeader(pdf, "Recent Alerts", yPos);
        yPos += 10;
        pdf.setFontSize(10);
        pdf.setTextColor(31, 41, 55);

        alerts.forEach((alert) => {
          if (yPos > pageHeight - 30) {
            pdf.addPage();
            yPos = 20;
          }

          pdf.setFillColor(255, 244, 230);
          pdf.roundedRect(20, yPos - 5, pageWidth - 40, 15, 2, 2, "F");
          pdf.setDrawColor(249, 115, 22);
          pdf.setLineWidth(0.8);
          pdf.line(22, yPos - 3, 22, yPos + 8);

          pdf.text(`! ${alert.message}`, 25, yPos);
          yPos += 6;
          pdf.setFontSize(9);
          pdf.setTextColor(75, 85, 99);
          pdf.text(`${alert.timestamp} | ${alert.nodeLabel} | ${alert.value}W / ${alert.threshold}W`, 25, yPos);
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
        pdf.line(20, pageHeight - 14, pageWidth - 20, pageHeight - 14);
        pdf.setFontSize(8);
        pdf.setTextColor(71, 85, 105);
        pdf.text(`Page ${index} of ${pageCount} • Data Source: ${API_BASE}`, pageWidth / 2, pageHeight - 9, {
          align: "center"
        });
      }

      pdf.save(`energy-report-${startDate}-to-${endDate}.pdf`);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Reports & Export</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Generate and export energy consumption reports</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
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
                Date Range
              </div>
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="start-date" className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Start Date
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-950 dark:text-gray-100"
                />
              </div>
              
              <div>
                <label htmlFor="end-date" className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                  End Date
                </label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-950 dark:text-gray-100"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Data visualization always uses latest 7-day backend data.</p>
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
                  <div className="text-sm text-gray-600 dark:text-gray-400">Include 7-day energy consumption trend chart</div>
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
              {isGenerating ? 'Generating PDF...' : 'Generate PDF Report'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Report Preview</h2>

        <div className="space-y-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Total Consumption</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{totalKWh.toFixed(3)} kWh</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Estimated Cost</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">₱{totalCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Rate</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">₱{rate.toFixed(2)}/kWh</p>
              </div>
            </div>
          </div>

          {includeCharts && (
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">7-Day Trend Chart</h3>
              <div id="report-chart" className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis label={{ value: 'kWh', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }} />
                      <Legend />
                      <Line type="monotone" dataKey="node1" stroke="#9333ea" strokeWidth={2} name={`Node 1 (${nodeSummaries[0]?.label || "Node 1"})`} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="node2" stroke="#f97316" strokeWidth={2} name={`Node 2 (${nodeSummaries[1]?.label || "Node 2"})`} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="node3" stroke="#06b6d4" strokeWidth={2} name={`Node 3 (${nodeSummaries[2]?.label || "Node 3"})`} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {includeNodeTable && (
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Node Details</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 dark:border-gray-700 rounded-lg">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">Node</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">Appliance</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">kWh Today</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">Current Power</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">Est. Cost</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">Device ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nodeSummaries.map((node, index) => (
                      <tr key={node.applianceId} className={index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">Node {node.nodeId}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">{node.label}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">{node.todayKWh.toFixed(3)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">{Math.round(node.currentPower)} W</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">₱{node.estimatedCost.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">{node.deviceId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {includeAlerts && alerts.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Recent Alerts</h3>
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div key={alert.id} className="p-3 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{alert.message}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {alert.timestamp} • {alert.nodeLabel} • {alert.value}W / {alert.threshold}W
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
