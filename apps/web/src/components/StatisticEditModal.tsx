import React, { useState, useEffect } from "react";
import ChartFromTable, {
  CHART_TYPE_INFO,
  type ChartType,
  type ChartConfig,
  type TableData,
  type DataClassification,
  getRecommendedChartTypes,
  getRecommendedStatMethod,
} from "./ChartFromTable";
import { type ProjectStatistic } from "../lib/api";

// SVG Icons (Flowbite/Heroicons style)
const ChartBarIcon = () => (
  <svg
    className="icon-sm edit-stat-icon-accent-gap-6"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
    />
  </svg>
);

const TableIcon = () => (
  <svg
    className="icon-sm edit-stat-icon-accent-gap-6"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125"
    />
  </svg>
);

const BeakerIcon = () => (
  <svg
    className="icon-sm edit-stat-icon-accent-gap-6"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
    />
  </svg>
);

const CloseIcon = () => (
  <svg
    className="icon-sm"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const LightBulbIcon = () => (
  <svg
    className="icon-sm edit-stat-icon-accent-gap-6"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
    />
  </svg>
);

const QuantitativeIcon = () => (
  <svg
    className="icon-sm edit-stat-icon-gap-4-no-shrink"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
    />
  </svg>
);

const QualitativeIcon = () => (
  <svg
    className="icon-sm edit-stat-icon-gap-4-no-shrink"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 6h.008v.008H6V6z"
    />
  </svg>
);

const SaveIcon = () => (
  <svg
    className="icon-sm edit-stat-icon-gap-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
    />
  </svg>
);

const SpinnerIcon = () => (
  <svg
    className="icon-sm loading-spinner edit-stat-icon-gap-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

type Props = {
  statistic: ProjectStatistic;
  onClose: () => void;
  onSave: (updates: {
    title?: string;
    description?: string;
    config?: Record<string, unknown>;
    tableData?: TableData;
    dataClassification?: DataClassification;
    chartType?: string;
  }) => Promise<void>;
};

export default function StatisticEditModal({
  statistic,
  onClose,
  onSave,
}: Props) {
  const [title, setTitle] = useState(statistic.title);
  const [description, setDescription] = useState(statistic.description || "");
  const [chartType, setChartType] = useState<ChartType>(
    (statistic.chart_type as ChartType) || "bar",
  );
  const [tableData, setTableData] = useState<TableData | null>(
    statistic.table_data as TableData | null,
  );
  const [labelColumn, setLabelColumn] = useState(
    (statistic.config as ChartConfig)?.labelColumn ?? 0,
  );
  const [dataColumns, setDataColumns] = useState<number[]>(
    (statistic.config as ChartConfig)?.dataColumns ?? [1],
  );
  const [bins, setBins] = useState(
    (statistic.config as ChartConfig)?.bins ?? 10,
  );
  const [xColumn, setXColumn] = useState(
    (statistic.config as ChartConfig)?.xColumn ?? 1,
  );
  const [yColumn, setYColumn] = useState(
    (statistic.config as ChartConfig)?.yColumn ?? 2,
  );

  // Data classification
  const [variableType, setVariableType] = useState<
    "quantitative" | "qualitative"
  >(statistic.data_classification?.variableType ?? "quantitative");
  const [subType, setSubType] = useState<DataClassification["subType"]>(
    statistic.data_classification?.subType ?? "continuous",
  );
  const [isNormalDistribution, setIsNormalDistribution] = useState<
    boolean | undefined
  >(statistic.data_classification?.isNormalDistribution);

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "chart" | "table" | "classification"
  >("chart");

  // Ensure new columns are auto-selected (all except label) and indexes stay in bounds
  useEffect(() => {
    if (!tableData) return;
    const colCount = tableData.headers?.length || 0;
    if (colCount === 0) return;

    // Clamp label/x/y columns inside bounds
    if (labelColumn >= colCount) setLabelColumn(Math.max(0, colCount - 1));
    if (xColumn >= colCount) setXColumn(Math.max(0, colCount - 1));
    if (yColumn >= colCount) setYColumn(Math.max(0, colCount - 1));

    // Auto-select all data columns except the label
    const target = Array.from({ length: colCount }, (_, i) => i).filter(
      (i) => i !== labelColumn,
    );
    setDataColumns((prev) => {
      if (
        prev.length === target.length &&
        prev.every((v, idx) => v === target[idx])
      ) {
        return prev;
      }
      return target;
    });
  }, [tableData, labelColumn, xColumn, yColumn]);

  const classification: DataClassification = {
    variableType,
    subType,
    isNormalDistribution,
  };
  const recommendedTypes = getRecommendedChartTypes(classification);
  const recommendedMethod = getRecommendedStatMethod(classification);

  const config: ChartConfig = {
    type: chartType,
    title,
    labelColumn,
    dataColumns,
    bins,
    xColumn,
    yColumn,
    dataClassification: classification,
  };

  const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
    if (!tableData) return;
    const newData = { ...tableData };
    newData.rows = [...newData.rows];
    newData.rows[rowIdx] = [...newData.rows[rowIdx]];
    newData.rows[rowIdx][colIdx] = value;
    setTableData(newData);
  };

  const handleHeaderChange = (colIdx: number, value: string) => {
    if (!tableData) return;
    const newData = { ...tableData };
    newData.headers = [...newData.headers];
    newData.headers[colIdx] = value;
    setTableData(newData);
  };

  const addRow = () => {
    if (!tableData) return;
    const newRow = new Array(tableData.headers.length).fill("");
    setTableData({
      ...tableData,
      rows: [...tableData.rows, newRow],
    });
  };

  const removeRow = (rowIdx: number) => {
    if (!tableData || tableData.rows.length <= 1) return;
    setTableData({
      ...tableData,
      rows: tableData.rows.filter((_, i) => i !== rowIdx),
    });
  };

  const addColumn = () => {
    if (!tableData) return;
    setTableData({
      headers: [
        ...tableData.headers,
        `Колонка ${tableData.headers.length + 1}`,
      ],
      rows: tableData.rows.map((row) => [...row, ""]),
    });
  };

  const removeColumn = (colIdx: number) => {
    if (!tableData || tableData.headers.length <= 2) return;
    setTableData({
      headers: tableData.headers.filter((_, i) => i !== colIdx),
      rows: tableData.rows.map((row) => row.filter((_, i) => i !== colIdx)),
    });
    // Update column references
    if (labelColumn >= colIdx) {
      setLabelColumn(Math.max(0, labelColumn - 1));
    }
    setDataColumns(
      dataColumns
        .filter((c) => c !== colIdx)
        .map((c) => (c > colIdx ? c - 1 : c)),
    );
  };

  const toggleDataColumn = (idx: number) => {
    if (dataColumns.includes(idx)) {
      setDataColumns(dataColumns.filter((c) => c !== idx));
    } else {
      setDataColumns([...dataColumns, idx]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        title,
        description: description || undefined,
        config: {
          type: chartType,
          title,
          labelColumn,
          dataColumns,
          bins,
          xColumn,
          yColumn,
          dataClassification: classification,
        },
        tableData: tableData || undefined,
        dataClassification: classification,
        chartType,
      });
      onClose();
    } catch (err) {
      console.error("Failed to save statistic:", err);
    } finally {
      setSaving(false);
    }
  };

  const allChartTypes: ChartType[] = [
    "bar",
    "histogram",
    "stacked",
    "pie",
    "line",
    "boxplot",
    "scatter",
    "doughnut",
  ];

  const getChartTypeButtonClassName = (
    isSelected: boolean,
    isRecommended: boolean,
  ): string =>
    `btn edit-stat-chart-type-button ${
      isSelected ? "edit-stat-chart-type-button--selected" : "secondary"
    } ${isRecommended ? "edit-stat-chart-type-button--recommended" : ""}`;

  const getRecommendedTypeButtonClassName = (isSelected: boolean): string =>
    `btn edit-stat-recommended-type-button ${
      isSelected ? "edit-stat-recommended-type-button--selected" : ""
    }`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content statistic-edit-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title statistic-modal-title">
            {statistic.type === "chart" ? <ChartBarIcon /> : <TableIcon />}
            Редактировать {statistic.type === "chart" ? "график" : "таблицу"}
          </h3>
          <button className="modal-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body">
          {/* Tabs */}
          <div className="tabs statistic-modal-tabs">
            <button
              className={`tab ${activeTab === "chart" ? "active" : ""}`}
              onClick={() => setActiveTab("chart")}
            >
              <ChartBarIcon />
              Тип графика
            </button>
            <button
              className={`tab ${activeTab === "table" ? "active" : ""}`}
              onClick={() => setActiveTab("table")}
            >
              <TableIcon />
              Данные таблицы
            </button>
            <button
              className={`tab ${activeTab === "classification" ? "active" : ""}`}
              onClick={() => setActiveTab("classification")}
            >
              <BeakerIcon />
              Классификация
            </button>
          </div>

          {/* Chart Type Tab */}
          {activeTab === "chart" && (
            <div className="row gap edit-stat-chart-layout">
              <div className="edit-stat-left-panel">
                <label className="stack edit-stat-field-spacing">
                  <span>Заголовок</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Название графика"
                  />
                </label>

                <label className="stack edit-stat-field-spacing">
                  <span>Описание</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Необязательное описание..."
                    rows={2}
                    className="edit-stat-description-textarea"
                  />
                </label>

                <div className="edit-stat-field-spacing">
                  <span className="muted edit-stat-type-label">
                    Тип графика
                  </span>
                  <div className="edit-stat-type-buttons-wrap">
                    {allChartTypes.map((t) => {
                      const info = CHART_TYPE_INFO[t] ?? {
                        name: String(t),
                        icon: <ChartBarIcon />,
                        description: "",
                      };
                      const isSelected = chartType === t;
                      const isRecommended = recommendedTypes.includes(t);
                      return (
                        <button
                          key={t}
                          className={getChartTypeButtonClassName(
                            isSelected,
                            isRecommended,
                          )}
                          onClick={() => setChartType(t)}
                          title={info.description}
                        >
                          {info.icon}{" "}
                          {info.name.length > 12
                            ? info.name.slice(0, 10) + "..."
                            : info.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {chartType === "scatter" ? (
                  <>
                    <label className="stack edit-stat-field-spacing">
                      <span>Ось X</span>
                      <select
                        value={xColumn}
                        onChange={(e) => setXColumn(Number(e.target.value))}
                      >
                        {tableData?.headers.map((h, i) => (
                          <option key={i} value={i}>
                            {h || `Колонка ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="stack edit-stat-field-spacing">
                      <span>Ось Y</span>
                      <select
                        value={yColumn}
                        onChange={(e) => setYColumn(Number(e.target.value))}
                      >
                        {tableData?.headers.map((h, i) => (
                          <option key={i} value={i}>
                            {h || `Колонка ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : chartType === "histogram" ? (
                  <>
                    <label className="stack edit-stat-field-spacing">
                      <span>Колонка данных</span>
                      <select
                        value={dataColumns[0] || 1}
                        onChange={(e) =>
                          setDataColumns([Number(e.target.value)])
                        }
                      >
                        {tableData?.headers.map((h, i) => (
                          <option key={i} value={i}>
                            {h || `Колонка ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="stack edit-stat-field-spacing">
                      <span>Количество интервалов (bins): {bins}</span>
                      <input
                        type="range"
                        min={3}
                        max={20}
                        value={bins}
                        onChange={(e) => setBins(Number(e.target.value))}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label className="stack edit-stat-field-spacing">
                      <span>Колонка меток (X)</span>
                      <select
                        value={labelColumn}
                        onChange={(e) => setLabelColumn(Number(e.target.value))}
                      >
                        {tableData?.headers.map((h, i) => (
                          <option key={i} value={i}>
                            {h || `Колонка ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="edit-stat-field-spacing">
                      <span className="muted">Колонки данных (Y)</span>
                      <div className="row gap edit-stat-data-columns-wrap">
                        {tableData?.headers.map(
                          (h, i) =>
                            i !== labelColumn && (
                              <label
                                key={i}
                                className="row gap edit-stat-align-center"
                              >
                                <input
                                  type="checkbox"
                                  checked={dataColumns.includes(i)}
                                  onChange={() => toggleDataColumn(i)}
                                  className="edit-stat-checkbox-auto"
                                />
                                <span className="edit-stat-data-column-label">
                                  {h || `Колонка ${i + 1}`}
                                </span>
                              </label>
                            ),
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Preview */}
              <div className="edit-stat-preview-panel">
                <div className="muted edit-stat-preview-title">
                  Предпросмотр:
                </div>
                {tableData &&
                (chartType === "scatter" ||
                  chartType === "histogram" ||
                  dataColumns.length > 0) ? (
                  <ChartFromTable
                    tableData={tableData}
                    config={config}
                    height={280}
                    theme="dark"
                  />
                ) : (
                  <div className="muted edit-stat-preview-empty">
                    Выберите колонки данных
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Table Data Tab */}
          {activeTab === "table" && tableData && (
            <div>
              <div className="row space edit-stat-table-header-row">
                <span className="muted">
                  {tableData.rows.length} строк × {tableData.headers.length}{" "}
                  колонок
                </span>
                <div className="row gap">
                  <button
                    className="btn secondary edit-stat-table-action-btn"
                    onClick={addColumn}
                  >
                    + Колонка
                  </button>
                  <button
                    className="btn secondary edit-stat-table-action-btn"
                    onClick={addRow}
                  >
                    + Строка
                  </button>
                </div>
              </div>

              <div className="edit-stat-table-container">
                <table className="chart-source-table edit-stat-table">
                  <thead>
                    <tr>
                      <th className="edit-stat-row-index-header">#</th>
                      {tableData.headers.map((h: string, i: number) => (
                        <th key={i}>
                          <div className="row gap edit-stat-align-center">
                            <input
                              type="text"
                              value={h}
                              onChange={(e) =>
                                handleHeaderChange(i, e.target.value)
                              }
                              className="chart-data-input header-input edit-stat-full-width-input"
                            />
                            {tableData.headers.length > 2 && (
                              <button
                                className="btn secondary edit-stat-remove-column-btn"
                                onClick={() => removeColumn(i)}
                                title="Удалить колонку"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.rows.map((row: string[], ri: number) => (
                      <tr key={ri}>
                        <td className="edit-stat-center-text">
                          <div className="row gap edit-stat-centered-row">
                            <span className="muted">{ri + 1}</span>
                            {tableData.rows.length > 1 && (
                              <button
                                className="btn secondary edit-stat-remove-row-btn"
                                onClick={() => removeRow(ri)}
                                title="Удалить строку"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </td>
                        {row.map((cell: string, ci: number) => (
                          <td key={ci}>
                            <input
                              type="text"
                              value={cell}
                              onChange={(e) =>
                                handleCellChange(ri, ci, e.target.value)
                              }
                              className="chart-data-input"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card edit-stat-table-hint-card">
                <div className="muted edit-stat-table-hint-text">
                  <LightBulbIcon />
                  Подсказка: Изменения в таблице автоматически отразятся на
                  графике
                </div>
              </div>
            </div>
          )}

          {/* Classification Tab */}
          {activeTab === "classification" && (
            <div>
              <div className="card edit-stat-classification-card">
                <div className="row space edit-stat-classification-header">
                  <strong className="edit-stat-classification-title">
                    <ChartBarIcon />
                    Классификация данных
                  </strong>
                  <span className="muted edit-stat-classification-method">
                    Рекомендуемый метод: {recommendedMethod}
                  </span>
                </div>

                <div className="row gap edit-stat-classification-fields">
                  <label className="stack edit-stat-classification-field">
                    <span className="muted edit-stat-classification-label">
                      Тип переменной
                    </span>
                    <select
                      value={variableType}
                      onChange={(e) =>
                        setVariableType(
                          e.target.value as "quantitative" | "qualitative",
                        )
                      }
                    >
                      <option value="quantitative">Количественные</option>
                      <option value="qualitative">Качественные</option>
                    </select>
                  </label>

                  <label className="stack edit-stat-classification-field">
                    <span className="muted edit-stat-classification-label">
                      Подтип
                    </span>
                    <select
                      value={subType}
                      onChange={(e) =>
                        setSubType(
                          e.target.value as DataClassification["subType"],
                        )
                      }
                    >
                      {variableType === "quantitative" ? (
                        <>
                          <option value="continuous">Непрерывные</option>
                          <option value="discrete">Дискретные</option>
                        </>
                      ) : (
                        <>
                          <option value="nominal">Номинальные</option>
                          <option value="dichotomous">Дихотомические</option>
                          <option value="ordinal">Порядковые</option>
                        </>
                      )}
                    </select>
                  </label>

                  {variableType === "quantitative" && (
                    <label className="stack edit-stat-classification-field">
                      <span className="muted edit-stat-classification-label">
                        Распределение
                      </span>
                      <select
                        value={
                          isNormalDistribution === undefined
                            ? ""
                            : isNormalDistribution
                              ? "yes"
                              : "no"
                        }
                        onChange={(e) => {
                          if (e.target.value === "")
                            setIsNormalDistribution(undefined);
                          else
                            setIsNormalDistribution(e.target.value === "yes");
                        }}
                      >
                        <option value="">Неизвестно</option>
                        <option value="yes">Нормальное</option>
                        <option value="no">Ненормальное</option>
                      </select>
                    </label>
                  )}
                </div>

                {recommendedTypes.length > 0 && (
                  <div>
                    <span className="muted edit-stat-classification-label">
                      Рекомендуемые типы графиков:{" "}
                    </span>
                    <div className="row gap edit-stat-recommended-wrap">
                      {recommendedTypes.map((t) => {
                        const info = CHART_TYPE_INFO[t] ?? {
                          name: String(t),
                          icon: <ChartBarIcon />,
                        };
                        const isSelected = chartType === t;
                        return (
                          <button
                            key={t}
                            onClick={() => {
                              setChartType(t);
                              setActiveTab("chart");
                            }}
                            className={getRecommendedTypeButtonClassName(
                              isSelected,
                            )}
                          >
                            {info.icon} {info.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Explanation cards */}
              <div className="edit-stat-explanation-grid">
                <div className="card edit-stat-explanation-card">
                  <h5 className="edit-stat-explanation-heading">
                    <QuantitativeIcon />
                    Количественные данные
                  </h5>
                  <p className="muted edit-stat-explanation-body">
                    <strong>Непрерывные:</strong> возраст, рост, вес, давление
                    <br />
                    <strong>Дискретные:</strong> количество детей, число визитов
                  </p>
                </div>
                <div className="card edit-stat-explanation-card">
                  <h5 className="edit-stat-explanation-heading">
                    <QualitativeIcon />
                    Качественные данные
                  </h5>
                  <p className="muted edit-stat-explanation-body">
                    <strong>Номинальные:</strong> группа крови, пол
                    <br />
                    <strong>Дихотомические:</strong> да/нет, жив/умер
                    <br />
                    <strong>Порядковые:</strong> степень тяжести, стадия
                    заболевания
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Actions */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button
            className="btn-primary edit-stat-save-btn"
            onClick={handleSave}
            disabled={saving || !title.trim()}
          >
            {saving ? (
              <>
                <SpinnerIcon />
                Сохранение...
              </>
            ) : (
              <>
                <SaveIcon />
                Сохранить изменения
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
