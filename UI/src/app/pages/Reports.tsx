import { useEffect, useState } from 'react';
import { FileText, Download, Calendar, Image as ImageIcon, Table, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { defaultMonth, fetchReportsViewData } from '../utils/mockData';
import type { Alert, DailyData, NodeSummary } from '../utils/mockData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import MonthPicker from '../components/MonthPicker';

type ViewMode = '7-day' | 'whole-month';

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
      } catch (error) {
        toast.error(`Failed to load report data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [selectedMonth, viewMode]);
  
  const totalKWh = nodeSummaries.reduce((sum, node) => sum + node.monthKWh, 0);
  const totalCost = totalKWh * rate;
  
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
      let yPos = 20;
      let chartSnapshotUnavailable = false;
      
      // Title
      pdf.setFontSize(20);
      pdf.text('Energy Report', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 10;
      pdf.setFontSize(10);
      const generatedDate = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
      pdf.text(`Generated: ${generatedDate}`, pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 8;
      pdf.text(`Period: ${selectedMonthLabel}`, pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 6;
      pdf.text(`View: ${viewMode === '7-day' ? '7-Day Trend' : 'Whole Month'}`, pageWidth / 2, yPos, { align: 'center' });
      
      // Summary
      yPos += 15;
      pdf.setFontSize(14);
      pdf.text('Summary', 20, yPos);
      
      yPos += 10;
      pdf.setFontSize(10);
      pdf.text(`Total: ${totalKWh.toFixed(2)} kWh | Cost: PHP ${totalCost.toFixed(2)} | Rate: PHP ${rate.toFixed(2)}/kWh`, 20, yPos);
      
      // Node Table
      if (includeNodeTable) {
        yPos += 15;
        pdf.setFontSize(14);
        pdf.text('Devices', 20, yPos);
        
        yPos += 8;
        pdf.setFontSize(9);
        
        nodeSummaries.forEach((node) => {
          if (yPos > pageHeight - 30) {
            pdf.addPage();
            yPos = 20;
          }
          
          pdf.text(`${node.label}: ${node.monthKWh.toFixed(2)} kWh, ${Math.round(node.currentPower)} W, PHP ${node.monthEstimatedCost.toFixed(2)}`, 20, yPos);
          yPos += 6;
        });
      }
      
      // Chart
      if (includeCharts) {
        pdf.addPage();
        yPos = 20;
        
        pdf.setFontSize(14);
        pdf.text(viewMode === '7-day' ? '7-Day Trend' : 'Whole Month Trend', 20, yPos);
        
        yPos += 10;
        
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
            const imgWidth = pageWidth - 40;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 20, yPos, imgWidth, Math.min(imgHeight, 120));
          } catch (chartError) {
            chartSnapshotUnavailable = true;
            console.error('Chart snapshot failed:', chartError);
            pdf.setFontSize(10);
            pdf.text('Chart snapshot could not be captured in this browser. Summary data is included.', 20, yPos);
          }
        } else {
          chartSnapshotUnavailable = true;
          pdf.setFontSize(10);
          pdf.text('Chart is unavailable for snapshot. Summary data is included.', 20, yPos);
        }
      }
      
      // Alerts
      if (includeAlerts && alerts.length > 0) {
        pdf.addPage();
        yPos = 20;
        
        pdf.setFontSize(14);
        pdf.text('Alerts', 20, yPos);
        
        yPos += 10;
        pdf.setFontSize(9);
        
        alerts.forEach((alert) => {
          if (yPos > pageHeight - 30) {
            pdf.addPage();
            yPos = 20;
          }
          
          pdf.text(`${alert.message} - ${alert.timestamp}`, 20, yPos);
          yPos += 6;
        });
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
                <span className="text-sm font-medium text-gray-900">Alerts</span>
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
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Summary</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-600">Total</p>
                <p className="text-lg font-bold text-gray-900">{totalKWh.toFixed(1)}</p>
                <p className="text-xs text-gray-600">kWh</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Cost</p>
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
                      <span className="text-xs text-gray-600">Month Cost:</span>
                      <span className="text-sm font-bold text-blue-600">₱{node.monthEstimatedCost.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Alerts */}
          {includeAlerts && alerts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Alerts ({alerts.length})</h3>
              <div className="space-y-2">
                {alerts.slice(0, 2).map((alert) => (
                  <div key={alert.id} className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
                    <p className="text-xs font-medium text-gray-900">{alert.message}</p>
                    <p className="text-xs text-gray-600 mt-1">{alert.nodeLabel} • {alert.value}W</p>
                  </div>
                ))}
                {alerts.length > 2 && (
                  <p className="text-xs text-gray-500 text-center">+{alerts.length - 2} more</p>
                )}
              </div>
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
