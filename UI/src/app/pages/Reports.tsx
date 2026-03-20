import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Calendar, Download, FileText, Image as ImageIcon, RefreshCw, Table } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { API_BASE, fetchDashboardData } from "../utils/mockData";
import type { Alert, DailyData, NodeSummary } from "../utils/mockData";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function isoDate(daysFromToday: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
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
      const savedRate = Number(window.localStorage.getItem("electricityRate") || "11.5");
      const currentRate = Number.isFinite(savedRate) && savedRate >= 0 ? savedRate : 11.5;
      setRate(currentRate);

      const dashboardData = await fetchDashboardData(currentRate);
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
    setIsGenerating(true);
    toast.info("Generating PDF report...");

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPos = 20;

      pdf.setFontSize(24);
      pdf.text("Energy Monitoring Report", pageWidth / 2, yPos, { align: "center" });

      yPos += 15;
      pdf.setFontSize(12);
      pdf.text("IoT-Based Household Energy Dashboard", pageWidth / 2, yPos, { align: "center" });

      yPos += 10;
      pdf.setFontSize(10);
      const generatedDate = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
      pdf.text(`Generated: ${generatedDate}`, pageWidth / 2, yPos, { align: "center" });

      yPos += 8;
      pdf.text(`Report Period: ${startDate} to ${endDate}`, pageWidth / 2, yPos, { align: "center" });

      yPos += 8;
      pdf.text("Timezone: PHT (UTC+8)", pageWidth / 2, yPos, { align: "center" });

      yPos += 8;
      pdf.text(`Electricity Rate: ₱${rate.toFixed(2)} per kWh`, pageWidth / 2, yPos, { align: "center" });

      yPos += 20;
      pdf.setFontSize(16);
      pdf.text("Summary", 20, yPos);

      yPos += 10;
      pdf.setFontSize(11);
      pdf.text(`Total Consumption (Today): ${totalKWh.toFixed(3)} kWh`, 20, yPos);

      yPos += 8;
      pdf.text(`Estimated Total Cost: ₱${totalCost.toFixed(2)}`, 20, yPos);

      if (includeNodeTable) {
        yPos += 15;
        pdf.setFontSize(16);
        pdf.text("Node Details", 20, yPos);

        yPos += 10;
        pdf.setFontSize(10);

        const headers = ["Node", "Appliance", "kWh Today", "Current Power", "Est. Cost", "Device ID"];
        const colWidths = [15, 40, 25, 28, 25, 37];
        let xPos = 20;

        pdf.setFillColor(240, 240, 240);
        pdf.rect(20, yPos - 5, pageWidth - 40, 8, "F");

        headers.forEach((header, index) => {
          pdf.text(header, xPos, yPos);
          xPos += colWidths[index];
        });

        yPos += 8;

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
            pdf.setFillColor(250, 250, 250);
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

        pdf.setFontSize(16);
        pdf.text("7-Day Energy Consumption Trend", 20, yPos);
        yPos += 10;

        const chartElement = document.getElementById("report-chart");
        if (chartElement) {
          const canvas = await html2canvas(chartElement, {
            backgroundColor: "#ffffff",
            scale: 2
          });
          const imgData = canvas.toDataURL("image/png");
          const imgWidth = pageWidth - 40;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          pdf.addImage(imgData, "PNG", 20, yPos, imgWidth, imgHeight);
        }
      }

      if (includeAlerts && alerts.length > 0) {
        pdf.addPage();
        yPos = 20;

        pdf.setFontSize(16);
        pdf.text("Recent Alerts", 20, yPos);
        yPos += 10;
        pdf.setFontSize(10);

        alerts.forEach((alert) => {
          if (yPos > pageHeight - 30) {
            pdf.addPage();
            yPos = 20;
          }

          pdf.setFillColor(255, 247, 237);
          pdf.rect(20, yPos - 5, pageWidth - 40, 15, "F");

          pdf.text(`! ${alert.message}`, 25, yPos);
          yPos += 6;
          pdf.setFontSize(9);
          pdf.text(`${alert.timestamp} | ${alert.nodeLabel} | ${alert.value}W / ${alert.threshold}W`, 25, yPos);
          pdf.setFontSize(10);
          yPos += 12;
        });
      }

      const pageCount = pdf.internal.pages.length - 1;
      for (let index = 1; index <= pageCount; index += 1) {
        pdf.setPage(index);
        pdf.setFontSize(8);
        pdf.text(`Page ${index} of ${pageCount} • Data Source: ${API_BASE}`, pageWidth / 2, pageHeight - 10, {
          align: "center"
        });
      }

      pdf.save(`energy-report-${startDate}-to-${endDate}.pdf`);
      toast.success("PDF report generated");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF report");
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
        <div className="flex items-center gap-2 mb-6">
          <FileText className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Export Settings</h2>
          <button
            type="button"
            onClick={loadData}
            className="ml-auto inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Data
          </button>
        </div>

        {errorMessage && <p className="text-sm text-red-600 mb-4">API error: {errorMessage}</p>}
        {isLoading && <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Loading latest report data...</p>}

        <div className="space-y-6 max-w-2xl">
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
              disabled={isGenerating || isLoading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
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
