import React, { useEffect, useRef, useState, useCallback } from "react";
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
  apiCreateStatistic,
  apiDeleteStatistic,
  apiUpdateStatistic,
  apiCleanupStatistics,
  apiGetProjectFiles,
  apiUploadFile,
  apiDeleteFile,
  apiGetStorageStatus,
  apiGetFileDownloadUrl,
  apiAnalyzeFile,
  apiImportFileAsArticle,
  type Project,
  type ProjectMember,
  type Document,
  type BibliographyItem,
  type CitationStyle,
  type ResearchType,
  type ResearchProtocol,
  type ProjectStatistic,
  type DataClassification,
  type ProjectFile,
  type FileCategory,
  type ExtractedArticleMetadata,
} from "../lib/api";
import { useProjectWebSocket } from "../lib/useProjectWebSocket";
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
  exportBibliographyToPdf,
  prepareHtmlForExport,
  captureChartsFromDOM
} from "../lib/exportWord";

type Tab = "articles" | "documents" | "files" | "statistics" | "graph" | "team" | "settings";

// Helper function to generate HTML table from table data
function generateTableHtml(tableData: TableData, title?: string): string {
  let html = '';
  if (title) {
    html += `<p><strong>${title}</strong></p>\n`;
  }
  html += '<table border="1" style="border-collapse: collapse; width: 100%;">\n';
  html += '<thead><tr>';
  for (const header of tableData.headers) {
    html += `<th style="padding: 8px; background: #f5f5f5;">${header}</th>`;
  }
  html += '</tr></thead>\n<tbody>\n';
  for (const row of tableData.rows) {
    html += '<tr>';
    for (const cell of row) {
      html += `<td style="padding: 8px;">${cell}</td>`;
    }
    html += '</tr>\n';
  }
  html += '</tbody></table>';
  return html;
}

// Sample data templates for each chart type
const CHART_SAMPLE_DATA: Record<ChartType, { title: string; tableData: TableData; config: Record<string, any> }> = {
  bar: {
    title: 'Сравнение групп пациентов',
    tableData: {
      headers: ['Группа', 'Количество'],
      rows: [
        ['Контрольная группа', '45'],
        ['Группа лечения A', '62'],
        ['Группа лечения B', '58'],
        ['Группа лечения C', '51'],
      ],
    },
    config: {
      type: 'bar',
      title: 'Сравнение групп пациентов',
      labelColumn: 0,
      dataColumns: [1],
    },
  },
  histogram: {
    title: 'Распределение возраста пациентов',
    tableData: {
      headers: ['ID', 'Возраст'],
      rows: [
        ['1', '23'], ['2', '34'], ['3', '45'], ['4', '28'], ['5', '52'],
        ['6', '41'], ['7', '36'], ['8', '29'], ['9', '47'], ['10', '38'],
        ['11', '55'], ['12', '33'], ['13', '42'], ['14', '31'], ['15', '49'],
        ['16', '27'], ['17', '44'], ['18', '39'], ['19', '35'], ['20', '50'],
      ],
    },
    config: {
      type: 'histogram',
      title: 'Распределение возраста пациентов',
      labelColumn: 0,
      dataColumns: [1],
      bins: 8,
    },
  },
  stacked: {
    title: 'Структура исходов по группам',
    tableData: {
      headers: ['Группа', 'Улучшение', 'Без изменений', 'Ухудшение'],
      rows: [
        ['Плацебо', '15', '20', '10'],
        ['Препарат A', '35', '12', '5'],
        ['Препарат B', '28', '18', '8'],
      ],
    },
    config: {
      type: 'stacked',
      title: 'Структура исходов по группам',
      labelColumn: 0,
      dataColumns: [1, 2, 3],
    },
  },
  pie: {
    title: 'Распределение диагнозов',
    tableData: {
      headers: ['Диагноз', 'Количество пациентов'],
      rows: [
        ['Гипертония', '35'],
        ['Диабет 2 типа', '25'],
        ['ИБС', '20'],
        ['ХОБЛ', '12'],
        ['Другие', '8'],
      ],
    },
    config: {
      type: 'pie',
      title: 'Распределение диагнозов',
      labelColumn: 0,
      dataColumns: [1],
    },
  },
  line: {
    title: 'Динамика артериального давления',
    tableData: {
      headers: ['День', 'Систолическое', 'Диастолическое'],
      rows: [
        ['1', '150', '95'],
        ['7', '145', '92'],
        ['14', '138', '88'],
        ['21', '132', '85'],
        ['28', '128', '82'],
        ['35', '125', '80'],
      ],
    },
    config: {
      type: 'line',
      title: 'Динамика артериального давления',
      labelColumn: 0,
      dataColumns: [1, 2],
    },
  },
  boxplot: {
    title: 'Распределение уровня глюкозы',
    tableData: {
      headers: ['ID', 'Группа A', 'Группа B'],
      rows: [
        ['1', '5.2', '6.8'], ['2', '5.8', '7.2'], ['3', '4.9', '6.5'],
        ['4', '6.1', '7.8'], ['5', '5.5', '6.9'], ['6', '5.3', '7.4'],
        ['7', '5.9', '8.1'], ['8', '5.0', '6.6'], ['9', '6.2', '7.0'],
        ['10', '5.4', '7.3'], ['11', '5.7', '6.7'], ['12', '5.1', '7.5'],
      ],
    },
    config: {
      type: 'boxplot',
      title: 'Распределение уровня глюкозы',
      labelColumn: 0,
      dataColumns: [1, 2],
    },
  },
  scatter: {
    title: 'Корреляция веса и роста',
    tableData: {
      headers: ['ID', 'Рост (см)', 'Вес (кг)'],
      rows: [
        ['1', '165', '62'], ['2', '178', '85'], ['3', '172', '74'],
        ['4', '160', '55'], ['5', '185', '92'], ['6', '170', '68'],
        ['7', '168', '65'], ['8', '182', '88'], ['9', '175', '78'],
        ['10', '163', '58'], ['11', '180', '82'], ['12', '173', '71'],
      ],
    },
    config: {
      type: 'scatter',
      title: 'Корреляция веса и роста',
      labelColumn: 0,
      dataColumns: [1, 2],
      xColumn: 1,
      yColumn: 2,
    },
  },
  doughnut: {
    title: 'Распределение по полу',
    tableData: {
      headers: ['Пол', 'Количество'],
      rows: [
        ['Мужчины', '120'],
        ['Женщины', '105'],
      ],
    },
    config: {
      type: 'doughnut',
      title: 'Распределение по полу',
      labelColumn: 0,
      dataColumns: [1],
    },
  },
};

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

