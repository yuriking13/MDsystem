/**
 * AnalyticsAgent - Статистический анализ и визуализация данных
 * Специализированный агент для анализа исследовательских данных
 */

import React, { useState, useEffect, useRef } from "react";
import { useAgentWindow } from "../AgentWindow";
import AgentWindow from "../AgentWindow";
import AgentCoordinator from "../../services/AgentCoordinator";
import styles from "./analytics-agent.module.css";

type AnalysisType =
  | "descriptive"
  | "correlation"
  | "regression"
  | "distribution"
  | "comparison"
  | "trend";
type DataFormat = "csv" | "json" | "xlsx" | "text";

type DataSet = {
  id: string;
  name: string;
  format: DataFormat;
  size: number;
  columns: string[];
  rows: number;
  data: Record<string, unknown>[];
  uploadedAt: Date;
};

type AnalysisResult = {
  id: string;
  type: AnalysisType;
  dataset: string;
  parameters: Record<string, unknown>;
  results: {
    summary: string;
    statistics: Record<string, number>;
    visualizations?: {
      type: "chart" | "graph" | "table";
      data: unknown;
      config: Record<string, unknown>;
    }[];
    interpretation: string;
    recommendations: string[];
  };
  confidence: number;
  createdAt: Date;
};

type Props = {
  agentId?: string;
  onAnalysisComplete?: (result: AnalysisResult) => void;
  initialDataset?: DataSet;
};

