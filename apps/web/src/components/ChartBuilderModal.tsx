import React, { useState, useEffect, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line, Pie, Doughnut, Scatter } from "react-chartjs-2";
import { cn } from "../design-system/utils/cn";
import {
  XMarkIcon,
  ChartBarIcon,
  ChartPieIcon,
  ArrowTrendingUpIcon,
  TableCellsIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  DocumentDuplicateIcon,
  PlusIcon,
  TrashIcon,
  SparklesIcon,
  Cog6ToothIcon,
  EyeIcon,
  PaintBrushIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

export type ChartType =
  | "bar"
  | "line"
  | "pie"
  | "doughnut"
  | "scatter"
  | "histogram"
  | "stacked";

interface ChartTypeOption {
  id: ChartType;
  name: string;
  icon: React.ReactNode;
  description: string;
}

const CHART_TYPES: ChartTypeOption[] = [
  {
    id: "bar",
    name: "Bar Chart",
    icon: <ChartBarIcon className="w-5 h-5" />,
    description: "Compare values across categories",
  },
  {
    id: "line",
    name: "Line Chart",
    icon: <ArrowTrendingUpIcon className="w-5 h-5" />,
    description: "Show trends over time",
  },
  {
    id: "pie",
    name: "Pie Chart",
    icon: <ChartPieIcon className="w-5 h-5" />,
    description: "Show proportions of a whole",
  },
  {
    id: "doughnut",
    name: "Doughnut",
    icon: <ChartPieIcon className="w-5 h-5" />,
    description: "Pie with center cutout",
  },
  {
    id: "scatter",
    name: "Scatter Plot",
    icon: <SparklesIcon className="w-5 h-5" />,
    description: "Show relationships between variables",
  },
  {
    id: "histogram",
    name: "Histogram",
    icon: <ChartBarIcon className="w-5 h-5" />,
    description: "Distribution of values",
  },
  {
    id: "stacked",
    name: "Stacked Bar",
    icon: <ChartBarIcon className="w-5 h-5" />,
    description: "Compare parts of a whole",
  },
];

const DEFAULT_COLORS = [
  "rgba(59, 130, 246, 0.8)", // blue
  "rgba(16, 185, 129, 0.8)", // green
  "rgba(245, 158, 11, 0.8)", // amber
  "rgba(239, 68, 68, 0.8)", // red
  "rgba(139, 92, 246, 0.8)", // purple
  "rgba(236, 72, 153, 0.8)", // pink
  "rgba(6, 182, 212, 0.8)", // cyan
  "rgba(249, 115, 22, 0.8)", // orange
];

interface TableRow {
  id: string;
  cells: string[];
}

interface ChartBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (chartHtml: string, chartId?: string) => void;
  initialData?: {
    headers: string[];
    rows: string[][];
  };
  activeUsers?: Array<{ id: string; name: string; avatar?: string }>;
}

