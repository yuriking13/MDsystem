import React, { useEffect, useRef, useState, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { apiGetCitationGraph, type GraphNode, type GraphLink } from "../lib/api";

type Props = {
  projectId: string;
};

type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

export default function CitationGraph({ projectId }: Props) {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalNodes: 0, totalLinks: 0 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGetCitationGraph(projectId);
        setData({
          nodes: res.nodes,
          links: res.links,
        });
        setStats(res.stats);
      } catch (err: any) {
        setError(err?.message || "Ошибка загрузки графа");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: 500,
        });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const nodeColor = useCallback((node: any) => {
    const status = node.status;
    if (status === 'selected') return '#4ade80';
    if (status === 'excluded') return '#ff6b6b';
    return '#4b74ff';
  }, []);

  const nodeLabel = useCallback((node: any) => {
    return node.label;
  }, []);

  if (loading) {
    return (
      <div className="graph-container">
        <div className="muted" style={{ padding: 40, textAlign: 'center' }}>
          ⏳ Загрузка графа цитирований...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="graph-container">
        <div className="alert" style={{ margin: 20 }}>{error}</div>
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="graph-container">
        <div className="muted" style={{ padding: 40, textAlign: 'center' }}>
          📊 Нет данных для графа. Обогатите статьи данными Crossref для построения связей.
        </div>
      </div>
    );
  }

  return (
    <div className="graph-container" ref={containerRef}>
      <div className="graph-stats">
        <span>📊 Узлов: {stats.totalNodes}</span>
        <span>🔗 Связей: {stats.totalLinks}</span>
        {hoveredNode && (
          <span className="hovered-info">
            📄 {hoveredNode.label} {hoveredNode.doi && `• DOI: ${hoveredNode.doi}`}
          </span>
        )}
      </div>
      
      <div className="graph-legend">
        <span><span className="legend-dot selected"></span> Отобранные</span>
        <span><span className="legend-dot candidate"></span> Кандидаты</span>
        <span><span className="legend-dot excluded"></span> Исключённые</span>
      </div>

      <ForceGraph2D
        graphData={data}
        width={dimensions.width}
        height={dimensions.height}
        nodeColor={nodeColor}
        nodeLabel={nodeLabel}
        nodeRelSize={6}
        linkColor={() => '#334477'}
        linkWidth={1}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        backgroundColor="#0b0f19"
        onNodeHover={(node: any) => setHoveredNode(node)}
        onNodeClick={(node: any) => {
          if (node.doi) {
            window.open(`https://doi.org/${node.doi}`, '_blank');
          }
        }}
      />
      
      <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
        💡 Наведите на узел для подробностей. Клик откроет DOI.
      </div>
    </div>
  );
}
