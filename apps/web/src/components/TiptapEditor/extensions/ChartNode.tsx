import {
  Node,
  mergeAttributes,
  type Editor,
  type NodeViewProps,
} from "@tiptap/react";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import React, { useMemo, useState } from "react";
import ChartFromTable, {
  type TableData,
  type ChartConfig,
  CHART_TYPE_INFO,
  type ChartType,
} from "../../ChartFromTable";

// Chart color schemes
export const CHART_COLOR_SCHEMES = {
  default: {
    name: "По умолчанию",
    colors: [
      "rgba(75, 116, 255, 0.8)",
      "rgba(74, 222, 128, 0.8)",
      "rgba(255, 107, 107, 0.8)",
      "rgba(251, 191, 36, 0.8)",
      "rgba(168, 85, 247, 0.8)",
      "rgba(236, 72, 153, 0.8)",
    ],
  },
  cool: {
    name: "Холодные",
    colors: [
      "rgba(59, 130, 246, 0.8)",
      "rgba(34, 211, 238, 0.8)",
      "rgba(99, 102, 241, 0.8)",
      "rgba(139, 92, 246, 0.8)",
      "rgba(6, 182, 212, 0.8)",
      "rgba(79, 70, 229, 0.8)",
    ],
  },
  warm: {
    name: "Тёплые",
    colors: [
      "rgba(239, 68, 68, 0.8)",
      "rgba(249, 115, 22, 0.8)",
      "rgba(234, 179, 8, 0.8)",
      "rgba(251, 146, 60, 0.8)",
      "rgba(220, 38, 38, 0.8)",
      "rgba(245, 158, 11, 0.8)",
    ],
  },
  mono: {
    name: "Монохром",
    colors: [
      "rgba(30, 41, 59, 0.9)",
      "rgba(51, 65, 85, 0.8)",
      "rgba(71, 85, 105, 0.7)",
      "rgba(100, 116, 139, 0.6)",
      "rgba(148, 163, 184, 0.5)",
      "rgba(203, 213, 225, 0.4)",
    ],
  },
  scientific: {
    name: "Научный",
    colors: [
      "rgba(0, 63, 92, 0.8)",
      "rgba(47, 75, 124, 0.8)",
      "rgba(102, 81, 145, 0.8)",
      "rgba(160, 81, 149, 0.8)",
      "rgba(212, 80, 135, 0.8)",
      "rgba(249, 93, 106, 0.8)",
    ],
  },
};

// Chart node attributes
export interface ChartNodeAttrs {
  chartId: string;
  tableData: TableData;
  config: ChartConfig;
  title?: string;
  colorScheme?: keyof typeof CHART_COLOR_SCHEMES;
  backgroundColor?: string;
  // Axis labels
  xAxisLabel?: string;
  yAxisLabel?: string;
  // Text/axis colors (default black)
  textColor?: string;
  axisColor?: string;
}

type ChartNodeRenderableAttrs = Partial<ChartNodeAttrs>;

const CHART_BACKGROUND_CLASS_MAP: Record<string, string> = {
  white: "chart-node-bg-white",
  "#f8fafc": "chart-node-bg-slate-50",
  "#f1f5f9": "chart-node-bg-slate-100",
  "#e2e8f0": "chart-node-bg-slate-200",
  "#eff6ff": "chart-node-bg-blue-50",
  "#fef3c7": "chart-node-bg-amber-100",
};

function getChartBackgroundClass(backgroundColor: string): string {
  return CHART_BACKGROUND_CLASS_MAP[backgroundColor] ?? "chart-node-bg-white";
}

