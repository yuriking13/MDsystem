import { Node, mergeAttributes } from "@tiptap/react";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import React, { useMemo, useState } from "react";
import ChartFromTable, { ChartConfig, TableData, CHART_TYPE_INFO, ChartType } from "./ChartFromTable";

// React компонент для отображения графика с названием и сворачиваемой таблицей
function ChartNodeView({ node, updateAttributes, editor }: { node: any; updateAttributes: (attrs: any) => void; editor: any }) {
  const [showSourceData, setShowSourceData] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<TableData | null>(null);
  
  const chartData = useMemo(() => {
    try {
      const data = node.attrs.chartData;
      if (typeof data === "string") {
        return JSON.parse(data);
      }
      return data;
    } catch {
      return null;
    }
  }, [node.attrs.chartData]);

  if (!chartData) {
    return (
      <NodeViewWrapper className="chart-node-wrapper">
        <div className="chart-error">Ошибка загрузки графика</div>
      </NodeViewWrapper>
    );
  }

  const { tableData, config } = chartData as { tableData: TableData; config: ChartConfig };
  const chartType = config.type as ChartType;
  const chartInfo = chartType ? CHART_TYPE_INFO[chartType] : null;
  const chartTitle = config.title || (chartInfo?.name || 'График');
  
  // Используем редактируемые данные если есть
  const displayData = editedData || tableData;

  // Функция для обновления данных таблицы
  const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
    const newData = { ...displayData };
    newData.rows = [...newData.rows];
    newData.rows[rowIdx] = [...newData.rows[rowIdx]];
    newData.rows[rowIdx][colIdx] = value;
    setEditedData(newData);
  };

  const handleHeaderChange = (colIdx: number, value: string) => {
    const newData = { ...displayData };
    newData.headers = [...newData.headers];
    newData.headers[colIdx] = value;
    setEditedData(newData);
  };

  // Сохранить изменения
  const handleSaveChanges = () => {
    if (editedData) {
      const newChartData = {
        ...chartData,
        tableData: editedData,
      };
      updateAttributes({
        chartData: JSON.stringify(newChartData),
      });
      setIsEditing(false);
    }
  };

  // Отменить изменения
  const handleCancelEdit = () => {
    setEditedData(null);
    setIsEditing(false);
  };

  return (
    <NodeViewWrapper className="chart-node-wrapper" data-drag-handle>
      <div className="chart-container-live">
        {/* Заголовок графика - РИСУНОК, не таблица */}
        <div className="chart-caption">
          <span className="chart-caption-label">Рисунок.</span>
          <span className="chart-caption-title">{chartTitle}</span>
          {chartInfo && (
            <span className="chart-type-badge" title={chartInfo.description}>
              {chartInfo.icon} {chartInfo.name}
            </span>
          )}
        </div>
        
        {/* График */}
        <ChartFromTable 
          tableData={displayData} 
          config={config} 
          height={300} 
        />
        
        {/* Кнопки управления */}
        <div className="chart-actions">
          <button 
            className="chart-toggle-data"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowSourceData(!showSourceData);
            }}
            type="button"
          >
            {showSourceData ? '▼ Скрыть данные' : '▶ Показать данные'}
          </button>
          
          {showSourceData && !isEditing && (
            <button 
              className="chart-toggle-data"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setEditedData({ ...displayData });
                setIsEditing(true);
              }}
              type="button"
            >
              ✏️ Редактировать
            </button>
          )}
          
          {isEditing && (
            <>
              <button 
                className="chart-toggle-data chart-save-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveChanges();
                }}
                type="button"
              >
                💾 Сохранить
              </button>
              <button 
                className="chart-toggle-data"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCancelEdit();
                }}
                type="button"
              >
                ✕ Отмена
              </button>
            </>
          )}
        </div>
        
        {/* Сворачиваемая таблица с исходными данными */}
        {showSourceData && displayData && (
          <div className="chart-source-data">
            <div className="chart-source-header">
              Таблица. Исходные данные:
              {isEditing && <span className="editing-badge"> (редактирование)</span>}
            </div>
            <table className="chart-source-table">
              <thead>
                <tr>
                  {displayData.headers.map((h, i) => (
                    <th key={i}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={h}
                          onChange={(e) => handleHeaderChange(i, e.target.value)}
                          className="chart-data-input header-input"
                        />
                      ) : (
                        h || `Колонка ${i + 1}`
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayData.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={cell}
                            onChange={(e) => handleCellChange(ri, ci, e.target.value)}
                            className="chart-data-input"
                          />
                        ) : (
                          cell
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// TipTap Node расширение
export const ChartNode = Node.create({
  name: "chartNode",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      chartData: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-chart"),
        renderHTML: (attributes) => {
          if (!attributes.chartData) return {};
          return {
            "data-chart":
              typeof attributes.chartData === "string"
                ? attributes.chartData
                : JSON.stringify(attributes.chartData),
          };
        },
      },
      statisticId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-statistic-id"),
        renderHTML: (attributes) => {
          if (!attributes.statisticId) return {};
          return { "data-statistic-id": attributes.statisticId };
        },
      },
      figureNumber: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-figure-number"),
        renderHTML: (attributes) => {
          if (!attributes.figureNumber) return {};
          return { "data-figure-number": attributes.figureNumber };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.chart-container[data-chart]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ class: "chart-container" }, HTMLAttributes),
      ["div", { class: "chart-placeholder" }, "📊 График"],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChartNodeView);
  },
});

export default ChartNode;
