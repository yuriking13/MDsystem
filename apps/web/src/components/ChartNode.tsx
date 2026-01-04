import { Node, mergeAttributes } from "@tiptap/react";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import React, { useMemo, useState, useEffect } from "react";
import ChartFromTable, { ChartConfig, TableData, CHART_TYPE_INFO, ChartType } from "./ChartFromTable";
import { apiGetStatistic, apiUpdateStatistic, type ProjectStatistic, type DataClassification } from "../lib/api";

// React компонент для отображения графика с названием и сворачиваемой таблицей
function ChartNodeView({ node, updateAttributes, editor }: { node: any; updateAttributes: (attrs: any) => void; editor: any }) {
  const [showSourceData, setShowSourceData] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<TableData | null>(null);
  const [syncedStat, setSyncedStat] = useState<ProjectStatistic | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const projectId = node.attrs.projectId;
  const statisticId = node.attrs.statisticId;

  // Initial load from attributes
  const initialChartData = useMemo(() => {
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

  // Sync with backend
  useEffect(() => {
    if (projectId && statisticId) {
      setLoading(true);
      apiGetStatistic(projectId, statisticId)
        .then(res => {
          setSyncedStat(res.statistic);
          // Update local attributes to match backend if needed
          if (res.statistic.config && res.statistic.table_data) {
             const newData = {
               config: res.statistic.config,
               tableData: res.statistic.table_data
             };
             // We don't necessarily want to trigger a document save every time we fetch,
             // but we want the display to be up to date.
             // If we want offline support, we should update attributes.
             if (JSON.stringify(newData) !== JSON.stringify(initialChartData)) {
                updateAttributes({
                  chartData: JSON.stringify(newData)
                });
             }
          }
        })
        .catch(err => {
          console.error("Failed to sync statistic:", err);
          setError("Ошибка синхронизации");
        })
        .finally(() => setLoading(false));
    }
  }, [projectId, statisticId]);

  // Determine what data to display
  const chartData = syncedStat 
    ? { config: syncedStat.config as ChartConfig, tableData: syncedStat.table_data as TableData }
    : initialChartData;

  if (!chartData) {
    return (
      <NodeViewWrapper className="chart-node-wrapper">
        <div className="chart-error">Ошибка загрузки графика {error ? `(${error})` : ''}</div>
      </NodeViewWrapper>
    );
  }

  const { tableData, config } = chartData;
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
  const handleSaveChanges = async () => {
    if (editedData) {
      const newConfig = { ...config }; // Preserve config, only update data here
      
      const newChartData = {
        config: newConfig,
        tableData: editedData,
      };
      
      // Update TipTap node
      updateAttributes({
        chartData: JSON.stringify(newChartData),
      });

      // Update Backend
      if (projectId && statisticId) {
        setLoading(true);
        try {
          await apiUpdateStatistic(projectId, statisticId, {
            tableData: editedData,
            config: newConfig
          });
          // Refresh synced stat
          const res = await apiGetStatistic(projectId, statisticId);
          setSyncedStat(res.statistic);
        } catch (err) {
          console.error("Failed to save to backend:", err);
          setError("Ошибка сохранения на сервере");
        } finally {
          setLoading(false);
        }
      }

      setIsEditing(false);
      setEditedData(null);
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
          {/* CSS counter handles numbering automatically */}
          <span className="chart-caption-label numbered">Рисунок</span>
          <span className="chart-caption-title">{chartTitle}</span>
          {chartInfo && (
            <span className="chart-type-badge" title={chartInfo.description}>
              {chartInfo.icon} {chartInfo.name}
            </span>
          )}
          {loading && <span className="muted" style={{fontSize: 10, marginLeft: 8}}>🔄</span>}
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
              ✏️ Редактировать данные
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
                disabled={loading}
              >
                {loading ? '⏳...' : '💾 Сохранить'}
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
                  {displayData.headers.map((h: string, i: number) => (
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
                {displayData.rows.map((row: string[], ri: number) => (
                  <tr key={ri}>
                    {row.map((cell: string, ci: number) => (
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
      projectId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-project-id"),
        renderHTML: (attributes) => {
          if (!attributes.projectId) return {};
          return { "data-project-id": attributes.projectId };
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
