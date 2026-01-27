import React, { useEffect, useState } from "react";
import {
  apiAdminGetHealth,
  apiAdminGetConfig,
  apiAdminCleanupExpiredCache,
  apiAdminCleanupOldSessions,
  apiAdminCleanupOldActivity,
  type AdminHealthResponse,
  type AdminConfigResponse,
} from "../../lib/adminApi";
import {
  IconSettings,
  IconRefresh,
  IconCheckCircle,
  IconExclamation,
  IconTrash,
} from "../../components/FlowbiteIcons";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}д ${hours}ч ${minutes}м`;
}

export default function AdminSystemPage() {
  const [health, setHealth] = useState<AdminHealthResponse | null>(null);
  const [config, setConfig] = useState<AdminConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [healthData, configData] = await Promise.all([
        apiAdminGetHealth(),
        apiAdminGetConfig(),
      ]);
      setHealth(healthData);
      setConfig(configData);
    } catch (err: any) {
      setError(err?.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  async function handleCleanup(type: 'cache' | 'sessions' | 'activity') {
    setCleanupLoading(type);
    try {
      let result;
      if (type === 'cache') {
        result = await apiAdminCleanupExpiredCache();
      } else if (type === 'sessions') {
        result = await apiAdminCleanupOldSessions(30);
      } else {
        result = await apiAdminCleanupOldActivity(90);
      }
      alert(`Удалено записей: ${result.deletedCount}`);
      loadData();
    } catch (err: any) {
      alert(err?.message || "Ошибка");
    } finally {
      setCleanupLoading(null);
    }
  }

  if (loading && !health) {
    return (
      <div className="admin-page">
        <div className="admin-loading-content">
          <div className="admin-loading-spinner"></div>
          <p>Загрузка системной информации...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>
            <IconSettings size="lg" />
            Система
          </h1>
          <p className="admin-page-subtitle">Здоровье и конфигурация</p>
        </div>
        <button className="btn secondary" onClick={loadData} disabled={loading}>
          <IconRefresh className={loading ? "spin" : ""} />
          Обновить
        </button>
      </div>

      {error && (
        <div className="alert admin-alert">
          <IconExclamation />
          <span>{error}</span>
        </div>
      )}

      <div className="admin-system-grid">
        {/* Database Health */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>База данных</h3>
            <span className={`admin-badge ${health?.database.active_connections && health.database.active_connections < health.database.max_connections * 0.8 ? 'admin-badge-success' : 'admin-badge-warning'}`}>
              {health?.database.active_connections || 0} активных
            </span>
          </div>
          <div className="admin-card-content">
            <div className="admin-info-list">
              <div className="admin-info-item">
                <span className="admin-info-label">Размер БД</span>
                <span className="admin-info-value mono">
                  {formatBytes(health?.database.database_size || 0)}
                </span>
              </div>
              <div className="admin-info-item">
                <span className="admin-info-label">Соединения</span>
                <span className="admin-info-value">
                  {health?.database.total_connections || 0} / {health?.database.max_connections || 0}
                </span>
              </div>
              <div className="admin-info-item">
                <span className="admin-info-label">Пул соединений</span>
                <span className="admin-info-value">
                  Всего: {health?.pool.totalCount || 0}, 
                  Свободно: {health?.pool.idleCount || 0}, 
                  Ожидают: {health?.pool.waitingCount || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Server Health */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>Сервер</h3>
            <span className="admin-badge admin-badge-success">
              <IconCheckCircle size="sm" />
              Онлайн
            </span>
          </div>
          <div className="admin-card-content">
            <div className="admin-info-list">
              <div className="admin-info-item">
                <span className="admin-info-label">Аптайм</span>
                <span className="admin-info-value">
                  {formatUptime(health?.uptime || 0)}
                </span>
              </div>
              <div className="admin-info-item">
                <span className="admin-info-label">Node.js</span>
                <span className="admin-info-value mono">
                  {health?.nodeVersion || "—"}
                </span>
              </div>
              <div className="admin-info-item">
                <span className="admin-info-label">Память (Heap)</span>
                <span className="admin-info-value mono">
                  {formatBytes(health?.memory.heapUsed || 0)} / {formatBytes(health?.memory.heapTotal || 0)}
                </span>
              </div>
              <div className="admin-info-item">
                <span className="admin-info-label">Память (RSS)</span>
                <span className="admin-info-value mono">
                  {formatBytes(health?.memory.rss || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cache */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>Кэш графов</h3>
          </div>
          <div className="admin-card-content">
            <div className="admin-info-list">
              <div className="admin-info-item">
                <span className="admin-info-label">Записей в кэше</span>
                <span className="admin-info-value">
                  {health?.cache.cache_entries || 0}
                </span>
              </div>
              <div className="admin-info-item">
                <span className="admin-info-label">Истёкших</span>
                <span className={`admin-info-value ${(health?.cache.expired_entries || 0) > 0 ? 'text-warning' : ''}`}>
                  {health?.cache.expired_entries || 0}
                </span>
              </div>
            </div>
            <button
              className="btn secondary mt-3"
              onClick={() => handleCleanup('cache')}
              disabled={cleanupLoading === 'cache'}
            >
              <IconTrash size="sm" />
              {cleanupLoading === 'cache' ? 'Очистка...' : 'Очистить истёкший кэш'}
            </button>
          </div>
        </div>

        {/* Configuration */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>Лимиты</h3>
          </div>
          <div className="admin-card-content">
            <div className="admin-info-list">
              <div className="admin-info-item">
                <span className="admin-info-label">Проектов на пользователя</span>
                <span className="admin-info-value">
                  {config?.config.maxProjectsPerUser || "—"}
                </span>
              </div>
              <div className="admin-info-item">
                <span className="admin-info-label">Документов в проекте</span>
                <span className="admin-info-value">
                  {config?.config.maxDocumentsPerProject || "—"}
                </span>
              </div>
              <div className="admin-info-item">
                <span className="admin-info-label">Макс. размер файла</span>
                <span className="admin-info-value">
                  {config?.config.maxFileSizeMb || "—"} MB
                </span>
              </div>
              <div className="admin-info-item">
                <span className="admin-info-label">Хранилище на пользователя</span>
                <span className="admin-info-value">
                  {config?.config.maxStoragePerUserMb || "—"} MB
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>Функции</h3>
          </div>
          <div className="admin-card-content">
            <div className="admin-features-list">
              <div className="admin-feature-item">
                <span className={`admin-feature-status ${config?.config.features.aiErrorAnalysis ? 'active' : ''}`}></span>
                <span>AI анализ ошибок</span>
              </div>
              <div className="admin-feature-item">
                <span className={`admin-feature-status ${config?.config.features.aiProtocolCheck ? 'active' : ''}`}></span>
                <span>AI проверка протокола</span>
              </div>
              <div className="admin-feature-item">
                <span className={`admin-feature-status ${config?.config.features.fileExtraction ? 'active' : ''}`}></span>
                <span>Извлечение из файлов</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rate Limits */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>Rate Limits</h3>
          </div>
          <div className="admin-card-content">
            <div className="admin-info-list">
              <div className="admin-info-item">
                <span className="admin-info-label">Регистрация</span>
                <span className="admin-info-value mono">
                  {config?.config.rateLimits.register || "—"}
                </span>
              </div>
              <div className="admin-info-item">
                <span className="admin-info-label">Вход</span>
                <span className="admin-info-value mono">
                  {config?.config.rateLimits.login || "—"}
                </span>
              </div>
              <div className="admin-info-item">
                <span className="admin-info-label">API</span>
                <span className="admin-info-value mono">
                  {config?.config.rateLimits.api || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cleanup Actions */}
        <div className="admin-card admin-card-full">
          <div className="admin-card-header">
            <h3>Очистка данных</h3>
          </div>
          <div className="admin-card-content">
            <div className="admin-cleanup-actions">
              <div className="admin-cleanup-item">
                <div className="admin-cleanup-info">
                  <h4>Старые сессии</h4>
                  <p>Удалить завершённые сессии старше 30 дней</p>
                </div>
                <button
                  className="btn secondary"
                  onClick={() => handleCleanup('sessions')}
                  disabled={cleanupLoading === 'sessions'}
                >
                  <IconTrash size="sm" />
                  {cleanupLoading === 'sessions' ? 'Очистка...' : 'Очистить'}
                </button>
              </div>
              <div className="admin-cleanup-item">
                <div className="admin-cleanup-info">
                  <h4>Старая активность</h4>
                  <p>Удалить записи активности старше 90 дней</p>
                </div>
                <button
                  className="btn secondary"
                  onClick={() => handleCleanup('activity')}
                  disabled={cleanupLoading === 'activity'}
                >
                  <IconTrash size="sm" />
                  {cleanupLoading === 'activity' ? 'Очистка...' : 'Очистить'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table Sizes */}
        <div className="admin-card admin-card-full">
          <div className="admin-card-header">
            <h3>Размеры таблиц</h3>
          </div>
          <div className="admin-card-content">
            <table className="admin-table admin-table-compact">
              <thead>
                <tr>
                  <th>Таблица</th>
                  <th>Строк</th>
                  <th>Размер</th>
                </tr>
              </thead>
              <tbody>
                {health?.tables.map((table) => (
                  <tr key={table.table_name}>
                    <td className="mono">{table.table_name}</td>
                    <td>{table.row_count.toLocaleString()}</td>
                    <td className="mono">{formatBytes(table.total_size)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