// Компонент для превью изображений
function FileImagePreview({ projectId, fileId, fileName }: { projectId: string; fileId: string; fileName: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    apiGetFileDownloadUrl(projectId, fileId)
      .then(({ url }) => {
        if (mounted) {
          setImageUrl(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setError(true);
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [projectId, fileId]);

  if (loading) {
    return (
      <div className="file-thumbnail file-thumbnail-loading">
        <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="file-thumbnail file-thumbnail-error">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="file-thumbnail">
      <img src={imageUrl} alt={fileName} loading="lazy" />
    </div>
  );
}

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
  const [creatingChartType, setCreatingChartType] = useState<ChartType | null>(null);
  const refreshingStats = useRef(false);

  // Файлы проекта
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [storageConfigured, setStorageConfigured] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filesCategory, setFilesCategory] = useState<FileCategory | "all">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Импорт статьи из файла
  const [analyzingFile, setAnalyzingFile] = useState<string | null>(null);
  const [fileImportModal, setFileImportModal] = useState<{
    fileId: string;
    fileName: string;
    metadata: ExtractedArticleMetadata;
    textPreview: string;
  } | null>(null);
  const [importingArticle, setImportingArticle] = useState(false);
  const [importStatus, setImportStatus] = useState<"selected" | "candidate">("selected");
  
  // Экспорт глав
  const [showChapterSelectModal, setShowChapterSelectModal] = useState(false);
  const [selectedChaptersForExport, setSelectedChaptersForExport] = useState<Set<string>>(new Set());
  const [includeChartDataTables, setIncludeChartDataTables] = useState(true); // Включать данные графиков для создания в Word

  // WebSocket для real-time синхронизации
  const handleWSStatisticCreated = useCallback((statistic: ProjectStatistic) => {
    if (!statistic) return;
    setStatistics(prev => {
      // Проверяем что такой статистики ещё нет
      if (prev.some(s => s.id === statistic.id)) return prev;
      return [...prev, statistic];
    });
  }, []);

  const handleWSStatisticUpdated = useCallback((statistic: ProjectStatistic) => {
    if (!statistic) return;
    setStatistics(prev => prev.map(s => s.id === statistic.id ? statistic : s));
    // Если редактируем эту статистику, обновляем её тоже
    setEditingStat(prev => prev?.id === statistic.id ? statistic : prev);
  }, []);

  const handleWSStatisticDeleted = useCallback((statisticId: string) => {
    if (!statisticId) return;
    setStatistics(prev => prev.filter(s => s.id !== statisticId));
    // Закрываем редактор если удалили редактируемую статистику
    setEditingStat(prev => prev?.id === statisticId ? null : prev);
  }, []);

  const { isConnected: wsConnected } = useProjectWebSocket({
    projectId: id,
    onStatisticCreated: handleWSStatisticCreated,
    onStatisticUpdated: handleWSStatisticUpdated,
    onStatisticDeleted: handleWSStatisticDeleted,
    enabled: activeTab === "statistics", // Включаем только на вкладке статистики
  });

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
  const [bibliographyLastUpdated, setBibliographyLastUpdated] = useState<number>(0);
  const [updatingBibliography, setUpdatingBibliography] = useState(false);

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
  
  async function loadStatistics(options?: { silent?: boolean }) {
    if (!id || refreshingStats.current) return;
    refreshingStats.current = true;
    if (!options?.silent) {
      setLoadingStats(true);
    }
    try {
      const res = await apiGetStatistics(id);
      setStatistics(res.statistics);
    } catch (err: any) {
      console.error("Failed to load statistics:", err);
    } finally {
      if (!options?.silent) {
        setLoadingStats(false);
      }
      refreshingStats.current = false;
    }
  }

  // Загрузка файлов проекта
  async function loadFiles() {
    if (!id) return;
    setLoadingFiles(true);
    try {
      const category = filesCategory === "all" ? undefined : filesCategory;
      const res = await apiGetProjectFiles(id, category);
      setFiles(res.files);
      setStorageConfigured(res.storageConfigured);
    } catch (err: any) {
      console.error("Failed to load files:", err);
    } finally {
      setLoadingFiles(false);
    }
  }

  // Загрузка нового файла
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!id || !e.target.files?.length) return;
    const file = e.target.files[0];
    
    setUploadingFile(true);
    setUploadProgress(0);
    setError(null);
    
    try {
      await apiUploadFile(id, file, (progress) => {
        setUploadProgress(progress);
      });
      setOk(`Файл "${file.name}" успешно загружен`);
      loadFiles();
    } catch (err: any) {
      setError(err.message || "Ошибка загрузки файла");
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  // Удаление файла
  async function handleDeleteFile(fileId: string, fileName: string) {
    if (!id) return;
    if (!confirm(`Удалить файл "${fileName}"?`)) return;
    
    try {
      await apiDeleteFile(id, fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      setOk(`Файл "${fileName}" удалён`);
    } catch (err: any) {
      setError(err.message || "Ошибка удаления файла");
    }
  }

  // Скачивание файла
  async function handleDownloadFile(fileId: string, fileName: string) {
    if (!id) return;
    try {
      const { url } = await apiGetFileDownloadUrl(id, fileId);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setError(err.message || "Ошибка скачивания файла");
    }
  }

  // Просмотр файла
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handlePreviewFile(file: ProjectFile) {
    if (!id) return;
    try {
      const { url } = await apiGetFileDownloadUrl(id, file.id);
      setPreviewUrl(url);
      setPreviewFile(file);
    } catch (err: any) {
      setError(err.message || "Ошибка загрузки превью");
    }
  }

  function closePreview() {
    setPreviewFile(null);
    setPreviewUrl(null);
  }

  // Анализ файла для импорта как статья
  async function handleAnalyzeFile(file: ProjectFile) {
    if (!id) return;
    
    setAnalyzingFile(file.id);
    setError(null);
    
    try {
      const result = await apiAnalyzeFile(id, file.id);
      setFileImportModal({
        fileId: file.id,
        fileName: file.name,
        metadata: result.metadata,
        textPreview: result.textPreview,
      });
    } catch (err: any) {
      setError(err.message || "Ошибка анализа файла");
    } finally {
      setAnalyzingFile(null);
    }
  }

  // Импорт статьи из файла
  async function handleImportArticleFromFile() {
    if (!id || !fileImportModal) return;
    
    setImportingArticle(true);
    setError(null);
    
    try {
      const result = await apiImportFileAsArticle(
        id,
        fileImportModal.fileId,
        fileImportModal.metadata,
        importStatus
      );
      setOk(result.message);
      setFileImportModal(null);
      setImportStatus("selected");
    } catch (err: any) {
      setError(err.message || "Ошибка импорта статьи");
    } finally {
      setImportingArticle(false);
    }
  }

  // Обновить метаданные в модальном окне
  function updateImportMetadata(field: keyof ExtractedArticleMetadata, value: any) {
    if (!fileImportModal) return;
    setFileImportModal({
      ...fileImportModal,
      metadata: {
        ...fileImportModal.metadata,
        [field]: value,
      },
    });
  }

  useEffect(() => {
    load();
  }, [id]);
  
  // Загружаем статистику при переходе на вкладку
  useEffect(() => {
    if (activeTab === "statistics" && statistics.length === 0) {
      loadStatistics();
    }
  }, [activeTab, statistics.length]);

  // Загружаем файлы при переходе на вкладку
  useEffect(() => {
    if (activeTab === "files") {
      loadFiles();
    }
  }, [activeTab, filesCategory]);

  // Автоматически загружаем и показываем библиографию при переходе на вкладку документов
  useEffect(() => {
    if (activeTab === "documents" && documents.length > 0) {
      // Автоматически показываем библиографию при наличии документов
      if (!showBibliography) {
        setShowBibliography(true);
      }
      // Загружаем или обновляем библиографию
      refreshBibliography(true);
    }
  }, [activeTab, documents.length]);

  // Auto-refresh statistics while the tab is open to reflect document-driven updates
  useEffect(() => {
    if (activeTab !== "statistics" || editingStat || showCreateStatistic) return;
    const interval = setInterval(() => {
      loadStatistics({ silent: true });
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab, editingStat, showCreateStatistic]);

  // Auto-refresh bibliography while the documents tab is open
  useEffect(() => {
    if (activeTab !== "documents") return;
    
    // Периодически обновляем библиографию каждые 5 секунд
    const interval = setInterval(() => {
      refreshBibliography(true);
    }, 5000);
    
    return () => clearInterval(interval);
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
    
    // Проверяем, что ID - это валидный UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidUuid = uuidRegex.test(statId);
    
    // Разные сообщения для валидных и невалидных ID
    const confirmMessage = isValidUuid 
      ? "Удалить этот элемент статистики?"
      : "Удалить эту поврежденную запись?";
    
    if (!confirm(confirmMessage)) return;
    try {
      await apiDeleteStatistic(id, statId);
      setStatistics(statistics.filter(s => s.id !== statId));
      setOk("Элемент удалён");
    } catch (err: any) {
      // Обработка конфликта — статистика используется в документах
      if (err?.message?.includes("используется") || err?.message?.includes("Conflict")) {
        const forceDelete = confirm(
          "⚠️ Эта статистика используется в документах!\n\n" +
          "Если вы удалите её, в документах появятся битые ссылки.\n\n" +
          "Удалить принудительно?"
        );
        if (forceDelete) {
          try {
            await apiDeleteStatistic(id, statId, true); // force=true
            setStatistics(statistics.filter(s => s.id !== statId));
            setOk("Элемент удалён принудительно");
          } catch (forceErr: any) {
            setError(forceErr?.message || "Ошибка принудительного удаления");
          }
        }
      } else {
        setError(err?.message || "Ошибка удаления");
      }
    }
  }

  async function handleUpdateStatistic(statId: string, updates: {
    title?: string;
    description?: string;
    config?: Record<string, any>;
    tableData?: Record<string, any>;
    dataClassification?: DataClassification;
    chartType?: string;
  }, currentVersion?: number) {
    if (!id) return;
    try {
      // Отправляем version для optimistic locking
      const result = await apiUpdateStatistic(id, statId, {
        ...updates,
        version: currentVersion,
      });
      setStatistics(statistics.map(s => 
        s.id === statId ? { ...s, ...result.statistic } : s
      ));
      setOk("Статистика обновлена");
    } catch (err: any) {
      // Обработка конфликта версий
      if (err?.message?.includes("VersionConflict") || err?.message?.includes("изменены другим")) {
        const reload = confirm(
          "⚠️ Данные были изменены другим пользователем!\n\n" +
          "Ваши изменения не сохранены.\n" +
          "Обновить данные?"
        );
        if (reload) {
          loadStatistics();
          setEditingStat(null);
        }
        return;
      }
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
      setBibliographyLastUpdated(Date.now());
      setShowBibliography(true);
    } catch (err: any) {
      setError(err?.message || "Ошибка загрузки библиографии");
    } finally {
      setLoadingBib(false);
    }
  }

  // Автоматическое обновление библиографии (вызывается после перестановки документов и т.д.)
  async function refreshBibliography(silent = false) {
    if (!id) return;
    if (!silent) {
      setUpdatingBibliography(true);
    }
    try {
      const res = await apiGetBibliography(id);
      setBibliography(res.bibliography);
      setBibliographyLastUpdated(Date.now());
    } catch (err: any) {
      console.error("Ошибка обновления библиографии:", err);
    } finally {
      if (!silent) {
        setUpdatingBibliography(false);
      }
    }
  }

  // Экспорт проекта в TXT
  async function handleExportTxt() {
    if (!id) return;
    setExporting(true);
    try {
      // Обновляем нумерацию цитат перед экспортом
      await apiRenumberCitations(id);
      
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
      
      // Обновляем локальную библиографию
      setBibliography(res.bibliography);
      setBibliographyLastUpdated(Date.now());
      
      setOk('Документ экспортирован в TXT');
    } catch (err: any) {
      setError(err?.message || "Ошибка экспорта");
    } finally {
      setExporting(false);
    }
  }

  // Экспорт проекта в Word (всегда получает свежую библиографию)
  async function handleExportWord(merged = false) {
    if (!id) return;
    setExporting(true);
    try {
      // Обновляем нумерацию цитат перед экспортом
      await apiRenumberCitations(id);
      
      // Захватываем графики из текущего DOM (если есть)
      const chartImages = captureChartsFromDOM();
      
      // Получаем свежие данные для экспорта
      const res = await apiExportProject(id);
      
      // Подготавливаем документы с изображениями графиков (и таблицами данных для Word)
      const preparedDocuments = await Promise.all(
        res.documents.map(async d => ({
          title: d.title,
          content: d.content ? await prepareHtmlForExport(d.content, chartImages, includeChartDataTables) : null
        }))
      );
      
      // Подготавливаем объединённый контент если нужно
      const preparedMergedContent = merged && res.mergedContent 
        ? await prepareHtmlForExport(res.mergedContent, chartImages, includeChartDataTables) 
        : undefined;
      
      await exportToWord(
        res.projectName,
        preparedDocuments,
        res.bibliography,
        res.citationStyle,
        preparedMergedContent
      );
      
      // Обновляем локальную библиографию
      setBibliography(res.bibliography);
      setBibliographyLastUpdated(Date.now());
      
      setOk(merged 
        ? 'Объединённый документ экспортирован в Word' 
        : 'Документ экспортирован в Word');
    } catch (err: any) {
      setError(err?.message || "Ошибка экспорта");
    } finally {
      setExporting(false);
    }
  }

  // Экспорт выбранных глав в Word
  async function handleExportSelectedChapters() {
    if (!id || selectedChaptersForExport.size === 0) return;
    
    setShowChapterSelectModal(false);
    setExporting(true);
    
    try {
      // Обновляем нумерацию цитат перед экспортом
      await apiRenumberCitations(id);
      
      // Захватываем графики из текущего DOM
      const chartImages = captureChartsFromDOM();
      
      // Получаем свежие данные для экспорта
      const res = await apiExportProject(id);
      
      // Фильтруем только выбранные документы
      const selectedDocs = res.documents.filter(d => selectedChaptersForExport.has(d.id));
      
      // Подготавливаем документы с изображениями графиков (и таблицами данных, если включено)
      const preparedDocuments = await Promise.all(
        selectedDocs.map(async d => ({
          title: d.title,
          content: d.content ? await prepareHtmlForExport(d.content, chartImages, includeChartDataTables) : null
        }))
      );
      
      // Фильтруем библиографию только для выбранных глав
      // (получаем articleId из цитат в выбранных документах)
      const selectedBibliography = res.bibliography.filter(bib => {
        // Проверяем используется ли эта статья в выбранных документах
        return selectedDocs.some(d => {
          const content = d.content || '';
          return content.includes(`data-citation-id="${bib.articleId}"`) ||
                 content.includes(`data-article-id="${bib.articleId}"`);
        });
      });
      
      // Перенумеровываем библиографию
      const renumberedBib = selectedBibliography.map((bib, idx) => ({
        ...bib,
        number: idx + 1,
      }));
      
      await exportToWord(
        res.projectName,
        preparedDocuments,
        renumberedBib,
        res.citationStyle,
        undefined // не объединённый
      );
      
      setOk(`Экспортировано ${selectedDocs.length} глав в Word`);
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
          <svg className="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          База статей
        </button>
        <button
          className={`tab ${activeTab === "documents" ? "active" : ""}`}
          onClick={() => setActiveTab("documents")}
        >
          <svg className="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Документы
        </button>
        <button
          className={`tab ${activeTab === "files" ? "active" : ""}`}
          onClick={() => setActiveTab("files")}
        >
          <svg className="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          Файлы
        </button>
        <button
          className={`tab ${activeTab === "statistics" ? "active" : ""}`}
          onClick={() => setActiveTab("statistics")}
        >
          <svg className="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Статистика
        </button>
        <button
          className={`tab ${activeTab === "graph" ? "active" : ""}`}
          onClick={() => setActiveTab("graph")}
        >
          <svg className="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Граф цитирований
        </button>
        <button
          className={`tab ${activeTab === "team" ? "active" : ""}`}
          onClick={() => setActiveTab("team")}
        >
          <svg className="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Команда
        </button>
        <button
          className={`tab ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
          title="Настройки"
        >
          <svg className="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ margin: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
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
                          
                          // Автоматически обновить библиографию после перестановки
                          await refreshBibliography();
                          
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
                        <svg className="icon-sm" style={{ marginRight: 4 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                        </svg>
                        Редактировать
                      </button>
                      {canEdit && (
                        <button
                          className="btn secondary document-delete-btn"
                          onClick={() => handleDeleteDocument(doc.id, doc.title)}
                          type="button"
                          title="Удалить документ"
                        >
                          <svg className="icon-sm" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
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
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg className="icon-md" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                  Библиография и экспорт
                </h4>
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
                    onClick={() => {
                      setSelectedChaptersForExport(new Set(documents.map(d => d.id)));
                      setShowChapterSelectModal(true);
                    }}
                    disabled={exporting || documents.length === 0}
                    type="button"
                    title="Выбрать главы для экспорта"
                  >
                    <svg className="icon-sm" style={{ marginRight: 4 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    {exporting ? '...' : 'Word (главы)'}
                  </button>
                  <button 
                    className="btn" 
                    onClick={() => handleExportWord(true)}
                    disabled={exporting || documents.length === 0}
                    type="button"
                    title="Объединённый документ с общим списком литературы"
                  >
                    <svg className="icon-sm" style={{ marginRight: 4 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    {exporting ? '...' : 'Word (объединённый)'}
                  </button>
                  <button 
                    className="btn secondary" 
                    onClick={async () => {
                      if (!id) return;
                      setExporting(true);
                      try {
                        // Обновляем нумерацию цитат перед экспортом
                        await apiRenumberCitations(id);
                        
                        // Захватываем графики из текущего DOM
                        const chartImages = captureChartsFromDOM();
                        
                        const res = await apiExportProject(id);
                        
                        // Подготавливаем документы с изображениями графиков
                        const preparedDocuments = await Promise.all(
                          res.documents.map(async d => ({
                            title: d.title,
                            content: d.content ? await prepareHtmlForExport(d.content, chartImages) : null
                          }))
                        );
                        
                        // Подготавливаем объединённый контент
                        const preparedMergedContent = res.mergedContent 
                          ? await prepareHtmlForExport(res.mergedContent, chartImages) 
                          : undefined;
                        
                        exportToPdf(
                          res.projectName,
                          preparedDocuments,
                          res.bibliography,
                          res.citationStyle,
                          preparedMergedContent
                        );
                        
                        // Обновляем локальную библиографию
                        setBibliography(res.bibliography);
                        setBibliographyLastUpdated(Date.now());
                        
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
                    <svg className="icon-sm" style={{ marginRight: 4 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                    </svg>
                    PDF
                  </button>
                  <button 
                    className="btn secondary" 
                    onClick={handleExportTxt}
                    disabled={exporting || documents.length === 0}
                    type="button"
                  >
                    <svg className="icon-sm" style={{ marginRight: 4 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    TXT
                  </button>
                </div>
              </div>
              
              {/* Библиография */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
                <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>Список литературы</div>
                <div className="row gap" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
                  <button 
                    className="btn secondary" 
                    onClick={() => refreshBibliography(false)}
                    disabled={loadingBib || updatingBibliography}
                    type="button"
                    title="Обновить список литературы"
                  >
                    <svg className="icon-sm" style={{ marginRight: 4 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    {loadingBib || updatingBibliography ? 'Обновление...' : 'Обновить'}
                  </button>
                  <button 
                    className="btn secondary" 
                    onClick={async () => {
                      if (!id) return;
                      setExporting(true);
                      try {
                        // Обновляем нумерацию перед экспортом библиографии
                        await apiRenumberCitations(id);
                        const res = await apiGetBibliography(id);
                        setBibliography(res.bibliography);
                        setBibliographyLastUpdated(Date.now());
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
                    <svg className="icon-sm" style={{ marginRight: 4 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Word
                  </button>
                  <button 
                    className="btn secondary" 
                    onClick={async () => {
                      if (!id) return;
                      setExporting(true);
                      try {
                        await apiRenumberCitations(id);
                        const res = await apiGetBibliography(id);
                        setBibliography(res.bibliography);
                        setBibliographyLastUpdated(Date.now());
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
                    <svg className="icon-sm" style={{ marginRight: 4 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                    </svg>
                    PDF
                  </button>
                  <button 
                    className="btn secondary" 
                    onClick={async () => {
                      if (!id) return;
                      try {
                        await apiRenumberCitations(id);
                        const res = await apiGetBibliography(id);
                        setBibliography(res.bibliography);
                        setBibliographyLastUpdated(Date.now());
                        exportBibliographyToTxt(project?.name || 'Проект', res.bibliography, citationStyle);
                        setOk('Список литературы экспортирован в TXT');
                      } catch (err: any) {
                        setError(err?.message || "Ошибка экспорта");
                      }
                    }}
                    type="button"
                    title="Экспорт только списка литературы в TXT"
                  >
                    <svg className="icon-sm" style={{ marginRight: 4 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    TXT
                  </button>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div className="row space" style={{ marginBottom: 8 }}>
                    <div className="row gap" style={{ alignItems: 'center' }}>
                      <span className="muted">
                        Всего источников: {bibliography.length}
                      </span>
                      {(updatingBibliography || loadingBib) && (
                        <span className="muted" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#3b82f6' }}>
                          <svg className="icon-sm loading-spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 12, height: 12 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          обновление...
                        </span>
                      )}
                      {bibliographyLastUpdated > 0 && !updatingBibliography && !loadingBib && (
                        <span className="muted" style={{ fontSize: 10, opacity: 0.6 }}>
                          обновлено {new Date(bibliographyLastUpdated).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <button 
                      className="btn secondary" 
                      onClick={handleCopyBibliography}
                      disabled={bibliography.length === 0}
                      style={{ padding: '4px 10px', fontSize: 12 }}
                      type="button"
                    >
                      <svg className="icon-sm" style={{ marginRight: 4 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                      </svg>
                      Копировать
                    </button>
                  </div>
                  
                  {loadingBib && bibliography.length === 0 ? (
                    <div className="muted" style={{ textAlign: 'center', padding: 24 }}>
                      Загрузка списка литературы...
                    </div>
                  ) : bibliography.length === 0 ? (
                    <div className="empty-state-bibliography" style={{ 
                      textAlign: 'center', 
                      padding: '24px 16px', 
                      background: 'rgba(255,255,255,0.03)', 
                      borderRadius: 8 
                    }}>
                      <svg className="icon-lg" style={{ width: 32, height: 32, margin: '0 auto 8px', opacity: 0.3 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <div className="muted" style={{ fontSize: 13 }}>
                        Нет цитат. Добавьте цитаты в документы проекта.
                      </div>
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
              </div>
            </div>
          </div>
        )}

        {/* === FILES TAB === */}
        {activeTab === "files" && id && (
          <div className="files-page">
            <div className="row space" style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Файлы проекта</h2>
              <div className="row gap">
                {canEdit && storageConfigured && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      style={{ display: "none" }}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.svg,.webp,.mp4,.webm,.mp3,.wav,.ogg"
                    />
                    <button
                      className="btn"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      type="button"
                    >
                      <svg className="w-4 h-4" style={{ marginRight: 6 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      {uploadingFile ? `Загрузка ${uploadProgress}%` : "Загрузить файл"}
                    </button>
                  </>
                )}
                <button
                  className="btn secondary"
                  onClick={() => loadFiles()}
                  disabled={loadingFiles}
                  title="Обновить"
                  type="button"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              </div>
            </div>

            {!storageConfigured && (
              <div className="card" style={{ marginBottom: 16, padding: 40, textAlign: 'center' }}>
                <svg style={{ width: 48, height: 48, margin: '0 auto 16px', opacity: 0.5 }} fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                </svg>
                <h3 style={{ margin: '0 0 8px 0' }}>Хранилище не настроено</h3>
                <p className="muted" style={{ margin: 0 }}>
                  Для загрузки файлов необходимо настроить подключение к Yandex Object Storage.
                  <br />
                  Обратитесь к администратору системы.
                </p>
              </div>
            )}

            {storageConfigured && (
              <>
                {/* Фильтр по категориям */}
                <div className="row gap" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
                  {(["all", "document", "image", "video", "audio"] as const).map((cat) => (
                    <button
                      key={cat}
                      className={`btn ${filesCategory === cat ? "" : "secondary"}`}
                      onClick={() => setFilesCategory(cat)}
                      type="button"
                      style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      {cat === "all" && (
                        <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg> Все</>
                      )}
                      {cat === "document" && (
                        <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg> Документы</>
                      )}
                      {cat === "image" && (
                        <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg> Изображения</>
                      )}
                      {cat === "video" && (
                        <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" /></svg> Видео</>
                      )}
                      {cat === "audio" && (
                        <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" /></svg> Аудио</>
                      )}
                    </button>
                  ))}
                </div>

                {loadingFiles ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <div className="muted">Загрузка файлов...</div>
                  </div>
                ) : files.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    <svg style={{ width: 48, height: 48, margin: '0 auto 16px', opacity: 0.5 }} fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                    </svg>
                    <h3 style={{ margin: '0 0 8px 0' }}>Нет файлов</h3>
                    <p className="muted" style={{ margin: 0 }}>
                      {canEdit 
                        ? "Загрузите файлы с помощью кнопки выше" 
                        : "В этом проекте пока нет файлов"}
                    </p>
                  </div>
                ) : (
                  <div className="files-grid">
                    {files.map((file) => {
                      const isImage = file.category === "image";
                      const isVideo = file.category === "video";
                      const isAudio = file.category === "audio";
                      const canPreview = isImage || isVideo || isAudio || file.mimeType === "application/pdf";
                      
                      return (
                        <div 
                          key={file.id} 
                          className={`file-card card ${canPreview ? 'clickable' : ''}`}
                          onClick={canPreview ? () => handlePreviewFile(file) : undefined}
                          style={{ cursor: canPreview ? 'pointer' : 'default' }}
                        >
                          {/* Превью для изображений */}
                          {isImage && (
                            <FileImagePreview projectId={id} fileId={file.id} fileName={file.name} />
                          )}
                          {/* Иконка для других типов */}
                          {!isImage && (
                            <div className="file-icon">
                              {file.category === "document" && (
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                              )}
                              {isVideo && (
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                                </svg>
                              )}
                              {isAudio && (
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                                </svg>
                              )}
                              {file.category === "other" && (
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                </svg>
                              )}
                            </div>
                          )}
                          <div className="file-info">
                            <div className="file-name" title={file.name}>
                              {file.name}
                            </div>
                            <div className="file-meta muted">
                              {file.sizeFormatted} • {new Date(file.createdAt).toLocaleDateString()}
                            </div>
                            {/* Теги использования в документах */}
                            {file.usedInDocuments && file.usedInDocuments.length > 0 && (
                              <div className="file-usage-tags">
                                {file.usedInDocuments.map((docId) => {
                                  const doc = documents.find(d => d.id === docId);
                                  return doc ? (
                                    <span key={docId} className="file-usage-tag" title={`Используется в: ${doc.title}`}>
                                      📄 {doc.title.length > 15 ? doc.title.slice(0, 15) + '...' : doc.title}
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            )}
                          </div>
                          <div className="file-actions" onClick={(e) => e.stopPropagation()}>
                            {/* Импорт как статья - только для документов */}
                            {canEdit && file.category === "document" && (
                              <button
                                className="btn secondary"
                                onClick={() => handleAnalyzeFile(file)}
                                disabled={analyzingFile === file.id}
                                title="Импортировать как статью"
                                type="button"
                              >
                                {analyzingFile === file.id ? (
                                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                                  </svg>
                                )}
                              </button>
                            )}
                            {canPreview && (
                              <button
                                className="btn secondary"
                                onClick={() => handlePreviewFile(file)}
                                title="Просмотр"
                                type="button"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </button>
                            )}
                            <button
                              className="btn secondary"
                              onClick={() => handleDownloadFile(file.id, file.name)}
                              title="Скачать"
                              type="button"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                              </svg>
                            </button>
                            {canEdit && (
                              <button
                                className="btn secondary"
                                onClick={() => handleDeleteFile(file.id, file.name)}
                                title="Удалить"
                                type="button"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Модальное окно просмотра файла */}
            {previewFile && previewUrl && (
              <div className="modal-overlay" onClick={closePreview}>
                <div className="modal file-preview-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>{previewFile.name}</h3>
                    <button className="btn secondary" onClick={closePreview} type="button">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="modal-body file-preview-body">
                    {previewFile.category === "image" && (
                      <img src={previewUrl} alt={previewFile.name} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
                    )}
                    {previewFile.category === "video" && (
                      <video src={previewUrl} controls style={{ maxWidth: '100%', maxHeight: '70vh' }} />
                    )}
                    {previewFile.category === "audio" && (
                      <audio src={previewUrl} controls style={{ width: '100%' }} />
                    )}
                    {previewFile.mimeType === "application/pdf" && (
                      <iframe src={previewUrl} style={{ width: '100%', height: '70vh', border: 'none' }} title={previewFile.name} />
                    )}
                  </div>
                  <div className="modal-footer">
                    <span className="muted">{previewFile.sizeFormatted}</span>
                    <button className="btn" onClick={() => handleDownloadFile(previewFile.id, previewFile.name)} type="button">
                      <svg className="w-4 h-4" style={{ marginRight: 6 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Скачать
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Модальное окно импорта статьи из файла */}
            {fileImportModal && (
              <div className="modal-overlay" onClick={() => setFileImportModal(null)}>
                <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700, maxHeight: '90vh', overflow: 'auto' }}>
                  <div className="modal-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                      </svg>
                      Импорт статьи из файла
                    </h3>
                    <button className="btn secondary" onClick={() => setFileImportModal(null)} type="button">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="modal-body" style={{ padding: 20 }}>
                    <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
                      Файл: <strong>{fileImportModal.fileName}</strong>
                    </div>

                    {/* Заголовок */}
                    <label className="stack" style={{ marginBottom: 12 }}>
                      <span>Заголовок статьи *</span>
                      <input
                        type="text"
                        value={fileImportModal.metadata.title || ""}
                        onChange={(e) => updateImportMetadata("title", e.target.value)}
                        placeholder="Введите заголовок статьи"
                        required
                      />
                    </label>

                    {/* Авторы */}
                    <label className="stack" style={{ marginBottom: 12 }}>
                      <span>Авторы</span>
                      <input
                        type="text"
                        value={fileImportModal.metadata.authors?.join(", ") || ""}
                        onChange={(e) => updateImportMetadata("authors", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                        placeholder="Автор 1, Автор 2, ..."
                      />
                    </label>

                    <div className="row gap" style={{ marginBottom: 12 }}>
                      {/* Год */}
                      <label className="stack" style={{ flex: 1 }}>
                        <span>Год</span>
                        <input
                          type="number"
                          value={fileImportModal.metadata.year || ""}
                          onChange={(e) => updateImportMetadata("year", e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="2024"
                          min={1900}
                          max={2100}
                        />
                      </label>

                      {/* DOI */}
                      <label className="stack" style={{ flex: 2 }}>
                        <span>DOI</span>
                        <input
                          type="text"
                          value={fileImportModal.metadata.doi || ""}
                          onChange={(e) => updateImportMetadata("doi", e.target.value || null)}
                          placeholder="10.1234/xxxxx"
                        />
                      </label>
                    </div>

                    {/* Журнал */}
                    <label className="stack" style={{ marginBottom: 12 }}>
                      <span>Журнал</span>
                      <input
                        type="text"
                        value={fileImportModal.metadata.journal || ""}
                        onChange={(e) => updateImportMetadata("journal", e.target.value || null)}
                        placeholder="Название журнала"
                      />
                    </label>

                    <div className="row gap" style={{ marginBottom: 12 }}>
                      {/* Том */}
                      <label className="stack" style={{ flex: 1 }}>
                        <span>Том</span>
                        <input
                          type="text"
                          value={fileImportModal.metadata.volume || ""}
                          onChange={(e) => updateImportMetadata("volume", e.target.value || null)}
                          placeholder="12"
                        />
                      </label>

                      {/* Выпуск */}
                      <label className="stack" style={{ flex: 1 }}>
                        <span>Выпуск</span>
                        <input
                          type="text"
                          value={fileImportModal.metadata.issue || ""}
                          onChange={(e) => updateImportMetadata("issue", e.target.value || null)}
                          placeholder="3"
                        />
                      </label>

                      {/* Страницы */}
                      <label className="stack" style={{ flex: 1 }}>
                        <span>Страницы</span>
                        <input
                          type="text"
                          value={fileImportModal.metadata.pages || ""}
                          onChange={(e) => updateImportMetadata("pages", e.target.value || null)}
                          placeholder="100-115"
                        />
                      </label>
                    </div>

                    {/* Аннотация */}
                    <label className="stack" style={{ marginBottom: 12 }}>
                      <span>Аннотация</span>
                      <textarea
                        value={fileImportModal.metadata.abstract || ""}
                        onChange={(e) => updateImportMetadata("abstract", e.target.value || null)}
                        placeholder="Текст аннотации..."
                        rows={4}
                        style={{ resize: 'vertical' }}
                      />
                    </label>

                    {/* Библиография */}
                    {fileImportModal.metadata.bibliography && fileImportModal.metadata.bibliography.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div className="row space" style={{ marginBottom: 8 }}>
                          <span style={{ fontWeight: 500 }}>
                            <svg className="w-4 h-4" style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                            </svg>
                            Библиография ({fileImportModal.metadata.bibliography.length} ссылок)
                          </span>
                        </div>
                        <div style={{ maxHeight: 150, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 12, fontSize: 12 }}>
                          {fileImportModal.metadata.bibliography.slice(0, 10).map((ref, idx) => (
                            <div key={idx} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: idx < 9 ? '1px solid var(--border)' : 'none' }}>
                              <div style={{ fontWeight: 500 }}>{idx + 1}. {ref.title || "Без названия"}</div>
                              {ref.authors && <div className="muted">{ref.authors}</div>}
                              {ref.year && <div className="muted">Год: {ref.year}</div>}
                              {ref.doi && <div className="muted">DOI: {ref.doi}</div>}
                            </div>
                          ))}
                          {fileImportModal.metadata.bibliography.length > 10 && (
                            <div className="muted">...и ещё {fileImportModal.metadata.bibliography.length - 10} ссылок</div>
                          )}
                        </div>
                        <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
                          ℹ️ Библиография будет сохранена вместе со статьёй
                        </div>
                      </div>
                    )}

                    {/* Статус импорта */}
                    <div style={{ marginBottom: 16 }}>
                      <span style={{ fontWeight: 500, marginBottom: 8, display: 'block' }}>Добавить в:</span>
                      <div className="row gap">
                        <label className="row gap" style={{ alignItems: 'center', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="importStatus"
                            checked={importStatus === "selected"}
                            onChange={() => setImportStatus("selected")}
                            style={{ width: 'auto' }}
                          />
                          <span>
                            <svg className="w-4 h-4" style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle', color: '#4ade80' }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Отобранные
                          </span>
                        </label>
                        <label className="row gap" style={{ alignItems: 'center', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="importStatus"
                            checked={importStatus === "candidate"}
                            onChange={() => setImportStatus("candidate")}
                            style={{ width: 'auto' }}
                          />
                          <span>
                            <svg className="w-4 h-4" style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle', color: '#fbbf24' }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                            </svg>
                            Кандидаты
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="muted" style={{ fontSize: 11, padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                      <strong>ℹ️ Важно:</strong> При удалении файла из проекта статья останется в базе статей.
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      className="btn secondary"
                      onClick={() => setFileImportModal(null)}
                      type="button"
                    >
                      Отмена
                    </button>
                    <button
                      className="btn"
                      onClick={handleImportArticleFromFile}
                      disabled={importingArticle || !fileImportModal.metadata.title}
                      type="button"
                    >
                      {importingArticle ? (
                        <>Импортируем...</>
                      ) : (
                        <>
                          <svg className="w-4 h-4" style={{ marginRight: 6 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          Импортировать в {importStatus === "selected" ? "Отобранные" : "Кандидаты"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === STATISTICS TAB === */}
        {activeTab === "statistics" && id && (
          <div className="statistics-page">
            <div className="statistics-header">
              <div>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Статистика проекта
                  {/* WebSocket индикатор */}
                  <span 
                    title={wsConnected ? "Real-time синхронизация активна" : "Нет real-time соединения"}
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: wsConnected ? '#4ade80' : '#6b7280',
                      animation: wsConnected ? 'pulse 2s infinite' : 'none',
                    }}
                  />
                </h2>
                <div className="muted" style={{ fontSize: 13 }}>
                  Графики и таблицы из документов проекта
                  {wsConnected && <span style={{ color: '#4ade80', marginLeft: 8 }}>• Live</span>}
                </div>
              </div>
              <div className="statistics-controls">
                <div className="view-toggle">
                  <button
                    className={`view-toggle-btn ${statisticsView === 'charts' ? 'active' : ''}`}
                    onClick={() => setStatisticsView('charts')}
                    type="button"
                  >
                    <svg className="icon-sm" style={{ marginRight: 4 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                    Графики
                  </button>
                  <button
                    className={`view-toggle-btn ${statisticsView === 'tables' ? 'active' : ''}`}
                    onClick={() => setStatisticsView('tables')}
                    type="button"
                  >
                    <svg className="icon-sm" style={{ marginRight: 4 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12c-.621 0-1.125.504-1.125 1.125M12 10.875c0-.621.504-1.125 1.125-1.125m0 0c.621 0 1.125.504 1.125 1.125M12 10.875c0-.621-.504-1.125-1.125-1.125m1.125 2.25c0 .621.504 1.125 1.125 1.125M13.125 12c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125m1.125-2.625c0-.621.504-1.125 1.125-1.125m-2.25 2.625c0 .621-.504 1.125-1.125 1.125M13.125 15.75h1.5m-1.5 0c-.621 0-1.125-.504-1.125-1.125M12 14.625c0 .621-.504 1.125-1.125 1.125M12 14.625c0-.621-.504-1.125-1.125-1.125m1.125 2.25c0-.621.504-1.125 1.125-1.125m0 1.125v-1.5m0 0c.621 0 1.125-.504 1.125-1.125" />
                    </svg>
                    Таблицы
                  </button>
                </div>
                <button 
                  className="btn secondary"
                  onClick={() => loadStatistics()}
                  disabled={loadingStats}
                  type="button"
                >
                  <svg className="icon-sm" style={{ marginRight: 4 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  {loadingStats ? 'Загрузка...' : 'Обновить'}
                </button>
                <button 
                  className="btn secondary"
                  onClick={async () => {
                    if (!id) return;
                    if (!confirm("Удалить статистики без данных (битые записи)?")) return;
                    try {
                      const result = await apiCleanupStatistics(id);
                      if (result.deleted > 0) {
                        setOk(`Удалено ${result.deleted} битых записей`);
                        loadStatistics();
                      } else {
                        setOk("Битых записей не найдено");
                      }
                    } catch (err: any) {
                      setError(err?.message || "Ошибка очистки");
                    }
                  }}
                  type="button"
                  title="Удалить статистики без данных"
                >
                  <svg className="icon-sm" style={{ marginRight: 4 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Очистка
                </button>
              </div>
            </div>
            
            {/* Быстрое создание - кнопка открывает модал */}
            <div className="chart-types-selector">
              <div className="chart-types-header">
                <h4 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg className="icon-md" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                  Создать новый график или таблицу
                </h4>
                <span className="muted">Создайте таблицу с данными, затем визуализируйте её</span>
              </div>
              <div className="row gap" style={{ marginTop: 12 }}>
                <button
                  className="btn"
                  onClick={() => setShowCreateStatistic(true)}
                  type="button"
                >
                  <svg className="icon-sm" style={{ marginRight: 4 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Создать таблицу/график
                </button>
              </div>
              <div className="chart-types-grid" style={{ marginTop: 16 }}>
                {(['bar', 'histogram', 'stacked', 'pie', 'line', 'boxplot', 'scatter'] as ChartType[]).map(type => {
                  const info = CHART_TYPE_INFO[type];
                  const sampleData = CHART_SAMPLE_DATA[type];
                  const isCreating = creatingChartType === type;
                  const defaultIcon = (
                    <svg className="chart-icon" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                  );
                  return (
                    <div 
                      key={type} 
                      className={`chart-type-card ${isCreating ? 'creating' : ''}`}
                      title={`Создать ${info?.name || type}: ${info?.description || ''}`}
                      onClick={async () => {
                        if (!id || isCreating || creatingChartType) return;
                        setCreatingChartType(type);
                        try {
                          const result = await apiCreateStatistic(id, {
                            type: 'chart',
                            title: sampleData.title,
                            config: sampleData.config,
                            tableData: sampleData.tableData,
                            chartType: type,
                          });
                          setStatistics([...statistics, result.statistic]);
                          setOk(`Создан пример: ${info?.name || type}`);
                        } catch (err: any) {
                          setError(err?.message || 'Ошибка создания');
                        } finally {
                          setCreatingChartType(null);
                        }
                      }}
                      style={{ cursor: isCreating || creatingChartType ? 'wait' : 'pointer', opacity: creatingChartType && !isCreating ? 0.5 : 1 }}
                    >
                      <span className="chart-type-icon">{info?.icon || defaultIcon}</span>
                      <span className="chart-type-name">{isCreating ? 'Создание...' : (info?.name || String(type))}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {loadingStats ? (
              <div className="muted">Загрузка...</div>
            ) : statistics.length === 0 ? (
              <div className="statistics-empty">
                <div className="statistics-empty-icon">
                  <svg className="icon-lg" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ width: 48, height: 48, opacity: 0.5 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                </div>
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
                    <svg className="icon-sm" style={{ marginRight: 4 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    Открыть документ
                  </button>
                )}
              </div>
            ) : (
              <div className="statistics-list">
                {statistics.map(stat => {
                  const chartInfo = stat.chart_type ? CHART_TYPE_INFO[stat.chart_type as ChartType] : null;
                  const tableData = stat.table_data as TableData | undefined;
                  const showAsTable = statisticsView === 'tables';
                  
                  // Проверяем, валиден ли ID
                  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                  const isValidId = uuidRegex.test(stat.id);
                  
                  // Находим документы, в которых используется этот график
                  const usedInDocIds = stat.used_in_documents || [];
                  const usedInDocuments = usedInDocIds.map(docId => 
                    documents.find(d => d.id === docId)
                  ).filter(Boolean);
                  
                  return (
                    <div key={stat.id} className="stat-card" style={!isValidId ? { border: '2px solid #ff6b6b', opacity: 0.7 } : undefined}>
                      {!isValidId && (
                        <div style={{ 
                          padding: '8px 12px', 
                          background: '#ff6b6b', 
                          color: 'white', 
                          fontSize: '12px',
                          borderRadius: '4px 4px 0 0',
                          marginBottom: '8px'
                        }}>
                          ⚠️ Поврежденная запись: невалидный ID. Редактирование недоступно, но можно удалить.
                        </div>
                      )}
                      <div className="stat-card-header">
                        <div className="stat-card-title-row">
                          <span className="stat-card-icon">
                            {showAsTable ? (
                              <svg className="chart-icon" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
                              </svg>
                            ) : (chartInfo?.icon || (
                              <svg className="chart-icon" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                              </svg>
                            ))}
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
                      
                      <div className="stat-card-preview" data-stat-id={stat.id}>
                        {/* Режим графиков - показываем график */}
                        {!showAsTable && tableData && stat.config && stat.config.type && (
                          <ChartFromTable 
                            tableData={tableData} 
                            config={stat.config as any} 
                            height={180}
                            theme="dark"
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
                          title={!isValidId ? "Редактирование недоступно для поврежденных записей" : "Редактировать"}
                          disabled={!isValidId}
                        >
                          <svg className="icon-sm" style={{ marginRight: 4 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                          </svg>
                          Редактировать
                        </button>
                        <button 
                          className="btn secondary stat-action-btn" 
                          onClick={async () => {
                            // Copy actual chart/table as HTML to clipboard
                            try {
                              const chartContainer = document.querySelector(`[data-stat-id="${stat.id}"]`);
                              if (chartContainer) {
                                // Try to get canvas as image
                                const canvas = chartContainer.querySelector('canvas');
                                if (canvas) {
                                  canvas.toBlob(async (blob) => {
                                    if (blob) {
                                      try {
                                        await navigator.clipboard.write([
                                          new ClipboardItem({ 'image/png': blob })
                                        ]);
                                        setOk('График скопирован как изображение!');
                                      } catch {
                                        // Fallback: copy as text
                                        const tableHtml = tableData ? generateTableHtml(tableData, stat.title || 'Таблица') : '';
                                        await navigator.clipboard.writeText(tableHtml || `[График: ${stat.title}]`);
                                        setOk('Данные скопированы!');
                                      }
                                    }
                                  }, 'image/png');
                                  return;
                                }
                              }
                              // Fallback: copy table data as HTML
                              if (tableData) {
                                const tableHtml = generateTableHtml(tableData, stat.title || 'Таблица');
                                await navigator.clipboard.writeText(tableHtml);
                                setOk('Таблица скопирована!');
                              } else {
                                await navigator.clipboard.writeText(`[График: ${stat.title}]`);
                                setOk('Ссылка скопирована!');
                              }
                            } catch (err) {
                              console.error('Copy error:', err);
                              setError('Не удалось скопировать');
                            }
                          }}
                          title="Копировать график/таблицу"
                        >
                          <svg className="icon-sm" style={{ marginRight: 4 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                          </svg>
                          Копировать
                        </button>
                        <div className="stat-card-actions-spacer" />
                        <button 
                          className="btn secondary stat-action-btn stat-delete-btn" 
                          onClick={() => handleDeleteStatistic(stat.id)}
                          title={!isValidId ? "Удалить поврежденную запись" : "Удалить"}
                        >
                          <svg className="icon-sm" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
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
                  // Передаём version для optimistic locking
                  await handleUpdateStatistic(editingStat.id, updates, editingStat.version);
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
          <CitationGraph projectId={id} />
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
                <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
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
                <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
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
                <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
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
                <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
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
                <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
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
                  {saving ? (
                    "Сохранение..."
                  ) : (
                    <>
                      <svg className="icon-sm" style={{ marginRight: 6 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                      </svg>
                      Сохранить настройки
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Select chapters for export */}
      {showChapterSelectModal && (
        <div className="modal-overlay" onClick={() => setShowChapterSelectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg className="icon-md" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Выберите главы для экспорта
              </h3>
              <button 
                className="btn secondary" 
                onClick={() => setShowChapterSelectModal(false)}
                type="button"
                style={{ padding: 6 }}
              >
                <svg className="icon-md" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '16px 20px' }}>
              <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
                <button
                  className="btn secondary"
                  onClick={() => setSelectedChaptersForExport(new Set(documents.map(d => d.id)))}
                  type="button"
                  style={{ fontSize: 12 }}
                >
                  Выбрать все
                </button>
                <button
                  className="btn secondary"
                  onClick={() => setSelectedChaptersForExport(new Set())}
                  type="button"
                  style={{ fontSize: 12 }}
                >
                  Снять все
                </button>
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {documents.map((doc, idx) => (
                  <label 
                    key={doc.id} 
                    className="chapter-select-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      background: selectedChaptersForExport.has(doc.id) ? 'rgba(75, 116, 255, 0.1)' : 'var(--bg-secondary)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      border: selectedChaptersForExport.has(doc.id) ? '1px solid var(--accent)' : '1px solid transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedChaptersForExport.has(doc.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedChaptersForExport);
                        if (e.target.checked) {
                          newSet.add(doc.id);
                        } else {
                          newSet.delete(doc.id);
                        }
                        setSelectedChaptersForExport(newSet);
                      }}
                      style={{ width: 18, height: 18 }}
                    />
                    <div>
                      <div style={{ fontWeight: 500 }}>
                        {idx + 1}. {doc.title}
                      </div>
                      <div className="muted" style={{ fontSize: 11 }}>
                        {doc.content ? `${doc.content.length} символов` : 'Пусто'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            {/* Опция включения данных графиков */}
            <div style={{ 
              padding: '12px 20px', 
              borderTop: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)'
            }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={includeChartDataTables}
                  onChange={(e) => setIncludeChartDataTables(e.target.checked)}
                  style={{ width: 18, height: 18, marginTop: 2 }}
                />
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>
                    <svg className="icon-sm" style={{ marginRight: 4, verticalAlign: 'middle' }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                    Включить данные графиков
                  </div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                    Добавляет таблицы с исходными данными под каждым графиком.
                    Используйте их для создания редактируемых графиков в Word.
                  </div>
                </div>
              </label>
            </div>
            
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="muted" style={{ fontSize: 12 }}>
                Выбрано: {selectedChaptersForExport.size} из {documents.length}
              </span>
              <div className="row gap">
                <button
                  className="btn secondary"
                  onClick={() => setShowChapterSelectModal(false)}
                  type="button"
                >
                  Отмена
                </button>
                <button
                  className="btn"
                  onClick={handleExportSelectedChapters}
                  disabled={selectedChaptersForExport.size === 0 || exporting}
                  type="button"
                >
                  <svg className="icon-sm" style={{ marginRight: 4 }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  {exporting ? 'Экспорт...' : 'Экспортировать'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
