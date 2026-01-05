import React, { useCallback, useEffect, useState, useRef } from "react";
import { useEditor, EditorContent, Editor as TipTapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import CitationNode from "./CitationNode";
import { ChartCreatorModal, CHART_TYPE_INFO, type ChartType, type TableData, parseTableFromHTML } from "./ChartFromTable";
import ChartNode from "./ChartNode";
import { apiCreateStatistic, apiUpdateStatistic, apiGetStatistics, type DataClassification, type ProjectStatistic } from "../lib/api";

type CitationData = {
  id: string;
  number: number;
  note?: string;
  articleTitle?: string;
};

type ViewMode = 'scroll' | 'pages';
type PageSize = 'a4' | 'letter';

type EditorSettings = {
  viewMode: ViewMode;
  pageSize: PageSize;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  lineHeight: number;
  firstLineIndent: number;
};

const DEFAULT_SETTINGS: EditorSettings = {
  viewMode: 'scroll',
  pageSize: 'a4',
  marginTop: 20,
  marginBottom: 20,
  marginLeft: 30,
  marginRight: 15,
  lineHeight: 1.5,
  firstLineIndent: 12.5,
};

// A4 dimensions in pixels (at 96dpi)
const PAGE_WIDTH_A4 = 794; // 210mm
const PAGE_HEIGHT_A4 = 1123; // 297mm

type Props = {
  content: string;
  onChange: (content: string) => void;
  onInsertCitation?: () => void;
  onCitationClick?: (citationNumber: number, citationId: string) => void;
  citations?: CitationData[];
  placeholder?: string;
  editable?: boolean;
  projectId?: string;
  documentId?: string;
  onStatisticCreated?: (statId: string) => void;
  onTablesUpdated?: (tables: TableData[]) => void;
  onImportFromStats?: () => void;
};

// Панель инструментов - фиксированная сверху
function Toolbar({ 
  editor, 
  onInsertCitation,
  onCreateChart,
  onImportFromStats,
  settings,
  onSettingsChange,
}: { 
  editor: TipTapEditor | null;
  onInsertCitation?: () => void;
  onCreateChart?: () => void;
  onImportFromStats?: () => void;
  settings: EditorSettings;
  onSettingsChange: (s: EditorSettings) => void;
}) {
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  
  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt("URL ссылки:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const insertTable = (rows: number, cols: number) => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    setShowTableMenu(false);
  };

  const canMergeCells = editor.can().mergeCells();
  const canSplitCell = editor.can().splitCell();

  return (
    <div className="editor-toolbar-fixed">
      {/* Режим отображения */}
      <div className="toolbar-group">
        <button
          type="button"
          onClick={() => onSettingsChange({ ...settings, viewMode: 'scroll' })}
          className={settings.viewMode === 'scroll' ? 'active' : ''}
          title="Режим ленты"
        >
          📜
        </button>
        <button
          type="button"
          onClick={() => onSettingsChange({ ...settings, viewMode: 'pages' })}
          className={settings.viewMode === 'pages' ? 'active' : ''}
          title="Режим страниц"
        >
          📄
        </button>
        <div className="toolbar-dropdown">
          <button
            type="button"
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            title="Настройки"
          >
            ⚙️
          </button>
          {showSettingsMenu && (
            <div className="dropdown-menu settings-dropdown">
              <div className="dropdown-header">Настройки документа</div>
              {settings.viewMode === 'pages' && (
                <>
                  <div className="dropdown-row">
                    <span>Формат:</span>
                    <select 
                      value={settings.pageSize}
                      onChange={(e) => onSettingsChange({ ...settings, pageSize: e.target.value as PageSize })}
                    >
                      <option value="a4">A4</option>
                      <option value="letter">Letter</option>
                    </select>
                  </div>
                </>
              )}
              <div className="dropdown-row">
                <span>Интервал:</span>
                <select 
                  value={settings.lineHeight}
                  onChange={(e) => onSettingsChange({ ...settings, lineHeight: +e.target.value })}
                >
                  <option value={1}>1.0</option>
                  <option value={1.5}>1.5</option>
                  <option value={2}>2.0</option>
                </select>
              </div>
              <div className="dropdown-row">
                <span>Поля (мм):</span>
                <input 
                  type="number" 
                  value={settings.marginLeft}
                  onChange={(e) => onSettingsChange({ ...settings, marginLeft: +e.target.value })}
                  style={{ width: 50 }}
                  title="Левое"
                />
                <input 
                  type="number" 
                  value={settings.marginRight}
                  onChange={(e) => onSettingsChange({ ...settings, marginRight: +e.target.value })}
                  style={{ width: 50 }}
                  title="Правое"
                />
              </div>
              <button onClick={() => setShowSettingsMenu(false)}>Закрыть</button>
            </div>
          )}
        </div>
      </div>

      <div className="toolbar-divider" />

      {/* Форматирование текста */}
      <div className="toolbar-group">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "active" : ""}
          title="Жирный"
        >
          <b>B</b>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "active" : ""}
          title="Курсив"
        >
          <i>I</i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive("underline") ? "active" : ""}
          title="Подчёркнутый"
        >
          <u>U</u>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive("strike") ? "active" : ""}
          title="Зачёркнутый"
        >
          <s>S</s>
        </button>
      </div>

      {/* Заголовки */}
      <div className="toolbar-group">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive("heading", { level: 1 }) ? "active" : ""}
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive("heading", { level: 2 }) ? "active" : ""}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive("heading", { level: 3 }) ? "active" : ""}
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={editor.isActive("paragraph") ? "active" : ""}
        >
          ¶
        </button>
      </div>

      {/* Списки */}
      <div className="toolbar-group">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "active" : ""}
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "active" : ""}
        >
          1.
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive("blockquote") ? "active" : ""}
        >
          «»
        </button>
      </div>

      {/* Выравнивание */}
      <div className="toolbar-group">
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={editor.isActive({ textAlign: "left" }) ? "active" : ""}
        >
          ⬅
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={editor.isActive({ textAlign: "center" }) ? "active" : ""}
        >
          ⬌
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          className={editor.isActive({ textAlign: "justify" }) ? "active" : ""}
        >
          ☰
        </button>
      </div>

      {/* Вставка элементов */}
      <div className="toolbar-group">
        <button type="button" onClick={addLink} title="Ссылка">
          🔗
        </button>
        
        {/* Таблицы */}
        <div className="toolbar-dropdown">
          <button
            type="button"
            onClick={() => setShowTableMenu(!showTableMenu)}
            className={editor.isActive("table") ? "active" : ""}
            title="Таблица"
          >
            📊
          </button>
          {showTableMenu && (
            <div className="dropdown-menu">
              <div className="dropdown-header">Вставить таблицу</div>
              <div className="table-grid">
                {[2, 3, 4, 5].map(rows => (
                  [2, 3, 4].map(cols => (
                    <button
                      key={`${rows}x${cols}`}
                      onClick={() => insertTable(rows, cols)}
                      className="table-cell-btn"
                    >
                      {rows}×{cols}
                    </button>
                  ))
                ))}
              </div>
              {editor.isActive("table") && (
                <>
                  <div className="dropdown-divider" />
                  <button onClick={() => { editor.chain().focus().addColumnAfter().run(); setShowTableMenu(false); }}>
                    + Столбец
                  </button>
                  <button onClick={() => { editor.chain().focus().addRowAfter().run(); setShowTableMenu(false); }}>
                    + Строка
                  </button>
                  <button 
                    onClick={() => { editor.chain().focus().mergeCells().run(); setShowTableMenu(false); }}
                    disabled={!canMergeCells}
                  >
                    ⊞ Объединить
                  </button>
                  <button 
                    onClick={() => { editor.chain().focus().splitCell().run(); setShowTableMenu(false); }}
                    disabled={!canSplitCell}
                  >
                    ⊟ Разделить
                  </button>
                  <div className="dropdown-divider" />
                  <button onClick={() => { editor.chain().focus().deleteColumn().run(); setShowTableMenu(false); }}>
                    − Столбец
                  </button>
                  <button onClick={() => { editor.chain().focus().deleteRow().run(); setShowTableMenu(false); }}>
                    − Строка
                  </button>
                  <button onClick={() => { editor.chain().focus().deleteTable().run(); setShowTableMenu(false); }}>
                    🗑️ Удалить
                  </button>
                  <div className="dropdown-divider" />
                  <button 
                    onClick={() => { onCreateChart?.(); setShowTableMenu(false); }}
                    className="chart-create-btn"
                  >
                    📈 Создать график
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          ―
        </button>
      </div>

      {/* История */}
      <div className="toolbar-group">
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          ↶
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          ↷
        </button>
      </div>

      {/* Цитаты */}
      {onInsertCitation && (
        <div className="toolbar-group">
          <button
            type="button"
            onClick={onInsertCitation}
            className="citation-btn"
          >
            📖 Цитата
          </button>
        </div>
      )}
      
      {/* Импорт из статистики */}
      {onImportFromStats && (
        <div className="toolbar-group">
          <button
            type="button"
            onClick={onImportFromStats}
            className="import-stats-btn"
            title="Импорт таблицы/графика из Статистики"
          >
            📥 Импорт
          </button>
        </div>
      )}
    </div>
  );
}

export default function Editor({
  content,
  onChange,
  onInsertCitation,
  onCitationClick,
  citations = [],
  placeholder = "Начните писать...",
  editable = true,
  projectId,
  documentId,
  onStatisticCreated,
  onTablesUpdated,
  onImportFromStats,
}: Props) {
  const [showChartModal, setShowChartModal] = useState(false);
  const [tableHtmlForChart, setTableHtmlForChart] = useState("");
  const [savingChart, setSavingChart] = useState(false);
  const [settings, setSettings] = useState<EditorSettings>(DEFAULT_SETTINGS);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false, // Отключаем встроенный link из StarterKit
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Table.configure({
        resizable: true,
        allowTableNodeSelection: true,
        HTMLAttributes: { class: 'editor-table' },
      }),
      TableRow,
      TableCell,
      TableHeader,
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: 'editor-image' },
      }),
      CitationNode.configure({ HTMLAttributes: {} }),
      ChartNode,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      
      // Парсим таблицы для синхронизации со статистикой
      if (onTablesUpdated) {
        const tables = extractTablesFromHtml(html);
        onTablesUpdated(tables);
      }
    },
  });

  // Извлечение таблиц из HTML
  const extractTablesFromHtml = (html: string): TableData[] => {
    const tables: TableData[] = [];
    const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/gi;
    let match;
    
    while ((match = tableRegex.exec(html)) !== null) {
      const tableData = parseTableFromHTML(match[0]);
      if (tableData && tableData.rows.length > 0) {
        tables.push(tableData);
      }
    }
    
    return tables;
  };

  // Обработка кликов по цитатам
  useEffect(() => {
    if (!editor) return;

    const handleClick = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains("citation-ref")) {
        const citationNumber = target.getAttribute("data-citation-number");
        const citationId = target.getAttribute("data-citation-id");
        
        if (citationNumber && citationId && onCitationClick) {
          event.preventDefault();
          onCitationClick(parseInt(citationNumber, 10), citationId);
        }
      }
    };

    const container = editorContainerRef.current;
    container?.addEventListener("click", handleClick);
    return () => container?.removeEventListener("click", handleClick);
  }, [editor, onCitationClick]);

  // Вставка цитаты
  const insertCitation = useCallback(
    (citationNumber: number, citationId?: string, note?: string, articleTitle?: string) => {
      if (editor) {
        editor.chain().focus().insertContent({
          type: 'citationNode',
          attrs: {
            citationNumber,
            citationId: citationId || `citation-${citationNumber}`,
            note: note || null,
            articleTitle: articleTitle || null,
          },
        }).run();
      }
    },
    [editor]
  );

  (window as any).__editorInsertCitation = insertCitation;

  // Функция для вставки графика из статистики (импорт)
  const insertChartFromStatistic = useCallback(
    (stat: { id: string; config: any; table_data: any }) => {
      if (editor && projectId) {
        const chartDataStr = JSON.stringify({
          config: stat.config,
          tableData: stat.table_data
        });
        
        editor.chain().focus().insertContent([
          { type: 'paragraph' },
          { 
            type: 'chartNode', 
            attrs: { 
              chartData: chartDataStr,
              statisticId: stat.id,
              projectId: projectId
            } 
          },
          { type: 'paragraph' },
        ]).run();
      }
    },
    [editor, projectId]
  );

  (window as any).__editorInsertChart = insertChartFromStatistic;

  // Статистика документа
  const wordCount = editor?.state.doc.textContent.split(/\s+/).filter(Boolean).length || 0;
  const charCount = editor?.state.doc.textContent.length || 0;

  // Создание графика из таблицы
  const handleCreateChart = useCallback(() => {
    if (!editor) return;
    
    const html = editor.getHTML();
    const tableMatch = html.match(/<table[^>]*>[\s\S]*?<\/table>/i);
    
    if (tableMatch) {
      setTableHtmlForChart(tableMatch[0]);
      setShowChartModal(true);
    } else {
      alert("Сначала создайте таблицу с данными");
    }
  }, [editor]);

  // Вставка графика
  const handleInsertChart = useCallback(async (chartDataJson: string, chartId?: string) => {
    if (editor && projectId) {
      const match = chartDataJson.match(/data-chart='([^']+)'/);
      if (match) {
        const chartDataStr = match[1].replace(/&#39;/g, "'");
        
        setSavingChart(true);
        try {
          // 1. Сначала создаем статистику на бэкенде
          const parsedData = JSON.parse(chartDataStr);
          const config = parsedData.config || {};
          const chartType = config.type as ChartType;
          const chartInfo = chartType ? CHART_TYPE_INFO[chartType] : null;
          
          const result = await apiCreateStatistic(projectId, {
            type: 'chart',
            title: config.title || (chartInfo?.name || 'График'),
            description: chartInfo?.description,
            config: config,
            tableData: parsedData.tableData,
            dataClassification: config.dataClassification as DataClassification,
            chartType: chartType,
          });
          
          onStatisticCreated?.(result.statistic.id);

          // 2. Вставляем узел в редактор с привязкой к ID
          editor.chain().focus().insertContent([
            { type: 'paragraph' },
            { 
              type: 'chartNode', 
              attrs: { 
                chartData: chartDataStr,
                statisticId: result.statistic.id,
                projectId: projectId
              } 
            },
            { type: 'paragraph' },
          ]).run();

        } catch (err) {
          console.error('Failed to save chart:', err);
          alert("Ошибка сохранения графика. Попробуйте еще раз.");
        } finally {
          setSavingChart(false);
        }
      }
    }
    setShowChartModal(false);
    setTableHtmlForChart("");
  }, [editor, projectId, onStatisticCreated]);

  // Вычисляем стили для режима страниц
  const pageWidth = settings.pageSize === 'a4' ? PAGE_WIDTH_A4 : 816;
  const pageHeight = settings.pageSize === 'a4' ? PAGE_HEIGHT_A4 : 1056;

  return (
    <div className="document-editor-container">
      {/* Фиксированный тулбар */}
      {editable && (
        <Toolbar 
          editor={editor} 
          onInsertCitation={onInsertCitation}
          onCreateChart={handleCreateChart}
          onImportFromStats={onImportFromStats}
          settings={settings}
          onSettingsChange={setSettings}
        />
      )}
      
      {/* Область редактирования */}
      <div 
        className={`editor-scroll-area ${settings.viewMode === 'pages' ? 'pages-mode' : 'scroll-mode'}`}
        ref={editorContainerRef}
      >
        <div 
          className={`editor-page ${settings.viewMode === 'pages' ? 'page-view' : 'scroll-view'}`}
          style={settings.viewMode === 'pages' ? {
            width: pageWidth,
            minWidth: pageWidth,
            maxWidth: pageWidth,
            margin: '0 auto',
            minHeight: pageHeight,
            padding: `${settings.marginTop}mm ${settings.marginRight}mm ${settings.marginBottom}mm ${settings.marginLeft}mm`,
            lineHeight: settings.lineHeight,
            background: '#ffffff',
          } : {
            lineHeight: settings.lineHeight,
          }}
        >
          <EditorContent 
            editor={editor} 
            className="editor-content-area"
          />
        </div>
      </div>
      
      {/* Статус-бар */}
      {editable && (
        <div className="editor-status-bar">
          <span>{wordCount} слов • {charCount} символов</span>
          {savingChart && <span>Сохранение графика...</span>}
          <span>{settings.viewMode === 'pages' ? '📄 Страницы' : '📜 Лента'}</span>
        </div>
      )}
      
      {/* Модалка создания графика */}
      {showChartModal && (
        <ChartCreatorModal
          tableHtml={tableHtmlForChart}
          onClose={() => {
            setShowChartModal(false);
            setTableHtmlForChart("");
          }}
          onInsert={handleInsertChart}
        />
      )}
    </div>
  );
}

export function insertCitationToEditor(
  citationNumber: number, 
  citationId?: string, 
  note?: string, 
  articleTitle?: string
) {
  const fn = (window as any).__editorInsertCitation;
  if (fn) fn(citationNumber, citationId, note, articleTitle);
}
