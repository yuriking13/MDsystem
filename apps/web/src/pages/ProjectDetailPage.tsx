import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  apiGetProject,
  apiUpdateProject,
  apiGetProjectMembers,
  apiInviteProjectMember,
  apiRemoveProjectMember,
  apiGetDocuments,
  apiCreateDocument,
  apiDeleteDocument,
  apiReorderDocuments,
  apiRenumberCitations,
  apiGetBibliography,
  apiExportProject,
  apiGetStatistics,
  apiDeleteStatistic,
  apiUpdateStatistic,
  type Project,
  type ProjectMember,
  type Document,
  type BibliographyItem,
  type CitationStyle,
  type ResearchType,
  type ResearchProtocol,
  type ProjectStatistic,
  type DataClassification,
} from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import ArticlesSection from "../components/ArticlesSection";
import CitationGraph from "../components/CitationGraph";
import ChartFromTable, { CHART_TYPE_INFO, type ChartType, type TableData } from "../components/ChartFromTable";
import StatisticEditModal from "../components/StatisticEditModal";
import CreateStatisticModal from "../components/CreateStatisticModal";
import { 
  exportToWord, 
  exportToPdf, 
  exportBibliographyToWord, 
  exportBibliographyToTxt, 
  exportBibliographyToPdf 
} from "../lib/exportWord";

type Tab = "articles" | "documents" | "statistics" | "graph" | "team" | "settings";

// Типы исследований с описаниями
const RESEARCH_TYPES: Record<ResearchType, {
  name: string;
  description: string;
  subtypes: { value: string; name: string; description: string }[];
}> = {
  observational_descriptive: {
    name: "Описательное наблюдательное",
    description: "Описание редких или новых феноменов",
    subtypes: [
      { value: "case_report", name: "Клинический случай (Case Report)", description: "Описание отдельного случая" },
      { value: "case_series", name: "Серия случаев", description: "Описание нескольких схожих случаев" },
    ],
  },
  observational_analytical: {
    name: "Аналитическое наблюдательное",
    description: "Выявление факторов риска и ассоциаций",
    subtypes: [
      { value: "cohort_prospective", name: "Когортное проспективное", description: "Наблюдение группы во времени" },
      { value: "cohort_retrospective", name: "Когортное ретроспективное", description: "Анализ прошлых данных" },
      { value: "case_control", name: "Случай-контроль", description: "Сравнение случаев с контролем" },
      { value: "cross_sectional", name: "Поперечное (одномоментное)", description: "Срез в один момент времени" },
    ],
  },
  experimental: {
    name: "Экспериментальное",
    description: "Оценка эффективности вмешательств",
    subtypes: [
      { value: "rct", name: "РКИ (рандомизированное контролируемое)", description: "Золотой стандарт" },
      { value: "quasi_experimental", name: "Квазиэкспериментальное", description: "Без полной рандомизации" },
      { value: "pre_post", name: "Пред- и постэкспериментальное", description: "До и после вмешательства" },
    ],
  },
  second_order: {
    name: "Исследование второго порядка",
    description: "Синтез доказательств",
    subtypes: [
      { value: "systematic_review", name: "Систематический обзор", description: "Систематический поиск и анализ" },
      { value: "meta_analysis", name: "Метаанализ", description: "Статистический синтез результатов" },
    ],
  },
  other: {
    name: "Иное",
    description: "Другой тип исследования",
    subtypes: [],
  },
};