export default function AnalyticsAgent({
  agentId = "analytics-agent",
  onAnalysisComplete,
  initialDataset,
}: Props) {
  const { isOpen, openWindow, closeWindow } = useAgentWindow(
    agentId,
    "analytics",
    "Statistical Analytics Agent",
  );

  const [datasets, setDatasets] = useState<DataSet[]>(
    initialDataset ? [initialDataset] : [],
  );
  const [selectedDataset, setSelectedDataset] = useState<DataSet | null>(
    initialDataset || null,
  );
  const [currentAnalysis, setCurrentAnalysis] =
    useState<AnalysisType>("descriptive");
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [analysisParameters, setAnalysisParameters] = useState<
    Record<string, unknown>
  >({});
  const [viewMode, setViewMode] = useState<"data" | "analysis" | "results">(
    "data",
  );
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update agent status
  useEffect(() => {
    if (isProcessing) {
      AgentCoordinator.updateAgentStatus(
        agentId,
        "busy",
        `Analyzing: ${currentAnalysis}`,
      );
    } else {
      AgentCoordinator.updateAgentStatus(agentId, "idle");
    }
  }, [isProcessing, currentAnalysis, agentId]);

  // Auto-select first dataset when available
  useEffect(() => {
    if (datasets.length > 0 && !selectedDataset) {
      setSelectedDataset(datasets[0]);
    }
  }, [datasets, selectedDataset]);

  // Update preview when dataset changes
  useEffect(() => {
    if (selectedDataset) {
      setPreviewData(selectedDataset.data.slice(0, 10)); // First 10 rows for preview
      setSelectedColumns(selectedDataset.columns.slice(0, 3)); // Auto-select first 3 columns
    }
  }, [selectedDataset]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadProgress(0);
    AgentCoordinator.updateAgentStatus(
      agentId,
      "active",
      `Uploading: ${file.name}`,
    );

    try {
      // Simulate file upload with progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        setUploadProgress(i);
      }

      const dataset = await processUploadedFile(file);
      setDatasets((prev) => [dataset, ...prev]);
      setSelectedDataset(dataset);
      setViewMode("data");

      AgentCoordinator.reportTaskCompleted(agentId, 1000, true);
    } catch (error) {
      console.error("File upload failed:", error);
      AgentCoordinator.reportTaskCompleted(agentId, 1000, false);
    } finally {
      setUploadProgress(0);
    }
  };

  const processUploadedFile = async (file: File): Promise<DataSet> => {
    // Simulate file processing
    await new Promise((resolve) => setTimeout(resolve, 500));

    const format =
      (file.name.split(".").pop()?.toLowerCase() as DataFormat) || "csv";

    // Mock data generation based on file type
    const mockData = generateMockDataset(file.name, format);

    return {
      id: `dataset-${Date.now()}`,
      name: file.name.replace(/\.[^/.]+$/, ""),
      format,
      size: file.size,
      columns: mockData.columns,
      rows: mockData.data.length,
      data: mockData.data,
      uploadedAt: new Date(),
    };
  };

  const generateMockDataset = (_filename: string, _format: DataFormat) => {
    // Generate realistic mock data for demonstration
    const columns = ["ID", "Value", "Category", "Timestamp", "Score", "Status"];
    const categories = ["A", "B", "C", "D"];
    const statuses = ["Active", "Inactive", "Pending"];

    const data = Array.from({ length: 100 }, (_, i) => ({
      ID: i + 1,
      Value: Math.round(Math.random() * 1000 * 100) / 100,
      Category: categories[Math.floor(Math.random() * categories.length)],
      Timestamp: new Date(
        Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      Score: Math.round(Math.random() * 100),
      Status: statuses[Math.floor(Math.random() * statuses.length)],
    }));

    return { columns, data };
  };

  const performAnalysis = async () => {
    if (!selectedDataset || selectedColumns.length === 0) return;

    setIsProcessing(true);
    setViewMode("analysis");

    try {
      AgentCoordinator.updateAgentStatus(
        agentId,
        "active",
        `Running ${currentAnalysis} analysis`,
      );

      // Simulate analysis processing
      await new Promise((resolve) =>
        setTimeout(resolve, 2000 + Math.random() * 2000),
      );

      const result = await generateAnalysisResult();

      setAnalysisResults((prev) => [result, ...prev.slice(0, 9)]);
      setViewMode("results");
      onAnalysisComplete?.(result);

      // Notify other agents
      AgentCoordinator.broadcastMessage(agentId, "notification", {
        type: "analysis-completed",
        analysisType: currentAnalysis,
        dataset: selectedDataset.name,
        confidence: result.confidence,
      });

      AgentCoordinator.reportTaskCompleted(agentId, 3000, true);
    } catch (error) {
      console.error("Analysis failed:", error);
      AgentCoordinator.reportTaskCompleted(agentId, 3000, false);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateAnalysisResult = async (): Promise<AnalysisResult> => {
    const analysisData = getAnalysisData(currentAnalysis);

    return {
      id: `analysis-${Date.now()}`,
      type: currentAnalysis,
      dataset: selectedDataset?.name || "Unknown",
      parameters: {
        columns: selectedColumns,
        ...analysisParameters,
      },
      results: {
        summary: analysisData.summary,
        statistics: analysisData.statistics as unknown as Record<
          string,
          number
        >,
        visualizations: analysisData.visualizations as
          | {
              type: "chart" | "table" | "graph";
              data: unknown;
              config: Record<string, unknown>;
            }[]
          | undefined,
        interpretation: analysisData.interpretation,
        recommendations: analysisData.recommendations,
      },
      confidence: analysisData.confidence,
      createdAt: new Date(),
    };
  };

  const getAnalysisData = (type: AnalysisType) => {
    const baseData = {
      confidence: Math.round(75 + Math.random() * 20),
    };

    switch (type) {
      case "descriptive":
        return {
          ...baseData,
          summary:
            "Comprehensive descriptive statistics reveal key patterns in the dataset with significant variability across measured variables.",
          statistics: {
            mean: 45.7,
            median: 42.3,
            standardDeviation: 15.2,
            variance: 231.04,
            skewness: 0.34,
            kurtosis: -0.12,
            outliers: 7,
          },
          interpretation:
            "The data shows a slightly right-skewed distribution with moderate variability. Most values cluster around the central tendency with few extreme outliers.",
          recommendations: [
            "Consider removing outliers for more robust analysis",
            "Apply normalization for comparative studies",
            "Investigate the cause of right-skewed distribution",
          ],
          visualizations: [
            {
              type: "chart",
              data: { type: "histogram", bins: 20 },
              config: { title: "Data Distribution" },
            },
          ],
        };

      case "correlation":
        return {
          ...baseData,
          summary:
            "Correlation analysis identifies moderate to strong relationships between variables, with significant positive correlations detected.",
          statistics: {
            pearsons_r: 0.67,
            p_value: 0.002,
            r_squared: 0.45,
            confidence_interval_lower: 0.34,
            confidence_interval_upper: 0.84,
          },
          interpretation:
            "A moderate positive correlation exists between the selected variables (r=0.67, p<0.01), explaining approximately 45% of the variance.",
          recommendations: [
            "Investigate causal relationships behind correlation",
            "Consider additional variables that might influence the relationship",
            "Validate findings with larger sample size",
          ],
          visualizations: [
            {
              type: "graph",
              data: { type: "scatter", regression: true },
              config: { title: "Correlation Scatter Plot" },
            },
          ],
        };

      case "regression":
        return {
          ...baseData,
          summary:
            "Linear regression model demonstrates good predictive power with significant coefficients and acceptable model diagnostics.",
          statistics: {
            r_squared: 0.72,
            adjusted_r_squared: 0.69,
            f_statistic: 45.3,
            p_value: 0.001,
            rmse: 8.4,
            coefficients_significant: 3,
          },
          interpretation:
            "The regression model explains 72% of variance in the dependent variable. All predictors show significant relationships with good model fit.",
          recommendations: [
            "Validate model with holdout test set",
            "Check for multicollinearity among predictors",
            "Consider non-linear relationships",
          ],
          visualizations: [
            {
              type: "chart",
              data: { type: "residuals" },
              config: { title: "Residual Analysis" },
            },
          ],
        };

      default:
        return {
          ...baseData,
          summary: `${type} analysis completed successfully with meaningful insights extracted from the dataset.`,
          statistics: { result: 1 },
          interpretation:
            "Analysis completed with standard parameters and acceptable confidence levels.",
          recommendations: ["Review results and consider additional analysis"],
          visualizations: [],
        };
    }
  };

  const getAnalysisDescription = (type: AnalysisType): string => {
    const descriptions = {
      descriptive:
        "Calculate mean, median, standard deviation, and distribution characteristics",
      correlation:
        "Measure relationships between variables using Pearson and Spearman correlations",
      regression: "Build predictive models and analyze variable relationships",
      distribution: "Analyze data distribution patterns and test for normality",
      comparison:
        "Compare groups using t-tests, ANOVA, or non-parametric tests",
      trend: "Identify temporal patterns and forecast future values",
    };
    return descriptions[type];
  };

  const formatStatistic = (key: string, value: number): string => {
    if (key.includes("p_value") || key.includes("confidence")) {
      return value.toFixed(4);
    }
    return value.toFixed(2);
  };

  const windowContent = (
    <div className="flex flex-col h-full">
      {/* Header with Mode Tabs */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex gap-2 mb-3">
          {(["data", "analysis", "results"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-2 rounded text-sm capitalize ${
                viewMode === mode
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Upload Progress */}
        {uploadProgress > 0 && (
          <div className="mb-3">
            <div className="text-sm text-blue-700 mb-1">
              Uploading data... {uploadProgress}%
            </div>
            <div className="bg-blue-200 rounded-full h-2">
              <div
                className={`bg-blue-500 h-2 rounded-full transition-all duration-300 ${styles[`progressBar${Math.floor(uploadProgress / 5) * 5}` as keyof typeof styles] || ""}`}
              ></div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        {selectedDataset && (
          <div className="flex gap-4 text-sm text-gray-600">
            <span>Dataset: {selectedDataset.name}</span>
            <span>Rows: {selectedDataset.rows.toLocaleString()}</span>
            <span>Columns: {selectedDataset.columns.length}</span>
            <span>Size: {(selectedDataset.size / 1024).toFixed(1)}KB</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === "data" && (
          <div className="p-4">
            {/* Dataset Management */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-900">Datasets</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Upload Data
                  </button>
                  <button
                    onClick={() => {
                      const mockDataset = {
                        id: `demo-${Date.now()}`,
                        name: "Demo Dataset",
                        format: "csv" as DataFormat,
                        size: 5120,
                        columns: ["ID", "Value", "Category", "Score"],
                        rows: 50,
                        data: generateMockDataset("demo.csv", "csv").data,
                        uploadedAt: new Date(),
                      };
                      setDatasets((prev) => [mockDataset, ...prev]);
                      setSelectedDataset(mockDataset);
                    }}
                    className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    Demo Data
                  </button>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.json,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Dataset List */}
              {datasets.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {datasets.map((dataset) => (
                    <div
                      key={dataset.id}
                      className={`p-3 border rounded cursor-pointer ${
                        selectedDataset?.id === dataset.id
                          ? "border-blue-300 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedDataset(dataset)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-sm">
                            {dataset.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {dataset.format.toUpperCase()} • {dataset.rows} rows
                            • {dataset.columns.length} columns
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {dataset.uploadedAt.toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg
                    className="w-12 h-12 mx-auto mb-3 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <p>No datasets available</p>
                  <p className="text-sm">Upload data or create demo dataset</p>
                </div>
              )}
            </div>

            {/* Data Preview */}
            {selectedDataset && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Data Preview
                </h3>
                <div className="border border-gray-200 rounded overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {selectedDataset.columns.map((column) => (
                          <th
                            key={column}
                            className="p-2 text-left font-medium text-gray-700 border-b"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          {selectedDataset.columns.map((column) => (
                            <td key={column} className="p-2 text-gray-600">
                              {typeof row[column] === "number"
                                ? row[column].toFixed(2)
                                : String(row[column])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Showing first {previewData.length} rows of{" "}
                  {selectedDataset.rows} total rows
                </div>
              </div>
            )}
          </div>
        )}

        {viewMode === "analysis" && (
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">
              Configure Analysis
            </h3>

            {/* Analysis Type Selection */}
            <div className="mb-4">
              <label className="block font-medium text-sm text-gray-700 mb-2">
                Analysis Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    "descriptive",
                    "correlation",
                    "regression",
                    "distribution",
                    "comparison",
                    "trend",
                  ] as AnalysisType[]
                ).map((type) => (
                  <button
                    key={type}
                    onClick={() => setCurrentAnalysis(type)}
                    className={`p-3 text-left border rounded ${
                      currentAnalysis === type
                        ? "border-blue-300 bg-blue-50 text-blue-900"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium text-sm capitalize">{type}</div>
                    <div className="text-xs text-gray-600">
                      {getAnalysisDescription(type)}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Column Selection */}
            {selectedDataset && (
              <div className="mb-4">
                <label className="block font-medium text-sm text-gray-700 mb-2">
                  Select Columns for Analysis ({selectedColumns.length}{" "}
                  selected)
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
                  {selectedDataset.columns.map((column) => (
                    <label
                      key={column}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedColumns.includes(column)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedColumns((prev) => [...prev, column]);
                          } else {
                            setSelectedColumns((prev) =>
                              prev.filter((c) => c !== column),
                            );
                          }
                        }}
                        className="rounded"
                      />
                      <span>{column}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Analysis Parameters */}
            <div className="mb-6">
              <label className="block font-medium text-sm text-gray-700 mb-2">
                Parameters
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600">
                    Confidence Level
                  </label>
                  <select
                    value={(analysisParameters.confidence || "0.95") as string}
                    onChange={(e) =>
                      setAnalysisParameters((prev) => ({
                        ...prev,
                        confidence: e.target.value,
                      }))
                    }
                    className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="0.90">90%</option>
                    <option value="0.95">95%</option>
                    <option value="0.99">99%</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600">
                    Significance Level
                  </label>
                  <select
                    value={(analysisParameters.alpha || "0.05") as string}
                    onChange={(e) =>
                      setAnalysisParameters((prev) => ({
                        ...prev,
                        alpha: e.target.value,
                      }))
                    }
                    className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="0.01">0.01</option>
                    <option value="0.05">0.05</option>
                    <option value="0.10">0.10</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Run Analysis Button */}
            <div className="flex justify-center">
              <button
                onClick={performAnalysis}
                disabled={
                  isProcessing ||
                  !selectedDataset ||
                  selectedColumns.length === 0
                }
                className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Analyzing...
                  </div>
                ) : (
                  "Run Analysis"
                )}
              </button>
            </div>
          </div>
        )}

        {viewMode === "results" && (
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">
              Analysis Results
            </h3>

            {analysisResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg
                  className="w-12 h-12 mx-auto mb-3 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <p>No analysis results yet</p>
                <p className="text-sm">Run an analysis to see results here</p>
              </div>
            ) : (
              <div className="space-y-6">
                {analysisResults.map((result) => (
                  <div
                    key={result.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-lg capitalize">
                          {result.type} Analysis
                        </h4>
                        <div className="text-sm text-gray-500">
                          Dataset: {result.dataset} • Confidence:{" "}
                          {result.confidence}% •
                          {result.createdAt.toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => onAnalysisComplete?.(result)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Export
                      </button>
                    </div>

                    {/* Summary */}
                    <div className="mb-4">
                      <h5 className="font-medium text-sm mb-2">Summary</h5>
                      <p className="text-sm text-gray-700">
                        {result.results.summary}
                      </p>
                    </div>

                    {/* Statistics */}
                    <div className="mb-4">
                      <h5 className="font-medium text-sm mb-2">
                        Key Statistics
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(result.results.statistics).map(
                          ([key, value]) => (
                            <div key={key} className="bg-gray-50 p-2 rounded">
                              <div className="text-xs text-gray-600 capitalize">
                                {key.replace(/_/g, " ")}
                              </div>
                              <div className="font-mono text-sm text-gray-900">
                                {formatStatistic(key, value)}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    {/* Interpretation */}
                    <div className="mb-4">
                      <h5 className="font-medium text-sm mb-2">
                        Interpretation
                      </h5>
                      <p className="text-sm text-gray-700">
                        {result.results.interpretation}
                      </p>
                    </div>

                    {/* Recommendations */}
                    <div>
                      <h5 className="font-medium text-sm mb-2">
                        Recommendations
                      </h5>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {result.results.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-blue-500 mt-1">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>
            Mode: {viewMode} •{isProcessing ? " Processing..." : " Ready"} •
            Results: {analysisResults.length}
          </span>
          <span>Analytics Agent v1.0</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <AgentWindow
        agentId={agentId}
        agentType="analytics"
        title="Statistical Analytics Agent"
        isOpen={isOpen}
        onClose={closeWindow}
        minWidth={600}
        minHeight={500}
        maxWidth={1000}
        maxHeight={800}
      >
        {windowContent}
      </AgentWindow>

      {!isOpen && (
        <button
          onClick={openWindow}
          className="fixed bottom-4 left-36 p-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 z-50"
          title="Open Analytics Agent"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2V9a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2v-8a2 2 0 00-2-2h-2a2 2 0 00-2 2v8a2 2 0 01-2 2z"
            />
          </svg>
        </button>
      )}
    </>
  );
}
