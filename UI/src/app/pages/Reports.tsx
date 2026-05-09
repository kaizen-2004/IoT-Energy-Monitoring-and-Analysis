import { useEffect, useState } from 'react';
import { FileText, Download, Calendar } from 'lucide-react';
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
    setIsGenerating(true);
    toast.info('Generating one-page PDF...');

    try {
      const [jsPdfModule, pdfReportData] = await Promise.all([
        import('jspdf'),
        fetchReportsViewData({
          selectedMonth,
          viewMode: 'whole-month'
        })
      ]);
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
      const pageMargin = 12;
      const contentWidth = pageWidth - pageMargin * 2;
      const gutter = 6;
      const leftColumnWidth = (contentWidth - gutter) / 2;
      const rightColumnX = pageMargin + leftColumnWidth + gutter;
      const rightColumnWidth = leftColumnWidth;
      const brandBlue = [37, 99, 235];
      const ink = [15, 23, 42];
      const muted = [100, 116, 139];
      const border = [203, 213, 225];
      const softBorder = [226, 232, 240];
      const paper = [248, 250, 252];
      const metrics = pdfReportData.combinedMetrics;
      const exportChartData = pdfReportData.chartData;
      const exportNodeSummaries = pdfReportData.nodeSummaries;
      const exportAlerts = pdfReportData.alerts;
      const exportRate = pdfReportData.rate;
      const generatedDate = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
      const [yearText, monthText] = selectedMonth.split('-');
      const year = Number(yearText);
      const month = Number(monthText);
      const monthStart = new Date(Date.UTC(year, month - 1, 1));
      const monthEnd = new Date(Date.UTC(year, month, 0));
      const reportNumber = `${selectedMonth.replace('-', '')}-${String(exportNodeSummaries.length).padStart(2, '0')}`;

      const formatDate = (date: Date) => date.toLocaleDateString('en-PH', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC'
      });
      const billingPeriod = `${formatDate(monthStart)} to ${formatDate(monthEnd)}`;
      const formatNumber = (value: number, digits = 2) => value.toLocaleString('en-PH', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      });
      const formatPhp = (value: number) => `PHP ${formatNumber(value, 2)}`;
      const formatKWh = (value: number) => `${formatNumber(value, 2)} kWh`;
      const exportThresholdStatusText = metrics.overThreshold
        ? `Combined load is ${Math.round(Math.abs(metrics.remainingThresholdW))}W above the total threshold.`
        : `Combined load is within the total threshold with ${Math.round(metrics.remainingThresholdW)}W remaining.`;

      const setTextColor = (color: number[]) => pdf.setTextColor(color[0], color[1], color[2]);
      const setFillColor = (color: number[]) => pdf.setFillColor(color[0], color[1], color[2]);
      const setDrawColor = (color: number[]) => pdf.setDrawColor(color[0], color[1], color[2]);
      const drawPanel = (x: number, y: number, width: number, height: number, fill: number[], stroke = softBorder, radius = 3) => {
        setFillColor(fill);
        setDrawColor(stroke);
        pdf.setLineWidth(0.25);
        pdf.roundedRect(x, y, width, height, radius, radius, 'FD');
      };
      const truncateText = (text: string, maxWidth: number) => {
        if (pdf.getTextWidth(text) <= maxWidth) {
          return text;
        }

        let value = text;
        while (value.length > 4 && pdf.getTextWidth(`${value}...`) > maxWidth) {
          value = value.slice(0, -1);
        }
        return `${value}...`;
      };
      const drawFittedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number, minFontSize = 9) => {
        let size = fontSize;
        pdf.setFontSize(size);
        while (size > minFontSize && pdf.getTextWidth(text) > maxWidth) {
          size -= 0.5;
          pdf.setFontSize(size);
        }
        pdf.text(text, x, y);
      };
      const drawInfoLine = (label: string, value: string, x: number, y: number, width: number) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.4);
        setTextColor(muted);
        pdf.text(label, x, y);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.8);
        setTextColor(ink);
        pdf.text(truncateText(value, width * 0.68), x + width, y, { align: 'right' });
      };
      const drawEnergyTrend = (x: number, y: number, width: number, height: number) => {
        drawPanel(x, y, width, height, [255, 255, 255], border, 4);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        setTextColor(ink);
        pdf.text('Your monthly consumption', x + 4, y + 8);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.6);
        setTextColor(muted);
        pdf.text(`${selectedMonthLabel} total usage by day`, x + 4, y + 13);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        setTextColor(brandBlue);
        pdf.text(formatKWh(metrics.monthKWh), x + width - 4, y + 8, { align: 'right' });

        const values = exportChartData.map((item) => Math.max(0, item.total));
        if (values.length === 0) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8.5);
          setTextColor(muted);
          pdf.text('No daily consumption data available for this billing month.', x + 4, y + 36);
          return;
        }

        const chartLeft = x + 12;
        const chartRight = x + width - 6;
        const chartTop = y + 21;
        const chartBottom = y + height - 14;
        const chartWidth = chartRight - chartLeft;
        const chartHeight = chartBottom - chartTop;
        const rawMax = Math.max(...values);
        const maxValue = rawMax > 0 ? rawMax * 1.12 : 1;

        pdf.setLineWidth(0.15);
        setDrawColor([226, 232, 240]);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.2);
        setTextColor(muted);
        [0, 0.5, 1].forEach((ratio) => {
          const gridY = chartBottom - chartHeight * ratio;
          pdf.line(chartLeft, gridY, chartRight, gridY);
          pdf.text(formatNumber(maxValue * ratio, 1), x + 3, gridY + 1.7);
        });

        const slotWidth = chartWidth / values.length;
        const barWidth = Math.max(1.3, slotWidth * 0.58);
        setFillColor(brandBlue);
        values.forEach((value, index) => {
          const barHeight = maxValue > 0 ? (value / maxValue) * chartHeight : 0;
          const barX = chartLeft + index * slotWidth + (slotWidth - barWidth) / 2;
          const barY = chartBottom - barHeight;
          if (barHeight > 0) {
            pdf.rect(barX, barY, barWidth, barHeight, 'F');
          }
        });

        const labelIndexes = new Set([0, 7, 14, 21, 28, values.length - 1].filter((index) => index >= 0 && index < values.length));
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.4);
        setTextColor(muted);
        labelIndexes.forEach((index) => {
          const labelX = chartLeft + index * slotWidth + slotWidth / 2;
          pdf.text(String(index + 1), labelX, y + height - 5, { align: 'center' });
        });
      };
      const drawDeviceTable = (x: number, y: number, width: number, height: number) => {
        drawPanel(x, y, width, height, [255, 255, 255], border, 4);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10.5);
        setTextColor(ink);
        pdf.text('Device consumption summary', x + 4, y + 8);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.3);
        setTextColor(muted);
        pdf.text(truncateText('Monthly totals, present load, and estimated cost', width - 8), x + 4, y + 13);

        const headerY = y + 20;
        const applianceX = x + 8;
        const kWhX = x + width * 0.55;
        const currentX = x + width * 0.73;
        const costX = x + width - 4;
        const applianceWidth = kWhX - applianceX - 3;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6.6);
        setTextColor(muted);
        pdf.text('Appliance', x + 4, headerY);
        pdf.text('kWh', kWhX, headerY, { align: 'right' });
        pdf.text('W', currentX, headerY, { align: 'right' });
        pdf.text('Cost PHP', costX, headerY, { align: 'right' });
        setDrawColor(softBorder);
        pdf.line(x + 4, headerY + 2.5, x + width - 4, headerY + 2.5);

        if (exportNodeSummaries.length === 0) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          setTextColor(muted);
          pdf.text('No device data available.', x + 4, headerY + 10);
          return;
        }

        exportNodeSummaries.slice(0, 3).forEach((node, index) => {
          const rowY = headerY + 10 + index * 8.4;
          const accent = index === 0 ? [147, 51, 234] : index === 1 ? [249, 115, 22] : [8, 145, 178];
          setFillColor(accent);
          pdf.roundedRect(x + 4, rowY - 3.5, 2, 5.5, 1, 1, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7.2);
          setTextColor(ink);
          pdf.text(truncateText(node.label, applianceWidth), applianceX, rowY);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7.1);
          setTextColor(ink);
          pdf.text(formatNumber(node.monthKWh, 2), kWhX, rowY, { align: 'right' });
          pdf.text(String(Math.round(node.currentPower)), currentX, rowY, { align: 'right' });
          pdf.text(formatNumber(node.monthEstimatedCost, 2), costX, rowY, { align: 'right' });
        });
      };
      const drawThresholdNotice = (x: number, y: number, width: number, height: number) => {
        const fill = metrics.overThreshold ? [254, 242, 242] : [220, 252, 231];
        const stroke = metrics.overThreshold ? [252, 165, 165] : [134, 239, 172];
        const textColor = metrics.overThreshold ? [153, 27, 27] : [22, 101, 52];
        drawPanel(x, y, width, height, fill, stroke, 4);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.4);
        setTextColor(textColor);
        pdf.text(metrics.overThreshold ? 'Threshold Alert' : 'Threshold Status: Within limit', x + 4, y + 7);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        const detail = metrics.overThreshold && exportAlerts.length > 0
          ? `${exportAlerts.length} active alert(s): ${exportAlerts[0].message}`
          : exportThresholdStatusText;
        const detailLines = pdf.splitTextToSize(detail, width - 8).slice(0, 2);
        pdf.text(detailLines, x + 4, y + 12.5);
      };

      setFillColor([255, 255, 255]);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      setFillColor([239, 246, 255]);
      pdf.rect(0, 0, pageWidth, 5, 'F');

      drawPanel(pageMargin, 12, leftColumnWidth, 40, [255, 255, 255], border, 4);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      setTextColor(brandBlue);
      pdf.text('MONTHLY ENERGY BILL', pageMargin + 5, 20);
      pdf.setFontSize(18);
      setTextColor(ink);
      pdf.text('Energy Consumption Report', pageMargin + 5, 29);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.3);
      setTextColor(muted);
      pdf.text(`Billing Month: ${selectedMonthLabel}`, pageMargin + 5, 37);
      pdf.text(`Generated: ${generatedDate}`, pageMargin + 5, 44);

      drawPanel(rightColumnX, 12, rightColumnWidth, 40, [224, 242, 254], [125, 211, 252], 4);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.2);
      setTextColor([12, 74, 110]);
      pdf.text('Estimated Amount This Month', rightColumnX + 5, 20);
      pdf.setFont('helvetica', 'bold');
      setTextColor(ink);
      drawFittedText(formatPhp(metrics.monthCost), rightColumnX + 5, 34, rightColumnWidth - 10, 22, 13);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      setTextColor([12, 74, 110]);
      pdf.text(`${formatKWh(metrics.monthKWh)} consumed`, rightColumnX + 5, 44);

      drawPanel(pageMargin, 58, leftColumnWidth, 50, [255, 255, 255], border, 4);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10.5);
      setTextColor(ink);
      pdf.text('Report Details', pageMargin + 4, 66);
      drawInfoLine('Report No.', reportNumber, pageMargin + 4, 76, leftColumnWidth - 8);
      drawInfoLine('Billing period', billingPeriod, pageMargin + 4, 84, leftColumnWidth - 8);
      drawInfoLine('Meter source', 'IoT energy monitor', pageMargin + 4, 92, leftColumnWidth - 8);
      drawInfoLine('Monitored devices', String(exportNodeSummaries.length), pageMargin + 4, 100, leftColumnWidth - 8);

      drawPanel(rightColumnX, 58, rightColumnWidth, 50, paper, border, 4);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10.5);
      setTextColor(ink);
      pdf.text('Bill Computation Summary', rightColumnX + 4, 66);
      drawInfoLine('Today consumption', formatKWh(metrics.todayKWh), rightColumnX + 4, 76, rightColumnWidth - 8);
      drawInfoLine('Monthly consumption', formatKWh(metrics.monthKWh), rightColumnX + 4, 84, rightColumnWidth - 8);
      drawInfoLine('Rate per kWh', formatPhp(exportRate), rightColumnX + 4, 92, rightColumnWidth - 8);
      drawInfoLine('Energy charge', formatPhp(metrics.monthCost), rightColumnX + 4, 100, rightColumnWidth - 8);

      drawEnergyTrend(pageMargin, 114, contentWidth, 78);

      drawPanel(pageMargin, 198, leftColumnWidth, 49, paper, border, 4);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10.5);
      setTextColor(ink);
      pdf.text('Load Status', pageMargin + 4, 206);
      drawInfoLine('Current load', `${Math.round(metrics.currentPowerW)} W`, pageMargin + 4, 216, leftColumnWidth - 8);
      drawInfoLine('Total threshold', `${Math.round(metrics.totalThresholdW)} W`, pageMargin + 4, 224, leftColumnWidth - 8);
      drawInfoLine(metrics.overThreshold ? 'Exceeded by' : 'Remaining', `${Math.round(Math.abs(metrics.remainingThresholdW))} W`, pageMargin + 4, 232, leftColumnWidth - 8);
      drawInfoLine('Alert count', String(exportAlerts.length), pageMargin + 4, 240, leftColumnWidth - 8);

      drawDeviceTable(rightColumnX, 198, rightColumnWidth, 49);
      drawThresholdNotice(pageMargin, 254, contentWidth, 20);

      setDrawColor(softBorder);
      pdf.line(pageMargin, pageHeight - 14, pageWidth - pageMargin, pageHeight - 14);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.2);
      setTextColor(muted);
      pdf.text('IoT Energy Monitor', pageMargin, pageHeight - 8);
      pdf.text('One-page monthly energy report | Page 1 of 1', pageWidth - pageMargin, pageHeight - 8, { align: 'right' });

      pdf.save(`energy-report-${selectedMonth}-whole-month.pdf`);
      toast.success('One-page PDF generated!');
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
          
          {/* Preview View Mode */}
          <div>
            <label htmlFor="view-mode" className="block text-sm font-medium text-gray-700 mb-2">
              Preview View Mode
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
          
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
            <p className="text-sm font-medium text-blue-900">One-page bill export</p>
            <p className="mt-1 text-xs leading-relaxed text-blue-700">
              The PDF always includes the whole-month trend graph, summary, devices, and threshold status.
              The view mode above only changes this on-screen preview.
            </p>
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
           
          {/* Devices */}
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
           
          {/* Alerts */}
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
        </div>
        </div>
      </div>
    </div>
  );
}