// Протоколы исследований
const RESEARCH_PROTOCOLS: Record<ResearchProtocol, {
  name: string;
  fullName: string;
  description: string;
  applicableTo: string[];
  keyRequirements: string[];
}> = {
  CARE: {
    name: "CARE",
    fullName: "CAse REport Guidelines",
    description: "Для публикации клинических случаев",
    applicableTo: ["case_report", "case_series"],
    keyRequirements: [
      "Структурированная аннотация",
      "Таймлайн событий",
      "Деперсонализация данных",
      "Информированное согласие",
    ],
  },
  STROBE: {
    name: "STROBE",
    fullName: "Strengthening the Reporting of Observational Studies",
    description: "Для наблюдательных исследований",
    applicableTo: ["cohort_prospective", "cohort_retrospective", "case_control", "cross_sectional"],
    keyRequirements: [
      "Чёткое описание дизайна",
      "Критерии включения/исключения",
      "Описание конфаундеров",
      "Указание пропусков данных",
    ],
  },
  CONSORT: {
    name: "CONSORT",
    fullName: "Consolidated Standards of Reporting Trials",
    description: "Для рандомизированных контролируемых испытаний",
    applicableTo: ["rct"],
    keyRequirements: [
      "CONSORT flow diagram",
      "Описание рандомизации",
      "Описание ослепления",
      "Расчёт размера выборки",
    ],
  },
  PRISMA: {
    name: "PRISMA",
    fullName: "Preferred Reporting Items for Systematic Reviews",
    description: "Для систематических обзоров и метаанализов",
    applicableTo: ["systematic_review", "meta_analysis"],
    keyRequirements: [
      "Регистрация протокола (PROSPERO)",
      "PRISMA flowchart",
      "Стратегия поиска",
      "Оценка bias",
    ],
  },
  OTHER: {
    name: "Другой",
    fullName: "Пользовательский протокол",
    description: "Указать название протокола вручную",
    applicableTo: [],
    keyRequirements: [],
  },
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Активная вкладка
  const [activeTab, setActiveTab] = useState<Tab>("articles");

  // Edit mode (settings)
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [citationStyle, setCitationStyle] = useState<"gost" | "apa" | "vancouver">("gost");
  const [saving, setSaving] = useState(false);
  
  // Новые настройки проекта
  const [researchType, setResearchType] = useState<ResearchType | undefined>();
  const [researchSubtype, setResearchSubtype] = useState("");
  const [researchProtocol, setResearchProtocol] = useState<ResearchProtocol | undefined>();
  const [protocolCustomName, setProtocolCustomName] = useState("");
  const [aiErrorAnalysisEnabled, setAiErrorAnalysisEnabled] = useState(false);
  const [aiProtocolCheckEnabled, setAiProtocolCheckEnabled] = useState(false);
  
  // Статистика проекта
  const [statistics, setStatistics] = useState<ProjectStatistic[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [editingStat, setEditingStat] = useState<ProjectStatistic | null>(null);
  const [statisticsView, setStatisticsView] = useState<'charts' | 'tables'>('charts');
  const [showCreateStatistic, setShowCreateStatistic] = useState(false);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "editor">("viewer");
  const [inviting, setInviting] = useState(false);

  // Create document
  const [showCreateDoc, setShowCreateDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [creatingDoc, setCreatingDoc] = useState(false);

  // Подсчёт статей для вкладки
  const [articleCounts, setArticleCounts] = useState({ candidate: 0, selected: 0, excluded: 0, total: 0 });

  // Библиография и экспорт
  const [bibliography, setBibliography] = useState<BibliographyItem[]>([]);
  const [loadingBib, setLoadingBib] = useState(false);
  const [showBibliography, setShowBibliography] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function load() {
    if (!id) return;
    setError(null);
    setLoading(true);
    try {
      const [pRes, mRes, dRes] = await Promise.all([
        apiGetProject(id),
        apiGetProjectMembers(id),
        apiGetDocuments(id),
      ]);
      setProject(pRes.project);
      setMembers(mRes.members);
      setDocuments(dRes.documents);
      setEditName(pRes.project.name);
      setEditDesc(pRes.project.description || "");
      setCitationStyle(pRes.project.citation_style || "gost");
      // Новые поля
      setResearchType(pRes.project.research_type);
      setResearchSubtype(pRes.project.research_subtype || "");
      setResearchProtocol(pRes.project.research_protocol);
      setProtocolCustomName(pRes.project.protocol_custom_name || "");
      setAiErrorAnalysisEnabled(pRes.project.ai_error_analysis_enabled || false);
      setAiProtocolCheckEnabled(pRes.project.ai_protocol_check_enabled || false);
    } catch (err: any) {
      setError(err?.message || "Failed to load project");
    } finally {
      setLoading(false);
    }
  }
  
  async function loadStatistics() {
    if (!id) return;
    setLoadingStats(true);
    try {
      const res = await apiGetStatistics(id);
      setStatistics(res.statistics);
    } catch (err: any) {
      console.error("Failed to load statistics:", err);
    } finally {
      setLoadingStats(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);
  
  // Загружаем статистику при переходе на вкладку
  useEffect(() => {
    if (activeTab === "statistics" && statistics.length === 0) {
      loadStatistics();
    }
  }, [activeTab]);

  const canEdit = project && (project.role === "owner" || project.role === "editor");
  const isOwner = project?.role === "owner";

  // === Handlers ===

  async function handleSaveSettings() {
    if (!id || !project) return;
    setSaving(true);
    setError(null);
    try {
      await apiUpdateProject(id, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        citationStyle,
        researchType,
        researchSubtype: researchSubtype || undefined,
        researchProtocol,
        protocolCustomName: protocolCustomName || undefined,
        aiErrorAnalysisEnabled,
        aiProtocolCheckEnabled,
      });
      setOk("Настройки сохранены");
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }
  
  async function handleDeleteStatistic(statId: string) {
    if (!id) return;
    if (!confirm("Удалить этот элемент статистики?")) return;
    try {
      await apiDeleteStatistic(id, statId);
      setStatistics(statistics.filter(s => s.id !== statId));
      setOk("Элемент удалён");
    } catch (err: any) {
      setError(err?.message || "Ошибка удаления");
    }
  }

  async function handleUpdateStatistic(statId: string, updates: {
    title?: string;
    description?: string;
    config?: Record<string, any>;
    tableData?: Record<string, any>;
    dataClassification?: DataClassification;
    chartType?: string;
  }) {
    if (!id) return;
    try {
      const result = await apiUpdateStatistic(id, statId, updates);
      setStatistics(statistics.map(s => 
        s.id === statId ? { ...s, ...result.statistic } : s
      ));
      setOk("Статистика обновлена");
    } catch (err: any) {
      setError(err?.message || "Ошибка обновления");
      throw err;
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !inviteEmail.trim()) return;
    setInviting(true);
    setError(null);
    try {
      await apiInviteProjectMember(id, inviteEmail.trim(), inviteRole);
      setInviteEmail("");
      setShowInvite(false);
      setOk("Участник приглашён");
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to invite");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(userId: string, email: string) {
    if (!id) return;
    if (!confirm(`Удалить ${email} из проекта?`)) return;
    try {
      await apiRemoveProjectMember(id, userId);
      setOk("Участник удалён");
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to remove member");
    }
  }

  async function handleCreateDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !newDocTitle.trim()) return;
    setCreatingDoc(true);
    try {
      const res = await apiCreateDocument(id, newDocTitle.trim());
      setDocuments([...documents, res.document]);
      setNewDocTitle("");
      setShowCreateDoc(false);
      nav(`/projects/${id}/documents/${res.document.id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create document");
    } finally {
      setCreatingDoc(false);
    }
  }

  async function handleDeleteDocument(docId: string, title: string) {
    if (!id) return;
    if (!confirm(`Удалить документ "${title}"?`)) return;
    try {
      await apiDeleteDocument(id, docId);
      setDocuments(documents.filter((d) => d.id !== docId));
    } catch (err: any) {
      setError(err?.message || "Failed to delete document");
    }
  }

  // Загрузка библиографии
  async function handleLoadBibliography() {
    if (!id) return;
    setLoadingBib(true);
    try {
      const res = await apiGetBibliography(id);
      setBibliography(res.bibliography);
      setShowBibliography(true);
    } catch (err: any) {
      setError(err?.message || "Ошибка загрузки библиографии");
    } finally {
      setLoadingBib(false);
    }
  }

  // Экспорт проекта в TXT
  async function handleExportTxt() {
    if (!id) return;
    setExporting(true);
    try {
      const res = await apiExportProject(id);
      
      // Формируем текстовый документ
      let content = `# ${res.projectName}\n\n`;
      
      // Добавляем все документы
      res.documents.forEach((doc, idx) => {
        content += `## ${idx + 1}. ${doc.title}\n\n`;
        // Убираем HTML теги для простого текста
        const plainText = doc.content?.replace(/<[^>]*>/g, '') || '';
        content += plainText + '\n\n';
      });
      
      // Добавляем список литературы
      if (res.bibliography.length > 0) {
        content += `## Список литературы\n\n`;
        res.bibliography.forEach((item) => {
          content += `${item.number}. ${item.formatted}\n`;
        });
      }
      
      // Скачиваем как текстовый файл
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${res.projectName.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      
      setOk('Документ экспортирован в TXT');
    } catch (err: any) {
      setError(err?.message || "Ошибка экспорта");
    } finally {
      setExporting(false);
    }
  }

  // Экспорт проекта в Word
  async function handleExportWord(merged = false) {
    if (!id) return;
    setExporting(true);
    try {
      const res = await apiExportProject(id);
      
      await exportToWord(
        res.projectName,
        res.documents.map(d => ({ title: d.title, content: d.content })),
        res.bibliography,
        res.citationStyle,
        merged ? res.mergedContent : undefined
      );
      
      setOk(merged 
        ? 'Объединённый документ экспортирован в Word' 
        : 'Документ экспортирован в Word');
    } catch (err: any) {
      setError(err?.message || "Ошибка экспорта");
    } finally {
      setExporting(false);
    }
  }

  // Копировать библиографию в буфер
  function handleCopyBibliography() {
    const text = bibliography.map(item => `${item.number}. ${item.formatted}`).join('\n');
    navigator.clipboard.writeText(text);
    setOk('Список литературы скопирован в буфер');
  }

  if (loading) {
    return (
      <div className="container">
        <div className="muted">Загрузка проекта...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container">
        <div className="alert">{error || "Проект не найден"}</div>
        <button className="btn" onClick={() => nav("/projects")} type="button">
          ← К проектам
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div className="row space" style={{ marginBottom: 16 }}>
        <div className="row gap">
          <button className="btn secondary" onClick={() => nav("/projects")} type="button">
            ← Проекты
          </button>
          <h1 style={{ margin: 0 }}>{project.name}</h1>
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
          {project.role} • Обновлён: {new Date(project.updated_at).toLocaleDateString()}
        </div>
      </div>

      {error && <div className="alert" style={{ marginBottom: 12 }}>{error}</div>}
      {ok && <div className="ok" style={{ marginBottom: 12 }}>{ok}</div>}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button
          className={`tab ${activeTab === "articles" ? "active" : ""}`}
          onClick={() => setActiveTab("articles")}
        >
          📚 База статей ({articleCounts.total})
        </button>
        <button
          className={`tab ${activeTab === "documents" ? "active" : ""}`}
          onClick={() => setActiveTab("documents")}
        >
          📄 Документы ({documents.length})
        </button>
        <button
          className={`tab ${activeTab === "statistics" ? "active" : ""}`}
          onClick={() => setActiveTab("statistics")}
        >
          📊 Статистика ({statistics.length})
        </button>
        <button
          className={`tab ${activeTab === "graph" ? "active" : ""}`}
          onClick={() => setActiveTab("graph")}
        >
          🔗 Граф цитирований
        </button>
        <button
          className={`tab ${activeTab === "team" ? "active" : ""}`}
          onClick={() => setActiveTab("team")}
        >
          👥 Команда ({members.length})
        </button>
        <button
          className={`tab ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          ⚙️ Настройки
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* === ARTICLES TAB === */}
        {activeTab === "articles" && id && (
          <ArticlesSection 
            projectId={id} 
            canEdit={!!canEdit} 
            onCountsChange={setArticleCounts}
          />
        )}

        {/* === DOCUMENTS TAB === */}
        {activeTab === "documents" && (
          <div>
            <div className="row space" style={{ marginBottom: 16 }}>
              <h2>Документы проекта</h2>
              {canEdit && (
                <button
                  className="btn"
                  onClick={() => setShowCreateDoc(true)}
                  type="button"
                >
                  + Новый документ
                </button>
              )}
            </div>

            {showCreateDoc && (
              <form onSubmit={handleCreateDocument} className="card" style={{ marginBottom: 16 }}>
                <div className="stack">
                  <label className="stack">
                    <span>Название документа</span>
                    <input
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      placeholder="Глава 1. Обзор литературы"
                      required
                    />
                  </label>
                  <div className="row gap">
                    <button className="btn" disabled={creatingDoc} type="submit">
                      {creatingDoc ? "Создание..." : "Создать"}
                    </button>
                    <button
                      className="btn secondary"
                      onClick={() => setShowCreateDoc(false)}
                      type="button"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </form>
            )}

            {documents.length === 0 ? (
              <div className="muted">
                Нет документов. Создайте первый документ для написания текста диссертации.
              </div>
            ) : (
              <div className="documents-grid">
                {documents.map((doc, idx) => (
                  <div 
                    key={doc.id} 
                    className="document-card"
                    draggable={!!canEdit}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', idx.toString());
                      e.currentTarget.classList.add('dragging');
                    }}
                    onDragEnd={(e) => {
                      e.currentTarget.classList.remove('dragging');
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('drag-over');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('drag-over');
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('drag-over');
                      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
                      const toIdx = idx;
                      if (fromIdx !== toIdx && id) {
                        const newDocs = [...documents];
                        const [moved] = newDocs.splice(fromIdx, 1);
                        newDocs.splice(toIdx, 0, moved);
                        setDocuments(newDocs);
                        
                        // Save new order to backend
                        try {
                          await apiReorderDocuments(id, newDocs.map(d => d.id));
                          
                          // Перенумеровать цитаты в реальном времени
                          const renumberResult = await apiRenumberCitations(id);
                          
                          // Обновить документы с новым контентом (перенумерованные цитаты)
                          if (renumberResult.documents) {
                            setDocuments(renumberResult.documents);
                          }
                          
                          // Сбросить библиографию для перезагрузки
                          setBibliography([]);
                          
                          if (renumberResult.renumbered > 0) {
                            setOk(`Порядок документов обновлён. Перенумеровано ${renumberResult.renumbered} цитат.`);
                          } else {
                            setOk('Порядок документов обновлён.');
                          }
                        } catch (err: any) {
                          setError(err?.message || 'Ошибка сохранения порядка');
                          // Revert on error
                          const revertedDocs = await apiGetDocuments(id);
                          setDocuments(revertedDocs.documents);
                        }
                      }
                    }}
                  >
                    <div className="document-card-header">
                      <div className="document-order-badge">{idx + 1}</div>
                      {canEdit && (
                        <div className="document-drag-handle" title="Перетащите для изменения порядка">
                          ⋮⋮
                        </div>
                      )}
                    </div>
                    
                    <div 
                      className="document-card-body"
                      onClick={() => nav(`/projects/${id}/documents/${doc.id}`)}
                    >
                      <h4 className="document-card-title">{doc.title}</h4>
                      <div className="document-card-dates">
                        <div className="document-date-row">
                          <span className="date-label">Создан:</span>
                          <span className="date-value">{new Date(doc.created_at).toLocaleDateString('ru-RU', { 
                            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                          })}</span>
                        </div>
                        <div className="document-date-row">
                          <span className="date-label">Изменён:</span>
                          <span className="date-value">{new Date(doc.updated_at).toLocaleDateString('ru-RU', { 
                            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                          })}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="document-card-footer">
                      <button
                        className="btn secondary document-open-btn"
                        onClick={() => nav(`/projects/${id}/documents/${doc.id}`)}
                        type="button"
                      >
                        📝 Редактировать
                      </button>
                      {canEdit && (
                        <button
                          className="btn secondary document-delete-btn"
                          onClick={() => handleDeleteDocument(doc.id, doc.title)}
                          type="button"
                          title="Удалить документ"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Библиография и экспорт */}
            <div className="card" style={{ marginTop: 16 }}>
              <div className="row space" style={{ marginBottom: 12 }}>
                <h4 style={{ margin: 0 }}>📚 Библиография и экспорт</h4>
                <span className="id-badge">
                  {citationStyle.toUpperCase()}
                </span>
              </div>
              
              {/* Экспорт документа */}
              <div style={{ marginBottom: 16 }}>
                <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>Экспорт документа проекта</div>
                <div className="row gap" style={{ flexWrap: 'wrap' }}>
                  <button 
                    className="btn" 
                    onClick={() => handleExportWord(false)}
                    disabled={exporting || documents.length === 0}
                    type="button"
                    title="Экспорт глав по отдельности"
                  >
                    {exporting ? '⏳...' : '📥 Word (главы)'}
                  </button>
                  <button 
                    className="btn" 
                    onClick={() => handleExportWord(true)}
                    disabled={exporting || documents.length === 0}
                    type="button"
                    title="Объединённый документ с общим списком литературы"
                  >
                    {exporting ? '⏳...' : '📄 Word (объединённый)'}
                  </button>
                  <button 
                    className="btn secondary" 
                    onClick={async () => {
                      if (!id) return;
                      setExporting(true);
                      try {
                        const res = await apiExportProject(id);
                        exportToPdf(
                          res.projectName,
                          res.documents.map(d => ({ title: d.title, content: d.content })),
                          res.bibliography,
                          res.citationStyle,
                          res.mergedContent
                        );
                        setOk('Открыто окно печати PDF');
                      } catch (err: any) {
                        setError(err?.message || "Ошибка экспорта");
                      } finally {
                        setExporting(false);
                      }
                    }}
                    disabled={exporting || documents.length === 0}
                    type="button"
                    title="Печать в PDF"
                  >
                    🖨️ PDF
                  </button>
                  <button 
                    className="btn secondary" 
                    onClick={handleExportTxt}
                    disabled={exporting || documents.length === 0}
                    type="button"
                  >
                    📄 TXT
                  </button>
                </div>
              </div>
              
              {/* Библиография */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
                <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>Список литературы</div>
                <div className="row gap" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
                  <button 
                    className="btn secondary" 
                    onClick={handleLoadBibliography}
                    disabled={loadingBib}
                    type="button"
                  >
                    {loadingBib ? '⏳ Загрузка...' : '📋 Показать'}
                  </button>
                  <button 
                    className="btn secondary" 
                    onClick={async () => {
                      if (!id) return;
                      setExporting(true);
                      try {
                        const res = await apiGetBibliography(id);
                        exportBibliographyToWord(project?.name || 'Проект', res.bibliography, citationStyle);
                        setOk('Список литературы экспортирован в Word');
                      } catch (err: any) {
                        setError(err?.message || "Ошибка экспорта");
                      } finally {
                        setExporting(false);
                      }
                    }}
                    disabled={exporting}
                    type="button"
                    title="Экспорт только списка литературы в Word"
                  >
                    📥 Word
                  </button>
                  <button 
                    className="btn secondary" 
                    onClick={async () => {
                      if (!id) return;
                      setExporting(true);
                      try {
                        const res = await apiGetBibliography(id);
                        exportBibliographyToPdf(project?.name || 'Проект', res.bibliography, citationStyle);
                        setOk('Открыто окно печати PDF');
                      } catch (err: any) {
                        setError(err?.message || "Ошибка экспорта");
                      } finally {
                        setExporting(false);
                      }
                    }}
                    disabled={exporting}
                    type="button"
                    title="Экспорт только списка литературы в PDF"
                  >
                    🖨️ PDF
                  </button>
                  <button 
                    className="btn secondary" 
                    onClick={async () => {
                      if (!id) return;
                      try {
                        const res = await apiGetBibliography(id);
                        exportBibliographyToTxt(project?.name || 'Проект', res.bibliography, citationStyle);
                        setOk('Список литературы экспортирован в TXT');
                      } catch (err: any) {
                        setError(err?.message || "Ошибка экспорта");
                      }
                    }}
                    type="button"
                    title="Экспорт только списка литературы в TXT"
                  >
                    📄 TXT
                  </button>
                </div>

                {showBibliography && (
                  <div style={{ marginTop: 12 }}>
                    <div className="row space" style={{ marginBottom: 8 }}>
                      <span className="muted">
                        Всего источников: {bibliography.length}
                      </span>
                      <button 
                        className="btn secondary" 
                        onClick={handleCopyBibliography}
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        type="button"
                      >
                        📋 Копировать
                      </button>
                    </div>
                    
                    {bibliography.length === 0 ? (
                      <div className="muted">
                        Нет цитат. Добавьте цитаты в документы.
                      </div>
                    ) : (
                      <div className="bibliography-list">
                        {bibliography.map((item) => (
                          <div key={item.articleId} className="bibliography-item">
                            <span className="bib-number">{item.number}.</span>
                            <span className="bib-text">{item.formatted}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* === STATISTICS TAB === */}
        {activeTab === "statistics" && id && (
          <div className="statistics-page">
            <div className="statistics-header">
              <div>
                <h2 style={{ margin: 0 }}>Статистика проекта</h2>
                <div className="muted" style={{ fontSize: 13 }}>
                  Графики и таблицы из документов проекта
                </div>
              </div>
              <div className="statistics-controls">
                <div className="view-toggle">
                  <button
                    className={`view-toggle-btn ${statisticsView === 'charts' ? 'active' : ''}`}
                    onClick={() => setStatisticsView('charts')}
                    type="button"
                  >
                    📊 Графики
                  </button>
                  <button
                    className={`view-toggle-btn ${statisticsView === 'tables' ? 'active' : ''}`}
                    onClick={() => setStatisticsView('tables')}
                    type="button"
                  >
                    📋 Таблицы
                  </button>
                </div>
                <button 
                  className="btn secondary"
                  onClick={loadStatistics}
                  disabled={loadingStats}
                  type="button"
                >
                  {loadingStats ? '⏳ Загрузка...' : '🔄 Обновить'}
                </button>
              </div>
            </div>
            
            {/* Быстрое создание - кнопка открывает модал */}
            <div className="chart-types-selector">
              <div className="chart-types-header">
                <h4>📊 Создать новый график или таблицу</h4>
                <span className="muted">Создайте таблицу с данными, затем визуализируйте её</span>
              </div>
              <div className="row gap" style={{ marginTop: 12 }}>
                <button
                  className="btn"
                  onClick={() => setShowCreateStatistic(true)}
                  type="button"
                >
                  ➕ Создать таблицу/график
                </button>
              </div>
              <div className="chart-types-grid" style={{ marginTop: 16 }}>
                {(['bar', 'histogram', 'stacked', 'pie', 'line', 'boxplot', 'scatter'] as ChartType[]).map(type => (
                  <div 
                    key={type} 
                    className="chart-type-card chart-type-hint"
                    title={CHART_TYPE_INFO[type].description}
                  >
                    <span className="chart-type-icon">{CHART_TYPE_INFO[type].icon}</span>
                    <span className="chart-type-name">{CHART_TYPE_INFO[type].name}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {loadingStats ? (
              <div className="muted">Загрузка...</div>
            ) : statistics.length === 0 ? (
              <div className="statistics-empty">
                <div className="statistics-empty-icon">📊</div>
                <h3>Нет статистических данных</h3>
                <p className="muted">
                  Создайте графики из таблиц в документах проекта.<br/>
                  Они автоматически появятся здесь.
                </p>
                {documents.length > 0 && (
                  <button 
                    className="btn"
                    onClick={() => nav(`/projects/${id}/documents/${documents[0].id}`)}
                    style={{ marginTop: 16 }}
                  >
                    📄 Открыть документ
                  </button>
                )}
              </div>
            ) : (
              <div className="statistics-list">
                {statistics.map(stat => {
                  const chartInfo = stat.chart_type ? CHART_TYPE_INFO[stat.chart_type as ChartType] : null;
                  const tableData = stat.table_data as TableData | undefined;
                  const showAsTable = statisticsView === 'tables';
                  
                  // Находим документы, в которых используется этот график
                  const usedInDocIds = stat.used_in_documents || [];
                  const usedInDocuments = usedInDocIds.map(docId => 
                    documents.find(d => d.id === docId)
                  ).filter(Boolean);
                  
                  return (
                    <div key={stat.id} className="stat-card">
                      <div className="stat-card-header">
                        <div className="stat-card-title-row">
                          <span className="stat-card-icon">
                            {showAsTable ? '📋' : (chartInfo?.icon || '📊')}
                          </span>
                          <div className="stat-card-title-info">
                            <h4 className="stat-card-title">{stat.title || 'Без названия'}</h4>
                            {usedInDocuments.length > 0 ? (
                              <div className="stat-card-documents">
                                {usedInDocuments.map((doc, i) => (
                                  <span 
                                    key={doc!.id} 
                                    className="stat-card-document"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      nav(`/projects/${id}/documents/${doc!.id}`);
                                    }}
                                    title="Открыть документ"
                                  >
                                    📄 {doc!.title}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="stat-card-document not-used">
                                Не используется в документах
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="stat-card-type-badge">
                          {showAsTable ? 'Исходные данные' : (chartInfo?.name || 'График')}
                        </span>
                      </div>
                      
                      {stat.description && (
                        <p className="stat-card-description">{stat.description}</p>
                      )}
                      
                      <div className="stat-card-preview">
                        {/* Режим графиков - показываем график */}
                        {!showAsTable && tableData && stat.config && stat.config.type && (
                          <ChartFromTable 
                            tableData={tableData} 
                            config={stat.config as any} 
                            height={180} 
                          />
                        )}
                        
                        {/* Если нет конфигурации в режиме графика */}
                        {!showAsTable && tableData && (!stat.config || !stat.config.type) && (
                          <div className="stat-no-data" style={{ color: '#ff6b6b' }}>
                            ⚠️ Конфигурация графика отсутствует или повреждена
                          </div>
                        )}
                        
                        {/* Режим таблиц - показываем исходную таблицу данных */}
                        {showAsTable && tableData && (
                          <div className="stat-table-preview">
                            <table>
                              <thead>
                                <tr>
                                  {tableData.headers?.map((h, i) => (
                                    <th key={i}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {tableData.rows?.map((row, i) => (
                                  <tr key={i}>
                                    {row.map((cell, j) => (
                                      <td key={j}>{cell}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        
                        {/* Если нет данных */}
                        {!tableData && (
                          <div className="stat-no-data">
                            Нет данных для отображения
                          </div>
                        )}
                      </div>
                      
                      {stat.data_classification && (
                        <div className="stat-card-tags">
                          <span className="stat-tag">
                            {stat.data_classification.variableType === 'quantitative' ? 'Количественные' : 'Качественные'}
                          </span>
                          <span className="stat-tag">
                            {stat.data_classification.subType}
                          </span>
                        </div>
                      )}
                      
                      <div className="stat-card-actions">
                        <button 
                          className="btn stat-action-btn" 
                          onClick={() => setEditingStat(stat)}
                          title="Редактировать"
                        >
                          ✏️ Редактировать
                        </button>
                        {documents.length > 0 && (
                          <button 
                            className="btn secondary stat-action-btn" 
                            onClick={() => {
                              const chartCode = `[График: ${stat.title}]`;
                              navigator.clipboard.writeText(chartCode);
                              setOk(`Скопировано! Вставьте в документ.`);
                            }}
                            title="Скопировать ссылку"
                          >
                            📋 Копировать
                          </button>
                        )}
                        <button 
                          className="btn secondary stat-action-btn stat-delete-btn" 
                          onClick={() => handleDeleteStatistic(stat.id)}
                          title="Удалить"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Модальное окно редактирования статистики */}
            {editingStat && (
              <StatisticEditModal
                statistic={editingStat}
                onClose={() => setEditingStat(null)}
                onSave={async (updates) => {
                  await handleUpdateStatistic(editingStat.id, updates);
                  setEditingStat(null);
                }}
              />
            )}
            
            {/* Модальное окно создания новой статистики */}
            {showCreateStatistic && (
              <CreateStatisticModal
                projectId={id!}
                onClose={() => setShowCreateStatistic(false)}
                onCreated={(newStat) => {
                  setStatistics([...statistics, newStat]);
                  setShowCreateStatistic(false);
                  setOk('Статистика создана');
                }}
              />
            )}
          </div>
        )}

        {/* === GRAPH TAB === */}
        {activeTab === "graph" && id && (
          <div>
            <div className="row space" style={{ marginBottom: 16 }}>
              <h2>Граф цитирований</h2>
              <div className="muted" style={{ fontSize: 13 }}>
                Визуализация связей между статьями проекта
              </div>
            </div>
            <CitationGraph projectId={id} />
            <div className="card" style={{ marginTop: 16 }}>
              <h4>💡 Как работает граф</h4>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#a9b7da', fontSize: 13 }}>
                <li>Каждый <strong>узел</strong> — статья из вашего проекта</li>
                <li><strong>Стрелки</strong> показывают, какая статья цитирует какую</li>
                <li>Данные о связях берутся из <strong>Crossref</strong> (обогатите статьи кнопкой "📚 Crossref")</li>
                <li>Кликните на узел чтобы открыть статью по DOI</li>
              </ul>
            </div>
          </div>
        )}

        {/* === TEAM TAB === */}
        {activeTab === "team" && (
          <div>
            <div className="row space" style={{ marginBottom: 16 }}>
              <h2>Команда проекта</h2>
              {isOwner && !showInvite && (
                <button className="btn" onClick={() => setShowInvite(true)} type="button">
                  + Пригласить
                </button>
              )}
            </div>

            {showInvite && (
              <form onSubmit={handleInvite} className="card" style={{ marginBottom: 16 }}>
                <div className="stack">
                  <label className="stack">
                    <span>Email</span>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      required
                    />
                  </label>
                  <label className="stack">
                    <span>Роль</span>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                    >
                      <option value="viewer">Читатель (только просмотр)</option>
                      <option value="editor">Редактор (может редактировать)</option>
                    </select>
                  </label>
                  <div className="row gap">
                    <button className="btn" disabled={inviting} type="submit">
                      {inviting ? "Приглашаем..." : "Пригласить"}
                    </button>
                    <button
                      className="btn secondary"
                      onClick={() => setShowInvite(false)}
                      type="button"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="table table-members">
              <div className="thead">
                <div>Email</div>
                <div>Роль</div>
                <div>Присоединился</div>
                <div>Действия</div>
              </div>
              {members.map((m) => (
                <div className="trow" key={m.user_id}>
                  <div className="mono" style={{ fontSize: 13 }}>
                    {m.email} {m.user_id === user?.id && "(вы)"}
                  </div>
                  <div>
                    {m.role === "owner" ? "Владелец" : m.role === "editor" ? "Редактор" : "Читатель"}
                  </div>
                  <div>{new Date(m.joined_at).toLocaleDateString()}</div>
                  <div>
                    {isOwner && m.role !== "owner" && (
                      <button
                        className="btn secondary"
                        onClick={() => handleRemoveMember(m.user_id, m.email)}
                        type="button"
                        style={{ fontSize: 12, padding: "6px 10px" }}
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === SETTINGS TAB === */}
        {activeTab === "settings" && (
          <div className="settings-page">
            <h2>Настройки проекта</h2>

            {/* Основные настройки */}
            <div className="settings-card">
              <div className="settings-card-header">
                <span className="settings-card-icon">📋</span>
                <h4>Основные</h4>
              </div>
              <div className="settings-card-body">
                <div className="settings-form-group">
                  <label>Название проекта</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="settings-input"
                  />
                </div>
                <div className="settings-form-group">
                  <label>Описание</label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Описание проекта..."
                    className="settings-textarea"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Тип исследования */}
            <div className="settings-card">
              <div className="settings-card-header">
                <span className="settings-card-icon">🔬</span>
                <h4>Вид исследования</h4>
              </div>
              <div className="settings-card-body">
                <p className="settings-hint">
                  Выберите тип исследования для получения рекомендаций по структуре и оформлению
                </p>
                <div className="research-types-grid">
                  {(Object.entries(RESEARCH_TYPES) as [ResearchType, typeof RESEARCH_TYPES[ResearchType]][]).map(([type, info]) => (
                    <div 
                      key={type}
                      className={`research-type-card ${researchType === type ? 'selected' : ''}`}
                      onClick={() => {
                        setResearchType(type);
                        setResearchSubtype('');
                      }}
                    >
                      <h5>{info.name}</h5>
                      <p>{info.description}</p>
                      {researchType === type && info.subtypes.length > 0 && (
                        <div className="research-subtype-select">
                          <select
                            value={researchSubtype}
                            onChange={(e) => setResearchSubtype(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">Выберите подтип...</option>
                            {info.subtypes.map(st => (
                              <option key={st.value} value={st.value}>{st.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Протокол исследования */}
            <div className="settings-card">
              <div className="settings-card-header">
                <span className="settings-card-icon">📑</span>
                <h4>Протокол исследования</h4>
              </div>
              <div className="settings-card-body">
                <p className="settings-hint">
                  Выберите стандарт отчётности для AI-проверки соответствия структуры статьи
                </p>
                <div className="protocols-grid">
                  {(Object.entries(RESEARCH_PROTOCOLS) as [ResearchProtocol, typeof RESEARCH_PROTOCOLS[ResearchProtocol]][]).map(([protocol, info]) => {
                    const isRecommended = researchSubtype && info.applicableTo.includes(researchSubtype);
                    
                    return (
                      <div 
                        key={protocol}
                        className={`protocol-card ${researchProtocol === protocol ? 'selected' : ''} ${isRecommended ? 'recommended' : ''}`}
                        onClick={() => setResearchProtocol(protocol)}
                      >
                        <div className="protocol-card-header">
                          <h5>{info.name}</h5>
                          {isRecommended && <span className="protocol-badge">Рекомендуется</span>}
                        </div>
                        <p className="protocol-description">{info.description}</p>
                        {info.keyRequirements.length > 0 && (
                          <ul className="protocol-requirements">
                            {info.keyRequirements.slice(0, 3).map((req, i) => (
                              <li key={i}>{req}</li>
                            ))}
                          </ul>
                        )}
                        {researchProtocol === protocol && protocol === 'OTHER' && (
                          <input
                            value={protocolCustomName}
                            onChange={(e) => setProtocolCustomName(e.target.value)}
                            placeholder="Название протокола..."
                            onClick={(e) => e.stopPropagation()}
                            className="protocol-custom-input"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* AI-анализ */}
            <div className="settings-card">
              <div className="settings-card-header">
                <span className="settings-card-icon">🤖</span>
                <h4>AI-анализ работы</h4>
              </div>
              <div className="settings-card-body">
                <p className="settings-hint">
                  Включите AI-функции для автоматической проверки и рекомендаций
                </p>
                
                <div className="ai-options-stack">
                  {/* Ошибки I и II рода */}
                  <div className="ai-option-card">
                    <div className="ai-option-header">
                      <label className="ai-option-toggle">
                        <input
                          type="checkbox"
                          checked={aiErrorAnalysisEnabled}
                          onChange={(e) => setAiErrorAnalysisEnabled(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <div className="ai-option-title">
                        <h5>Анализ ошибок первого и второго рода</h5>
                        <span className="ai-badge">AI</span>
                      </div>
                    </div>
                    <p className="ai-option-description">
                      Проверка статистических тестов на предмет возможных ошибок интерпретации
                    </p>
                    
                    {aiErrorAnalysisEnabled && (
                      <div className="error-types-grid">
                        <div className="error-type-card error-type-1">
                          <h6>❌ Ошибка I рода (α)</h6>
                          <p>
                            Отклонили нулевую гипотезу, хотя она верна.<br/>
                            <strong>Ложноположительный результат.</strong>
                          </p>
                        </div>
                        <div className="error-type-card error-type-2">
                          <h6>⚠️ Ошибка II рода (β)</h6>
                          <p>
                            Не выявили эффект, хотя он существует.<br/>
                            <strong>Ложноотрицательный результат.</strong>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Проверка соответствия протоколу */}
                  <div className="ai-option-card">
                    <div className="ai-option-header">
                      <label className="ai-option-toggle">
                        <input
                          type="checkbox"
                          checked={aiProtocolCheckEnabled}
                          onChange={(e) => setAiProtocolCheckEnabled(e.target.checked)}
                          disabled={!researchProtocol}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <div className="ai-option-title">
                        <h5>Проверка соответствия протоколу</h5>
                        <span className="ai-badge">AI</span>
                      </div>
                    </div>
                    <p className="ai-option-description">
                      {researchProtocol ? (
                        <>
                          Проверка структуры работы на соответствие протоколу <strong>{RESEARCH_PROTOCOLS[researchProtocol].fullName}</strong>.
                        </>
                      ) : (
                        <span className="muted">Сначала выберите протокол исследования</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Стиль библиографии */}
            <div className="settings-card">
              <div className="settings-card-header">
                <span className="settings-card-icon">📚</span>
                <h4>Стиль библиографии</h4>
              </div>
              <div className="settings-card-body">
                <p className="settings-hint">
                  Выберите стиль оформления списка литературы для всех документов проекта
                </p>
                <div className="citation-styles-list">
                  <label className={`citation-style-option ${citationStyle === "gost" ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="citationStyle"
                      value="gost"
                      checked={citationStyle === "gost"}
                      onChange={() => setCitationStyle("gost")}
                    />
                    <div className="citation-style-content">
                      <strong>ГОСТ Р 7.0.5-2008</strong>
                      <span className="citation-example">
                        Иванов И.И. Название статьи // Журнал. — 2024. — Т. 1, № 2. — С. 10-20.
                      </span>
                    </div>
                  </label>
                  <label className={`citation-style-option ${citationStyle === "apa" ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="citationStyle"
                      value="apa"
                      checked={citationStyle === "apa"}
                      onChange={() => setCitationStyle("apa")}
                    />
                    <div className="citation-style-content">
                      <strong>APA 7th Edition</strong>
                      <span className="citation-example">
                        Ivanov, I. I. (2024). Article title. Journal Name, 1(2), 10-20.
                      </span>
                    </div>
                  </label>
                  <label className={`citation-style-option ${citationStyle === "vancouver" ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="citationStyle"
                      value="vancouver"
                      checked={citationStyle === "vancouver"}
                      onChange={() => setCitationStyle("vancouver")}
                    />
                    <div className="citation-style-content">
                      <strong>Vancouver</strong>
                      <span className="citation-example">
                        Ivanov II. Article title. Journal Name. 2024;1(2):10-20.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="settings-save-section">
                <button
                  className="btn settings-save-btn"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  type="button"
                >
                  {saving ? "Сохранение..." : "💾 Сохранить настройки"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
