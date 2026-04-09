import { useEffect, useState } from 'react';
import { FileText, Download, Calendar, Image as ImageIcon, Table, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { defaultMonth, fetchReportsViewData } from '../utils/mockData';
import type { Alert, CombinedMetrics, DailyData, NodeSummary } from '../utils/mockData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import MonthPicker from '../components/MonthPicker';

type ViewMode = '7-day' | 'whole-month';

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

export default function Reports() {
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth());
  const [viewMode, setViewMode] = useState<ViewMode>('7-day');
  const [includeCharts, setIncludeCharts] = useState<boolean>(true);
  const [includeNodeTable, setIncludeNodeTable] = useState<boolean>(true);
  const [includeAlerts, setIncludeAlerts] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [rate, setRate] = useState<number>(11.5);
  const [nodeSummaries, setNodeSummaries] = useState<NodeSummary[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [chartData, setChartData] = useState<DailyData[]>([]);
  const [combinedMetrics, setCombinedMetrics] = useState<CombinedMetrics>(EMPTY_COMBINED_METRICS);
  
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchReportsViewData({
          selectedMonth,
          viewMode
        });
        setRate(data.rate);
        setNodeSummaries(data.nodeSummaries);
        setAlerts(data.alerts);
        setChartData(data.chartData);
        setCombinedMetrics(data.combinedMetrics);
      } catch (error) {
        toast.error(`Failed to load report data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [selectedMonth, viewMode]);
  
  const totalKWh = combinedMetrics.monthKWh;
  const totalCost = combinedMetrics.monthCost;
  const thresholdStatusText = combinedMetrics.overThreshold
    ? `Combined load is ${Math.round(Math.abs(combinedMetrics.remainingThresholdW))}W above the total threshold.`
    : `Combined load is within the total threshold with ${Math.round(combinedMetrics.remainingThresholdW)}W remaining.`;
  
  const selectedMonthLabel = new Date(selectedMonth + '-01').toLocaleDateString('en-PH', { 
    month: 'long', 
    year: 'numeric' 
  });
  
  const handleGeneratePDF = async () => {
    const hasRenderableData = chartData.length > 0 || nodeSummaries.length > 0;

    if (isLoading && !hasRenderableData) {
      toast.info('Still loading latest data. Please try again in a moment.');
      return;
    }

    setIsGenerating(true);
    toast.info('Generating PDF...');
    
    try {
      const jsPdfModule = await import('jspdf');
      const JsPdfCtor =
        jsPdfModule.jsPDF ||
        (jsPdfModule.default as { jsPDF?: typeof jsPdfModule.jsPDF } | undefined)?.jsPDF ||
        (jsPdfModule.default as unknown as typeof jsPdfModule.jsPDF);

      if (typeof JsPdfCtor !== 'function') {
        throw new Error('jsPDF constructor is unavailable in this browser build.');
      }

      const pdf = new JsPdfCtor('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageMargin = 16;
      const contentWidth = pageWidth - pageMargin * 2;
      let yPos = 18;
      let chartSnapshotUnavailable = false;

      const ensurePageSpace = (requiredHeight: number) => {
        if (yPos + requiredHeight <= pageHeight - 16) {
          return;
        }

        pdf.addPage();
        yPos = 20;
      };

      const drawSectionTitle = (title: string, subtitle?: string) => {
        ensurePageSpace(subtitle ? 16 : 10);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.setTextColor(15, 23, 42);
        pdf.text(title, pageMargin, yPos);

        if (subtitle) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(100, 116, 139);
          pdf.text(subtitle, pageMargin, yPos + 5);
          yPos += 12;
        } else {
          yPos += 7;
        }

        pdf.setDrawColor(226, 232, 240);
        pdf.line(pageMargin, yPos, pageWidth - pageMargin, yPos);
        yPos += 6;
      };

      const drawMetricCard = (x: number, y: number, label: string, value: string, accent: [number, number, number]) => {
        const cardWidth = (contentWidth - 6) / 2;
        const cardHeight = 26;
        const labelLines = pdf.splitTextToSize(label, cardWidth - 12);

        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'FD');
        pdf.setFillColor(accent[0], accent[1], accent[2]);
        pdf.roundedRect(x, y, 4, cardHeight, 3, 3, 'F');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text(labelLines, x + 8, y + 6.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(15, 23, 42);
        pdf.text(value, x + 8, y + 20.5);
      };

      pdf.setFillColor(15, 23, 42);
      pdf.roundedRect(pageMargin, yPos, contentWidth, 30, 5, 5, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Energy Consumption Report', pageMargin + 6, yPos + 11);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      const generatedDate = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
      pdf.text(`Generated: ${generatedDate}`, pageMargin + 6, yPos + 19);
      pdf.text(`Period: ${selectedMonthLabel}`, pageMargin + 6, yPos + 25);
      pdf.text(`View: ${viewMode === '7-day' ? '7-Day Trend' : 'Whole Month'}`, pageWidth - pageMargin - 6, yPos + 25, {
        align: 'right',
      });

      yPos += 38;
      drawSectionTitle('Summary Snapshot', 'Combined totals for the three monitored appliances');

      const cardGap = 6;
      const firstColumnX = pageMargin;
      const secondColumnX = pageMargin + ((contentWidth - cardGap) / 2) + cardGap;
      drawMetricCard(firstColumnX, yPos, 'Today Total', `${combinedMetrics.todayKWh.toFixed(2)} kWh`, [59, 130, 246]);
      drawMetricCard(secondColumnX, yPos, 'Month Total', `${totalKWh.toFixed(2)} kWh`, [37, 99, 235]);
      yPos += 30;
      drawMetricCard(firstColumnX, yPos, 'Total Estimated Cost This Month', `PHP ${totalCost.toFixed(2)}`, [14, 165, 233]);
      drawMetricCard(secondColumnX, yPos, 'Rate', `PHP ${rate.toFixed(2)}/kWh`, [99, 102, 241]);
      yPos += 30;
      drawMetricCard(firstColumnX, yPos, 'Total Threshold', `${Math.round(combinedMetrics.totalThresholdW)} W`, [245, 158, 11]);
      drawMetricCard(secondColumnX, yPos, 'Current Load', `${Math.round(combinedMetrics.currentPowerW)} W`, [249, 115, 22]);
      yPos += 32;

      ensurePageSpace(14);
      pdf.setFillColor(combinedMetrics.overThreshold ? 254 : 220, combinedMetrics.overThreshold ? 226 : 252, combinedMetrics.overThreshold ? 226 : 231);
      pdf.setDrawColor(combinedMetrics.overThreshold ? 248 : 134, combinedMetrics.overThreshold ? 113 : 239, combinedMetrics.overThreshold ? 113 : 172);
      pdf.roundedRect(pageMargin, yPos, contentWidth, 12, 3, 3, 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(combinedMetrics.overThreshold ? 153 : 22, combinedMetrics.overThreshold ? 27 : 101, combinedMetrics.overThreshold ? 27 : 52);
      pdf.text(
        combinedMetrics.overThreshold
          ? `Threshold Status: Over by ${Math.round(Math.abs(combinedMetrics.remainingThresholdW))}W`
          : `Threshold Status: Within limit with ${Math.round(combinedMetrics.remainingThresholdW)}W remaining`,
        pageMargin + 4,
        yPos + 7.5
      );
      yPos += 18;

      if (includeNodeTable) {
        drawSectionTitle('Devices', 'Monthly totals, current load, and cost estimates per appliance');

        nodeSummaries.forEach((node, index) => {
          ensurePageSpace(24);
          const accent =
            index === 0 ? [243, 232, 255] : index === 1 ? [255, 237, 213] : [207, 250, 254];

          pdf.setFillColor(accent[0], accent[1], accent[2]);
          pdf.setDrawColor(226, 232, 240);
          pdf.roundedRect(pageMargin, yPos, contentWidth, 22, 3, 3, 'FD');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.setTextColor(15, 23, 42);
          pdf.text(node.label, pageMargin + 4, yPos + 6);
          pdf.text(`${node.monthKWh.toFixed(2)} kWh`, pageWidth - pageMargin - 4, yPos + 6, { align: 'right' });
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8.5);
          pdf.setTextColor(71, 85, 105);
          pdf.text(`Current Load: ${Math.round(node.currentPower)}W`, pageMargin + 4, yPos + 11.5);
          pdf.text(`Today: ${node.todayKWh.toFixed(2)} kWh`, pageMargin + 56, yPos + 11.5);
          pdf.text(`Estimated Cost This Month: PHP ${node.monthEstimatedCost.toFixed(2)}`, pageMargin + 4, yPos + 17);
          yPos += 26;
        });
      }

      if (includeCharts) {
        pdf.addPage();
        yPos = 20;

        drawSectionTitle(
          viewMode === '7-day' ? '7-Day Trend' : 'Whole Month Trend',
          'Consumption trend for the three monitored appliances and their combined total'
        );

        const chartElement = document.getElementById('report-chart');
        if (chartElement) {
          try {
            const html2canvasModule = await import('html2canvas');
            const html2canvas =
              html2canvasModule.default ||
              (html2canvasModule as unknown as (target: HTMLElement, options?: object) => Promise<HTMLCanvasElement>);

            const canvas = await html2canvas(chartElement, {
              backgroundColor: '#ffffff',
              scale: 2,
              useCORS: true,
              logging: false,
            });
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = contentWidth - 8;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const renderedHeight = Math.min(imgHeight, 120);
            pdf.setFillColor(255, 255, 255);
            pdf.setDrawColor(226, 232, 240);
            pdf.roundedRect(pageMargin, yPos, contentWidth, renderedHeight + 8, 4, 4, 'FD');
            pdf.addImage(imgData, 'PNG', pageMargin + 4, yPos + 4, imgWidth, renderedHeight);
            yPos += renderedHeight + 14;
          } catch (chartError) {
            chartSnapshotUnavailable = true;
            console.error('Chart snapshot failed:', chartError);
            pdf.setFillColor(255, 247, 237);
            pdf.setDrawColor(253, 186, 116);
            pdf.roundedRect(pageMargin, yPos, contentWidth, 14, 3, 3, 'FD');
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            pdf.setTextColor(154, 52, 18);
            pdf.text('Chart snapshot could not be captured in this browser. Summary data is included.', pageMargin + 4, yPos + 8.5);
          }
        } else {
          chartSnapshotUnavailable = true;
          pdf.setFillColor(255, 247, 237);
          pdf.setDrawColor(253, 186, 116);
          pdf.roundedRect(pageMargin, yPos, contentWidth, 14, 3, 3, 'FD');
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.setTextColor(154, 52, 18);
          pdf.text('Chart is unavailable for snapshot. Summary data is included.', pageMargin + 4, yPos + 8.5);
        }
      }

      if (includeAlerts) {
        pdf.addPage();
        yPos = 20;

        drawSectionTitle('Threshold Status', 'Combined alerting only triggers when the three-device total exceeds the total threshold');

        if (alerts.length === 0) {
          pdf.setFillColor(220, 252, 231);
          pdf.setDrawColor(134, 239, 172);
          pdf.roundedRect(pageMargin, yPos, contentWidth, 16, 3, 3, 'FD');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.setTextColor(22, 101, 52);
          pdf.text('No active combined-threshold alert', pageMargin + 4, yPos + 6.5);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.text(thresholdStatusText, pageMargin + 4, yPos + 12);
        } else {
          alerts.forEach((alert) => {
            ensurePageSpace(20);
            pdf.setFillColor(254, 242, 242);
            pdf.setDrawColor(252, 165, 165);
            pdf.roundedRect(pageMargin, yPos, contentWidth, 18, 3, 3, 'FD');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.setTextColor(153, 27, 27);
            pdf.text(alert.message, pageMargin + 4, yPos + 6.5);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(9);
            pdf.text(`${alert.nodeLabel}: ${alert.value}W / ${alert.threshold}W`, pageMargin + 4, yPos + 12);
            pdf.text(alert.timestamp, pageWidth - pageMargin - 4, yPos + 12, { align: 'right' });
            yPos += 22;
          });
        }
      }
      
      pdf.save(`energy-report-${selectedMonth}-${viewMode}.pdf`);
      if (chartSnapshotUnavailable) {
        toast.success('PDF generated. Chart snapshot was skipped.');
      } else {
        toast.success('PDF generated!');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="px-1">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-600 mt-1">Export energy consumption data</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        {/* Export Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">PDF Export</h2>
        </div>
        
        <div className="space-y-4">
          {/* Billing Month */}
          <div>
            <label htmlFor="billing-month-picker" className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Billing Month
              </div>
            </label>
            <MonthPicker
              id="billing-month-picker"
              value={selectedMonth}
              onChange={setSelectedMonth}
              minYear={2020}
              maxYear={2035}
            />
          </div>
          
          {/* View Mode */}
          <div>
            <label htmlFor="view-mode" className="block text-sm font-medium text-gray-700 mb-2">
              View Mode
            </label>
            <select
              id="view-mode"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-h-[48px]"
            >
              <option value="7-day">7-Day Trend</option>
              <option value="whole-month">Whole Month</option>
            </select>
          </div>
          
          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Include in Report
            </label>
            
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer active:bg-gray-100 min-h-[48px]">
                <input
                  type="checkbox"
                  checked={includeCharts}
                  onChange={(e) => setIncludeCharts(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <ImageIcon className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Charts</span>
              </label>
              
              <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer active:bg-gray-100 min-h-[48px]">
                <input
                  type="checkbox"
                  checked={includeNodeTable}
                  onChange={(e) => setIncludeNodeTable(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <Table className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Device Details</span>
              </label>
              
              <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer active:bg-gray-100 min-h-[48px]">
                <input
                  type="checkbox"
                  checked={includeAlerts}
                  onChange={(e) => setIncludeAlerts(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <AlertTriangle className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Threshold Alerts</span>
              </label>
            </div>
          </div>
          
          <button
            onClick={handleGeneratePDF}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium active:bg-blue-700 transition-colors disabled:bg-gray-400 min-h-[48px]"
          >
            <Download className="w-5 h-5" />
            {isGenerating ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Preview</h2>
          <p className="text-xs text-gray-600">{selectedMonthLabel} • {viewMode === '7-day' ? '7-Day Trend' : 'Whole Month'}</p>
        </div>
        
        <div className="space-y-4">
          {isLoading && (
            <p className="text-xs text-gray-500">Loading live report data...</p>
          )}

          {/* Summary */}
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-blue-50 to-white p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Summary</h3>
                <p className="mt-1 text-xs text-gray-600">Combined totals for the three monitored appliances</p>
              </div>
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                {viewMode === '7-day' ? '7-Day View' : 'Whole Month'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-600">Today Total</p>
                <p className="text-lg font-bold text-gray-900">{combinedMetrics.todayKWh.toFixed(1)}</p>
                <p className="text-xs text-gray-600">kWh</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Month Total</p>
                <p className="text-lg font-bold text-gray-900">{totalKWh.toFixed(1)}</p>
                <p className="text-xs text-gray-600">kWh</p>
              </div>
              <div>
                <p className="mx-auto flex min-h-[2rem] items-center justify-center text-[11px] leading-tight text-gray-600">
                  Total Estimated Cost This Month
                </p>
                <p className="text-lg font-bold text-gray-900">₱{totalCost.toFixed(0)}</p>
                <p className="text-xs text-gray-600">PHP</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Rate</p>
                <p className="text-lg font-bold text-gray-900">₱{rate.toFixed(1)}</p>
                <p className="text-xs text-gray-600">/kWh</p>
              </div>
            </div>
          </div>

          <div
            className={`rounded-xl border p-4 ${
              combinedMetrics.overThreshold ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Total Threshold Status</h3>
                <p className="mt-1 text-xs text-gray-600">
                  One appliance may exceed its own threshold as long as the combined load stays within the total threshold.
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  combinedMetrics.overThreshold ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {combinedMetrics.overThreshold ? 'Over Threshold' : 'Within Threshold'}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
              <div>
                <p className="text-xs text-gray-600">Total Threshold</p>
                <p className="text-lg font-bold text-gray-900">{Math.round(combinedMetrics.totalThresholdW)}</p>
                <p className="text-xs text-gray-600">W</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Current Load</p>
                <p className="text-lg font-bold text-gray-900">{Math.round(combinedMetrics.currentPowerW)}</p>
                <p className="text-xs text-gray-600">W</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">{combinedMetrics.overThreshold ? 'Exceeded By' : 'Remaining'}</p>
                <p className="text-lg font-bold text-gray-900">{Math.round(Math.abs(combinedMetrics.remainingThresholdW))}</p>
                <p className="text-xs text-gray-600">W</p>
              </div>
            </div>
            <p className="mt-3 text-xs font-medium text-gray-700">{thresholdStatusText}</p>
          </div>
          
          {/* Chart */}
          {includeCharts && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {viewMode === '7-day' ? '7-Day Trend' : 'Whole Month Trend'}
              </h3>
              <div id="report-chart" className="bg-white p-3 rounded-xl border border-gray-200">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10 }} 
                        tickMargin={5}
                        interval={viewMode === 'whole-month' ? 'preserveStartEnd' : 0}
                      />
                      <YAxis tick={{ fontSize: 10 }} width={35} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '11px'
                        }}
                      />
                      <Line 
                        id="report-node1-line"
                        type="monotone" 
                        dataKey="node1" 
                        stroke="#9333ea" 
                        strokeWidth={2} 
                        dot={false}
                        name={nodeSummaries[0]?.label || "Node 1"}
                      />
                      <Line 
                        id="report-node2-line"
                        type="monotone" 
                        dataKey="node2" 
                        stroke="#f97316" 
                        strokeWidth={2} 
                        dot={false}
                        name={nodeSummaries[1]?.label || "Node 2"}
                      />
                      <Line 
                        id="report-node3-line"
                        type="monotone" 
                        dataKey="node3" 
                        stroke="#06b6d4" 
                        strokeWidth={2} 
                        dot={false}
                        name={nodeSummaries[2]?.label || "Node 3"}
                      />
                      <Line 
                        id="report-total-line"
                        type="monotone" 
                        dataKey="total" 
                        stroke="#1f2937" 
                        strokeWidth={2.5}
                        dot={false}
                        strokeDasharray="5 5"
                        name="Total"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
          
          {/* Devices */}
          {includeNodeTable && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Devices</h3>
              <div className="space-y-2">
                {nodeSummaries.map((node, index) => (
                  <div key={node.nodeId} className={`p-3 rounded-xl ${
                    index === 0 ? 'bg-purple-50 border border-purple-200' :
                    index === 1 ? 'bg-orange-50 border border-orange-200' :
                    'bg-cyan-50 border border-cyan-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900">{node.label}</span>
                      <span className="text-sm font-bold text-gray-900">{node.monthKWh.toFixed(2)} kWh</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Current: {Math.round(node.currentPower)} W</span>
                      <span>Today: {node.todayKWh.toFixed(2)} kWh</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex w-full flex-col gap-1 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                        <span className="leading-tight">Estimated Cost This Month:</span>
                        <span className="text-sm font-bold text-blue-600">₱{node.monthEstimatedCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Alerts */}
          {includeAlerts && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Threshold Alerts ({alerts.length})</h3>
              {alerts.length > 0 ? (
                <div className="space-y-2">
                  {alerts.slice(0, 2).map((alert) => (
                    <div key={alert.id} className="rounded-xl border border-orange-200 bg-orange-50 p-3">
                      <p className="text-xs font-medium text-gray-900">{alert.message}</p>
                      <p className="mt-1 text-xs text-gray-600">{alert.nodeLabel} • {alert.value}W / {alert.threshold}W</p>
                      <p className="mt-1 text-[11px] text-gray-500">{alert.timestamp}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-medium text-emerald-800">No active combined-threshold alert</p>
                  <p className="mt-1 text-xs text-emerald-700">{thresholdStatusText}</p>
                </div>
              )}
            </div>
          )}
          
          {/* No Data States */}
          {!includeCharts && !includeNodeTable && !includeAlerts && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No sections selected</p>
              <p className="text-xs mt-1">Select at least one section to include in the report</p>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