export default function ChartBuilderModal({
  isOpen,
  onClose,
  onInsert,
  initialData,
  activeUsers = [],
}: ChartBuilderModalProps) {
  // Data state
  const [headers, setHeaders] = useState<string[]>([
    "Category",
    "Value 1",
    "Value 2",
  ]);
  const [rows, setRows] = useState<TableRow[]>([
    { id: "1", cells: ["A", "10", "15"] },
    { id: "2", cells: ["B", "25", "20"] },
    { id: "3", cells: ["C", "18", "12"] },
    { id: "4", cells: ["D", "30", "28"] },
  ]);

  // Chart config
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [chartTitle, setChartTitle] = useState("");
  const [labelColumn, setLabelColumn] = useState(0);
  const [dataColumns, setDataColumns] = useState<number[]>([1]);
  const [xAxisLabel, setXAxisLabel] = useState("");
  const [yAxisLabel, setYAxisLabel] = useState("");
  const [showLegend, setShowLegend] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  // UI state
  const [activeTab, setActiveTab] = useState<"data" | "style" | "config">(
    "data",
  );
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "saved" | "saving" | "unsaved"
  >("saved");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Initialize with provided data
  useEffect(() => {
    if (initialData) {
      setHeaders(initialData.headers);
      setRows(
        initialData.rows.map((cells, i) => ({ id: String(i + 1), cells })),
      );
      if (initialData.headers.length > 1) {
        setDataColumns([1]);
      }
    }
  }, [initialData]);

  // Auto-save simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (autoSaveStatus === "unsaved") {
        setAutoSaveStatus("saving");
        setTimeout(() => {
          setAutoSaveStatus("saved");
          setLastSaved(new Date());
        }, 500);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [headers, rows, chartType, chartTitle, autoSaveStatus]);

  // Mark as unsaved on changes
  const markUnsaved = useCallback(() => {
    setAutoSaveStatus("unsaved");
  }, []);

  // Table operations
  const handleCellChange = (
    rowIndex: number,
    cellIndex: number,
    value: string,
  ) => {
    const newRows = [...rows];
    newRows[rowIndex] = {
      ...newRows[rowIndex],
      cells: newRows[rowIndex].cells.map((cell, i) =>
        i === cellIndex ? value : cell,
      ),
    };
    setRows(newRows);
    markUnsaved();
  };

  const handleHeaderChange = (index: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[index] = value;
    setHeaders(newHeaders);
    markUnsaved();
  };

  const addRow = () => {
    const newRow: TableRow = {
      id: String(Date.now()),
      cells: headers.map(() => ""),
    };
    setRows([...rows, newRow]);
    markUnsaved();
  };

  const deleteRow = (rowIndex: number) => {
    setRows(rows.filter((_, i) => i !== rowIndex));
    markUnsaved();
  };

  const addColumn = () => {
    setHeaders([...headers, `Column ${headers.length + 1}`]);
    setRows(rows.map((row) => ({ ...row, cells: [...row.cells, ""] })));
    markUnsaved();
  };

  const deleteColumn = (colIndex: number) => {
    if (headers.length <= 2) return;
    setHeaders(headers.filter((_, i) => i !== colIndex));
    setRows(
      rows.map((row) => ({
        ...row,
        cells: row.cells.filter((_, i) => i !== colIndex),
      })),
    );
    setDataColumns(
      dataColumns
        .filter((c) => c !== colIndex)
        .map((c) => (c > colIndex ? c - 1 : c)),
    );
    if (labelColumn >= colIndex && labelColumn > 0) {
      setLabelColumn(labelColumn - 1);
    }
    markUnsaved();
  };

  const toggleDataColumn = (colIndex: number) => {
    if (dataColumns.includes(colIndex)) {
      setDataColumns(dataColumns.filter((c) => c !== colIndex));
    } else {
      setDataColumns([...dataColumns, colIndex]);
    }
    markUnsaved();
  };

  // Generate chart data
  const generateChartData = () => {
    const labels = rows.map((row) => row.cells[labelColumn] || "");
    const datasets = dataColumns.map((colIndex, i) => {
      const data = rows.map((row) => {
        const val = row.cells[colIndex]?.replace(/[,\s]/g, "") || "0";
        return parseFloat(val) || 0;
      });

      return {
        label: headers[colIndex] || `Dataset ${i + 1}`,
        data,
        backgroundColor:
          chartType === "pie" || chartType === "doughnut"
            ? DEFAULT_COLORS.slice(0, data.length)
            : DEFAULT_COLORS[i % DEFAULT_COLORS.length],
        borderColor:
          chartType === "line"
            ? DEFAULT_COLORS[i % DEFAULT_COLORS.length]
            : "rgba(255, 255, 255, 0.2)",
        borderWidth: chartType === "line" ? 2 : 1,
        tension: 0.3,
        fill: chartType === "line" ? false : undefined,
      };
    });

    return { labels, datasets };
  };

  const chartData = generateChartData();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: "top" as const,
        labels: {
          color: "#e2e8f0",
        },
      },
      title: {
        display: !!chartTitle,
        text: chartTitle,
        color: "#e2e8f0",
        font: {
          size: 16,
          weight: "bold" as const,
        },
      },
    },
    scales:
      chartType !== "pie" && chartType !== "doughnut"
        ? {
            x: {
              display: true,
              grid: {
                display: showGrid,
                color: "rgba(148, 163, 184, 0.1)",
              },
              ticks: { color: "#94a3b8" },
              title: xAxisLabel
                ? {
                    display: true,
                    text: xAxisLabel,
                    color: "#94a3b8",
                  }
                : undefined,
            },
            y: {
              display: true,
              grid: {
                display: showGrid,
                color: "rgba(148, 163, 184, 0.1)",
              },
              ticks: { color: "#94a3b8" },
              title: yAxisLabel
                ? {
                    display: true,
                    text: yAxisLabel,
                    color: "#94a3b8",
                  }
                : undefined,
            },
          }
        : undefined,
  };

  const ChartComponent =
    {
      bar: Bar,
      line: Line,
      pie: Pie,
      doughnut: Doughnut,
      scatter: Scatter,
      histogram: Bar,
      stacked: Bar,
    }[chartType] || Bar;

  const handleGenerate = () => {
    const chartId = `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const chartDataJson = JSON.stringify({
      tableData: { headers, rows: rows.map((r) => r.cells) },
      config: {
        type: chartType,
        title: chartTitle,
        labelColumn,
        dataColumns,
        xAxisLabel,
        yAxisLabel,
      },
      chartId,
    });

    const chartHtml = `
      <div class="chart-container" data-chart='${chartDataJson.replace(/'/g, "&#39;")}' data-chart-id="${chartId}">
        <div class="chart-placeholder">
          Chart: ${chartTitle || CHART_TYPES.find((t) => t.id === chartType)?.name || "Chart"}
        </div>
      </div>
    `;

    onInsert(chartHtml, chartId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-6xl max-h-[90vh] m-4 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ChartBarIcon className="w-6 h-6 text-blue-400" />
              <h2 className="text-lg font-semibold text-slate-200">
                Chart Builder
              </h2>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded-full">
              <span className="text-xs text-slate-400">
                Step 1 of 2: Configure Chart
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Auto-save status */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {autoSaveStatus === "saved" && (
                <>
                  <CheckIcon className="w-4 h-4 text-green-400" />
                  <span>Saved</span>
                </>
              )}
              {autoSaveStatus === "saving" && (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              )}
              {autoSaveStatus === "unsaved" && (
                <>
                  <ExclamationTriangleIcon className="w-4 h-4 text-amber-400" />
                  <span>Unsaved changes</span>
                </>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Data Input */}
          <div className="w-1/2 border-r border-slate-700/50 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-700/50 bg-slate-800/30">
              <button
                onClick={() => setActiveTab("data")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors",
                  activeTab === "data"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50",
                )}
              >
                <TableCellsIcon className="w-4 h-4" />
                Data
              </button>
              <button
                onClick={() => setActiveTab("style")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors",
                  activeTab === "style"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50",
                )}
              >
                <PaintBrushIcon className="w-4 h-4" />
                Style
              </button>
              <button
                onClick={() => setActiveTab("config")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors",
                  activeTab === "config"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50",
                )}
              >
                <Cog6ToothIcon className="w-4 h-4" />
                Config
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto p-4">
              {activeTab === "data" && (
                <div className="space-y-4">
                  {/* Section Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-slate-300">
                      Raw Data Source
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={addColumn}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                      >
                        <PlusIcon className="w-3 h-3" />
                        Column
                      </button>
                      <button
                        onClick={addRow}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                      >
                        <PlusIcon className="w-3 h-3" />
                        Row
                      </button>
                    </div>
                  </div>

                  {/* Data Table */}
                  <div className="overflow-x-auto rounded-lg border border-slate-700/50">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-800/50">
                          <th className="w-8 p-2 border-b border-slate-700/50"></th>
                          {headers.map((header, i) => (
                            <th
                              key={i}
                              className="p-2 border-b border-slate-700/50"
                            >
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={header}
                                  onChange={(e) =>
                                    handleHeaderChange(i, e.target.value)
                                  }
                                  className="w-full px-2 py-1 bg-slate-700/30 border border-slate-600/50 rounded text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                                />
                                {headers.length > 2 && (
                                  <button
                                    onClick={() => deleteColumn(i)}
                                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                                  >
                                    <TrashIcon className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </th>
                          ))}
                          <th className="w-8 p-2 border-b border-slate-700/50"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, rowIndex) => (
                          <tr key={row.id} className="hover:bg-slate-800/30">
                            <td className="p-2 text-center text-slate-500 text-xs">
                              {rowIndex + 1}
                            </td>
                            {row.cells.map((cell, cellIndex) => (
                              <td key={cellIndex} className="p-2">
                                <input
                                  type="text"
                                  value={cell}
                                  onChange={(e) =>
                                    handleCellChange(
                                      rowIndex,
                                      cellIndex,
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-2 py-1 bg-slate-700/30 border border-slate-600/50 rounded text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                                />
                              </td>
                            ))}
                            <td className="p-2">
                              <button
                                onClick={() => deleteRow(rowIndex)}
                                className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                              >
                                <TrashIcon className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Column Selection */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                      Column Mapping
                    </h4>

                    <div className="space-y-2">
                      <label className="block">
                        <span className="text-xs text-slate-400">
                          Label Column
                        </span>
                        <select
                          value={labelColumn}
                          onChange={(e) => {
                            setLabelColumn(Number(e.target.value));
                            markUnsaved();
                          }}
                          className="w-full mt-1 px-3 py-1.5 text-sm bg-slate-700/50 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-blue-500"
                        >
                          {headers.map((h, i) => (
                            <option key={i} value={i}>
                              {h || `Column ${i + 1}`}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div>
                        <span className="text-xs text-slate-400">
                          Data Columns
                        </span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {headers.map((h, i) => (
                            <button
                              key={i}
                              onClick={() => toggleDataColumn(i)}
                              disabled={i === labelColumn}
                              className={cn(
                                "px-3 py-1 text-xs rounded transition-colors",
                                i === labelColumn
                                  ? "bg-slate-700/30 text-slate-500 cursor-not-allowed"
                                  : dataColumns.includes(i)
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-700/50 text-slate-300 hover:bg-slate-700",
                              )}
                            >
                              {h || `Column ${i + 1}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "style" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-slate-300">
                    Chart Type
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    {CHART_TYPES.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => {
                          setChartType(type.id);
                          markUnsaved();
                        }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-all",
                          chartType === type.id
                            ? "bg-blue-600/20 border-blue-500 text-slate-200"
                            : "bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-600",
                        )}
                      >
                        <div
                          className={cn(
                            "p-2 rounded-lg",
                            chartType === type.id
                              ? "bg-blue-600"
                              : "bg-slate-700",
                          )}
                        >
                          {type.icon}
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-medium">{type.name}</div>
                          <div className="text-xs text-slate-500">
                            {type.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "config" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-slate-300">
                    Chart Settings
                  </h3>

                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-xs text-slate-400">
                        Chart Title
                      </span>
                      <input
                        type="text"
                        value={chartTitle}
                        onChange={(e) => {
                          setChartTitle(e.target.value);
                          markUnsaved();
                        }}
                        placeholder="Enter chart title..."
                        className="w-full mt-1 px-3 py-2 text-sm bg-slate-700/50 border border-slate-600 rounded text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs text-slate-400">
                        X-Axis Label
                      </span>
                      <input
                        type="text"
                        value={xAxisLabel}
                        onChange={(e) => {
                          setXAxisLabel(e.target.value);
                          markUnsaved();
                        }}
                        placeholder="Enter X-axis label..."
                        className="w-full mt-1 px-3 py-2 text-sm bg-slate-700/50 border border-slate-600 rounded text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs text-slate-400">
                        Y-Axis Label
                      </span>
                      <input
                        type="text"
                        value={yAxisLabel}
                        onChange={(e) => {
                          setYAxisLabel(e.target.value);
                          markUnsaved();
                        }}
                        placeholder="Enter Y-axis label..."
                        className="w-full mt-1 px-3 py-2 text-sm bg-slate-700/50 border border-slate-600 rounded text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </label>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-slate-300">
                        Show Legend
                      </span>
                      <button
                        onClick={() => {
                          setShowLegend(!showLegend);
                          markUnsaved();
                        }}
                        className={cn(
                          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                          showLegend ? "bg-blue-600" : "bg-slate-600",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            showLegend ? "translate-x-4" : "translate-x-0.5",
                          )}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-slate-300">
                        Show Grid Lines
                      </span>
                      <button
                        onClick={() => {
                          setShowGrid(!showGrid);
                          markUnsaved();
                        }}
                        className={cn(
                          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                          showGrid ? "bg-blue-600" : "bg-slate-600",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            showGrid ? "translate-x-4" : "translate-x-0.5",
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-700/50 bg-slate-800/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <EyeIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300">Live Preview</span>
                </div>
                <span className="text-xs text-slate-500">
                  Changes update in real-time
                </span>
              </div>
            </div>

            <div className="flex-1 p-4 flex items-center justify-center bg-slate-800/30">
              <div className="w-full h-full max-h-100">
                <ChartComponent data={chartData} options={chartOptions} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center gap-4">
            {/* Active users */}
            {activeUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <UserGroupIcon className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400">
                  {activeUsers.length} user{activeUsers.length > 1 ? "s" : ""}{" "}
                  editing
                </span>
                <div className="flex -space-x-2">
                  {activeUsers.slice(0, 3).map((user) => (
                    <div
                      key={user.id}
                      className="w-6 h-6 rounded-full bg-blue-600 border-2 border-slate-900 flex items-center justify-center text-[10px] text-white font-medium"
                      title={user.name}
                    >
                      {user.avatar || user.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {lastSaved && (
              <span className="text-xs text-slate-500">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Discard Draft
            </button>
            <button
              onClick={handleGenerate}
              disabled={dataColumns.length === 0}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors",
                dataColumns.length > 0
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed",
              )}
            >
              <ChartBarIcon className="w-4 h-4" />
              Generate Chart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
