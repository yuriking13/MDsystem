import React, { useEffect, useRef, useState, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { apiGetCitationGraph, apiFetchReferences, apiImportFromGraph, type GraphNode, type GraphLink, type GraphFilterOptions, type LevelCounts } from "../lib/api";

type Props = {
  projectId: string;
};

type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

type FilterType = 'all' | 'selected' | 'excluded';
type DepthType = 1 | 2 | 3;

export default function CitationGraph({ projectId }: Props) {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ 
    totalNodes: number; 
    totalLinks: number; 
    levelCounts?: LevelCounts;
    availableReferences?: number;
    availableCiting?: number;
  }>({ totalNodes: 0, totalLinks: 0 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [fetchingRefs, setFetchingRefs] = useState(false);
  const [refsMessage, setRefsMessage] = useState<string | null>(null);

  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  
  // Фильтры
  const [filter, setFilter] = useState<FilterType>('all');
  const [availableQueries, setAvailableQueries] = useState<string[]>([]);
  const [selectedQueries, setSelectedQueries] = useState<string[]>([]);
  
  // Новые фильтры
  const [depth, setDepth] = useState<DepthType>(1);
  const [yearRange, setYearRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
  const [yearFrom, setYearFrom] = useState<number | undefined>(undefined);
  const [yearTo, setYearTo] = useState<number | undefined>(undefined);
  const [statsQuality, setStatsQuality] = useState<number>(0);
  
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
      if (res.yearRange) {
        setYearRange(res.yearRange);
      }

      // Если граф перезагрузился, убираем выбор узлов, которых больше нет
      setSelectedNodeIds((prev) => {
        const next = new Set<string>();
        const ids = new Set(res.nodes.map((n) => n.id));
        for (const id of prev) {
          if (ids.has(id)) next.add(id);
        }
        return next;
      });
    } catch (err: any) {
      setError(err?.message || "Ошибка загрузки графа");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Перезагрузка при изменении фильтров
  useEffect(() => {
    const options: GraphFilterOptions = { 
      filter,
      depth,
    };
    if (selectedQueries.length > 0) {
      options.sourceQueries = selectedQueries;
    }
    if (yearFrom !== undefined) {
      options.yearFrom = yearFrom;
    }
    if (yearTo !== undefined) {
      options.yearTo = yearTo;
    }
    if (statsQuality > 0) {
      options.statsQuality = statsQuality;
    }
    loadGraph(options);
  }, [loadGraph, filter, selectedQueries, depth, yearFrom, yearTo, statsQuality]);

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

  const buildImportPayload = useCallback(() => {
    if (!data) return { pmids: [], dois: [] };

    const selected = new Set(selectedNodeIds);
    const pmids: string[] = [];
    const dois: string[] = [];

    for (const n of data.nodes) {
      if (!selected.has(n.id)) continue;
      if (n.pmid) pmids.push(String(n.pmid));
      if (n.doi) dois.push(String(n.doi));
    }

    return {
      pmids: Array.from(new Set(pmids)).slice(0, 100),
      dois: Array.from(new Set(dois.map((d) => d.toLowerCase()))).slice(0, 100),
    };
  }, [data, selectedNodeIds]);

  const handleImportSelected = async () => {
    setImporting(true);
    setImportMessage(null);
    try {
      const payload = buildImportPayload();
      if ((payload.pmids?.length || 0) === 0 && (payload.dois?.length || 0) === 0) {
        setImportMessage('Не выбрано ни одного узла с PMID/DOI');
        return;
      }
      const res = await apiImportFromGraph(projectId, payload);
      setImportMessage(res.message);
      setSelectedNodeIds(new Set());
    } catch (err: any) {
      setImportMessage(err?.message || 'Ошибка импорта в кандидаты');
    } finally {
      setImporting(false);
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
    const level = node.graphLevel || 1;

    // Если выбран - яркий зелёный
    if (selectedNodeIds.has(node.id)) {
      return '#10b981';
    }
    
    // Уровень 1 (найденные статьи) - стандартные цвета по статусу
    if (level === 1) {
      if (status === 'selected') return '#34d399'; // Яркий зелёный
      if (status === 'excluded') return '#ef4444'; // Красный
      return '#3b82f6'; // Синий (кандидаты)
    }
    
    // Уровень 2 (references - статьи, на которые ссылаются)
    if (level === 2) {
      return '#f97316'; // Насыщенный оранжевый
    }
    
    // Уровень 3 (citing - статьи, которые цитируют)
    if (level === 3) {
      return '#d946ef'; // Насыщенный розово-фиолетовый
    }
    
    return '#3b82f6';
  }, [selectedNodeIds]);

  const nodeLabel = useCallback((node: any) => {
    const citedByCount = node.citedByCount || 0;
    const level = node.graphLevel || 1;
    const statsQ = node.statsQuality || 0;
    
    let levelText = '';
    if (level === 2) levelText = ' [Ссылка]';
    else if (level === 3) levelText = ' [Цитирующая]';
    
    let statsText = '';
    if (statsQ > 0) statsText = ` • P-value: ${'★'.repeat(statsQ)}`;
    
    return `${node.label}${levelText}${citedByCount > 0 ? ` (цитирований: ${citedByCount})` : ''}${statsText}`;
  }, []);

  // Размер узла зависит от количества цитирований, уровня графа и качества статистики
  const nodeVal = useCallback((node: any) => {
    const citedByCount = node.citedByCount || 0;
    const level = node.graphLevel || 1;
    const statsQ = node.statsQuality || 0;
    
    // Базовый размер по цитированиям
    let baseSize: number;
    if (citedByCount === 0) baseSize = 2;
    else if (citedByCount <= 3) baseSize = 2.5 + citedByCount * 0.3;
    else if (citedByCount <= 10) baseSize = 3.5 + (citedByCount - 3) * 0.4;
    else if (citedByCount <= 30) baseSize = 6 + (citedByCount - 10) * 0.35;
    else if (citedByCount <= 100) baseSize = 13 + (citedByCount - 30) * 0.15;
    else baseSize = 24 + Math.log10(citedByCount - 99) * 5;
    
    // Коэффициент по уровню графа (уровни 2 и 3 немного меньше)
    let levelMultiplier = 1;
    if (level === 2) levelMultiplier = 0.85;
    if (level === 3) levelMultiplier = 0.75;
    
    // Бонус за качество статистики
    const statsBonus = statsQ > 0 ? 0.15 * statsQ : 0;
    
    return baseSize * levelMultiplier * (1 + statsBonus);
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
      {/* Фильтры - первая строка */}
      <div className="graph-filters" style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 12, 
        padding: '12px 16px', 
        borderBottom: '1px solid var(--border-glass)',
        alignItems: 'center'
      }}>
        {/* Фильтр по уровню глубины */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>📊 Уровень:</span>
          <button
            className={`btn ${depth === 1 ? '' : 'secondary'}`}
            style={{ padding: '4px 10px', fontSize: 11 }}
            onClick={() => setDepth(1)}
            title="Только найденные статьи"
          >
            1️⃣ Поиск
          </button>
          <button
            className={`btn ${depth === 2 ? '' : 'secondary'}`}
            style={{ padding: '4px 10px', fontSize: 11 }}
            onClick={() => setDepth(2)}
            title="+ Статьи, на которые ссылаются найденные"
          >
            2️⃣ +Ссылки
          </button>
          <button
            className={`btn ${depth === 3 ? '' : 'secondary'}`}
            style={{ padding: '4px 10px', fontSize: 11 }}
            onClick={() => setDepth(3)}
            title="+ Статьи, которые цитируют найденные"
          >
            3️⃣ +Цитирующие
          </button>
        </div>

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

        {/* Кнопка обновления PubMed */}
        <button
          className="btn"
          style={{ marginLeft: 'auto', padding: '6px 14px', fontSize: 12 }}
          onClick={handleImportSelected}
          disabled={importing || selectedNodeIds.size === 0}
          title="Добавить выбранные статьи из графа в кандидаты"
        >
          {importing ? `⏳ Импорт...` : `➕ В кандидаты (${selectedNodeIds.size})`}
        </button>

        <button
          className="btn secondary"
          style={{ padding: '6px 14px', fontSize: 12 }}
          onClick={handleFetchReferences}
          disabled={fetchingRefs}
        >
          {fetchingRefs ? '⏳ Загрузка...' : '🔄 Обновить связи из PubMed'}
        </button>
      </div>
      
      {/* Фильтры - вторая строка */}
      <div className="graph-filters" style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 12, 
        padding: '8px 16px', 
        borderBottom: '1px solid var(--border-glass)',
        alignItems: 'center'
      }}>
        {/* Фильтр по годам */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>📅 Годы:</span>
          <input
            type="number"
            placeholder={yearRange.min ? String(yearRange.min) : "От"}
            value={yearFrom || ''}
            onChange={(e) => setYearFrom(e.target.value ? parseInt(e.target.value, 10) : undefined)}
            style={{ 
              width: 70, 
              padding: '4px 8px', 
              fontSize: 11,
              border: '1px solid var(--border-glass)',
              borderRadius: 4,
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
            min={yearRange.min || 1900}
            max={yearRange.max || 2030}
          />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
          <input
            type="number"
            placeholder={yearRange.max ? String(yearRange.max) : "До"}
            value={yearTo || ''}
            onChange={(e) => setYearTo(e.target.value ? parseInt(e.target.value, 10) : undefined)}
            style={{ 
              width: 70, 
              padding: '4px 8px', 
              fontSize: 11,
              border: '1px solid var(--border-glass)',
              borderRadius: 4,
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
            min={yearRange.min || 1900}
            max={yearRange.max || 2030}
          />
          {(yearFrom || yearTo) && (
            <button
              className="btn secondary"
              style={{ padding: '2px 6px', fontSize: 10 }}
              onClick={() => { setYearFrom(undefined); setYearTo(undefined); }}
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Фильтр по качеству статистики (p-value) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>📈 P-value:</span>
          <select
            value={statsQuality}
            onChange={(e) => setStatsQuality(parseInt(e.target.value, 10))}
            style={{ 
              padding: '4px 8px', 
              fontSize: 11,
              border: '1px solid var(--border-glass)',
              borderRadius: 4,
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
          >
            <option value={0}>Все статьи</option>
            <option value={1}>≥ Упомянут p-value</option>
            <option value={2}>≥ Значимые результаты</option>
            <option value={3}>Строгие критерии (p&lt;0.01)</option>
          </select>
        </div>
        
        {/* Фильтр по запросам */}
        {availableQueries.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🔍 Запросы:</span>
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
      </div>

      {refsMessage && (
        <div className="ok" style={{ margin: '8px 16px', padding: 10, fontSize: 12 }}>
          {refsMessage}
        </div>
      )}

      {importMessage && (
        <div className="ok" style={{ margin: '8px 16px', padding: 10, fontSize: 12 }}>
          {importMessage}
        </div>
      )}

      {/* Статистика */}
      <div className="graph-stats" style={{ padding: '8px 16px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid var(--border-glass)' }}>
        <span style={{ fontWeight: 600 }}>📊 Всего узлов: <span style={{ color: '#3b82f6' }}>{stats.totalNodes}</span></span>
        <span style={{ fontWeight: 600 }}>🔗 Связей: <span style={{ color: '#10b981' }}>{stats.totalLinks}</span></span>
        {stats.levelCounts && (
          <>
            <span style={{ color: '#3b82f6', fontWeight: 500 }}>🔵 Поиск: {stats.levelCounts.level1}</span>
            {depth >= 2 && (
              <span style={{ color: '#f97316', fontWeight: 500 }}>
                🟠 Ссылки: {stats.levelCounts.level2}
                {stats.availableReferences !== undefined && stats.availableReferences > 0 && 
                  ` (доступно: ${stats.availableReferences})`}
              </span>
            )}
            {depth >= 3 && (
              <span style={{ color: '#d946ef', fontWeight: 500 }}>
                🟣 Цитирующие: {stats.levelCounts.level3}
                {stats.availableCiting !== undefined && stats.availableCiting > 0 && 
                  ` (доступно: ${stats.availableCiting})`}
              </span>
            )}
          </>
        )}
        {hoveredNode && (
          <span className="hovered-info" style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 'auto' }}>
            📄 {hoveredNode.label} 
            {hoveredNode.graphLevel && hoveredNode.graphLevel > 1 && ` [Уровень ${hoveredNode.graphLevel}]`}
            {hoveredNode.doi && ` • DOI: ${hoveredNode.doi}`}
            {hoveredNode.statsQuality !== undefined && hoveredNode.statsQuality > 0 && ` • P-value: ★${'★'.repeat(hoveredNode.statsQuality - 1)}`}
          </span>
        )}
      </div>
      
      {/* Подсказка если нет связей */}
      {depth >= 2 && stats.availableReferences === 0 && stats.availableCiting === 0 && (
        <div style={{ 
          padding: '8px 16px', 
          background: 'rgba(251, 191, 36, 0.1)', 
          borderBottom: '1px solid var(--border-glass)',
          fontSize: 12,
          color: '#fbbf24'
        }}>
          ⚠️ Данные о ссылках не загружены. Нажмите "Обновить связи из PubMed" для загрузки информации о цитированиях.
        </div>
      )}
      
      <div className="graph-legend" style={{ padding: '4px 16px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 500, fontSize: 11 }}>🔵 Уровень 1:</span>
        <span><span className="legend-dot selected"></span> Отобранные</span>
        <span><span className="legend-dot candidate"></span> Кандидаты</span>
        <span><span className="legend-dot excluded"></span> Исключённые</span>
        {depth >= 2 && (
          <>
            <span style={{ marginLeft: 8, fontWeight: 500, fontSize: 11 }}>🟠 Уровень 2:</span>
            <span><span className="legend-dot" style={{ background: '#f97316' }}></span> Ссылки (references)</span>
          </>
        )}
        {depth >= 3 && (
          <>
            <span style={{ marginLeft: 8, fontWeight: 500, fontSize: 11 }}>🟣 Уровень 3:</span>
            <span><span className="legend-dot" style={{ background: '#d946ef' }}></span> Цитирующие (cited-by)</span>
          </>
        )}
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
          nodeRelSize={5}
          nodeCanvasObject={(node: any, ctx: any, globalScale: any) => {
            const size = (node.val || 1) * 1.2;
            
            // Основной кружок узла
            ctx.fillStyle = nodeColor(node);
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
            ctx.fill();
            
            // Светлый ободок для выделения (уровень показывает интенсивность)
            if (selectedNodeIds.has(node.id)) {
              ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
              ctx.lineWidth = size * 0.4;
              ctx.stroke();
            }
            
            // Дополнительный обвод для важных узлов (много цитирований)
            if ((node.citedByCount || 0) > 20) {
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
              ctx.lineWidth = size * 0.15;
              ctx.stroke();
            }
          }}
          linkColor={() => 'rgba(100, 120, 150, 0.3)'}
          linkWidth={0.8}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={0.95}
          backgroundColor="#0b0f19"
          d3AlphaDecay={0.015}
          d3VelocityDecay={0.25}
          cooldownTicks={250}
          warmupTicks={120}
          onNodeHover={(node: any) => setHoveredNode(node)}
          onNodeClick={(node: any, event: any) => {
            // Alt+клик всегда открывает первоисточник
            if (event?.altKey) {
              if (node.doi) {
                window.open(`https://doi.org/${node.doi}`, '_blank');
              } else if (node.pmid) {
                window.open(`https://pubmed.ncbi.nlm.nih.gov/${node.pmid}`, '_blank');
              }
              return;
            }

            // Обычный клик: для уровней 2/3 — выбор узла, для уровня 1 — открытие
            const level = node.graphLevel || 1;
            if (level >= 2) {
              setSelectedNodeIds((prev) => {
                const next = new Set(prev);
                if (next.has(node.id)) next.delete(node.id);
                else next.add(node.id);
                return next;
              });
              return;
            }

            if (node.doi) {
              window.open(`https://doi.org/${node.doi}`, '_blank');
            } else if (node.pmid) {
              window.open(`https://pubmed.ncbi.nlm.nih.gov/${node.pmid}`, '_blank');
            }
          }}
        />
      )}
      
      <div className="muted" style={{ fontSize: 11, marginTop: 8, padding: '0 16px 12px' }}>
        💡 Наведите на узел для подробностей. Клик по уровням 2/3 выбирает узел, Alt+клик открывает DOI/PubMed.
      </div>
    </div>
  );
}
