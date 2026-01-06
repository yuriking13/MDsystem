import React, { useEffect, useRef, useState, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { apiGetCitationGraph, apiFetchReferences, apiFetchReferencesStatus, apiImportFromGraph, type GraphNode, type GraphLink, type GraphFilterOptions, type LevelCounts } from "../lib/api";

type Props = {
  projectId: string;
};

type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

type FilterType = 'all' | 'selected' | 'excluded';
type DepthType = 1 | 2 | 3;

// Тип для статуса загрузки
type FetchJobStatus = {
  isRunning: boolean;
  progress: number;
  elapsedSeconds: number;
  status?: string;
  totalArticles?: number;
  processedArticles?: number;
  message?: string;
};

// Форматирование времени MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

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
  const [selectedNodeForDisplay, setSelectedNodeForDisplay] = useState<GraphNode | null>(null);
  const [fetchingRefs, setFetchingRefs] = useState(false);
  const [refsMessage, setRefsMessage] = useState<string | null>(null);
  
  // Статус фоновой загрузки
  const [fetchJobStatus, setFetchJobStatus] = useState<FetchJobStatus | null>(null);
  const fetchStatusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  
  // Опция загрузки связей только для отобранных
  const [fetchSelectedOnly, setFetchSelectedOnly] = useState(false);
  
  // Фильтры
  const [filter, setFilter] = useState<FilterType>('all');
  const [availableQueries, setAvailableQueries] = useState<string[]>([]);
  const [selectedQueries, setSelectedQueries] = useState<string[]>([]);
  
  // Режим графа: всегда lite (облегчённый с лимитами)
  // mega режим отключён для стабильности
  
  // Новые фильтры
  const [depth, setDepth] = useState<DepthType>(1);
  const [yearRange, setYearRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
  const [yearFrom, setYearFrom] = useState<number | undefined>(undefined);
  const [yearTo, setYearTo] = useState<number | undefined>(undefined);
  const [statsQuality, setStatsQuality] = useState<number>(0);
  
  // Подсветка статей с P-value (золотым цветом)
  const [highlightPValue, setHighlightPValue] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

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

  // Проверка статуса загрузки при монтировании
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await apiFetchReferencesStatus(projectId);
        if (status.hasJob && (status.status === 'running' || status.status === 'pending')) {
          setFetchJobStatus({
            isRunning: true,
            progress: status.progress || 0,
            elapsedSeconds: status.elapsedSeconds || 0,
            status: status.status,
            totalArticles: status.totalArticles,
            processedArticles: status.processedArticles,
          });
          startStatusPolling();
        }
      } catch {
        // Игнорируем ошибки проверки статуса
      }
    };
    checkStatus();
    
    return () => {
      if (fetchStatusIntervalRef.current) {
        clearInterval(fetchStatusIntervalRef.current);
      }
    };
  }, [projectId]);

  const startStatusPolling = () => {
    if (fetchStatusIntervalRef.current) {
      clearInterval(fetchStatusIntervalRef.current);
    }
    
    fetchStatusIntervalRef.current = setInterval(async () => {
      try {
        const status = await apiFetchReferencesStatus(projectId);
        
        if (!status.hasJob || status.status === 'completed' || status.status === 'failed') {
          // Загрузка завершена
          if (fetchStatusIntervalRef.current) {
            clearInterval(fetchStatusIntervalRef.current);
            fetchStatusIntervalRef.current = null;
          }
          
          setFetchJobStatus(null);
          setFetchingRefs(false);
          
          if (status.status === 'completed') {
            setRefsMessage('✅ Загрузка связей завершена! Граф обновляется...');
            // Перезагружаем граф
            await loadGraph({ filter, sourceQueries: selectedQueries.length > 0 ? selectedQueries : undefined, depth, yearFrom, yearTo, statsQuality });
          } else if (status.status === 'failed') {
            setRefsMessage(`❌ Ошибка: ${status.errorMessage || 'Неизвестная ошибка'}`);
          }
        } else {
          // Обновляем прогресс
          setFetchJobStatus({
            isRunning: true,
            progress: status.progress || 0,
            elapsedSeconds: status.elapsedSeconds || 0,
            status: status.status,
            totalArticles: status.totalArticles,
            processedArticles: status.processedArticles,
          });
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 2000); // Каждые 2 секунды
  };

  const handleFetchReferences = async () => {
    setFetchingRefs(true);
    setRefsMessage(null);
    
    // Сразу показываем прогресс-бар
    setFetchJobStatus({
      isRunning: true,
      progress: 0,
      elapsedSeconds: 0,
      totalArticles: 0,
      processedArticles: 0,
      message: 'Запуск загрузки...',
    });
    
    try {
      // Передаём опцию selectedOnly если выбран чекбокс
      const res = await apiFetchReferences(projectId, fetchSelectedOnly ? { selectedOnly: true } : undefined);
      
      if (res.jobId) {
        // Фоновая загрузка запущена - обновляем данные
        setFetchJobStatus({
          isRunning: true,
          progress: 0,
          elapsedSeconds: 0,
          totalArticles: res.totalArticles,
          processedArticles: 0,
          message: res.message,
        });
        startStatusPolling();
      } else {
        setFetchJobStatus(null);
        setRefsMessage(res.message || 'Загрузка не требуется');
        setFetchingRefs(false);
      }
    } catch (err: any) {
      setFetchJobStatus(null);
      setRefsMessage(err?.message || "Ошибка запуска загрузки");
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

  // Resize observer - use 2000x2000 for the graph canvas
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateSize = () => {
      if (containerRef.current) {
        // Fixed 2000x2000 canvas for the graph visualization
        setDimensions({
          width: 2000,
          height: 2000,
        });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const nodeColor = useCallback((node: any) => {
    const status = node.status;
    const level = node.graphLevel ?? 1;
    const statsQ = node.statsQuality || 0;

    // Если включена подсветка P-value и статья имеет P-value - золотой
    if (highlightPValue && statsQ > 0) {
      return '#fbbf24'; // Золотой/янтарный для P-value
    }
    
    // Если выбран - яркий зелёный
    if (selectedNodeIds.has(node.id)) {
      return '#10b981';
    }
    
    // Уровень 0 (citing - статьи, которые цитируют наши) - фиолетовый
    if (level === 0) {
      return '#a855f7'; // Фиолетовый
    }
    
    // Уровень 1 (найденные статьи) - стандартные цвета по статусу
    if (level === 1) {
      if (status === 'selected') return '#22c55e'; // Яркий зелёный
      if (status === 'excluded') return '#ef4444'; // Красный
      return '#3b82f6'; // Синий (кандидаты)
    }
    
    // Уровень 2 (references - статьи, на которые ссылаются)
    if (level === 2) {
      return '#f97316'; // Оранжевый
    }
    
    // Уровень 3 (статьи, которые тоже ссылаются на level 2)
    if (level === 3) {
      return '#06b6d4'; // Голубой/циан
    }
    
    return '#6b7280'; // Серый по умолчанию
  }, [selectedNodeIds, highlightPValue]);

  const nodeLabel = useCallback((node: any) => {
    const citedByCount = node.citedByCount || 0;
    const level = node.graphLevel ?? 1;
    const statsQ = node.statsQuality || 0;
    
    let levelText = '';
    if (level === 0) levelText = ' [Цитирует нас]';
    else if (level === 2) levelText = ' [Ссылка]';
    else if (level === 3) levelText = ' [Связанная]';
    
    let statsText = '';
    if (statsQ > 0) statsText = ` • P-value: ${'★'.repeat(statsQ)}`;
    
    return `${node.label}${levelText}${citedByCount > 0 ? ` (${citedByCount} цит.)` : ''}${statsText}`;
  }, []);

  // Размер узла зависит от количества цитирований - как в ResearchRabbit
  const nodeVal = useCallback((node: any) => {
    const citedByCount = node.citedByCount || 0;
    const level = node.graphLevel ?? 1;
    const statsQ = node.statsQuality || 0;
    
    // Логарифмическая шкала - УВЕЛИЧЕННЫЕ размеры для видимости
    // Минимальный размер 12, максимальный ~80 для самых цитируемых
    let baseSize: number;
    if (citedByCount === 0) {
      baseSize = 12;
    } else if (citedByCount <= 10) {
      baseSize = 12 + citedByCount * 1.5; // 12-27
    } else if (citedByCount <= 100) {
      baseSize = 27 + Math.log10(citedByCount) * 12; // 27-51
    } else if (citedByCount <= 1000) {
      baseSize = 51 + Math.log10(citedByCount) * 8; // 51-75
    } else {
      baseSize = 75 + Math.log10(citedByCount) * 3; // 75-85+
    }
    
    // Уровень 1 (наши статьи) крупнее для выделения
    if (level === 1) baseSize *= 1.4;
    
    // Бонус за качество статистики
    const statsBonus = statsQ > 0 ? 0.15 * statsQ : 0;
    
    return baseSize * (1 + statsBonus);
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
          <div className="loading-spinner" style={{ margin: '0 auto 16px', width: 32, height: 32 }} />
          Загрузка графа цитирований...
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
    <div className="graph-container" ref={containerRef} style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
      {/* Header Panel */}
      <div className="graph-header-panel">
        <div className="graph-header-title">
          <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <div>
            <h3>Граф цитирований</h3>
            <span className="graph-header-subtitle">Визуализация связей между статьями проекта</span>
          </div>
        </div>
      </div>

      {/* Filters Row 1 */}
      <div className="graph-filters" style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 12, 
        padding: '12px 20px', 
        borderBottom: '1px solid var(--border-glass)',
        alignItems: 'center',
        background: 'rgba(0,0,0,0.05)'
      }}>
        {/* Depth Filter */}
        <div className="graph-filter-group">
          <div className="graph-filter-label">
            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span>Уровень:</span>
          </div>
          <div className="graph-filter-buttons">
            <button
              className={`graph-filter-btn ${depth === 1 ? 'active' : ''}`}
              onClick={() => setDepth(1)}
              title="Только статьи проекта + связи между ними"
            >
              Проект
            </button>
            <button
              className={`graph-filter-btn ${depth === 2 ? 'active' : ''}`}
              onClick={() => setDepth(2)}
              title="+ Топ ссылок (references)"
            >
              +Ссылки
            </button>
            <button
              className={`graph-filter-btn ${depth === 3 ? 'active' : ''}`}
              onClick={() => setDepth(3)}
              title="+ Топ цитирующих (cited_by)"
            >
              +Цитирующие
            </button>
          </div>
        </div>

        {/* Status Filter */}
        <div className="graph-filter-group">
          <div className="graph-filter-label">
            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>Статус:</span>
          </div>
          <div className="graph-filter-buttons">
            <button
              className={`graph-filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              Все
            </button>
            <button
              className={`graph-filter-btn ${filter === 'selected' ? 'active' : ''}`}
              onClick={() => handleFilterChange('selected')}
            >
              Отобранные
            </button>
            <button
              className={`graph-filter-btn ${filter === 'excluded' ? 'active' : ''}`}
              onClick={() => handleFilterChange('excluded')}
            >
              Исключённые
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            className="btn"
            style={{ padding: '8px 16px', fontSize: 12 }}
            onClick={handleImportSelected}
            disabled={importing || selectedNodeIds.size === 0}
            title="Добавить выбранные статьи из графа в кандидаты"
          >
            <svg className="icon-sm" style={{ marginRight: 6 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {importing ? 'Импорт...' : `В кандидаты (${selectedNodeIds.size})`}
          </button>
        </div>
      </div>

      {/* Filters Row 2 */}
      <div className="graph-filters" style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 12, 
        padding: '12px 20px', 
        borderBottom: '1px solid var(--border-glass)',
        alignItems: 'center'
      }}>
        {/* Fetch References */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={fetchSelectedOnly}
              onChange={(e) => setFetchSelectedOnly(e.target.checked)}
              className="search-checkbox"
            />
            Только отобранные
          </label>
          <button
            className="btn secondary"
            style={{ padding: '8px 16px', fontSize: 12 }}
            onClick={handleFetchReferences}
            disabled={fetchingRefs || !!fetchJobStatus?.isRunning}
            title={fetchSelectedOnly ? 'Загрузить связи только для отобранных статей' : 'Загрузить связи для всех статей проекта'}
          >
            <svg className="icon-sm" style={{ marginRight: 6 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {fetchingRefs || fetchJobStatus?.isRunning ? 'Загрузка...' : 'Обновить связи из PubMed'}
          </button>
        </div>
      
        {/* Year Filter */}
        <div className="graph-filter-group">
          <div className="graph-filter-label">
            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Годы:</span>
          </div>
          <input
            type="number"
            placeholder={yearRange.min ? String(yearRange.min) : "От"}
            value={yearFrom || ''}
            onChange={(e) => setYearFrom(e.target.value ? parseInt(e.target.value, 10) : undefined)}
            style={{ 
              width: 70, 
              padding: '6px 8px', 
              fontSize: 12,
              border: '1px solid var(--border-glass)',
              borderRadius: 6,
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
            min={yearRange.min || 1900}
            max={yearRange.max || 2030}
          />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
          <input
            type="number"
            placeholder={yearRange.max ? String(yearRange.max) : "До"}
            value={yearTo || ''}
            onChange={(e) => setYearTo(e.target.value ? parseInt(e.target.value, 10) : undefined)}
            style={{ 
              width: 70, 
              padding: '6px 8px', 
              fontSize: 12,
              border: '1px solid var(--border-glass)',
              borderRadius: 6,
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
            min={yearRange.min || 1900}
            max={yearRange.max || 2030}
          />
          {(yearFrom || yearTo) && (
            <button
              className="graph-filter-btn"
              style={{ padding: '4px 8px' }}
              onClick={() => { setYearFrom(undefined); setYearTo(undefined); }}
            >
              ✕
            </button>
          )}
        </div>
        
        {/* P-value Filter */}
        <div className="graph-filter-group">
          <div className="graph-filter-label">
            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>P-value:</span>
          </div>
          <button
            className={`graph-filter-btn ${highlightPValue ? 'active' : ''}`}
            style={highlightPValue ? { background: '#fbbf24', borderColor: '#f59e0b', color: '#1e293b' } : undefined}
            onClick={() => setHighlightPValue(!highlightPValue)}
            title={highlightPValue ? 'Скрыть подсветку' : 'Подсветить золотым'}
          >
            Выделить
          </button>
          <select
            value={statsQuality}
            onChange={(e) => setStatsQuality(parseInt(e.target.value, 10))}
            style={{ 
              padding: '6px 10px', 
              fontSize: 12,
              border: '1px solid var(--border-glass)',
              borderRadius: 6,
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
          >
            <option value={0}>Все статьи</option>
            <option value={1}>≥ Упомянут p-value</option>
            <option value={2}>≥ Значимые результаты</option>
            <option value={3}>Строгие (p&lt;0.01)</option>
          </select>
        </div>
        
        {/* Query Filter */}
        {availableQueries.length > 0 && (
          <div className="graph-filter-group" style={{ flexWrap: 'wrap' }}>
            <div className="graph-filter-label">
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Запросы:</span>
            </div>
            <div className="graph-filter-buttons">
              {availableQueries.map(query => (
                <button
                  key={query}
                  className={`graph-filter-btn ${selectedQueries.includes(query) ? 'active' : ''}`}
                  onClick={() => handleQueryToggle(query)}
                  title={query}
                  style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {query.length > 15 ? query.slice(0, 15) + '...' : query}
                </button>
              ))}
              {selectedQueries.length > 0 && (
                <button className="graph-filter-btn" onClick={handleClearQueries}>✕</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {fetchJobStatus?.isRunning && (
        <div style={{ 
          padding: '16px 20px', 
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
          borderBottom: '1px solid var(--border-glass)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div className="loading-spinner" />
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
              Загрузка связей из PubMed...
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
              {formatTime(fetchJobStatus.elapsedSeconds)}
            </span>
          </div>
          
          <div className="progress-bar-animated" style={{ 
            height: 6, 
            background: 'rgba(255,255,255,0.1)', 
            borderRadius: 3, 
            overflow: 'hidden',
            marginBottom: 10
          }}>
            <div style={{ 
              height: '100%', 
              width: `${fetchJobStatus.progress}%`,
              background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              borderRadius: 3,
              transition: 'width 0.3s ease'
            }} />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
            <span>Статей: {fetchJobStatus.processedArticles || 0} / {fetchJobStatus.totalArticles || '?'}</span>
            <span>{fetchJobStatus.progress}% завершено</span>
          </div>
          
          <div style={{ marginTop: 10, fontSize: 11, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Загрузка выполняется в фоне. Граф обновится автоматически.
          </div>
        </div>
      )}

      {refsMessage && (
        <div className="ok" style={{ margin: '8px 20px', padding: 12, fontSize: 13 }}>
          {refsMessage}
        </div>
      )}

      {importMessage && (
        <div className="ok" style={{ margin: '8px 20px', padding: 12, fontSize: 13 }}>
          {importMessage}
        </div>
      )}

      {/* Stats Bar */}
      <div className="graph-stats-bar">
        <div className="graph-stat-item">
          <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>Узлов:</span>
          <span className="graph-stat-value">{stats.totalNodes}</span>
        </div>
        <div className="graph-stat-item">
          <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span>Связей:</span>
          <span className="graph-stat-value" style={{ color: '#10b981' }}>{stats.totalLinks}</span>
        </div>
        {stats.levelCounts && (
          <>
            {depth >= 3 && stats.levelCounts.level0 !== undefined && stats.levelCounts.level0 > 0 && (
              <div className="graph-stat-item">
                <span className="legend-dot" style={{ background: '#a855f7' }}></span>
                <span>Цитируют:</span>
                <span style={{ color: '#a855f7', fontWeight: 600 }}>{stats.levelCounts.level0}</span>
              </div>
            )}
            <div className="graph-stat-item">
              <span className="legend-dot" style={{ background: '#3b82f6' }}></span>
              <span>В проекте:</span>
              <span style={{ color: '#3b82f6', fontWeight: 600 }}>{stats.levelCounts.level1}</span>
            </div>
            {depth >= 2 && (
              <div className="graph-stat-item">
                <span className="legend-dot" style={{ background: '#f97316' }}></span>
                <span>Ссылки:</span>
                <span style={{ color: '#f97316', fontWeight: 600 }}>{stats.levelCounts.level2}</span>
              </div>
            )}
            {depth >= 3 && stats.levelCounts.level3 !== undefined && stats.levelCounts.level3 > 0 && (
              <div className="graph-stat-item">
                <span className="legend-dot" style={{ background: '#06b6d4' }}></span>
                <span>Связанные:</span>
                <span style={{ color: '#06b6d4', fontWeight: 600 }}>{stats.levelCounts.level3}</span>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Warning if no references */}
      {depth >= 2 && stats.availableReferences === 0 && stats.availableCiting === 0 && (
        <div style={{ 
          padding: '12px 20px', 
          background: 'rgba(251, 191, 36, 0.1)', 
          borderBottom: '1px solid var(--border-glass)',
          fontSize: 12,
          color: '#fbbf24',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Данные о ссылках не загружены. Нажмите "Обновить связи из PubMed" для загрузки.
        </div>
      )}
      
      {/* Legend */}
      <div className="graph-legend-bar">
        {highlightPValue && (
          <span><span className="legend-dot" style={{ background: '#fbbf24' }}></span> P-value</span>
        )}
        {depth >= 3 && (
          <span><span className="legend-dot" style={{ background: '#a855f7' }}></span> Цитируют нас</span>
        )}
        <span><span className="legend-dot" style={{ background: '#22c55e' }}></span> Отобранные</span>
        <span><span className="legend-dot" style={{ background: '#3b82f6' }}></span> Кандидаты</span>
        <span><span className="legend-dot" style={{ background: '#ef4444' }}></span> Исключённые</span>
        {depth >= 2 && (
          <span><span className="legend-dot" style={{ background: '#f97316' }}></span> Ссылки</span>
        )}
        {depth >= 3 && (
          <span><span className="legend-dot" style={{ background: '#06b6d4' }}></span> Связанные</span>
        )}
      </div>

      {/* Main Graph + Sidebar Container */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Graph Area - scrollable 2000x2000 canvas */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          {(!data || data.nodes.length === 0) ? (
            <div className="muted" style={{ padding: 60, textAlign: 'center' }}>
              <svg className="icon-lg" style={{ margin: '0 auto 16px', opacity: 0.5, width: 48, height: 48 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p>Нет данных для графа с текущими фильтрами.</p>
            </div>
          ) : (
            <div style={{ overflow: 'auto', flex: 1, position: 'relative' }}>
              <ForceGraph2D
                graphData={data}
                width={dimensions.width}
                height={dimensions.height}
                nodeColor={nodeColor}
                nodeLabel={nodeLabel}
                nodeVal={nodeVal}
                nodeRelSize={6}
                nodeCanvasObject={(node: any, ctx: any, globalScale: any) => {
                  const size = Math.sqrt(node.val || 20) * 1.5;
                  
                  ctx.fillStyle = nodeColor(node);
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
                  ctx.fill();
                  
                  if (selectedNodeIds.has(node.id)) {
                    ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
                    ctx.lineWidth = size * 0.4;
                    ctx.stroke();
                  }
                  
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
                  if (event?.altKey) {
                    if (node.doi) {
                      window.open(`https://doi.org/${node.doi}`, '_blank');
                    } else if (node.pmid) {
                      window.open(`https://pubmed.ncbi.nlm.nih.gov/${node.pmid}`, '_blank');
                    }
                    return;
                  }
                  setSelectedNodeForDisplay(selectedNodeForDisplay?.id === node.id ? null : node);
                }}
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="graph-sidebar">
          {selectedNodeForDisplay || hoveredNode ? (
            <NodeInfoPanel 
              node={selectedNodeForDisplay || hoveredNode} 
              projectId={projectId} 
              onRefresh={() => loadGraph({ filter, sourceQueries: selectedQueries.length > 0 ? selectedQueries : undefined, depth, yearFrom, yearTo, statsQuality })}
            />
          ) : (
            <div className="graph-sidebar-empty">
              <div>
                <svg className="icon-lg" style={{ margin: '0 auto 12px', opacity: 0.5 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                <p style={{ margin: 0 }}>Наведите или кликните на узел для просмотра информации</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer with instructions */}
      <div className="graph-footer">
        <div className="graph-footer-title">
          <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Как работает граф</span>
        </div>
        <ul className="graph-footer-list">
          <li>Каждый <strong>узел</strong> — статья из вашего проекта</li>
          <li><strong>Стрелки</strong> показывают, какая статья цитирует какую</li>
          <li>Данные о связях берутся из <strong>Crossref</strong> (обогатите статьи кнопкой "Crossref")</li>
          <li>Кликните на узел чтобы открыть статью по DOI. <strong>Alt+клик</strong> открывает источник напрямую.</li>
        </ul>
      </div>
    </div>
  );
}

// Компонент для отображения информации о узле
function NodeInfoPanel({ node, projectId, onRefresh }: { node: any; projectId: string; onRefresh?: () => void }) {
  const [adding, setAdding] = useState(false);
  const [addMessage, setAddMessage] = useState<string | null>(null);

  const handleAddToProject = async () => {
    if (!node.pmid && !node.doi) {
      setAddMessage('Нет PMID или DOI для добавления');
      return;
    }

    setAdding(true);
    setAddMessage(null);
    try {
      const payload = {
        pmids: node.pmid ? [node.pmid] : [],
        dois: node.doi ? [node.doi] : [],
      };
      const res = await apiImportFromGraph(projectId, payload);
      setAddMessage(res.message || 'Статья добавлена в проект!');
      if (onRefresh) {
        setTimeout(() => onRefresh(), 500);
      }
    } catch (err: any) {
      setAddMessage(err?.message || 'Ошибка добавления');
    } finally {
      setAdding(false);
    }
  };

  const getLevelColor = (level: number) => {
    switch(level) {
      case 0: return '#a855f7';
      case 1: return '#3b82f6';
      case 2: return '#f97316';
      case 3: return '#06b6d4';
      default: return '#6b7280';
    }
  };

  const getLevelName = (level: number) => {
    switch(level) {
      case 0: return 'Цитирует нас';
      case 1: return 'В проекте';
      case 2: return 'Ссылка (reference)';
      case 3: return 'Связанная работа';
      default: return `Уровень ${level}`;
    }
  };

  const level = node.graphLevel ?? 1;

  return (
    <div className="node-info-panel">
      {/* Header Card */}
      <div className="node-info-header" style={{ borderLeftColor: getLevelColor(level) }}>
        <div className="node-level-badge" style={{ backgroundColor: getLevelColor(level) }}>
          {getLevelName(level)}
        </div>
        <div className="node-title">{node.label}</div>
        {node.title && node.title !== node.label && (
          <div className="node-full-title">{node.title}</div>
        )}
      </div>

      {/* Info Rows */}
      {node.year && (
        <div className="node-info-row">
          <div className="node-info-label">
            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Год
          </div>
          <div className="node-info-value">{node.year}</div>
        </div>
      )}

      {node.pmid && (
        <div className="node-info-row">
          <div className="node-info-label">
            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            PMID
          </div>
          <a 
            href={`https://pubmed.ncbi.nlm.nih.gov/${node.pmid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="node-info-link"
          >
            {node.pmid} ↗
          </a>
        </div>
      )}

      {node.doi && (
        <div className="node-info-row">
          <div className="node-info-label">
            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            DOI
          </div>
          <a 
            href={`https://doi.org/${node.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="node-info-link"
            style={{ wordBreak: 'break-all' }}
          >
            {node.doi} ↗
          </a>
        </div>
      )}

      {(node.citedByCount !== undefined && node.citedByCount > 0) && (
        <div className="node-info-row">
          <div className="node-info-label">
            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Цитирований
          </div>
          <div className="node-info-value" style={{ color: '#10b981' }}>{node.citedByCount}</div>
        </div>
      )}

      {node.statsQuality && node.statsQuality > 0 && (
        <div className="node-info-row">
          <div className="node-info-label">
            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            P-value
          </div>
          <div className="node-info-value" style={{ color: '#fbbf24' }}>{'★'.repeat(node.statsQuality)}</div>
        </div>
      )}

      {/* Add Button */}
      {(node.graphLevel === 2 || node.graphLevel === 3 || node.graphLevel === 0) && (
        <button
          onClick={handleAddToProject}
          disabled={adding}
          className="node-add-btn"
        >
          {adding ? (
            <>
              <span className="loading-spinner" style={{ width: 14, height: 14, marginRight: 8, display: 'inline-block', verticalAlign: 'middle' }} />
              Добавляю...
            </>
          ) : (
            <>
              <svg className="icon-sm" style={{ marginRight: 6, display: 'inline', verticalAlign: 'middle' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Добавить в проект
            </>
          )}
        </button>
      )}

      {addMessage && (
        <div style={{ 
          marginTop: 12,
          padding: '10px 14px',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderRadius: 8,
          fontSize: 12,
          color: '#10b981',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {addMessage}
        </div>
      )}
    </div>
  );
}
