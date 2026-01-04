import React, { useEffect, useRef, useState, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { apiGetCitationGraph, apiFetchReferences, type GraphNode, type GraphLink } from "../lib/api";

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
  const [fetchingRefs, setFetchingRefs] = useState(false);
  const [refsMessage, setRefsMessage] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  const loadGraph = useCallback(async () => {
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
  }, [projectId]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const handleFetchReferences = async () => {
    setFetchingRefs(true);
    setRefsMessage(null);
    try {
      const res = await apiFetchReferences(projectId);
      setRefsMessage(res.message);
      // Перезагружаем граф после получения связей
      await loadGraph();
    } catch (err: any) {
      setRefsMessage(err?.message || "Ошибка получения связей");
    } finally {
      setFetchingRefs(false);
    }
  };

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
    const citedByCount = node.citedByCount || 0;
    return `${node.label}${citedByCount > 0 ? ` (цитирований: ${citedByCount})` : ''}`;
  }, []);

  // Размер узла зависит от количества цитирований
  const nodeVal = useCallback((node: any) => {
    const citedByCount = node.citedByCount || 0;
    // Базовый размер 1, увеличивается с логарифмом цитирований
    return Math.max(1, 1 + Math.log10(citedByCount + 1) * 2);
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
        <button
          className="btn secondary"
          style={{ marginLeft: 'auto', padding: '6px 14px', fontSize: 12 }}
          onClick={handleFetchReferences}
          disabled={fetchingRefs}
        >
          {fetchingRefs ? '⏳ Загрузка...' : '🔄 Обновить связи из PubMed'}
        </button>
      </div>
      
      {refsMessage && (
        <div className="ok" style={{ margin: '0 16px 8px', padding: 10, fontSize: 12 }}>
          {refsMessage}
        </div>
      )}
      
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
        nodeVal={nodeVal}
        nodeRelSize={4}
        linkColor={() => '#334477'}
        linkWidth={1}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        backgroundColor="#0b0f19"
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.2}
        cooldownTicks={200}
        warmupTicks={100}
        onNodeHover={(node: any) => setHoveredNode(node)}
        onNodeClick={(node: any) => {
          if (node.doi) {
            window.open(`https://doi.org/${node.doi}`, '_blank');
          } else if (node.pmid) {
            window.open(`https://pubmed.ncbi.nlm.nih.gov/${node.pmid}`, '_blank');
          }
        }}
      />
      
      <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
        💡 Наведите на узел для подробностей. Клик откроет DOI.
      </div>
    </div>
  );
}
