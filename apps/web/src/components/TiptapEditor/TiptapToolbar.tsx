import React, { useState, useRef, useEffect } from "react";
import { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import type { CitationStyle } from "../../lib/api";
import { STYLE_CONFIGS } from "./TiptapEditor";
import { editorEvents } from "../../lib/editorEvents";
import {
  IconDocumentText,
  IconBook,
  IconLink,
  IconTableCells,
  IconSettings,
  IconPaintBrush,
  IconChatBubbleQuote,
  IconCodeBracket,
  IconChartBar,
  IconArrowsExpand,
  IconTrash,
  IconBarsLeft,
  IconBarsCenter,
  IconBarsRight,
  IconAlignTop,
  IconAlignMiddle,
  IconAlignBottom,
  IconPhoto,
  IconPencil,
  IconSparkles,
} from "../FlowbiteIcons";

// Cell colors for table customization
const CELL_COLORS = [
  { name: "Без цвета", value: "", class: "" },
  { name: "Синий", value: "rgba(59, 130, 246, 0.15)", class: "cell-blue" },
  { name: "Зелёный", value: "rgba(34, 197, 94, 0.15)", class: "cell-green" },
  { name: "Жёлтый", value: "rgba(234, 179, 8, 0.15)", class: "cell-yellow" },
  { name: "Красный", value: "rgba(239, 68, 68, 0.15)", class: "cell-red" },
  {
    name: "Фиолетовый",
    value: "rgba(168, 85, 247, 0.15)",
    class: "cell-purple",
  },
  { name: "Серый", value: "rgba(100, 116, 139, 0.15)", class: "cell-gray" },
];

// Font sizes available in the editor
const FONT_SIZES = [
  "10",
  "11",
  "12",
  "14",
  "16",
  "18",
  "20",
  "24",
  "28",
  "32",
  "36",
  "48",
];

// Font families (Google Fonts + Times New Roman)
const FONT_FAMILIES = [
  { name: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { name: "Arial", value: "'Arial', sans-serif" },
  { name: "Georgia", value: "'Georgia', serif" },
  { name: "Verdana", value: "'Verdana', sans-serif" },
  { name: "Roboto", value: "'Roboto', sans-serif" },
  { name: "Open Sans", value: "'Open Sans', sans-serif" },
  { name: "Lato", value: "'Lato', sans-serif" },
  { name: "Montserrat", value: "'Montserrat', sans-serif" },
  { name: "PT Sans", value: "'PT Sans', sans-serif" },
  { name: "PT Serif", value: "'PT Serif', serif" },
  { name: "Courier New", value: "'Courier New', monospace" },
];

const FONT_OPTION_CLASS_MAP: Record<string, string> = {
  "'Times New Roman', Times, serif": "toolbar-font-option--times",
  "'Arial', sans-serif": "toolbar-font-option--arial",
  "'Georgia', serif": "toolbar-font-option--georgia",
  "'Verdana', sans-serif": "toolbar-font-option--verdana",
  "'Roboto', sans-serif": "toolbar-font-option--roboto",
  "'Open Sans', sans-serif": "toolbar-font-option--open-sans",
  "'Lato', sans-serif": "toolbar-font-option--lato",
  "'Montserrat', sans-serif": "toolbar-font-option--montserrat",
  "'PT Sans', sans-serif": "toolbar-font-option--pt-sans",
  "'PT Serif', serif": "toolbar-font-option--pt-serif",
  "'Courier New', monospace": "toolbar-font-option--courier",
};

const CELL_COLOR_SWATCH_CLASS_MAP: Record<string, string> = {
  "": "toolbar-cell-color-swatch--none",
  "rgba(59, 130, 246, 0.15)": "toolbar-cell-color-swatch--blue",
  "rgba(34, 197, 94, 0.15)": "toolbar-cell-color-swatch--green",
  "rgba(234, 179, 8, 0.15)": "toolbar-cell-color-swatch--yellow",
  "rgba(239, 68, 68, 0.15)": "toolbar-cell-color-swatch--red",
  "rgba(168, 85, 247, 0.15)": "toolbar-cell-color-swatch--purple",
  "rgba(100, 116, 139, 0.15)": "toolbar-cell-color-swatch--gray",
};

interface TiptapToolbarProps {
  editor: Editor;
  onInsertCitation?: () => void;
  onImportStatistic?: () => void;
  onImportFile?: () => void;
  onToggleOutline?: () => void;
  onToggleBibliography?: () => void;
  onCreateChartFromTable?: (tableHtml: string) => void;
  onOpenTableEditor?: () => void;
  onOpenPageSettings?: () => void;
  showOutline?: boolean;
  showBibliography?: boolean;
  citationStyle?: CitationStyle;
  // Review mode
  reviewMode?: boolean;
  onToggleReviewMode?: () => void;
  onAddComment?: () => void;
  // AI Assistant
  onToggleAIAssistant?: () => void;
  showAIAssistant?: boolean;
}

type ToolbarChain = ReturnType<Editor["chain"]> & {
  setFontSize: (fontSize: string) => ToolbarChain;
  unsetFontSize: () => ToolbarChain;
  toggleIndent: () => ToolbarChain;
  setRowHeight: (height: number) => ToolbarChain;
  deleteRowHeight: () => ToolbarChain;
};

export default function TiptapToolbar({
  editor,
  onInsertCitation,
  onImportStatistic,
  onImportFile,
  onToggleOutline,
  onToggleBibliography,
  onCreateChartFromTable,
  onOpenTableEditor,
  onOpenPageSettings,
  showOutline,
  showBibliography,
  citationStyle = "gost",
  reviewMode = false,
  onToggleReviewMode,
  onAddComment,
  onToggleAIAssistant,
  showAIAssistant = false,
}: TiptapToolbarProps) {
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showTableEditMenu, setShowTableEditMenu] = useState(false);
  const [showTableColorMenu, setShowTableColorMenu] = useState(false);
  const tableMenuRef = useRef<HTMLDivElement>(null);
  const tableEditMenuRef = useRef<HTMLDivElement>(null);
  const tableColorMenuRef = useRef<HTMLDivElement>(null);

  const styleConfig = STYLE_CONFIGS[citationStyle] || STYLE_CONFIGS.gost;

  const hasOutlineToggle = typeof onToggleOutline === "function";
  const hasBibliographyToggle = typeof onToggleBibliography === "function";
  const hasSidebarToggles = hasOutlineToggle || hasBibliographyToggle;

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tableMenuRef.current &&
        !tableMenuRef.current.contains(e.target as Node)
      ) {
        setShowTableMenu(false);
      }
      if (
        tableEditMenuRef.current &&
        !tableEditMenuRef.current.contains(e.target as Node)
      ) {
        setShowTableEditMenu(false);
      }
      if (
        tableColorMenuRef.current &&
        !tableColorMenuRef.current.contains(e.target as Node)
      ) {
        setShowTableColorMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isInTable = editor.isActive("table");

  const insertTable = (rows: number, cols: number) => {
    if (editorEvents.hasListeners("createTable")) {
      editorEvents.emit("createTable", { rows, cols });
    } else {
      editor
        .chain()
        .focus()
        .insertTable({ rows, cols, withHeaderRow: true })
        .run();
    }
    setShowTableMenu(false);
  };

  const applyCellColor = (color: string) => {
    if (!color) {
      editor.chain().focus().setCellAttribute("backgroundColor", "").run();
    } else {
      editor.chain().focus().setCellAttribute("backgroundColor", color).run();
    }
    setShowTableColorMenu(false);
  };

  const isInHeaderRow = () => {
    try {
      const { state } = editor;
      const { $from } = state.selection;
      let isHeader = false;
      for (let depth = $from.depth; depth > 0; depth--) {
        const node = $from.node(depth);
        if (node?.type?.name === "tableHeader") {
          isHeader = true;
          break;
        }
      }
      return isHeader;
    } catch {
      return false;
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = prompt("Введите URL:", previousUrl || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const getToolbarChain = () => editor.chain().focus() as ToolbarChain;

  const getFontOptionClass = (fontFamily: string): string =>
    FONT_OPTION_CLASS_MAP[fontFamily] ?? "toolbar-font-option--default";

  const getLockedActionClass = (locked: boolean): string =>
    locked ? "toolbar-dropdown-item--locked" : "";

  const getCellColorSwatchClass = (color: string): string =>
    CELL_COLOR_SWATCH_CLASS_MAP[color] ?? "toolbar-cell-color-swatch--none";

  return (
    <div className="tiptap-toolbar">
      {hasSidebarToggles && (
        <>
          {hasOutlineToggle && (
            <button
              className={`toolbar-btn${showOutline ? " active-subtle" : ""}`}
              onClick={onToggleOutline}
              title="Содержание документа"
            >
              <IconDocumentText size="sm" />
            </button>
          )}

          {hasBibliographyToggle && (
            <button
              className={`toolbar-btn${showBibliography ? " active-subtle" : ""}`}
              onClick={onToggleBibliography}
              title="Список литературы"
            >
              <IconBook size="sm" />
            </button>
          )}

          <div className="toolbar-divider" />
        </>
      )}

      {/* Text formatting */}
      <button
        className={`toolbar-btn${editor.isActive("bold") ? " active" : ""}`}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Жирный (Ctrl+B)"
      >
        <b>B</b>
      </button>
      <button
        className={`toolbar-btn${editor.isActive("italic") ? " active" : ""}`}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Курсив (Ctrl+I)"
      >
        <i>I</i>
      </button>
      <button
        className={`toolbar-btn${editor.isActive("underline") ? " active" : ""}`}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Подчёркнутый (Ctrl+U)"
      >
        <u>U</u>
      </button>
      <button
        className={`toolbar-btn${editor.isActive("strike") ? " active" : ""}`}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Зачёркнутый"
      >
        <s>S</s>
      </button>

      <div className="toolbar-divider" />

      {/* Font Size Selector */}
      <select
        value={
          editor.getAttributes("textStyle")?.fontSize?.replace("pt", "") || ""
        }
        onChange={(e) => {
          if (e.target.value) {
            getToolbarChain().setFontSize(`${e.target.value}pt`).run();
          } else {
            getToolbarChain().unsetFontSize().run();
          }
        }}
        className="toolbar-select toolbar-select--font-size"
        title="Размер шрифта"
      >
        <option value="">Размер</option>
        {FONT_SIZES.map((size) => (
          <option key={size} value={size}>
            {size}pt
          </option>
        ))}
      </select>

      {/* Font Family Selector */}
      <select
        value={editor.getAttributes("textStyle")?.fontFamily || ""}
        onChange={(e) => {
          if (e.target.value) {
            editor.chain().focus().setFontFamily(e.target.value).run();
          } else {
            editor.chain().focus().unsetFontFamily().run();
          }
        }}
        className="toolbar-select toolbar-select--font-family"
        title="Шрифт"
      >
        <option value="">Шрифт</option>
        {FONT_FAMILIES.map((font) => (
          <option
            key={font.name}
            value={font.value}
            className={getFontOptionClass(font.value)}
          >
            {font.name}
          </option>
        ))}
      </select>

      <div className="toolbar-divider" />

      {/* Headings */}
      <button
        className={`toolbar-btn${editor.isActive("heading", { level: 1 }) ? " active" : ""}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Заголовок 1"
      >
        H1
      </button>
      <button
        className={`toolbar-btn${editor.isActive("heading", { level: 2 }) ? " active" : ""}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Заголовок 2"
      >
        H2
      </button>
      <button
        className={`toolbar-btn${editor.isActive("heading", { level: 3 }) ? " active" : ""}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Заголовок 3"
      >
        H3
      </button>
      <button
        className="toolbar-btn"
        onClick={() => getToolbarChain().toggleIndent().run()}
        title="Отступ первой строки (Tab)"
      >
        ⇥
      </button>

      <div className="toolbar-divider" />

      {/* Lists */}
      <button
        className={`toolbar-btn${editor.isActive("bulletList") ? " active" : ""}`}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Маркированный список"
      >
        •
      </button>
      <button
        className={`toolbar-btn${editor.isActive("orderedList") ? " active" : ""}`}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Нумерованный список"
      >
        1.
      </button>

      <div className="toolbar-divider" />

      {/* Link */}
      <button
        className={`toolbar-btn${editor.isActive("link") ? " active" : ""}`}
        onClick={setLink}
        title="Ссылка"
      >
        <IconLink size="sm" />
      </button>

      {/* Insert Table */}
      <div className="toolbar-menu-wrap" ref={tableMenuRef}>
        <button
          className="toolbar-btn"
          onClick={() => {
            setShowTableMenu(!showTableMenu);
            setShowTableEditMenu(false);
          }}
          title="Вставить таблицу"
        >
          <IconTableCells size="sm" />
        </button>
        {showTableMenu && (
          <div className="toolbar-dropdown">
            <div className="toolbar-dropdown-label">Вставить таблицу</div>
            {[
              [2, 2],
              [3, 3],
              [4, 4],
              [5, 3],
            ].map(([r, c]) => (
              <button
                key={`${r}x${c}`}
                onClick={() => insertTable(r, c)}
                className="toolbar-dropdown-item"
              >
                {r} × {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Edit Table (when in table) */}
      {isInTable && (
        <>
          <div className="toolbar-menu-wrap" ref={tableEditMenuRef}>
            <button
              className="toolbar-btn active-subtle"
              onClick={() => {
                setShowTableEditMenu(!showTableEditMenu);
                setShowTableMenu(false);
                setShowTableColorMenu(false);
              }}
              title="Редактировать таблицу"
            >
              <IconSettings size="sm" />
            </button>
            {showTableEditMenu && (
              <div className="toolbar-dropdown">
                {onOpenTableEditor && (
                  <>
                    <button
                      onClick={() => {
                        onOpenTableEditor();
                        setShowTableEditMenu(false);
                      }}
                      className="toolbar-dropdown-item toolbar-dropdown-item--row-action accent"
                    >
                      <IconArrowsExpand size="sm" /> Редактор таблицы
                    </button>
                    <div className="toolbar-dropdown-sep" />
                  </>
                )}
                <div className="toolbar-dropdown-label">Строки</div>
                <button
                  onClick={() => {
                    if (isInHeaderRow()) {
                      alert("Нельзя добавить строку выше заголовка таблицы");
                      return;
                    }
                    editor.chain().focus().addRowBefore().run();
                    setShowTableEditMenu(false);
                  }}
                  className={`toolbar-dropdown-item ${getLockedActionClass(
                    isInHeaderRow(),
                  )}`}
                  title={
                    isInHeaderRow()
                      ? "Нельзя добавить строку выше заголовка"
                      : ""
                  }
                >
                  ↑ Добавить строку выше {isInHeaderRow() && "🔒"}
                </button>
                <button
                  onClick={() => {
                    editor.chain().focus().addRowAfter().run();
                    setShowTableEditMenu(false);
                  }}
                  className="toolbar-dropdown-item"
                >
                  ↓ Добавить строку ниже
                </button>
                <button
                  onClick={() => {
                    if (isInHeaderRow()) {
                      alert("Нельзя удалить строку заголовка таблицы");
                      return;
                    }
                    editor.chain().focus().deleteRow().run();
                    setShowTableEditMenu(false);
                  }}
                  className={`toolbar-dropdown-item danger ${getLockedActionClass(
                    isInHeaderRow(),
                  )}`}
                  title={
                    isInHeaderRow() ? "Нельзя удалить строку заголовка" : ""
                  }
                >
                  ✕ Удалить строку {isInHeaderRow() && "🔒"}
                </button>

                <div className="toolbar-dropdown-sep" />

                <div className="toolbar-dropdown-label">Столбцы</div>
                <button
                  onClick={() => {
                    editor.chain().focus().addColumnBefore().run();
                    setShowTableEditMenu(false);
                  }}
                  className="toolbar-dropdown-item"
                >
                  ← Добавить столбец слева
                </button>
                <button
                  onClick={() => {
                    editor.chain().focus().addColumnAfter().run();
                    setShowTableEditMenu(false);
                  }}
                  className="toolbar-dropdown-item"
                >
                  → Добавить столбец справа
                </button>
                <button
                  onClick={() => {
                    editor.chain().focus().deleteColumn().run();
                    setShowTableEditMenu(false);
                  }}
                  className="toolbar-dropdown-item danger"
                >
                  ✕ Удалить столбец
                </button>

                <div className="toolbar-dropdown-sep" />

                <button
                  onClick={() => {
                    editor.chain().focus().mergeCells().run();
                    setShowTableEditMenu(false);
                  }}
                  className="toolbar-dropdown-item"
                >
                  ⊞ Объединить ячейки
                </button>
                <button
                  onClick={() => {
                    editor.chain().focus().splitCell().run();
                    setShowTableEditMenu(false);
                  }}
                  className="toolbar-dropdown-item"
                >
                  ⊟ Разделить ячейку
                </button>
                <button
                  onClick={() => {
                    editor.chain().focus().toggleHeaderRow().run();
                    setShowTableEditMenu(false);
                  }}
                  className="toolbar-dropdown-item"
                >
                  ⊟ Переключить заголовок строки
                </button>

                <div className="toolbar-dropdown-sep" />

                <div className="toolbar-dropdown-label">Высота строки</div>
                <button
                  onClick={() => {
                    const height = prompt(
                      "Введите высоту строки в пикселях (10-500):",
                      "30",
                    );
                    if (height) {
                      const numHeight = Math.max(
                        10,
                        Math.min(500, Number(height)),
                      );
                      if (isNaN(numHeight)) return;
                      getToolbarChain().setRowHeight(numHeight).run();
                      setShowTableEditMenu(false);
                    }
                  }}
                  className="toolbar-dropdown-item"
                >
                  📏 Установить высоту
                </button>
                <button
                  onClick={() => {
                    getToolbarChain().deleteRowHeight().run();
                    setShowTableEditMenu(false);
                  }}
                  className="toolbar-dropdown-item"
                >
                  ↺ Сбросить высоту
                </button>

                <div className="toolbar-dropdown-sep" />

                <button
                  onClick={() => {
                    editor.chain().focus().deleteTable().run();
                    setShowTableEditMenu(false);
                  }}
                  className="toolbar-dropdown-item toolbar-dropdown-item--row-action danger"
                >
                  <IconTrash size="sm" /> Удалить таблицу
                </button>

                {onCreateChartFromTable && (
                  <>
                    <div className="toolbar-dropdown-sep" />
                    <button
                      onClick={() => {
                        // Get the table HTML from the editor
                        const { state } = editor;
                        const { from } = state.selection;
                        let tableNode: ProseMirrorNode | null = null;

                        state.doc.nodesBetween(
                          0,
                          state.doc.content.size,
                          (node, pos) => {
                            if (node?.type?.name === "table") {
                              if (pos <= from && pos + node.nodeSize >= from) {
                                tableNode = node;
                              }
                            }
                          },
                        );

                        if (tableNode) {
                          const div = document.createElement("div");
                          const tableEl = document.createElement("table");
                          const activeTableNode = tableNode as ProseMirrorNode;

                          activeTableNode.forEach((row: ProseMirrorNode) => {
                            const tr = document.createElement("tr");
                            row.forEach((cell: ProseMirrorNode) => {
                              const cellEl = document.createElement(
                                cell?.type?.name === "tableHeader"
                                  ? "th"
                                  : "td",
                              );
                              cellEl.textContent = cell?.textContent || "";
                              tr.appendChild(cellEl);
                            });
                            tableEl.appendChild(tr);
                          });

                          div.appendChild(tableEl);
                          onCreateChartFromTable(div.innerHTML);
                        }
                        setShowTableEditMenu(false);
                      }}
                      className="toolbar-dropdown-item toolbar-dropdown-item--row-action success"
                    >
                      <IconChartBar size="sm" /> Создать график
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Table Cell Color Menu */}
          <div className="toolbar-menu-wrap" ref={tableColorMenuRef}>
            <button
              className="toolbar-btn active-subtle"
              onClick={() => {
                setShowTableColorMenu(!showTableColorMenu);
                setShowTableEditMenu(false);
                setShowTableMenu(false);
              }}
              title="Стиль ячейки (цвет, выравнивание)"
            >
              <IconPaintBrush size="sm" />
            </button>
            {showTableColorMenu && (
              <div className="toolbar-dropdown toolbar-dropdown--table-color">
                <div className="toolbar-dropdown-label">Цвет ячейки</div>
                {CELL_COLORS.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => applyCellColor(color.value)}
                    className="toolbar-dropdown-item toolbar-dropdown-item--color-option"
                  >
                    <span
                      className={`toolbar-cell-color-swatch ${getCellColorSwatchClass(
                        color.value,
                      )}`}
                    />
                    {color.name}
                  </button>
                ))}

                <div className="toolbar-dropdown-sep" />

                <div className="toolbar-dropdown-label">
                  Выравнивание текста в ячейке
                </div>
                <div className="toolbar-align-controls">
                  <button
                    className="toolbar-btn toolbar-align-btn"
                    onClick={() => {
                      editor
                        .chain()
                        .focus()
                        .setCellAttribute("textAlign", "left")
                        .run();
                      setShowTableColorMenu(false);
                    }}
                    title="По левому краю"
                  >
                    <IconBarsLeft size="sm" />
                  </button>
                  <button
                    className="toolbar-btn toolbar-align-btn"
                    onClick={() => {
                      editor
                        .chain()
                        .focus()
                        .setCellAttribute("textAlign", "center")
                        .run();
                      setShowTableColorMenu(false);
                    }}
                    title="По центру"
                  >
                    <IconBarsCenter size="sm" />
                  </button>
                  <button
                    className="toolbar-btn toolbar-align-btn"
                    onClick={() => {
                      editor
                        .chain()
                        .focus()
                        .setCellAttribute("textAlign", "right")
                        .run();
                      setShowTableColorMenu(false);
                    }}
                    title="По правому краю"
                  >
                    <IconBarsRight size="sm" />
                  </button>
                </div>

                <div className="toolbar-dropdown-sep" />

                <div className="toolbar-dropdown-label">
                  Вертикальное выравнивание
                </div>
                <div className="toolbar-align-controls">
                  <button
                    className="toolbar-btn toolbar-align-btn"
                    onClick={() => {
                      editor
                        .chain()
                        .focus()
                        .setCellAttribute("verticalAlign", "top")
                        .run();
                      setShowTableColorMenu(false);
                    }}
                    title="Сверху"
                  >
                    <IconAlignTop size="sm" />
                  </button>
                  <button
                    className="toolbar-btn toolbar-align-btn"
                    onClick={() => {
                      editor
                        .chain()
                        .focus()
                        .setCellAttribute("verticalAlign", "middle")
                        .run();
                      setShowTableColorMenu(false);
                    }}
                    title="По центру"
                  >
                    <IconAlignMiddle size="sm" />
                  </button>
                  <button
                    className="toolbar-btn toolbar-align-btn"
                    onClick={() => {
                      editor
                        .chain()
                        .focus()
                        .setCellAttribute("verticalAlign", "bottom")
                        .run();
                      setShowTableColorMenu(false);
                    }}
                    title="Снизу"
                  >
                    <IconAlignBottom size="sm" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <button
        className={`toolbar-btn${editor.isActive("blockquote") ? " active" : ""}`}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Цитата"
      >
        <IconChatBubbleQuote size="sm" />
      </button>
      <button
        className={`toolbar-btn${editor.isActive("codeBlock") ? " active" : ""}`}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Код"
      >
        <IconCodeBracket size="sm" />
      </button>

      <div className="toolbar-divider" />

      {/* Alignment */}
      <button
        className={`toolbar-btn${editor.isActive({ textAlign: "left" }) ? " active" : ""}`}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        title="По левому краю"
      >
        <IconBarsLeft size="sm" />
      </button>
      <button
        className={`toolbar-btn${editor.isActive({ textAlign: "center" }) ? " active" : ""}`}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        title="По центру"
      >
        <IconBarsCenter size="sm" />
      </button>
      <button
        className={`toolbar-btn${editor.isActive({ textAlign: "right" }) ? " active" : ""}`}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        title="По правому краю"
      >
        <IconBarsRight size="sm" />
      </button>
      <button
        className={`toolbar-btn${editor.isActive({ textAlign: "justify" }) ? " active" : ""}`}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        title="По ширине"
      >
        <IconBarsRight size="sm" />
      </button>

      <div className="toolbar-divider" />

      {/* Citation & Import */}
      {onInsertCitation && (
        <button
          className="toolbar-btn-wide citation"
          onClick={onInsertCitation}
          title="Вставить цитату"
        >
          <IconChatBubbleQuote size="sm" /> Цитата
        </button>
      )}
      {onImportStatistic && (
        <button
          className="toolbar-btn-wide statistic"
          onClick={onImportStatistic}
          title="Импорт графика/таблицы"
        >
          <IconChartBar size="sm" /> Статистика
        </button>
      )}
      {onImportFile && (
        <button
          className="toolbar-btn-wide file-import"
          onClick={onImportFile}
          title="Вставить файл из проекта"
        >
          <IconPhoto size="sm" /> Файл
        </button>
      )}

      {/* Review Mode Toggle */}
      <div className="toolbar-divider" />

      {onToggleReviewMode && (
        <button
          className={`toolbar-btn-wide${reviewMode ? " review-on" : " review-off"}`}
          onClick={onToggleReviewMode}
          title={
            reviewMode
              ? "Отключить режим рецензирования"
              : "Включить режим рецензирования"
          }
        >
          <IconPencil size="sm" />
          {reviewMode ? "Рецензия ВКЛ" : "Рецензия"}
        </button>
      )}

      {/* Add Comment Button (visible in review mode) */}
      {reviewMode && onAddComment && (
        <button
          className="toolbar-btn-wide review-on"
          onClick={onAddComment}
          title="Добавить комментарий к выделенному тексту"
        >
          <IconChatBubbleQuote size="sm" />
          Комментарий
        </button>
      )}

      {/* AI Assistant Button */}
      {onToggleAIAssistant && (
        <>
          <div className="toolbar-divider" />
          <button
            className={`toolbar-btn-wide ai-btn${showAIAssistant ? " active" : ""}`}
            onClick={onToggleAIAssistant}
            title="AI Ассистент — улучшение текста, таблицы, иллюстрации"
          >
            <IconSparkles size="sm" />
            AI
          </button>
        </>
      )}

      {/* Style indicator and page settings */}
      <div className="toolbar-tail">
        {onOpenPageSettings && (
          <button
            className="toolbar-btn"
            onClick={onOpenPageSettings}
            title="Настройки страницы"
          >
            <IconSettings size="sm" />
          </button>
        )}
        <span
          className="toolbar-style-badge"
          title={`Стиль: ${styleConfig.name}\nШрифт: ${styleConfig.fontSize}pt\nИнтервал: ${styleConfig.lineHeight}\nКликните для настройки`}
          onClick={onOpenPageSettings}
        >
          {citationStyle.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