const CHART_SWATCH_COLOR_CLASS_MAP: Record<string, string> = {
  "rgba(75, 116, 255, 0.8)": "chart-node-color-swatch--default-1",
  "rgba(74, 222, 128, 0.8)": "chart-node-color-swatch--default-2",
  "rgba(255, 107, 107, 0.8)": "chart-node-color-swatch--default-3",
  "rgba(251, 191, 36, 0.8)": "chart-node-color-swatch--default-4",
  "rgba(168, 85, 247, 0.8)": "chart-node-color-swatch--default-5",
  "rgba(236, 72, 153, 0.8)": "chart-node-color-swatch--default-6",
  "rgba(59, 130, 246, 0.8)": "chart-node-color-swatch--cool-1",
  "rgba(34, 211, 238, 0.8)": "chart-node-color-swatch--cool-2",
  "rgba(99, 102, 241, 0.8)": "chart-node-color-swatch--cool-3",
  "rgba(139, 92, 246, 0.8)": "chart-node-color-swatch--cool-4",
  "rgba(6, 182, 212, 0.8)": "chart-node-color-swatch--cool-5",
  "rgba(79, 70, 229, 0.8)": "chart-node-color-swatch--cool-6",
  "rgba(239, 68, 68, 0.8)": "chart-node-color-swatch--warm-1",
  "rgba(249, 115, 22, 0.8)": "chart-node-color-swatch--warm-2",
  "rgba(234, 179, 8, 0.8)": "chart-node-color-swatch--warm-3",
  "rgba(251, 146, 60, 0.8)": "chart-node-color-swatch--warm-4",
  "rgba(220, 38, 38, 0.8)": "chart-node-color-swatch--warm-5",
  "rgba(245, 158, 11, 0.8)": "chart-node-color-swatch--warm-6",
  "rgba(30, 41, 59, 0.9)": "chart-node-color-swatch--mono-1",
  "rgba(51, 65, 85, 0.8)": "chart-node-color-swatch--mono-2",
  "rgba(71, 85, 105, 0.7)": "chart-node-color-swatch--mono-3",
  "rgba(100, 116, 139, 0.6)": "chart-node-color-swatch--mono-4",
  "rgba(148, 163, 184, 0.5)": "chart-node-color-swatch--mono-5",
  "rgba(203, 213, 225, 0.4)": "chart-node-color-swatch--mono-6",
  "rgba(0, 63, 92, 0.8)": "chart-node-color-swatch--scientific-1",
  "rgba(47, 75, 124, 0.8)": "chart-node-color-swatch--scientific-2",
  "rgba(102, 81, 145, 0.8)": "chart-node-color-swatch--scientific-3",
  "rgba(160, 81, 149, 0.8)": "chart-node-color-swatch--scientific-4",
  "rgba(212, 80, 135, 0.8)": "chart-node-color-swatch--scientific-5",
  "rgba(249, 93, 106, 0.8)": "chart-node-color-swatch--scientific-6",
};

function getSwatchColorClass(color: string): string {
  return (
    CHART_SWATCH_COLOR_CLASS_MAP[color] ?? "chart-node-color-swatch--default-1"
  );
}

