import React, { useCallback, useEffect, useState } from "react";
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
import { ChartCreatorModal, CHART_TYPE_INFO, type ChartType } from "./ChartFromTable";
import ChartNode from "./ChartNode";
import { apiCreateStatistic, type DataClassification } from "../lib/api";

type CitationData = {
  id: string;
  number: number;
  note?: string;
  articleTitle?: string;
};

type ViewMode = 'scroll' | 'pages';
type PageSize = 'a4' | 'letter' | 'custom';

type EditorSettings = {
  viewMode: ViewMode;
  pageSize: PageSize;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  paragraphSpacing: number;
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
  paragraphSpacing: 10,
  lineHeight: 1.5,
  firstLineIndent: 12.5,
};

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
};

// Панель навигации по заголовкам
function HeadingsNav({ editor, onClose }: { editor: TipTapEditor | null; onClose: () => void }) {
  const [headings, setHeadings] = useState<{ level: number; text: string; pos: number }[]>([]);

  useEffect(() => {
    if (!editor) return;

    const updateHeadings = () => {
      const items: { level: number; text: string; pos: number }[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          items.push({
            level: node.attrs.level,
            text: node.textContent,
            pos,
          });
        }
      });
      setHeadings(items);
    };

    updateHeadings();
    editor.on('update', updateHeadings);
    return () => {
      editor.off('update', updateHeadings);
    };
  }, [editor]);

  const scrollToHeading = (pos: number) => {
    if (!editor) return;
    editor.chain().focus().setTextSelection(pos).run();
    // Скролл к позиции
    const editorEl = document.querySelector('.editor-content');
    if (editorEl) {
      const coords = editor.view.coordsAtPos(pos);
      editorEl.scrollTo({
        top: coords.top - 100,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="headings-nav">
      <div className="headings-nav-header">
        <span>📑 Структура документа</span>
        <button onClick={onClose} className="btn secondary" style={{ padding: '4px 8px', fontSize: 10 }}>✕</button>
      </div>
      {headings.length === 0 ? (
        <div className="muted" style={{ padding: 12, fontSize: 12 }}>
          Нет заголовков. Используйте H1, H2, H3 для создания структуры.
        </div>
      ) : (
        <div className="headings-list">
          {headings.map((h, i) => (
            <button
              key={i}
              className={`heading-item heading-level-${h.level}`}
              onClick={() => scrollToHeading(h.pos)}
              style={{ paddingLeft: 12 + (h.level - 1) * 16 }}
            >
              <span className="heading-marker">H{h.level}</span>
              <span className="heading-text">{h.text || '(без названия)'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Панель настроек документа
function SettingsPanel({ 
  settings, 
  onSettingsChange, 
  onClose 
}: { 
  settings: EditorSettings; 
  onSettingsChange: (s: EditorSettings) => void; 
  onClose: () => void;
}) {
  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <span>⚙️ Настройки документа</span>
        <button onClick={onClose} className="btn secondary" style={{ padding: '4px 8px', fontSize: 10 }}>✕</button>
      </div>
      
      <div className="settings-section-inner">
        <label className="settings-label">Режим отображения</label>
        <div className="settings-row">
          <button 
            className={`settings-btn ${settings.viewMode === 'scroll' ? 'active' : ''}`}
            onClick={() => onSettingsChange({ ...settings, viewMode: 'scroll' })}
          >
            📜 Лента
          </button>
          <button 
            className={`settings-btn ${settings.viewMode === 'pages' ? 'active' : ''}`}
            onClick={() => onSettingsChange({ ...settings, viewMode: 'pages' })}
          >
            📄 Страницы
          </button>
        </div>
      </div>

      {settings.viewMode === 'pages' && (
        <div className="settings-section-inner">
          <label className="settings-label">Формат страницы</label>
          <select 
            value={settings.pageSize}
            onChange={(e) => onSettingsChange({ ...settings, pageSize: e.target.value as PageSize })}
          >
            <option value="a4">A4 (210 × 297 мм)</option>
            <option value="letter">Letter (216 × 279 мм)</option>
            <option value="custom">Пользовательский</option>
          </select>
        </div>
      )}

      <div className="settings-section-inner">
        <label className="settings-label">Поля (мм)</label>
        <div className="settings-margins">
          <div>
            <span>Верх</span>
            <input 
              type="number" 
              value={settings.marginTop} 
              onChange={(e) => onSettingsChange({ ...settings, marginTop: +e.target.value })}
              min={0} max={100}
            />
          </div>
          <div>
            <span>Низ</span>
            <input 
              type="number" 
              value={settings.marginBottom} 
              onChange={(e) => onSettingsChange({ ...settings, marginBottom: +e.target.value })}
              min={0} max={100}
            />
          </div>
          <div>
            <span>Лево</span>
            <input 
              type="number" 
              value={settings.marginLeft} 
              onChange={(e) => onSettingsChange({ ...settings, marginLeft: +e.target.value })}
              min={0} max={100}
            />
          </div>
          <div>
            <span>Право</span>
            <input 
              type="number" 
              value={settings.marginRight} 
              onChange={(e) => onSettingsChange({ ...settings, marginRight: +e.target.value })}
              min={0} max={100}
            />
          </div>
        </div>
      </div>

      <div className="settings-section-inner">
        <label className="settings-label">Межстрочный интервал</label>
        <select 
          value={settings.lineHeight}
          onChange={(e) => onSettingsChange({ ...settings, lineHeight: +e.target.value })}
        >
          <option value={1}>Одинарный (1.0)</option>
          <option value={1.15}>1.15</option>
          <option value={1.5}>Полуторный (1.5)</option>
          <option value={2}>Двойной (2.0)</option>
        </select>
      </div>

      <div className="settings-section-inner">
        <label className="settings-label">Отступ первой строки (мм): {settings.firstLineIndent}</label>
        <input 
          type="range" 
          min={0} max={50} 
          value={settings.firstLineIndent}
          onChange={(e) => onSettingsChange({ ...settings, firstLineIndent: +e.target.value })}
        />
      </div>

      <div className="settings-section-inner">
        <label className="settings-label">Интервал между абзацами (px): {settings.paragraphSpacing}</label>
        <input 
          type="range" 
          min={0} max={40} 
          value={settings.paragraphSpacing}
          onChange={(e) => onSettingsChange({ ...settings, paragraphSpacing: +e.target.value })}
        />
      </div>
    </div>
  );
}

// Панель инструментов
function Toolbar({ 
  editor, 
  onInsertCitation,
  onCreateChart,
  onToggleHeadings,
  onToggleSettings,
  showHeadings,
  showSettings,
}: { 
  editor: TipTapEditor | null;
  onInsertCitation?: () => void;
  onCreateChart?: () => void;
  onToggleHeadings: () => void;
  onToggleSettings: () => void;
  showHeadings: boolean;
  showSettings: boolean;
}) {
  const [showTableMenu, setShowTableMenu] = useState(false);
  
  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt("URL ссылки:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = window.prompt("URL изображения:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const insertTable = (rows: number, cols: number) => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    setShowTableMenu(false);
  };

  const canMergeCells = editor.can().mergeCells();
  const canSplitCell = editor.can().splitCell();

  return (
    <div className="editor-toolbar">
      {/* Навигация и настройки */}
      <div className="toolbar-group">
        <button
          type="button"
          onClick={onToggleHeadings}
          className={showHeadings ? "active" : ""}
          title="Структура документа"
        >
          📑
        </button>
        <button
          type="button"
          onClick={onToggleSettings}
          className={showSettings ? "active" : ""}
          title="Настройки документа"
        >
          ⚙️
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Форматирование текста */}
      <div className="toolbar-group">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "active" : ""}
          title="Жирный (Ctrl+B)"
        >
          <b>B</b>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "active" : ""}
          title="Курсив (Ctrl+I)"
        >
          <i>I</i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive("underline") ? "active" : ""}
          title="Подчёркнутый (Ctrl+U)"
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
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={editor.isActive("highlight") ? "active" : ""}
          title="Выделение"
        >
          🖍️
        </button>
      </div>

      {/* Заголовки */}
      <div className="toolbar-group">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive("heading", { level: 1 }) ? "active" : ""}
          title="Заголовок 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive("heading", { level: 2 }) ? "active" : ""}
          title="Заголовок 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive("heading", { level: 3 }) ? "active" : ""}
          title="Заголовок 3"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={editor.isActive("paragraph") ? "active" : ""}
          title="Обычный текст"
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
          title="Маркированный список"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "active" : ""}
          title="Нумерованный список"
        >
          1.
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive("blockquote") ? "active" : ""}
          title="Цитата"
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
          title="По левому краю"
        >
          ⬅
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={editor.isActive({ textAlign: "center" }) ? "active" : ""}
          title="По центру"
        >
          ⬌
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={editor.isActive({ textAlign: "right" }) ? "active" : ""}
          title="По правому краю"
        >
          ➡
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          className={editor.isActive({ textAlign: "justify" }) ? "active" : ""}
          title="По ширине"
        >
          ☰
        </button>
      </div>

      {/* Вставка элементов */}
      <div className="toolbar-group">
        <button
          type="button"
          onClick={addLink}
          className={editor.isActive("link") ? "active" : ""}
          title="Вставить ссылку"
        >
          🔗
        </button>
        <button
          type="button"
          onClick={addImage}
          title="Вставить изображение"
        >
          🖼️
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
            <div className="dropdown-menu" style={{ minWidth: 220 }}>
              <div className="dropdown-header">Вставить таблицу</div>
              <div className="table-grid">
                {[2, 3, 4, 5].map(rows => (
                  [2, 3, 4, 5].map(cols => (
                    <button
                      key={`${rows}x${cols}`}
                      onClick={() => insertTable(rows, cols)}
                      className="table-cell-btn"
                      title={`${rows}×${cols}`}
                    >
                      {rows}×{cols}
                    </button>
                  ))
                ))}
              </div>
              {editor.isActive("table") && (
                <>
                  <div className="dropdown-divider" />
                  <div className="dropdown-header">Редактирование</div>
                  <button onClick={() => { editor.chain().focus().addColumnAfter().run(); setShowTableMenu(false); }}>
                    + Столбец справа
                  </button>
                  <button onClick={() => { editor.chain().focus().addRowAfter().run(); setShowTableMenu(false); }}>
                    + Строка снизу
                  </button>
                  <button onClick={() => { editor.chain().focus().addColumnBefore().run(); setShowTableMenu(false); }}>
                    + Столбец слева
                  </button>
                  <button onClick={() => { editor.chain().focus().addRowBefore().run(); setShowTableMenu(false); }}>
                    + Строка сверху
                  </button>
                  <div className="dropdown-divider" />
                  <div className="dropdown-header">Объединение ячеек</div>
                  <button 
                    onClick={() => { editor.chain().focus().mergeCells().run(); setShowTableMenu(false); }}
                    disabled={!canMergeCells}
                    style={{ opacity: canMergeCells ? 1 : 0.5 }}
                  >
                    ⊞ Объединить ячейки
                  </button>
                  <button 
                    onClick={() => { editor.chain().focus().splitCell().run(); setShowTableMenu(false); }}
                    disabled={!canSplitCell}
                    style={{ opacity: canSplitCell ? 1 : 0.5 }}
                  >
                    ⊟ Разделить ячейку
                  </button>
                  <button onClick={() => { editor.chain().focus().toggleHeaderCell().run(); setShowTableMenu(false); }}>
                    ≡ Сделать заголовком
                  </button>
                  <div className="dropdown-divider" />
                  <button onClick={() => { editor.chain().focus().deleteColumn().run(); setShowTableMenu(false); }}>
                    − Удалить столбец
                  </button>
                  <button onClick={() => { editor.chain().focus().deleteRow().run(); setShowTableMenu(false); }}>
                    − Удалить строку
                  </button>
                  <button onClick={() => { editor.chain().focus().deleteTable().run(); setShowTableMenu(false); }}>
                    🗑️ Удалить таблицу
                  </button>
                  <div className="dropdown-divider" />
                  <button 
                    onClick={() => { onCreateChart?.(); setShowTableMenu(false); }}
                    style={{ background: 'rgba(74, 222, 128, 0.2)', color: 'var(--success)' }}
                  >
                    📈 Создать график из таблицы
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Горизонтальная линия"
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
          title="Отменить (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Повторить (Ctrl+Y)"
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
            title="Вставить ссылку на литературу"
          >
            📖 Цитата
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
}: Props) {
  const [showChartModal, setShowChartModal] = useState(false);
  const [tableHtmlForChart, setTableHtmlForChart] = useState("");
  const [savingChart, setSavingChart] = useState(false);
  const [showHeadings, setShowHeadings] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<EditorSettings>(DEFAULT_SETTINGS);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
      Table.configure({
        resizable: true,
        allowTableNodeSelection: true,
        HTMLAttributes: {
          class: 'editor-table',
        },
      }),
      TableRow,
      TableCell,
      TableHeader,
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      CitationNode.configure({
        HTMLAttributes: {},
      }),
      ChartNode,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Обработка кликов по цитатам в редакторе
  useEffect(() => {
    if (!editor) return;

    const handleClick = (event: Event) => {
      const mouseEvent = event as unknown as MouseEvent;
      const target = mouseEvent.target as HTMLElement;
      if (target.classList.contains("citation-ref")) {
        const citationNumber = target.getAttribute("data-citation-number");
        const citationId = target.getAttribute("data-citation-id");
        
        if (citationNumber && citationId && onCitationClick) {
          mouseEvent.preventDefault();
          onCitationClick(parseInt(citationNumber, 10), citationId);
        }
      }
    };

    const editorEl = document.querySelector(".editor-content");
    editorEl?.addEventListener("click", handleClick);

    return () => {
      editorEl?.removeEventListener("click", handleClick);
    };
  }, [editor, onCitationClick]);

  // Метод для вставки цитаты в текст
  const insertCitation = useCallback(
    (citationNumber: number, citationId?: string, note?: string, articleTitle?: string) => {
      if (editor) {
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'citationNode',
            attrs: {
              citationNumber,
              citationId: citationId || `citation-${citationNumber}`,
              note: note || null,
              articleTitle: articleTitle || null,
            },
          })
          .run();
      }
    },
    [editor]
  );

  (window as any).__editorInsertCitation = insertCitation;

  // Статистика документа
  const wordCount = editor?.state.doc.textContent.split(/\s+/).filter(Boolean).length || 0;
  const charCount = editor?.state.doc.textContent.length || 0;

  // Найти позицию конца таблицы
  const findTableEndPosition = useCallback(() => {
    if (!editor) return null;
    
    const { state } = editor;
    const { selection } = state;
    const { $from } = selection;
    
    let tableNode = null;
    let tablePos = 0;
    
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d);
      if (node.type.name === 'table') {
        tableNode = node;
        tablePos = $from.before(d);
        break;
      }
    }
    
    if (tableNode) {
      return tablePos + tableNode.nodeSize;
    }
    
    return null;
  }, [editor]);

  // Создание графика из таблицы
  const handleCreateChart = useCallback(() => {
    if (!editor) return;
    
    const { state } = editor;
    const { selection } = state;
    const { $from } = selection;
    
    let tableNode = null;
    
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d);
      if (node.type.name === 'table') {
        tableNode = node;
        break;
      }
    }
    
    if (!tableNode) {
      const html = editor.getHTML();
      const tableMatch = html.match(/<table[^>]*>[\s\S]*?<\/table>/i);
      
      if (tableMatch) {
        setTableHtmlForChart(tableMatch[0]);
        setShowChartModal(true);
      } else {
        alert("Сначала создайте таблицу с данными в редакторе");
      }
      return;
    }
    
    const html = editor.getHTML();
    const tableMatch = html.match(/<table[^>]*>[\s\S]*?<\/table>/i);
    
    if (tableMatch) {
      setTableHtmlForChart(tableMatch[0]);
      setShowChartModal(true);
    }
  }, [editor]);

  // Вставка графика после таблицы
  const handleInsertChart = useCallback(async (chartDataJson: string, chartId?: string) => {
    if (editor) {
      const match = chartDataJson.match(/data-chart='([^']+)'/);
      if (match) {
        const chartDataStr = match[1].replace(/&#39;/g, "'");
        
        const tableEndPos = findTableEndPosition();
        
        if (tableEndPos !== null) {
          editor
            .chain()
            .focus()
            .insertContentAt(tableEndPos, [
              { type: 'paragraph' },
              {
                type: 'chartNode',
                attrs: { chartData: chartDataStr },
              },
              { type: 'paragraph' },
            ])
            .run();
        } else {
          editor
            .chain()
            .focus()
            .insertContent([
              { type: 'paragraph' },
              {
                type: 'chartNode',
                attrs: { chartData: chartDataStr },
              },
              { type: 'paragraph' },
            ])
            .run();
        }
        
        if (projectId) {
          setSavingChart(true);
          try {
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
          } catch (err) {
            console.error('Failed to save chart to statistics:', err);
          } finally {
            setSavingChart(false);
          }
        }
      }
    }
    setShowChartModal(false);
    setTableHtmlForChart("");
  }, [editor, projectId, onStatisticCreated, findTableEndPosition]);

  return (
    <div className={`editor-wrapper ${settings.viewMode === 'pages' ? 'page-mode' : 'scroll-mode'}`}>
      {/* Боковая панель навигации */}
      {showHeadings && (
        <HeadingsNav editor={editor} onClose={() => setShowHeadings(false)} />
      )}

      {/* Основной редактор */}
      <div className="editor-main">
        {editable && (
          <Toolbar 
            editor={editor} 
            onInsertCitation={onInsertCitation}
            onCreateChart={handleCreateChart}
            onToggleHeadings={() => setShowHeadings(!showHeadings)}
            onToggleSettings={() => setShowSettings(!showSettings)}
            showHeadings={showHeadings}
            showSettings={showSettings}
          />
        )}
        
        <div className={`editor-content-wrapper ${settings.viewMode === 'pages' ? 'pages' : 'scroll'}`}>
          <div 
            className={`editor-content-page ${settings.viewMode === 'pages' ? 'page-view' : 'scroll-view'}`}
            style={settings.viewMode === 'pages' ? {
              maxWidth: settings.pageSize === 'a4' ? '210mm' : settings.pageSize === 'letter' ? '216mm' : '210mm',
              minHeight: settings.pageSize === 'a4' ? '297mm' : '279mm',
              padding: `${settings.marginTop}mm ${settings.marginRight}mm ${settings.marginBottom}mm ${settings.marginLeft}mm`,
            } : undefined}
          >
            <EditorContent 
              editor={editor} 
              className="editor-content" 
              style={{
                '--paragraph-spacing': `${settings.paragraphSpacing}px`,
                '--line-height': settings.lineHeight,
                '--first-line-indent': `${settings.firstLineIndent}mm`,
              } as React.CSSProperties}
            />
          </div>
        </div>
        
        {editable && (
          <div className="editor-footer">
            <span className="word-count">
              {wordCount} слов • {charCount} символов
              {savingChart && ' • Сохранение графика...'}
            </span>
            <span className="view-mode-indicator">
              {settings.viewMode === 'pages' ? '📄 Страницы' : '📜 Лента'}
            </span>
          </div>
        )}
      </div>

      {/* Панель настроек */}
      {showSettings && (
        <SettingsPanel 
          settings={settings} 
          onSettingsChange={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
      
      {/* Модальное окно создания графика */}
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
