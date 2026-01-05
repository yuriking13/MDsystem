import { Node, mergeAttributes, type Editor } from '@tiptap/react';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useMemo, useState } from 'react';
import ChartFromTable, { type TableData, type ChartConfig, CHART_TYPE_INFO, type ChartType } from '../../ChartFromTable';

// Chart color schemes
export const CHART_COLOR_SCHEMES = {
  default: {
    name: 'По умолчанию',
    colors: [
      'rgba(75, 116, 255, 0.8)',
      'rgba(74, 222, 128, 0.8)',
      'rgba(255, 107, 107, 0.8)',
      'rgba(251, 191, 36, 0.8)',
      'rgba(168, 85, 247, 0.8)',
      'rgba(236, 72, 153, 0.8)',
    ],
  },
  cool: {
    name: 'Холодные',
    colors: [
      'rgba(59, 130, 246, 0.8)',
      'rgba(34, 211, 238, 0.8)',
      'rgba(99, 102, 241, 0.8)',
      'rgba(139, 92, 246, 0.8)',
      'rgba(6, 182, 212, 0.8)',
      'rgba(79, 70, 229, 0.8)',
    ],
  },
  warm: {
    name: 'Тёплые',
    colors: [
      'rgba(239, 68, 68, 0.8)',
      'rgba(249, 115, 22, 0.8)',
      'rgba(234, 179, 8, 0.8)',
      'rgba(251, 146, 60, 0.8)',
      'rgba(220, 38, 38, 0.8)',
      'rgba(245, 158, 11, 0.8)',
    ],
  },
  mono: {
    name: 'Монохром',
    colors: [
      'rgba(30, 41, 59, 0.9)',
      'rgba(51, 65, 85, 0.8)',
      'rgba(71, 85, 105, 0.7)',
      'rgba(100, 116, 139, 0.6)',
      'rgba(148, 163, 184, 0.5)',
      'rgba(203, 213, 225, 0.4)',
    ],
  },
  scientific: {
    name: 'Научный',
    colors: [
      'rgba(0, 63, 92, 0.8)',
      'rgba(47, 75, 124, 0.8)',
      'rgba(102, 81, 145, 0.8)',
      'rgba(160, 81, 149, 0.8)',
      'rgba(212, 80, 135, 0.8)',
      'rgba(249, 93, 106, 0.8)',
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
}

// React component for rendering the chart
function ChartNodeView({ node, updateAttributes }: { node: any; updateAttributes: (attrs: Partial<ChartNodeAttrs>) => void }) {
  const attrs = node.attrs as ChartNodeAttrs;
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(attrs.title || attrs.config?.title || '');
  const [selectedColorScheme, setSelectedColorScheme] = useState<keyof typeof CHART_COLOR_SCHEMES>(attrs.colorScheme || 'default');
  const [selectedChartType, setSelectedChartType] = useState<ChartType>(attrs.config?.type || 'bar');
  const [bgColor, setBgColor] = useState(attrs.backgroundColor || 'white');
  
  const { tableData, config, title } = attrs;
  
  // Apply color scheme to config
  const effectiveConfig = useMemo(() => {
    if (!config) return config;
    const scheme = CHART_COLOR_SCHEMES[selectedColorScheme] || CHART_COLOR_SCHEMES.default;
    return {
      ...config,
      type: selectedChartType,
      title: editTitle || config.title,
      colors: scheme.colors,
    };
  }, [config, selectedColorScheme, selectedChartType, editTitle]);
  
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
      config: {
        ...config,
        type: selectedChartType,
        title: editTitle,
        colors: CHART_COLOR_SCHEMES[selectedColorScheme].colors,
      },
    });
    setIsEditing(false);
  };

  const chartTypes: ChartType[] = ['bar', 'line', 'pie', 'doughnut', 'histogram', 'stacked', 'scatter', 'boxplot'];
  
  return (
    <NodeViewWrapper className="chart-node-wrapper" data-chart-id={attrs.chartId}>
      <div className="chart-node-container" style={{ backgroundColor: bgColor }}>
        <div className="chart-node-header" style={{ background: bgColor === 'white' ? '#f8fafc' : 'rgba(0,0,0,0.05)' }}>
          {isEditing ? (
            <input 
              className="chart-title-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Название графика"
              style={{
                flex: 1,
                padding: '4px 8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                background: 'white',
              }}
            />
          ) : (
            <span className="chart-node-title">{editTitle || title || config.title || 'График'}</span>
          )}
          <div style={{ display: 'flex', gap: '4px' }}>
            {isEditing ? (
              <>
                <button 
                  onClick={handleSave}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    background: '#4ade80',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  ✓ Сохранить
                </button>
                <button 
                  onClick={() => setIsEditing(false)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    background: '#94a3b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  background: 'rgba(75,116,255,0.1)',
                  color: '#4b74ff',
                  border: '1px solid rgba(75,116,255,0.3)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                title="Редактировать график"
              >
                Редактировать
              </button>
            )}
          </div>
        </div>

        {/* Edit panel */}
        {isEditing && (
          <div className="chart-edit-panel" style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.02)',
          }}>
            {/* Chart Type */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: '#64748b' }}>Тип графика</label>
              <select
                value={selectedChartType}
                onChange={(e) => setSelectedChartType(e.target.value as ChartType)}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              >
                {chartTypes.map((type) => (
                  <option key={type} value={type}>
                    {CHART_TYPE_INFO[type]?.name || type}
                  </option>
                ))}
              </select>
            </div>

            {/* Color Scheme */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: '#64748b' }}>Цветовая схема</label>
              <select
                value={selectedColorScheme}
                onChange={(e) => setSelectedColorScheme(e.target.value as keyof typeof CHART_COLOR_SCHEMES)}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              >
                {Object.entries(CHART_COLOR_SCHEMES).map(([key, scheme]) => (
                  <option key={key} value={key}>{scheme.name}</option>
                ))}
              </select>
            </div>

            {/* Background Color */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: '#64748b' }}>Фон</label>
              <select
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
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
            <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
              {CHART_COLOR_SCHEMES[selectedColorScheme].colors.slice(0, 6).map((color, i) => (
                <div
                  key={i}
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '2px',
                    background: color,
                    border: '1px solid rgba(0,0,0,0.1)',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="chart-node-content" style={{ 
          padding: '16px', 
          minHeight: '300px',
          background: bgColor,
        }}>
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
  name: 'chartNode',
  
  group: 'block',
  
  atom: true,
  
  draggable: true,
  
  addAttributes() {
    return {
      chartId: {
        default: null,
      },
      tableData: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const data = element.getAttribute('data-table-data');
          return data ? JSON.parse(data) : null;
        },
        renderHTML: (attributes: Record<string, any>) => {
          return {
            'data-table-data': JSON.stringify(attributes.tableData),
          };
        },
      },
      config: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const data = element.getAttribute('data-config');
          return data ? JSON.parse(data) : null;
        },
        renderHTML: (attributes: Record<string, any>) => {
          return {
            'data-config': JSON.stringify(attributes.config),
          };
        },
      },
      title: {
        default: '',
      },
      colorScheme: {
        default: 'default',
      },
      backgroundColor: {
        default: 'white',
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
  
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'chart-node' })];
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(ChartNodeView);
  },
});

// Helper function to insert chart (instead of command)
export function insertChartIntoEditor(editor: Editor, attrs: ChartNodeAttrs) {
  if (!editor || !editor.view || editor.isDestroyed) {
    console.error('Editor is not available or has been destroyed');
    return false;
  }
  
  try {
    editor.chain().focus().insertContent({
      type: 'chartNode',
      attrs,
    }).run();
    return true;
  } catch (error) {
    console.error('Failed to insert chart:', error);
    return false;
  }
}

export default ChartNode;
