import { DecoratorNode, LexicalNode, SerializedLexicalNode, Spread } from 'lexical';
import type { EditorConfig, NodeKey } from 'lexical';
import React from 'react';

export type SerializedChartNode = Spread<
  {
    chartId: string;
    chartType: string;
    chartData: any;
    title?: string;
  },
  SerializedLexicalNode
>;

export class ChartNode extends DecoratorNode<JSX.Element> {
  __chartId: string;
  __chartType: string;
  __chartData: any;
  __title?: string;

  static getType(): string {
    return 'chart';
  }

  static clone(node: ChartNode): ChartNode {
    return new ChartNode(
      node.__chartId,
      node.__chartType,
      node.__chartData,
      node.__title,
      node.__key
    );
  }

  constructor(
    chartId: string,
    chartType: string,
    chartData: any,
    title?: string,
    key?: NodeKey
  ) {
    super(key);
    this.__chartId = chartId;
    this.__chartType = chartType;
    this.__chartData = chartData;
    this.__title = title;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const div = document.createElement('div');
    div.className = 'chart-node-wrapper';
    return div;
  }

  updateDOM(): false {
    return false;
  }

  exportJSON(): SerializedChartNode {
    return {
      chartId: this.__chartId,
      chartType: this.__chartType,
      chartData: this.__chartData,
      title: this.__title,
      type: 'chart',
      version: 1,
    };
  }

  static importJSON(serializedNode: SerializedChartNode): ChartNode {
    return $createChartNode(
      serializedNode.chartId,
      serializedNode.chartType,
      serializedNode.chartData,
      serializedNode.title
    );
  }

  decorate(): JSX.Element {
    return (
      <div className="chart-node-container">
        {this.__title && <div className="chart-title">{this.__title}</div>}
        <div className="chart-placeholder">
          📊 График: {this.__chartType}
        </div>
      </div>
    );
  }
}

export function $createChartNode(
  chartId: string,
  chartType: string,
  chartData: any,
  title?: string
): ChartNode {
  return new ChartNode(chartId, chartType, chartData, title);
}

export function $isChartNode(
  node: LexicalNode | null | undefined
): node is ChartNode {
  return node instanceof ChartNode;
}
