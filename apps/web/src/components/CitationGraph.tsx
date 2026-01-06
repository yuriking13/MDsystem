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
    try {
      const res = await apiFetchReferences(projectId);
      
      if (res.jobId) {
        // Фоновая загрузка запущена
        setFetchJobStatus({
          isRunning: true,
          progress: 0,
          elapsedSeconds: 0,
          totalArticles: res.totalArticles,
          message: res.message,
        });
        setRefsMessage(`⏳ ${res.message}`);
        startStatusPolling();
      } else {
        setRefsMessage(res.message);
        setFetchingRefs(false);
      }
    } catch (err: any) {
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

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: Math.max(800, containerRef.current.offsetWidth - 320), // Больше места для графа
          height: Math.max(800, window.innerHeight - 100), // Максимальный размер
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
  }, [selectedNodeIds]);

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
    <div className="graph-container" ref={containerRef} style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
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
          disabled={fetchingRefs || !!fetchJobStatus?.isRunning}
        >
          {fetchingRefs || fetchJobStatus?.isRunning ? '⏳ Загрузка...' : '🔄 Обновить связи из PubMed'}
        </button>
      </div>
      
      {/* Прогресс загрузки связей */}
      {fetchJobStatus?.isRunning && (
        <div style={{ 
          padding: '12px 16px', 
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))',
          borderBottom: '1px solid var(--border-glass)',
          borderRadius: '0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div className="loading-spinner" style={{ width: 18, height: 18 }} />
            <span style={{ fontWeight: 600, fontSize: 13 }}>
              Загрузка связей из PubMed...
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
              ⏱️ {formatTime(fetchJobStatus.elapsedSeconds)}
            </span>
          </div>
          
          {/* Прогресс бар */}
          <div style={{ 
            height: 8, 
            background: 'rgba(255,255,255,0.1)', 
            borderRadius: 4, 
            overflow: 'hidden',
            marginBottom: 8
          }}>
            <div style={{ 
              height: '100%', 
              width: `${fetchJobStatus.progress}%`,
              background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              borderRadius: 4,
              transition: 'width 0.3s ease'
            }} />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
            <span>
              📊 Статей: {fetchJobStatus.processedArticles || 0} / {fetchJobStatus.totalArticles || '?'}
            </span>
            <span>
              {fetchJobStatus.progress}% завершено
            </span>
          </div>
          
          <div style={{ marginTop: 8, fontSize: 11, color: '#fbbf24' }}>
            💡 Загрузка выполняется в фоне. Вы можете продолжить работу — граф обновится автоматически.
          </div>
        </div>
      )}
      
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
        <span style={{ fontWeight: 600 }}>📊 Узлов: <span style={{ color: '#3b82f6' }}>{stats.totalNodes}</span></span>
        <span style={{ fontWeight: 600 }}>🔗 Связей: <span style={{ color: '#10b981' }}>{stats.totalLinks}</span></span>
        {stats.levelCounts && (
          <>
            {depth >= 3 && stats.levelCounts.level0 !== undefined && stats.levelCounts.level0 > 0 && (
              <span style={{ color: '#a855f7', fontWeight: 500 }}>
                🟣 Цитируют нас: {stats.levelCounts.level0}
              </span>
            )}
            <span style={{ color: '#3b82f6', fontWeight: 500 }}>🔵 В проекте: {stats.levelCounts.level1}</span>
            {depth >= 2 && (
              <span style={{ color: '#f97316', fontWeight: 500 }}>
                🟠 Ссылки: {stats.levelCounts.level2}
              </span>
            )}
            {depth >= 3 && stats.levelCounts.level3 !== undefined && stats.levelCounts.level3 > 0 && (
              <span style={{ color: '#06b6d4', fontWeight: 500 }}>
                🔷 Связанные: {stats.levelCounts.level3}
              </span>
            )}
          </>
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
      
      <div className="graph-legend" style={{ padding: '4px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11 }}>
        {depth >= 3 && (
          <>
            <span><span className="legend-dot" style={{ background: '#a855f7' }}></span> Цитируют нас</span>
          </>
        )}
        <span><span className="legend-dot" style={{ background: '#22c55e' }}></span> Отобранные</span>
        <span><span className="legend-dot" style={{ background: '#3b82f6' }}></span> Кандидаты</span>
        <span><span className="legend-dot" style={{ background: '#ef4444' }}></span> Исключённые</span>
        {depth >= 2 && (
          <>
            <span><span className="legend-dot" style={{ background: '#f97316' }}></span> Ссылки</span>
          </>
        )}
        {depth >= 3 && (
          <>
            <span><span className="legend-dot" style={{ background: '#06b6d4' }}></span> Связанные</span>
          </>
        )}
      </div>

      {/* Основной контейнер с графом и sidebar */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Область графа */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
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
          nodeRelSize={6}
          nodeCanvasObject={(node: any, ctx: any, globalScale: any) => {
            const size = Math.sqrt(node.val || 20) * 1.5;
            
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

            // Alt+клик открывает источник, обычный клик фиксирует узел для отображения
            if (event?.altKey) {
              if (node.doi) {
                window.open(`https://doi.org/${node.doi}`, '_blank');
              } else if (node.pmid) {
                window.open(`https://pubmed.ncbi.nlm.nih.gov/${node.pmid}`, '_blank');
              }
              return;
            }

            // Обычный клик: фиксируем узел для отображения информации
            setSelectedNodeForDisplay(selectedNodeForDisplay?.id === node.id ? null : node);
          }}
        />
      )}
      
      <div className="muted" style={{ fontSize: 11, marginTop: 8, padding: '0 16px 12px' }}>
        💡 Наведите на узел для подробностей. Клик - фиксирует узел, Alt+клик открывает DOI/PubMed.
      </div>
        </div>

        {/* Sidebar с информацией о узле */}
        <div style={{
          width: 340,
          borderLeft: '1px solid var(--border-glass)',
          backgroundColor: 'var(--bg-secondary)',
          overflow: 'auto',
          padding: '16px',
          fontSize: 13
        }}>
          {selectedNodeForDisplay || hoveredNode ? (
            <NodeInfoPanel 
              node={selectedNodeForDisplay || hoveredNode} 
              projectId={projectId} 
              onRefresh={() => loadGraph({ filter, sourceQueries: selectedQueries.length > 0 ? selectedQueries : undefined, depth, yearFrom, yearTo, statsQuality })}
            />
          ) : (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '40px' }}>
              👈 Наведите или кликните на узел
            </div>
          )}
        </div>
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
      // Обновляем граф после добавления
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
      case 0: return '#a855f7'; // Фиолетовый - цитирует нас
      case 1: return '#3b82f6'; // Синий - наши статьи
      case 2: return '#f97316'; // Оранжевый - references
      case 3: return '#06b6d4'; // Голубой - связанные
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
    <div>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          padding: '12px', 
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '8px',
          marginBottom: '12px',
          border: `2px solid ${getLevelColor(level)}`
        }}>
          <div style={{ 
            display: 'inline-block',
            padding: '4px 10px',
            backgroundColor: getLevelColor(level),
            color: 'white',
            borderRadius: '4px',
            fontSize: 11,
            fontWeight: 600,
            marginBottom: '10px'
          }}>
            {getLevelName(level)}
          </div>
          
          {/* Название (label) */}
          <div style={{ 
            fontSize: 14,
            lineHeight: '1.5',
            color: 'var(--text-primary)',
            fontWeight: 600,
            wordBreak: 'break-word',
            marginBottom: '8px'
          }}>
            {node.label}
          </div>

          {/* Полное название если есть title */}
          {node.title && node.title !== node.label && (
            <div style={{
              fontSize: 12,
              lineHeight: '1.4',
              color: 'var(--text-muted)',
              wordBreak: 'break-word',
              marginTop: '8px',
              padding: '8px',
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: '4px'
            }}>
              📖 {node.title}
            </div>
          )}
        </div>
      </div>

      {node.year && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: '4px' }}>📅 Год</div>
          <div style={{ fontWeight: 500 }}>{node.year}</div>
        </div>
      )}

      {node.pmid && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: '4px' }}>🆔 PMID</div>
          <a 
            href={`https://pubmed.ncbi.nlm.nih.gov/${node.pmid}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              color: '#3b82f6',
              textDecoration: 'none',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            {node.pmid} ↗
          </a>
        </div>
      )}

      {node.doi && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: '4px' }}>📄 DOI</div>
          <a 
            href={`https://doi.org/${node.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              color: '#3b82f6',
              textDecoration: 'none',
              fontWeight: 500,
              cursor: 'pointer',
              wordBreak: 'break-all'
            }}
          >
            {node.doi} ↗
          </a>
        </div>
      )}

      {(node.citedByCount !== undefined && node.citedByCount > 0) && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: '4px' }}>📈 Цитирований</div>
          <div style={{ fontWeight: 500, color: '#10b981' }}>{node.citedByCount}</div>
        </div>
      )}

      {node.statsQuality && node.statsQuality > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: '4px' }}>⭐ P-value</div>
          <div style={{ fontWeight: 500 }}>{'★'.repeat(node.statsQuality)}</div>
        </div>
      )}

      {node.graphLevel === 2 || node.graphLevel === 3 || node.graphLevel === 0 ? (
        <button
          onClick={handleAddToProject}
          disabled={adding}
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: adding ? 'wait' : 'pointer',
            fontWeight: 600,
            fontSize: 12,
            marginTop: '16px',
            opacity: adding ? 0.6 : 1
          }}
        >
          {adding ? '⏳ Добавляю...' : '➕ Добавить в проект'}
        </button>
      ) : null}

      {addMessage && (
        <div style={{ 
          marginTop: '12px',
          padding: '8px 12px',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderRadius: '4px',
          fontSize: 11,
          color: '#10b981'
        }}>
          {addMessage}
        </div>
      )}
    </div>
  );
}
