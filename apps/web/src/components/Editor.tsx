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

// Панель инструментов
function Toolbar({ 
  editor, 
  onInsertCitation,
  onCreateChart,
}: { 
  editor: TipTapEditor | null;
  onInsertCitation?: () => void;
  onCreateChart?: () => void;
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

  // Проверяем есть ли выделенные ячейки для объединения
  const canMergeCells = editor.can().mergeCells();
  const canSplitCell = editor.can().splitCell();

  return (
    <div className="editor-toolbar">
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
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editor.isActive("codeBlock") ? "active" : ""}
          title="Блок кода"
        >
          {"</>"}
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
  const [currentTablePos, setCurrentTablePos] = useState<{ from: number; to: number } | null>(null);

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
      // Проверяем клик по citation-ref (новый Node)
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

  // Метод для вставки цитаты в текст как атомарный Node
  const insertCitation = useCallback(
    (citationNumber: number, citationId?: string, note?: string, articleTitle?: string) => {
      if (editor) {
        // Вставляем как атомарный Node - не может "растечься" на соседний текст
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

  // Экспортируем метод через ref или контекст если нужно
  (window as any).__editorInsertCitation = insertCitation;

  // Статистика документа
  const wordCount = editor?.state.doc.textContent.split(/\s+/).filter(Boolean).length || 0;
  const charCount = editor?.state.doc.textContent.length || 0;

  // Найти позицию конца таблицы для вставки графика после неё
  const findTableEndPosition = useCallback(() => {
    if (!editor) return null;
    
    const { state } = editor;
    const { selection } = state;
    const { $from } = selection;
    
    // Ищем таблицу, которая содержит курсор
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
      // Возвращаем позицию сразу после таблицы
      return tablePos + tableNode.nodeSize;
    }
    
    return null;
  }, [editor]);

  // Функция для создания графика из текущей таблицы
  const handleCreateChart = useCallback(() => {
    if (!editor) return;
    
    const { state } = editor;
    const { selection } = state;
    const { $from } = selection;
    
    // Ищем таблицу, которая содержит курсор
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
    
    if (!tableNode) {
      // Ищем любую таблицу в документе
      const html = editor.getHTML();
      const tableMatch = html.match(/<table[^>]*>[\s\S]*?<\/table>/i);
      
      if (tableMatch) {
        setTableHtmlForChart(tableMatch[0]);
        setCurrentTablePos(null);
        setShowChartModal(true);
      } else {
        alert("Сначала создайте таблицу с данными в редакторе");
      }
      return;
    }
    
    // Получаем HTML только выбранной таблицы
    const tableEndPos = tablePos + tableNode.nodeSize;
    setCurrentTablePos({ from: tablePos, to: tableEndPos });
    
    // Создаём временный div для получения HTML таблицы
    const fragment = state.doc.slice(tablePos, tableEndPos);
    const tempDiv = document.createElement('div');
    const serializer = (window as any).DOMSerializer?.fromSchema?.(state.schema);
    if (serializer) {
      tempDiv.appendChild(serializer.serializeFragment(fragment.content));
    }
    
    // Fallback: ищем таблицу в полном HTML
    const html = editor.getHTML();
    const tableMatch = html.match(/<table[^>]*>[\s\S]*?<\/table>/i);
    
    if (tableMatch) {
      setTableHtmlForChart(tableMatch[0]);
      setShowChartModal(true);
    }
  }, [editor]);

  // Вставка графика в документ ПОСЛЕ таблицы и сохранение в статистику проекта
  const handleInsertChart = useCallback(async (chartDataJson: string, chartId?: string) => {
    if (editor) {
      // Парсим JSON из HTML атрибута
      const match = chartDataJson.match(/data-chart='([^']+)'/);
      if (match) {
        const chartDataStr = match[1].replace(/&#39;/g, "'");
        
        // Находим позицию после таблицы
        const tableEndPos = findTableEndPosition();
        
        if (tableEndPos !== null) {
          // Вставляем график ПОСЛЕ таблицы, не внутри неё
          editor
            .chain()
            .focus()
            .insertContentAt(tableEndPos, [
              { type: 'paragraph' }, // Пустая строка перед графиком
              {
                type: 'chartNode',
                attrs: { chartData: chartDataStr },
              },
              { type: 'paragraph' }, // Пустая строка после графика
            ])
            .run();
        } else {
          // Если таблица не найдена, вставляем в конец документа
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
        
        // Сохраняем в статистику проекта если есть projectId
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
            console.log('Chart saved to statistics:', result.statistic.id);
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
    setCurrentTablePos(null);
  }, [editor, projectId, onStatisticCreated, findTableEndPosition]);

  return (
    <div className="editor-container">
      {editable && (
        <Toolbar 
          editor={editor} 
          onInsertCitation={onInsertCitation}
          onCreateChart={handleCreateChart}
        />
      )}
      <EditorContent editor={editor} className="editor-content" />
      {editable && (
        <div className="editor-footer">
          <span className="word-count">
            {wordCount} слов • {charCount} символов
            {savingChart && ' • Сохранение графика...'}
          </span>
        </div>
      )}
      
      {/* Модальное окно создания графика */}
      {showChartModal && (
        <ChartCreatorModal
          tableHtml={tableHtmlForChart}
          onClose={() => {
            setShowChartModal(false);
            setTableHtmlForChart("");
            setCurrentTablePos(null);
          }}
          onInsert={handleInsertChart}
        />
      )}
    </div>
  );
}

// Вспомогательная функция для вставки цитаты извне
export function insertCitationToEditor(
  citationNumber: number, 
  citationId?: string, 
  note?: string, 
  articleTitle?: string
) {
  const fn = (window as any).__editorInsertCitation;
  if (fn) fn(citationNumber, citationId, note, articleTitle);
}