// React component for rendering the chart
function ChartNodeView({
  node,
  updateAttributes,
}: Pick<NodeViewProps, "node" | "updateAttributes">) {
  const attrs = node.attrs as ChartNodeAttrs;
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(
    attrs.title || attrs.config?.title || "",
  );
  const [selectedColorScheme, setSelectedColorScheme] = useState<
    keyof typeof CHART_COLOR_SCHEMES
  >(attrs.colorScheme || "default");
  const [selectedChartType, setSelectedChartType] = useState<ChartType>(
    attrs.config?.type || "bar",
  );
  const [bgColor, setBgColor] = useState(attrs.backgroundColor || "white");
  const [xAxisLabel, setXAxisLabel] = useState(
    attrs.xAxisLabel || attrs.config?.xAxisLabel || "",
  );
  const [yAxisLabel, setYAxisLabel] = useState(
    attrs.yAxisLabel || attrs.config?.yAxisLabel || "",
  );
  const [textColor, setTextColor] = useState(
    attrs.textColor || attrs.config?.textColor || "#000000",
  );
  const [axisColor, setAxisColor] = useState(
    attrs.axisColor || attrs.config?.axisColor || "#000000",
  );

  const { tableData, config, title } = attrs;

  // Apply color scheme and axis options to config
  const effectiveConfig = useMemo(() => {
    if (!config) return config;
    const scheme =
      CHART_COLOR_SCHEMES[selectedColorScheme] || CHART_COLOR_SCHEMES.default;
    return {
      ...config,
      type: selectedChartType,
      title: editTitle || config.title,
      colors: scheme.colors,
      xAxisLabel: xAxisLabel || config.xAxisLabel,
      yAxisLabel: yAxisLabel || config.yAxisLabel,
      textColor: textColor || config.textColor || "#000000",
      axisColor: axisColor || config.axisColor || "#000000",
    };
  }, [
    config,
    selectedColorScheme,
    selectedChartType,
    editTitle,
    xAxisLabel,
    yAxisLabel,
    textColor,
    axisColor,
  ]);

  if (!tableData || !config) {
    return (
      <NodeViewWrapper className="chart-node-wrapper">
        <div className="chart-node-error">
          ⚠️ Ошибка: данные графика не найдены
        </div>
      </NodeViewWrapper>
    );
  }

  const handleSave = () => {
    updateAttributes({
      title: editTitle,
      colorScheme: selectedColorScheme,
      backgroundColor: bgColor,
      xAxisLabel,
      yAxisLabel,
      textColor,
      axisColor,
      config: {
        ...config,
        type: selectedChartType,
        title: editTitle,
        colors: CHART_COLOR_SCHEMES[selectedColorScheme].colors,
        xAxisLabel,
        yAxisLabel,
        textColor,
        axisColor,
      },
    });
    setIsEditing(false);
  };

  const chartTypes: ChartType[] = [
    "bar",
    "line",
    "pie",
    "doughnut",
    "histogram",
    "stacked",
    "scatter",
    "boxplot",
  ];
  const chartBackgroundClass = getChartBackgroundClass(bgColor);
  const containerClassName = `chart-node-container ${chartBackgroundClass}`;
  const headerClassName = `chart-node-header ${
    bgColor === "white"
      ? "chart-node-header--default"
      : "chart-node-header--tinted"
  }`;
  const contentClassName = `chart-node-content ${chartBackgroundClass}`;

  return (
    <NodeViewWrapper
      className="chart-node-wrapper"
      data-chart-id={attrs.chartId}
    >
      <div className={containerClassName}>
        <div className={headerClassName}>
          {isEditing ? (
            <input
              className="chart-title-input chart-title-input--editing"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Название графика"
            />
          ) : (
            <span className="chart-node-title">
              {editTitle || title || config.title || "График"}
            </span>
          )}
          <div className="chart-node-header-actions">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="chart-node-action-btn chart-node-action-btn--save"
                >
                  ✓ Сохранить
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="chart-node-action-btn chart-node-action-btn--cancel"
                >
                  ✕
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="chart-node-action-btn chart-node-action-btn--edit"
                title="Редактировать график"
              >
                Редактировать
              </button>
            )}
          </div>
        </div>

        {/* Edit panel */}
        {isEditing && (
          <div className="chart-edit-panel">
            {/* Chart Type */}
            <div className="chart-node-field-group">
              <label className="chart-node-field-label">Тип графика</label>
              <select
                value={selectedChartType}
                onChange={(e) =>
                  setSelectedChartType(e.target.value as ChartType)
                }
                className="chart-node-select"
              >
                {chartTypes.map((type) => (
                  <option key={type} value={type}>
                    {CHART_TYPE_INFO[type]?.name || type}
                  </option>
                ))}
              </select>
            </div>

            {/* Color Scheme */}
            <div className="chart-node-field-group">
              <label className="chart-node-field-label">Цветовая схема</label>
              <select
                value={selectedColorScheme}
                onChange={(e) =>
                  setSelectedColorScheme(
                    e.target.value as keyof typeof CHART_COLOR_SCHEMES,
                  )
                }
                className="chart-node-select"
              >
                {Object.entries(CHART_COLOR_SCHEMES).map(([key, scheme]) => (
                  <option key={key} value={key}>
                    {scheme.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Background Color */}
            <div className="chart-node-field-group">
              <label className="chart-node-field-label">Фон</label>
              <select
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="chart-node-select"
              >
                <option value="white">Белый</option>
                <option value="#f8fafc">Светло-серый</option>
                <option value="#f1f5f9">Серый</option>
                <option value="#e2e8f0">Тёмно-серый</option>
                <option value="#eff6ff">Голубоватый</option>
                <option value="#fef3c7">Кремовый</option>
              </select>
            </div>

            {/* Color Preview */}
            <div className="chart-node-color-preview-row">
              {CHART_COLOR_SCHEMES[selectedColorScheme].colors
                .slice(0, 6)
                .map((color, i) => (
                  <div
                    key={i}
                    className={`chart-node-color-swatch ${getSwatchColorClass(
                      color,
                    )}`}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Advanced edit panel for axis labels and colors */}
        {isEditing && (
          <div className="chart-axis-panel">
            {/* X Axis Label */}
            <div className="chart-node-field-group">
              <label className="chart-node-field-label">Подпись оси X</label>
              <input
                value={xAxisLabel}
                onChange={(e) => setXAxisLabel(e.target.value)}
                placeholder="Ось X"
                className="chart-node-axis-input"
              />
            </div>

            {/* Y Axis Label */}
            <div className="chart-node-field-group">
              <label className="chart-node-field-label">Подпись оси Y</label>
              <input
                value={yAxisLabel}
                onChange={(e) => setYAxisLabel(e.target.value)}
                placeholder="Ось Y"
                className="chart-node-axis-input"
              />
            </div>

            {/* Text Color */}
            <div className="chart-node-field-group">
              <label className="chart-node-field-label">Цвет текста</label>
              <div className="chart-node-color-input-row">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="chart-node-color-input"
                />
                <span className="chart-node-color-value">{textColor}</span>
              </div>
            </div>

            {/* Axis Color */}
            <div className="chart-node-field-group">
              <label className="chart-node-field-label">Цвет осей</label>
              <div className="chart-node-color-input-row">
                <input
                  type="color"
                  value={axisColor}
                  onChange={(e) => setAxisColor(e.target.value)}
                  className="chart-node-color-input"
                />
                <span className="chart-node-color-value">{axisColor}</span>
              </div>
            </div>

            {/* Reset to black button */}
            <button
              onClick={() => {
                setTextColor("#000000");
                setAxisColor("#000000");
              }}
              className="chart-node-reset-colors-btn"
              title="Сбросить цвета на чёрный"
            >
              ⟲ По умолчанию
            </button>
          </div>
        )}

        <div className={contentClassName}>
          <ChartFromTable
            tableData={tableData}
            config={effectiveConfig}
            height={300}
          />
        </div>
      </div>
    </NodeViewWrapper>
  );
}

// TipTap extension
export const ChartNode = Node.create({
  name: "chartNode",

  group: "block",

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      chartId: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-chart-id"),
        renderHTML: (attributes: ChartNodeRenderableAttrs) => {
          return attributes.chartId
            ? { "data-chart-id": attributes.chartId }
            : {};
        },
      },
      tableData: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const data = element.getAttribute("data-table-data");
          return data ? JSON.parse(data) : null;
        },
        renderHTML: (attributes: ChartNodeRenderableAttrs) => {
          return attributes.tableData
            ? {
                "data-table-data": JSON.stringify(attributes.tableData),
              }
            : {};
        },
      },
      config: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const data = element.getAttribute("data-config");
          return data ? JSON.parse(data) : null;
        },
        renderHTML: (attributes: ChartNodeRenderableAttrs) => {
          return attributes.config
            ? {
                "data-config": JSON.stringify(attributes.config),
              }
            : {};
        },
      },
      title: {
        default: "",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-title") || "",
        renderHTML: (attributes: ChartNodeRenderableAttrs) => {
          return attributes.title ? { "data-title": attributes.title } : {};
        },
      },
      colorScheme: {
        default: "default",
      },
      backgroundColor: {
        default: "white",
      },
      xAxisLabel: {
        default: "",
      },
      yAxisLabel: {
        default: "",
      },
      textColor: {
        default: "#000000",
      },
      axisColor: {
        default: "#000000",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="chart-node"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "chart-node" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChartNodeView);
  },
});

// Helper function to insert chart (instead of command)
export function insertChartIntoEditor(editor: Editor, attrs: ChartNodeAttrs) {
  if (!editor || !editor.view || editor.isDestroyed) {
    console.error("Editor is not available or has been destroyed");
    return false;
  }

  try {
    editor
      .chain()
      .focus()
      .insertContent({
        type: "chartNode",
        attrs,
      })
      .run();
    return true;
  } catch (error) {
    console.error("Failed to insert chart:", error);
    return false;
  }
}

export default ChartNode;
