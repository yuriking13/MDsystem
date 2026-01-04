import React, { useEffect, useRef, useState, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { apiGetCitationGraph, apiFetchReferences, type GraphNode, type GraphLink, type GraphFilterOptions } from "../lib/api";

type Props = {
  projectId: string;
};

type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

type FilterType = 'all' | 'selected' | 'excluded';

export default function CitationGraph({ projectId }: Props) {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalNodes: 0, totalLinks: 0 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [fetchingRefs, setFetchingRefs] = useState(false);
  const [refsMessage, setRefsMessage] = useState<string | null>(null);
  
  // Фильтры
  const [filter, setFilter] = useState<FilterType>('all');
  const [availableQueries, setAvailableQueries] = useState<string[]>([]);
  const [selectedQueries, setSelectedQueries] = useState<string[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  const loadGraph = useCallback(async (options?: GraphFilterOptions) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGetCitationGraph(projectId, options);
      setData({
        nodes: res.nodes,
        links: res.links,
      });
      setStats(res.stats);
      if (res.availableQueries) {
        setAvailableQueries(res.availableQueries);
      }
    } catch (err: any) {
      setError(err?.message || "Ошибка загрузки графа");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Перезагрузка при изменении фильтров
  useEffect(() => {
    const options: GraphFilterOptions = { filter };
    if (selectedQueries.length > 0) {
      options.sourceQueries = selectedQueries;
    }
    loadGraph(options);
  }, [loadGraph, filter, selectedQueries]);

  const handleFetchReferences = async () => {
    setFetchingRefs(true);
    setRefsMessage(null);
    try {
      const res = await apiFetchReferences(projectId);
      setRefsMessage(res.message);
      // Перезагружаем граф после получения связей
      await loadGraph({ filter, sourceQueries: selectedQueries.length > 0 ? selectedQueries : undefined });
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
  // Значительно увеличиваем разницу между статьями с цитированиями и без
  const nodeVal = useCallback((node: any) => {
    const citedByCount = node.citedByCount || 0;
    if (citedByCount === 0) return 1; // Минимальный размер
    if (citedByCount <= 5) return 2 + citedByCount * 0.5; // 2-4.5
    if (citedByCount <= 20) return 5 + (citedByCount - 5) * 0.4; // 5-11
    if (citedByCount <= 100) return 11 + (citedByCount - 20) * 0.2; // 11-27
    // Для очень цитируемых статей
    return 27 + Math.log10(citedByCount - 99) * 8; // 27+
  }, []);

  // Обработчики фильтров
  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
  };

  const handleQueryToggle = (query: string) => {
    setSelectedQueries(prev => {
      if (prev.includes(query)) {
        return prev.filter(q => q !== query);
      } else {
        return [...prev, query];
      }
    });
  };

  const handleClearQueries = () => {
    setSelectedQueries([]);
  };

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

  return (
    <div className="graph-container" ref={containerRef}>
      {/* Фильтры */}
      <div className="graph-filters" style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 12, 
        padding: '12px 16px', 
        borderBottom: '1px solid var(--border-glass)',
        alignItems: 'center'
      }}>
        {/* Фильтр по статусу */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Статус:</span>
          <button
            className={`btn ${filter === 'all' ? '' : 'secondary'}`}
            style={{ padding: '4px 10px', fontSize: 11 }}
            onClick={() => handleFilterChange('all')}
          >
            Все
          </button>
          <button
            className={`btn ${filter === 'selected' ? '' : 'secondary'}`}
            style={{ padding: '4px 10px', fontSize: 11 }}
            onClick={() => handleFilterChange('selected')}
          >
            ✅ Отобранные
          </button>
          <button
            className={`btn ${filter === 'excluded' ? '' : 'secondary'}`}
            style={{ padding: '4px 10px', fontSize: 11 }}
            onClick={() => handleFilterChange('excluded')}
          >
            ❌ Исключённые
          </button>
        </div>

        {/* Фильтр по запросам */}
        {availableQueries.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Запросы:</span>
            {availableQueries.map(query => (
              <button
                key={query}
                className={`btn ${selectedQueries.includes(query) ? '' : 'secondary'}`}
                style={{ 
                  padding: '4px 10px', 
                  fontSize: 10,
                  maxWidth: 150,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                onClick={() => handleQueryToggle(query)}
                title={query}
              >
                {query}
              </button>
            ))}
            {selectedQueries.length > 0 && (
              <button
                className="btn secondary"
                style={{ padding: '4px 8px', fontSize: 10 }}
                onClick={handleClearQueries}
              >
                ✕ Сбросить
              </button>
            )}
          </div>
        )}

        {/* Кнопка обновления PubMed */}
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
        <div className="ok" style={{ margin: '8px 16px', padding: 10, fontSize: 12 }}>
          {refsMessage}
        </div>
      )}

      {/* Статистика */}
      <div className="graph-stats" style={{ padding: '8px 16px', display: 'flex', gap: 16, alignItems: 'center' }}>
        <span>📊 Узлов: {stats.totalNodes}</span>
        <span>🔗 Связей: {stats.totalLinks}</span>
        {hoveredNode && (
          <span className="hovered-info" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            📄 {hoveredNode.label} {hoveredNode.doi && `• DOI: ${hoveredNode.doi}`}
          </span>
        )}
      </div>
      
      <div className="graph-legend" style={{ padding: '4px 16px', display: 'flex', gap: 12 }}>
        <span><span className="legend-dot selected"></span> Отобранные</span>
        <span><span className="legend-dot candidate"></span> Кандидаты</span>
        <span><span className="legend-dot excluded"></span> Исключённые</span>
      </div>

      {(!data || data.nodes.length === 0) ? (
        <div className="muted" style={{ padding: 40, textAlign: 'center' }}>
          📊 Нет данных для графа с текущими фильтрами.
        </div>
      ) : (
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
      )}
      
      <div className="muted" style={{ fontSize: 11, marginTop: 8, padding: '0 16px 12px' }}>
        💡 Наведите на узел для подробностей. Клик откроет DOI/PubMed.
      </div>
    </div>
  );
}
