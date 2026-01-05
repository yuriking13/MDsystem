import { Node, mergeAttributes, type Editor } from '@tiptap/react';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useMemo } from 'react';
import ChartFromTable, { type TableData, type ChartConfig, CHART_TYPE_INFO, type ChartType } from '../../ChartFromTable';

// Chart node attributes
export interface ChartNodeAttrs {
  chartId: string;
  tableData: TableData;
  config: ChartConfig;
  title?: string;
}

// React component for rendering the chart
function ChartNodeView({ node }: { node: any }) {
  const attrs = node.attrs as ChartNodeAttrs;
  
  const { tableData, config, title } = attrs;
  
  const chartInfo = useMemo(() => {
    return config?.type ? CHART_TYPE_INFO[config.type as ChartType] : null;
  }, [config?.type]);
  
  if (!tableData || !config) {
    return (
      <NodeViewWrapper className="chart-node-wrapper">
        <div className="chart-node-error">
          ⚠️ Ошибка: данные графика не найдены
        </div>
      </NodeViewWrapper>
    );
  }
  
  return (
    <NodeViewWrapper className="chart-node-wrapper" data-chart-id={attrs.chartId}>
      <div className="chart-node-container">
        <div className="chart-node-header">
          <span className="chart-node-icon">{chartInfo?.icon || '📊'}</span>
          <span className="chart-node-title">{title || config.title || 'График'}</span>
        </div>
        <div className="chart-node-content">
          <ChartFromTable 
            tableData={tableData} 
            config={config} 
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
  editor.chain().focus().insertContent({
    type: 'chartNode',
    attrs,
  }).run();
}

export default ChartNode;
