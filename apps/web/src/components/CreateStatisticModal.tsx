import React, { useState } from "react";
import ChartFromTable, {
  CHART_TYPE_INFO,
  type ChartType,
  type ChartConfig,
  type TableData,
  type DataClassification,
  getRecommendedChartTypes,
  getRecommendedStatMethod,
} from "./ChartFromTable";
import { apiCreateStatistic, type ProjectStatistic } from "../lib/api";

// SVG Icons (Flowbite/Heroicons style)
const PlusIcon = () => (
  <svg
    className="icon-md create-stat-icon-accent"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.5v15m7.5-7.5h-15"
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

const TableIcon = () => (
  <svg
    className="icon-sm create-stat-icon-gap-6"
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

const ChartIcon = () => (
  <svg
    className="icon-sm create-stat-icon-gap-6"
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

const BeakerIcon = () => (
  <svg
    className="icon-sm create-stat-icon-gap-6"
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

const QuantitativeIcon = () => (
  <svg
    className="icon-sm create-stat-icon-gap-4-no-shrink"
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
    className="icon-sm create-stat-icon-gap-4-no-shrink"
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

const LightBulbIcon = () => (
  <svg
    className="icon-sm create-stat-icon-gap-6 create-stat-icon-accent"
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

const CheckIcon = () => (
  <svg
    className="icon-sm create-stat-icon-gap-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 12.75l6 6 9-13.5"
    />
  </svg>
);

const SpinnerIcon = () => (
  <svg
    className="icon-sm loading-spinner create-stat-icon-gap-4"
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

const TableDataIcon = () => (
  <svg
    className="icon-sm create-stat-icon-gap-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125"
    />
  </svg>
);

type Props = {
  projectId: string;
  onClose: () => void;
  onCreated: (statistic: ProjectStatistic) => void;
};

const DEFAULT_TABLE_DATA: TableData = {
  headers: ["Категория", "Значение"],
  rows: [
    ["Группа 1", "10"],
    ["Группа 2", "25"],
    ["Группа 3", "15"],
  ],
};

export default function CreateStatisticModal({
  projectId,
  onClose,
  onCreated,
}: Props) {
  const [title, setTitle] = useState("Новый график");
  const [description, setDescription] = useState("");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [tableData, setTableData] = useState<TableData>(DEFAULT_TABLE_DATA);
  const [labelColumn, setLabelColumn] = useState(0);
  const [dataColumns, setDataColumns] = useState<number[]>([1]);
  const [bins, setBins] = useState(10);
  const [xColumn, setXColumn] = useState(0);
  const [yColumn, setYColumn] = useState(1);

  // Data classification
  const [variableType, setVariableType] = useState<
    "quantitative" | "qualitative"
  >("quantitative");
  const [subType, setSubType] =
    useState<DataClassification["subType"]>("continuous");
  const [isNormalDistribution, setIsNormalDistribution] = useState<
    boolean | undefined
  >(undefined);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "table" | "chart" | "classification"
  >("table");

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
    const newData = { ...tableData };
    newData.rows = [...newData.rows];
    newData.rows[rowIdx] = [...newData.rows[rowIdx]];
    newData.rows[rowIdx][colIdx] = value;
    setTableData(newData);
  };

  const handleHeaderChange = (colIdx: number, value: string) => {
    const newData = { ...tableData };
    newData.headers = [...newData.headers];
    newData.headers[colIdx] = value;
    setTableData(newData);
  };

  const addRow = () => {
    const newRow = new Array(tableData.headers.length).fill("");
    setTableData({
      ...tableData,
      rows: [...tableData.rows, newRow],
    });
  };

  const removeRow = (rowIdx: number) => {
    if (tableData.rows.length <= 1) return;
    setTableData({
      ...tableData,
      rows: tableData.rows.filter((_, i) => i !== rowIdx),
    });
  };

  const addColumn = () => {
    setTableData({
      headers: [
        ...tableData.headers,
        `Колонка ${tableData.headers.length + 1}`,
      ],
      rows: tableData.rows.map((row) => [...row, ""]),
    });
  };

  const removeColumn = (colIdx: number) => {
    if (tableData.headers.length <= 2) return;
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

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("Введите название");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await apiCreateStatistic(projectId, {
        type: "chart",
        title: title.trim(),
        description: description.trim() || undefined,
        config: {
          type: chartType,
          title: title.trim(),
          labelColumn,
          dataColumns,
          bins,
          xColumn,
          yColumn,
          dataClassification: classification,
        },
        tableData,
        dataClassification: classification,
        chartType,
      });

      onCreated(result.statistic);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка создания");
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
    isCurrent: boolean,
    isRecommended: boolean,
  ): string =>
    `btn create-stat-chart-type-button ${
      isCurrent ? "" : "secondary"
    } ${isRecommended ? "create-stat-chart-type-button--recommended" : ""}`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content create-statistic-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title statistic-modal-title">
            <PlusIcon />
            Создать таблицу и график
          </h3>
          <button className="modal-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="alert statistic-modal-alert">{error}</div>}

          {/* Tabs */}
          <div className="tabs statistic-modal-tabs">
            <button
              className={`tab ${activeTab === "table" ? "active" : ""}`}
              onClick={() => setActiveTab("table")}
            >
              <TableIcon />
              1. Ввод данных
            </button>
            <button
              className={`tab ${activeTab === "chart" ? "active" : ""}`}
              onClick={() => setActiveTab("chart")}
            >
              <ChartIcon />
              2. Тип графика
            </button>
            <button
              className={`tab ${activeTab === "classification" ? "active" : ""}`}
              onClick={() => setActiveTab("classification")}
            >
              <BeakerIcon />
              3. Классификация
            </button>
          </div>

          {/* Step 1: Table Data */}
          {activeTab === "table" && (
            <div>
              <div className="row gap create-stat-title-row">
                <label className="stack create-stat-title-field">
                  <span>Название графика</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Например: Распределение по возрасту"
                  />
                </label>
              </div>

              <div className="row space create-stat-table-meta-row">
                <span className="muted create-stat-table-meta-label">
                  <TableDataIcon />
                  Таблица данных: {tableData.rows.length} строк ×{" "}
                  {tableData.headers.length} колонок
                </span>
                <div className="row gap">
                  <button
                    className="btn secondary create-stat-table-action-button"
                    onClick={addColumn}
                  >
                    + Колонка
                  </button>
                  <button
                    className="btn secondary create-stat-table-action-button"
                    onClick={addRow}
                  >
                    + Строка
                  </button>
                </div>
              </div>

              <div className="create-stat-table-wrap">
                <table className="chart-source-table create-stat-table">
                  <thead>
                    <tr>
                      <th className="create-stat-index-column">#</th>
                      {tableData.headers.map((h, i) => (
                        <th key={i}>
                          <div className="row gap create-stat-row-align-center">
                            <input
                              type="text"
                              value={h}
                              onChange={(e) =>
                                handleHeaderChange(i, e.target.value)
                              }
                              className="chart-data-input header-input create-stat-flex-1"
                            />
                            {tableData.headers.length > 2 && (
                              <button
                                className="btn secondary create-stat-remove-column-button"
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
                    {tableData.rows.map((row, ri) => (
                      <tr key={ri}>
                        <td className="create-stat-center-text">
                          <div className="row gap create-stat-centered-row">
                            <span className="muted">{ri + 1}</span>
                            {tableData.rows.length > 1 && (
                              <button
                                className="btn secondary create-stat-remove-row-button"
                                onClick={() => removeRow(ri)}
                                title="Удалить строку"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </td>
                        {row.map((cell, ci) => (
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

              <div className="card create-stat-table-hint-card">
                <div className="muted create-stat-table-hint-text">
                  <LightBulbIcon />
                  Введите данные в таблицу, затем перейдите к выбору типа
                  графика
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Chart Type */}
          {activeTab === "chart" && (
            <div className="row gap create-stat-chart-panel">
              <div className="create-stat-chart-config-column">
                <div className="create-stat-chart-type-block">
                  <span className="muted create-stat-chart-type-hint-label">
                    Выберите тип графика
                  </span>
                  <div className="create-stat-chart-type-buttons">
                    {allChartTypes.map((t) => {
                      const info = CHART_TYPE_INFO[t] ?? {
                        name: String(t),
                        icon: "📊",
                        description: "",
                      };
                      return (
                        <button
                          key={t}
                          className={getChartTypeButtonClassName(
                            chartType === t,
                            recommendedTypes.includes(t),
                          )}
                          onClick={() => setChartType(t)}
                          title={info.description}
                        >
                          {info.icon} {info.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {chartType === "scatter" ? (
                  <>
                    <label className="stack create-stat-field-spacing">
                      <span>Ось X (горизонтальная)</span>
                      <select
                        value={xColumn}
                        onChange={(e) => setXColumn(Number(e.target.value))}
                      >
                        {tableData.headers.map((h, i) => (
                          <option key={i} value={i}>
                            {h || `Колонка ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="stack create-stat-field-spacing">
                      <span>Ось Y (вертикальная)</span>
                      <select
                        value={yColumn}
                        onChange={(e) => setYColumn(Number(e.target.value))}
                      >
                        {tableData.headers.map((h, i) => (
                          <option key={i} value={i}>
                            {h || `Колонка ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : chartType === "histogram" ? (
                  <>
                    <label className="stack create-stat-field-spacing">
                      <span>Колонка с данными для гистограммы</span>
                      <select
                        value={dataColumns[0] || 1}
                        onChange={(e) =>
                          setDataColumns([Number(e.target.value)])
                        }
                      >
                        {tableData.headers.map((h, i) => (
                          <option key={i} value={i}>
                            {h || `Колонка ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="stack create-stat-field-spacing">
                      <span>Количество интервалов: {bins}</span>
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
                    <label className="stack create-stat-field-spacing">
                      <span>Колонка меток (подписи на оси X)</span>
                      <select
                        value={labelColumn}
                        onChange={(e) => setLabelColumn(Number(e.target.value))}
                      >
                        {tableData.headers.map((h, i) => (
                          <option key={i} value={i}>
                            {h || `Колонка ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="create-stat-field-spacing">
                      <span className="muted">
                        Колонки с данными (значения на оси Y)
                      </span>
                      <div className="row gap create-stat-data-columns-row">
                        {tableData.headers.map(
                          (h, i) =>
                            i !== labelColumn && (
                              <label
                                key={i}
                                className="row gap create-stat-row-align-center"
                              >
                                <input
                                  type="checkbox"
                                  checked={dataColumns.includes(i)}
                                  onChange={() => toggleDataColumn(i)}
                                  className="create-stat-checkbox-auto"
                                />
                                <span className="create-stat-option-text">
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
              <div className="create-stat-preview-panel">
                <div className="muted create-stat-preview-label">
                  Предпросмотр:
                </div>
                {chartType === "scatter" ||
                chartType === "histogram" ||
                dataColumns.length > 0 ? (
                  <ChartFromTable
                    tableData={tableData}
                    config={config}
                    height={280}
                    theme="dark"
                  />
                ) : (
                  <div className="muted create-stat-preview-empty">
                    Выберите колонки с данными
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Classification */}
          {activeTab === "classification" && (
            <div>
              <div className="card create-stat-classification-card">
                <div className="row space create-stat-classification-header">
                  <strong className="create-stat-classification-title">
                    <BeakerIcon />
                    Классификация данных
                  </strong>
                  <span className="muted create-stat-classification-subtitle">
                    Рекомендуемый метод: {recommendedMethod}
                  </span>
                </div>

                <div className="row gap create-stat-classification-fields">
                  <label className="stack create-stat-classification-field">
                    <span className="muted create-stat-classification-field-label">
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

                  <label className="stack create-stat-classification-field">
                    <span className="muted create-stat-classification-field-label">
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
                    <label className="stack create-stat-classification-field">
                      <span className="muted create-stat-classification-field-label">
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
              </div>

              <label className="stack create-stat-description-field">
                <span>Описание (необязательно)</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Описание графика или метода анализа..."
                  rows={3}
                  className="create-stat-description-textarea"
                />
              </label>

              {/* Explanation cards */}
              <div className="create-stat-explanation-grid">
                <div className="card create-stat-explanation-card">
                  <h5 className="create-stat-explanation-title">
                    <QuantitativeIcon />
                    Количественные данные
                  </h5>
                  <p className="muted create-stat-explanation-text">
                    <strong>Непрерывные:</strong> возраст, рост, вес, давление
                    <br />
                    <strong>Дискретные:</strong> количество детей, число визитов
                  </p>
                </div>
                <div className="card create-stat-explanation-card">
                  <h5 className="create-stat-explanation-title">
                    <QualitativeIcon />
                    Качественные данные
                  </h5>
                  <p className="muted create-stat-explanation-text">
                    <strong>Номинальные:</strong> группа крови, пол
                    <br />
                    <strong>Дихотомические:</strong> да/нет, жив/умер
                    <br />
                    <strong>Порядковые:</strong> степень тяжести
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Actions */}
        <div className="modal-footer create-stat-footer">
          <div className="row gap">
            {activeTab !== "table" && (
              <button
                className="btn-secondary"
                onClick={() =>
                  setActiveTab(
                    activeTab === "classification" ? "chart" : "table",
                  )
                }
              >
                ← Назад
              </button>
            )}
            {activeTab !== "classification" && (
              <button
                className="btn-secondary"
                onClick={() =>
                  setActiveTab(
                    activeTab === "table" ? "chart" : "classification",
                  )
                }
              >
                Далее →
              </button>
            )}
          </div>
          <div className="row gap">
            <button className="btn-secondary" onClick={onClose}>
              Отмена
            </button>
            <button
              className="btn-primary create-stat-create-button"
              onClick={handleCreate}
              disabled={saving || !title.trim()}
            >
              {saving ? (
                <>
                  <SpinnerIcon />
                  Создание...
                </>
              ) : (
                <>
                  <CheckIcon />
                  Создать график
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
