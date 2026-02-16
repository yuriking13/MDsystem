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
  const containerStyle: React.CSSProperties = { backgroundColor: bgColor };
  const headerStyle: React.CSSProperties = {
    background: bgColor === "white" ? "#f8fafc" : "rgba(0,0,0,0.05)",
  };
  const titleInputStyle: React.CSSProperties = {
    flex: 1,
    padding: "4px 8px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    fontSize: "14px",
    background: "white",
  };
  const headerActionsStyle: React.CSSProperties = {
    display: "flex",
    gap: "4px",
  };
  const saveButtonStyle: React.CSSProperties = {
    padding: "4px 8px",
    fontSize: "11px",
    background: "#4ade80",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  };
  const cancelButtonStyle: React.CSSProperties = {
    padding: "4px 8px",
    fontSize: "11px",
    background: "#94a3b8",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  };
  const editButtonStyle: React.CSSProperties = {
    padding: "4px 8px",
    fontSize: "11px",
    background: "rgba(75,116,255,0.1)",
    color: "#4b74ff",
    border: "1px solid rgba(75,116,255,0.3)",
    borderRadius: "4px",
    cursor: "pointer",
  };
  const editPanelStyle: React.CSSProperties = {
    padding: "12px 16px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    alignItems: "center",
    background: "rgba(0,0,0,0.02)",
  };
  const axisPanelStyle: React.CSSProperties = {
    padding: "12px 16px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    alignItems: "flex-end",
    background: "rgba(0,0,0,0.02)",
  };
  const fieldGroupStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  };
  const fieldLabelStyle: React.CSSProperties = {
    fontSize: "11px",
    color: "#64748b",
  };
  const selectStyle: React.CSSProperties = {
    padding: "4px 8px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    fontSize: "12px",
  };
  const axisInputStyle: React.CSSProperties = {
    padding: "4px 8px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    fontSize: "12px",
    width: "120px",
  };
  const colorPreviewRowStyle: React.CSSProperties = {
    display: "flex",
    gap: "2px",
    alignItems: "center",
  };
  const colorInputRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  };
  const colorInputStyle: React.CSSProperties = {
    width: "32px",
    height: "28px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    cursor: "pointer",
    padding: "2px",
  };
  const colorValueStyle: React.CSSProperties = {
    fontSize: "10px",
    color: "#64748b",
  };
  const resetColorsButtonStyle: React.CSSProperties = {
    padding: "4px 8px",
    fontSize: "11px",
    background: "#f1f5f9",
    color: "#475569",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    cursor: "pointer",
  };
  const chartContentStyle: React.CSSProperties = {
    padding: "16px",
    minHeight: "300px",
    background: bgColor,
  };

  const getSwatchStyle = (color: string): React.CSSProperties => ({
    width: "16px",
    height: "16px",
    borderRadius: "2px",
    background: color,
    border: "1px solid rgba(0,0,0,0.1)",
  });

  return (
    <NodeViewWrapper
      className="chart-node-wrapper"
      data-chart-id={attrs.chartId}
    >
      <div className="chart-node-container" style={containerStyle}>
        <div className="chart-node-header" style={headerStyle}>
          {isEditing ? (
            <input
              className="chart-title-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Название графика"
              style={titleInputStyle}
            />
          ) : (
            <span className="chart-node-title">
              {editTitle || title || config.title || "График"}
            </span>
          )}
          <div style={headerActionsStyle}>
            {isEditing ? (
              <>
                <button onClick={handleSave} style={saveButtonStyle}>
                  ✓ Сохранить
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  style={cancelButtonStyle}
                >
                  ✕
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                style={editButtonStyle}
                title="Редактировать график"
              >
                Редактировать
              </button>
            )}
          </div>
        </div>

        {/* Edit panel */}
        {isEditing && (
          <div className="chart-edit-panel" style={editPanelStyle}>
            {/* Chart Type */}
            <div style={fieldGroupStyle}>
              <label style={fieldLabelStyle}>Тип графика</label>
              <select
                value={selectedChartType}
                onChange={(e) =>
                  setSelectedChartType(e.target.value as ChartType)
                }
                style={selectStyle}
              >
                {chartTypes.map((type) => (
                  <option key={type} value={type}>
                    {CHART_TYPE_INFO[type]?.name || type}
                  </option>
                ))}
              </select>
            </div>

            {/* Color Scheme */}
            <div style={fieldGroupStyle}>
              <label style={fieldLabelStyle}>Цветовая схема</label>
              <select
                value={selectedColorScheme}
                onChange={(e) =>
                  setSelectedColorScheme(
                    e.target.value as keyof typeof CHART_COLOR_SCHEMES,
                  )
                }
                style={selectStyle}
              >
                {Object.entries(CHART_COLOR_SCHEMES).map(([key, scheme]) => (
                  <option key={key} value={key}>
                    {scheme.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Background Color */}
            <div style={fieldGroupStyle}>
              <label style={fieldLabelStyle}>Фон</label>
              <select
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                style={selectStyle}
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
            <div style={colorPreviewRowStyle}>
              {CHART_COLOR_SCHEMES[selectedColorScheme].colors
                .slice(0, 6)
                .map((color, i) => (
                  <div key={i} style={getSwatchStyle(color)} />
                ))}
            </div>
          </div>
        )}

        {/* Advanced edit panel for axis labels and colors */}
        {isEditing && (
          <div className="chart-axis-panel" style={axisPanelStyle}>
            {/* X Axis Label */}
            <div style={fieldGroupStyle}>
              <label style={fieldLabelStyle}>Подпись оси X</label>
              <input
                value={xAxisLabel}
                onChange={(e) => setXAxisLabel(e.target.value)}
                placeholder="Ось X"
                style={axisInputStyle}
              />
            </div>

            {/* Y Axis Label */}
            <div style={fieldGroupStyle}>
              <label style={fieldLabelStyle}>Подпись оси Y</label>
              <input
                value={yAxisLabel}
                onChange={(e) => setYAxisLabel(e.target.value)}
                placeholder="Ось Y"
                style={axisInputStyle}
              />
            </div>

            {/* Text Color */}
            <div style={fieldGroupStyle}>
              <label style={fieldLabelStyle}>Цвет текста</label>
              <div style={colorInputRowStyle}>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  style={colorInputStyle}
                />
                <span style={colorValueStyle}>{textColor}</span>
              </div>
            </div>

            {/* Axis Color */}
            <div style={fieldGroupStyle}>
              <label style={fieldLabelStyle}>Цвет осей</label>
              <div style={colorInputRowStyle}>
                <input
                  type="color"
                  value={axisColor}
                  onChange={(e) => setAxisColor(e.target.value)}
                  style={colorInputStyle}
                />
                <span style={colorValueStyle}>{axisColor}</span>
              </div>
            </div>

            {/* Reset to black button */}
            <button
              onClick={() => {
                setTextColor("#000000");
                setAxisColor("#000000");
              }}
              style={resetColorsButtonStyle}
              title="Сбросить цвета на чёрный"
            >
              ⟲ По умолчанию
            </button>
          </div>
        )}

        <div className="chart-node-content" style={chartContentStyle}>
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
