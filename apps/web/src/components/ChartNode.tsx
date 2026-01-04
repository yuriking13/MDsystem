import { Node, mergeAttributes } from "@tiptap/react";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import React, { useMemo } from "react";
import ChartFromTable, { ChartConfig, TableData } from "./ChartFromTable";

// React компонент для отображения графика
function ChartNodeView({ node }: { node: any }) {
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

  return (
    <NodeViewWrapper className="chart-node-wrapper">
      <div className="chart-container-live">
        <ChartFromTable tableData={tableData} config={config} height={300} />
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
