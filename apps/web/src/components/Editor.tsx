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
import { ChartCreatorModal } from "./ChartFromTable";
import ChartNode from "./ChartNode";

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
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  
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
            <div className="dropdown-menu">
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
                  <button onClick={() => { editor.chain().focus().addColumnAfter().run(); setShowTableMenu(false); }}>
                    + Столбец справа
                  </button>
                  <button onClick={() => { editor.chain().focus().addRowAfter().run(); setShowTableMenu(false); }}>
                    + Строка снизу
                  </button>
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
                  <button onClick={() => { onCreateChart?.(); setShowTableMenu(false); }}>
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
}: Props) {
  const [showChartModal, setShowChartModal] = useState(false);
  const [tableHtmlForChart, setTableHtmlForChart] = useState("");

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

  // Функция для создания графика из текущей таблицы
  const handleCreateChart = useCallback(() => {
    if (!editor) return;
    
    // Получаем HTML всего документа и ищем таблицу в позиции курсора
    const html = editor.getHTML();
    
    // Простой способ - ищем первую таблицу в документе
    // В реальном случае нужно искать таблицу, в которой находится курсор
    const tableMatch = html.match(/<table[^>]*>[\s\S]*?<\/table>/i);
    
    if (tableMatch) {
      setTableHtmlForChart(tableMatch[0]);
      setShowChartModal(true);
    } else {
      alert("Сначала выберите таблицу в редакторе");
    }
  }, [editor]);

  // Вставка графика в документ
  const handleInsertChart = useCallback((chartDataJson: string) => {
    if (editor) {
      // Парсим JSON из HTML атрибута
      const match = chartDataJson.match(/data-chart='([^']+)'/);
      if (match) {
        const chartData = match[1].replace(/&#39;/g, "'");
        editor.chain().focus().insertContent({
          type: 'chartNode',
          attrs: { chartData },
        }).run();
      }
    }
    setShowChartModal(false);
    setTableHtmlForChart("");
  }, [editor]);

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
          </span>
        </div>
      )}
      
      {/* Модальное окно создания графика */}
      {showChartModal && (
        <ChartCreatorModal
          tableHtml={tableHtmlForChart}
          onClose={() => setShowChartModal(false)}
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
