import React, { useState, useRef, useEffect } from "react";
import { Editor } from "@tiptap/react";
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
}

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

  // Button styles
  const btn = (active = false, color?: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    padding: "0",
    border: "none",
    background: active ? "#4b74ff" : color || "transparent",
    color: active ? "#fff" : "#a9b7da",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "13px",
    fontWeight: 500,
    transition: "all 0.1s",
  });

  const btnWide = (
    color?: string,
    textColor?: string,
  ): React.CSSProperties => ({
    ...btn(false, color),
    width: "auto",
    padding: "0 10px",
    gap: "4px",
    color: textColor || "#a9b7da",
    border: color ? `1px solid ${color}` : "none",
  });

  const divider: React.CSSProperties = {
    width: "1px",
    height: "20px",
    background: "rgba(255,255,255,0.1)",
    margin: "0 4px",
  };

  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    top: "100%",
    left: 0,
    marginTop: "4px",
    background: "#1e293b",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "6px",
    padding: "6px",
    zIndex: 1000,
    minWidth: "160px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
  };

  const dropdownItemStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "6px 10px",
    background: "transparent",
    border: "none",
    color: "#a9b7da",
    fontSize: "12px",
    textAlign: "left",
    cursor: "pointer",
    borderRadius: "4px",
  };

  const insertTable = (rows: number, cols: number) => {
    // Try to use event system first, fall back to direct editor call
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

  // Apply cell background color
  const applyCellColor = (color: string) => {
    if (!color) {
      editor.chain().focus().setCellAttribute("backgroundColor", "").run();
    } else {
      editor.chain().focus().setCellAttribute("backgroundColor", color).run();
    }
    setShowTableColorMenu(false);
  };

  // Check if cursor is in header row
  const isInHeaderRow = () => {
    try {
      const { state } = editor;
      const { $from } = state.selection;
      let isHeader = false;

      // Check if current cell is a tableHeader
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

  return (
    <div className="tiptap-toolbar">
      {hasSidebarToggles && (
        <>
          {hasOutlineToggle && (
            <button
              style={btn(
                !!showOutline,
                showOutline ? "rgba(75,116,255,0.2)" : undefined,
              )}
              onClick={onToggleOutline}
              title="Содержание документа"
            >
              <IconDocumentText size="sm" />
            </button>
          )}

          {hasBibliographyToggle && (
            <button
              style={btn(
                !!showBibliography,
                showBibliography ? "rgba(75,116,255,0.2)" : undefined,
              )}
              onClick={onToggleBibliography}
              title="Список литературы"
            >
              <IconBook size="sm" />
            </button>
          )}

          <div style={divider} />
        </>
      )}

      {/* Text formatting */}
      <button
        style={btn(editor.isActive("bold"))}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Жирный (Ctrl+B)"
      >
        <b>B</b>
      </button>
      <button
        style={btn(editor.isActive("italic"))}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Курсив (Ctrl+I)"
      >
        <i>I</i>
      </button>
      <button
        style={btn(editor.isActive("underline"))}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Подчёркнутый (Ctrl+U)"
      >
        <u>U</u>
      </button>
      <button
        style={btn(editor.isActive("strike"))}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Зачёркнутый"
      >
        <s>S</s>
      </button>

      <div style={divider} />

      {/* Font Size Selector */}
      <select
        value={
          editor.getAttributes("textStyle")?.fontSize?.replace("pt", "") || ""
        }
        onChange={(e) => {
          if (e.target.value) {
            (editor.chain().focus() as any)
              .setFontSize(`${e.target.value}pt`)
              .run();
          } else {
            (editor.chain().focus() as any).unsetFontSize().run();
          }
        }}
        style={{
          background: "#1e293b",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "4px",
          color: "#a9b7da",
          fontSize: "11px",
          padding: "4px 6px",
          cursor: "pointer",
          width: "52px",
        }}
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
        style={{
          background: "#1e293b",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "4px",
          color: "#a9b7da",
          fontSize: "11px",
          padding: "4px 6px",
          cursor: "pointer",
          width: "100px",
        }}
        title="Шрифт"
      >
        <option value="">Шрифт</option>
        {FONT_FAMILIES.map((font) => (
          <option
            key={font.name}
            value={font.value}
            style={{ fontFamily: font.value }}
          >
            {font.name}
          </option>
        ))}
      </select>

      <div style={divider} />

      {/* Headings */}
      <button
        style={btn(editor.isActive("heading", { level: 1 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Заголовок 1"
      >
        H1
      </button>
      <button
        style={btn(editor.isActive("heading", { level: 2 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Заголовок 2"
      >
        H2
      </button>
      <button
        style={btn(editor.isActive("heading", { level: 3 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Заголовок 3"
      >
        H3
      </button>
      <button
        style={btn()}
        onClick={() => (editor.chain().focus() as any).toggleIndent().run()}
        title="Отступ первой строки (Tab)"
      >
        ⇥
      </button>

      <div style={divider} />

      {/* Lists */}
      <button
        style={btn(editor.isActive("bulletList"))}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Маркированный список"
      >
        •
      </button>
      <button
        style={btn(editor.isActive("orderedList"))}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Нумерованный список"
      >
        1.
      </button>

      <div style={divider} />

      {/* Link */}
      <button
        style={btn(editor.isActive("link"))}
        onClick={setLink}
        title="Ссылка"
      >
        <IconLink size="sm" />
      </button>

      {/* Insert Table */}
      <div style={{ position: "relative" }} ref={tableMenuRef}>
        <button
          style={btn()}
          onClick={() => {
            setShowTableMenu(!showTableMenu);
            setShowTableEditMenu(false);
          }}
          title="Вставить таблицу"
        >
          <IconTableCells size="sm" />
        </button>
        {showTableMenu && (
          <div style={dropdownStyle}>
            <div
              style={{
                fontSize: "10px",
                color: "#64748b",
                marginBottom: "4px",
                padding: "0 4px",
              }}
            >
              Вставить таблицу
            </div>
            {[
              [2, 2],
              [3, 3],
              [4, 4],
              [5, 3],
            ].map(([r, c]) => (
              <button
                key={`${r}x${c}`}
                onClick={() => insertTable(r, c)}
                style={dropdownItemStyle}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "rgba(75,116,255,0.2)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
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
          <div style={{ position: "relative" }} ref={tableEditMenuRef}>
            <button
              style={btn(false, "rgba(75,116,255,0.2)")}
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
              <div style={dropdownStyle}>
                {onOpenTableEditor && (
                  <>
                    <button
                      onClick={() => {
                        onOpenTableEditor();
                        setShowTableEditMenu(false);
                      }}
                      style={{
                        ...dropdownItemStyle,
                        color: "#4b74ff",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(75,116,255,0.2)")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <IconArrowsExpand size="sm" /> Редактор таблицы
                    </button>
                    <div
                      style={{
                        height: "1px",
                        background: "rgba(255,255,255,0.1)",
                        margin: "6px 0",
                      }}
                    />
                  </>
                )}
                <div
                  style={{
                    fontSize: "10px",
                    color: "#64748b",
                    marginBottom: "4px",
                    padding: "0 4px",
                  }}
                >
                  Строки
                </div>
                <button
                  onClick={() => {
                    // Защита заголовков - не добавлять строку выше если мы в заголовке
                    if (isInHeaderRow()) {
                      alert("Нельзя добавить строку выше заголовка таблицы");
                      return;
                    }
                    editor.chain().focus().addRowBefore().run();
                    setShowTableEditMenu(false);
                  }}
                  style={{
                    ...dropdownItemStyle,
                    opacity: isInHeaderRow() ? 0.5 : 1,
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "rgba(75,116,255,0.2)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
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
                  style={dropdownItemStyle}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "rgba(75,116,255,0.2)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  ↓ Добавить строку ниже
                </button>
                <button
                  onClick={() => {
                    // Защита заголовков - не удалять строку заголовка
                    if (isInHeaderRow()) {
                      alert("Нельзя удалить строку заголовка таблицы");
                      return;
                    }
                    editor.chain().focus().deleteRow().run();
                    setShowTableEditMenu(false);
                  }}
                  style={{
                    ...dropdownItemStyle,
                    color: "#f87171",
                    opacity: isInHeaderRow() ? 0.5 : 1,
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "rgba(248,113,113,0.2)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                  title={
                    isInHeaderRow() ? "Нельзя удалить строку заголовка" : ""
                  }
                >
                  ✕ Удалить строку {isInHeaderRow() && "🔒"}
                </button>

                <div
                  style={{
                    height: "1px",
                    background: "rgba(255,255,255,0.1)",
                    margin: "6px 0",
                  }}
                />

                <div
                  style={{
                    fontSize: "10px",
                    color: "#64748b",
                    marginBottom: "4px",
                    padding: "0 4px",
                  }}
                >
                  Столбцы
                </div>
                <button
                  onClick={() => {
                    editor.chain().focus().addColumnBefore().run();
                    setShowTableEditMenu(false);
                  }}
                  style={dropdownItemStyle}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "rgba(75,116,255,0.2)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  ← Добавить столбец слева
                </button>
                <button
                  onClick={() => {
                    editor.chain().focus().addColumnAfter().run();
                    setShowTableEditMenu(false);
                  }}
                  style={dropdownItemStyle}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "rgba(75,116,255,0.2)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  → Добавить столбец справа
                </button>
                <button
                  onClick={() => {
                    editor.chain().focus().deleteColumn().run();
                    setShowTableEditMenu(false);
                  }}
                  style={{ ...dropdownItemStyle, color: "#f87171" }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "rgba(248,113,113,0.2)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  ✕ Удалить столбец
                </button>

                <div
                  style={{
                    height: "1px",
                    background: "rgba(255,255,255,0.1)",
                    margin: "6px 0",
                  }}
                />

                <button
                  onClick={() => {
                    editor.chain().focus().mergeCells().run();
                    setShowTableEditMenu(false);
                  }}
                  style={dropdownItemStyle}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "rgba(75,116,255,0.2)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  ⊞ Объединить ячейки
                </button>
                <button
                  onClick={() => {
                    editor.chain().focus().splitCell().run();
                    setShowTableEditMenu(false);
                  }}
                  style={dropdownItemStyle}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "rgba(75,116,255,0.2)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  ⊟ Разделить ячейку
                </button>
                <button
                  onClick={() => {
                    editor.chain().focus().toggleHeaderRow().run();
                    setShowTableEditMenu(false);
                  }}
                  style={dropdownItemStyle}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "rgba(75,116,255,0.2)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  ⊟ Переключить заголовок строки
                </button>
                <button
                  onClick={() => {
                    editor.chain().focus().deleteTable().run();
                    setShowTableEditMenu(false);
                  }}
                  style={{
                    ...dropdownItemStyle,
                    color: "#f87171",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "rgba(248,113,113,0.2)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <IconTrash size="sm" /> Удалить таблицу
                </button>

                {onCreateChartFromTable && (
                  <>
                    <div
                      style={{
                        height: "1px",
                        background: "rgba(255,255,255,0.1)",
                        margin: "6px 0",
                      }}
                    />
                    <button
                      onClick={() => {
                        // Get the table HTML from the editor
                        const { state } = editor;
                        const { from } = state.selection;
                        let tableNode: any = null;

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
                          // Create HTML from the table node
                          const div = document.createElement("div");
                          const tableEl = document.createElement("table");

                          tableNode.content.forEach((row: any) => {
                            const tr = document.createElement("tr");
                            row.content?.forEach((cell: any) => {
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
                      style={{
                        ...dropdownItemStyle,
                        color: "#4ade80",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(74,222,128,0.2)")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <IconChartBar size="sm" /> Создать график
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Table Cell Color Menu */}
          <div style={{ position: "relative" }} ref={tableColorMenuRef}>
            <button
              style={btn(false, "rgba(75,116,255,0.2)")}
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
              <div style={{ ...dropdownStyle, minWidth: "180px" }}>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#64748b",
                    marginBottom: "4px",
                    padding: "0 4px",
                  }}
                >
                  Цвет ячейки
                </div>
                {CELL_COLORS.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => applyCellColor(color.value)}
                    style={{
                      ...dropdownItemStyle,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(75,116,255,0.2)")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <span
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "3px",
                        border: "1px solid rgba(255,255,255,0.2)",
                        background: color.value || "white",
                        display: "inline-block",
                      }}
                    />
                    {color.name}
                  </button>
                ))}

                <div
                  style={{
                    height: "1px",
                    background: "rgba(255,255,255,0.1)",
                    margin: "8px 0",
                  }}
                />

                <div
                  style={{
                    fontSize: "10px",
                    color: "#64748b",
                    marginBottom: "4px",
                    padding: "0 4px",
                  }}
                >
                  Выравнивание текста в ячейке
                </div>
                <div style={{ display: "flex", gap: "4px", padding: "0 4px" }}>
                  <button
                    onClick={() => {
                      editor
                        .chain()
                        .focus()
                        .setCellAttribute("textAlign", "left")
                        .run();
                      setShowTableColorMenu(false);
                    }}
                    style={{ ...btn(), flex: 1 }}
                    title="По левому краю"
                  >
                    <IconBarsLeft size="sm" />
                  </button>
                  <button
                    onClick={() => {
                      editor
                        .chain()
                        .focus()
                        .setCellAttribute("textAlign", "center")
                        .run();
                      setShowTableColorMenu(false);
                    }}
                    style={{ ...btn(), flex: 1 }}
                    title="По центру"
                  >
                    <IconBarsCenter size="sm" />
                  </button>
                  <button
                    onClick={() => {
                      editor
                        .chain()
                        .focus()
                        .setCellAttribute("textAlign", "right")
                        .run();
                      setShowTableColorMenu(false);
                    }}
                    style={{ ...btn(), flex: 1 }}
                    title="По правому краю"
                  >
                    <IconBarsRight size="sm" />
                  </button>
                </div>

                <div
                  style={{
                    height: "1px",
                    background: "rgba(255,255,255,0.1)",
                    margin: "8px 0",
                  }}
                />

                <div
                  style={{
                    fontSize: "10px",
                    color: "#64748b",
                    marginBottom: "4px",
                    padding: "0 4px",
                  }}
                >
                  Вертикальное выравнивание
                </div>
                <div style={{ display: "flex", gap: "4px", padding: "0 4px" }}>
                  <button
                    onClick={() => {
                      editor
                        .chain()
                        .focus()
                        .setCellAttribute("verticalAlign", "top")
                        .run();
                      setShowTableColorMenu(false);
                    }}
                    style={{ ...btn(), flex: 1, fontSize: "10px" }}
                    title="Сверху"
                  >
                    <IconAlignTop size="sm" />
                  </button>
                  <button
                    onClick={() => {
                      editor
                        .chain()
                        .focus()
                        .setCellAttribute("verticalAlign", "middle")
                        .run();
                      setShowTableColorMenu(false);
                    }}
                    style={{ ...btn(), flex: 1, fontSize: "10px" }}
                    title="По центру"
                  >
                    <IconAlignMiddle size="sm" />
                  </button>
                  <button
                    onClick={() => {
                      editor
                        .chain()
                        .focus()
                        .setCellAttribute("verticalAlign", "bottom")
                        .run();
                      setShowTableColorMenu(false);
                    }}
                    style={{ ...btn(), flex: 1, fontSize: "10px" }}
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
        style={btn(editor.isActive("blockquote"))}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Цитата"
      >
        <IconChatBubbleQuote size="sm" />
      </button>
      <button
        style={btn(editor.isActive("codeBlock"))}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Код"
      >
        <IconCodeBracket size="sm" />
      </button>

      <div style={divider} />

      {/* Alignment */}
      <button
        style={btn(editor.isActive({ textAlign: "left" }))}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        title="По левому краю"
      >
        <IconBarsLeft size="sm" />
      </button>
      <button
        style={btn(editor.isActive({ textAlign: "center" }))}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        title="По центру"
      >
        <IconBarsCenter size="sm" />
      </button>
      <button
        style={btn(editor.isActive({ textAlign: "right" }))}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        title="По правому краю"
      >
        <IconBarsRight size="sm" />
      </button>
      <button
        style={btn(editor.isActive({ textAlign: "justify" }))}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        title="По ширине"
      >
        <IconBarsRight size="sm" />
      </button>

      <div style={divider} />

      {/* Citation & Import */}
      {onInsertCitation && (
        <button
          style={{
            ...btnWide("rgba(74,222,128,0.3)", "#4ade80"),
            display: "flex",
            alignItems: "center",
          }}
          onClick={onInsertCitation}
          title="Вставить цитату"
        >
          <IconChatBubbleQuote size="sm" /> Цитата
        </button>
      )}
      {onImportStatistic && (
        <button
          style={{
            ...btnWide("rgba(75,116,255,0.3)", "#4b74ff"),
            display: "flex",
            alignItems: "center",
          }}
          onClick={onImportStatistic}
          title="Импорт графика/таблицы"
        >
          <IconChartBar size="sm" /> Статистика
        </button>
      )}
      {onImportFile && (
        <button
          style={{
            ...btnWide("rgba(168,85,247,0.3)", "#a855f7"),
            display: "flex",
            alignItems: "center",
          }}
          onClick={onImportFile}
          title="Вставить файл из проекта"
        >
          <IconPhoto className="w-3 h-3" size="sm" style={{ marginRight: 4 }} />
          Файл
        </button>
      )}

      {/* Review Mode Toggle */}
      <div style={divider} />

      {onToggleReviewMode && (
        <button
          style={{
            ...btnWide(
              reviewMode
                ? "rgba(251, 191, 36, 0.3)"
                : "rgba(100, 116, 139, 0.2)",
              reviewMode ? "#fbbf24" : "#94a3b8",
            ),
            display: "flex",
            alignItems: "center",
          }}
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
          style={{
            ...btnWide("rgba(251, 191, 36, 0.2)", "#fbbf24"),
            display: "flex",
            alignItems: "center",
          }}
          onClick={onAddComment}
          title="Добавить комментарий к выделенному тексту"
        >
          <IconChatBubbleQuote size="sm" />
          Комментарий
        </button>
      )}

      {/* Style indicator and page settings */}
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {onOpenPageSettings && (
          <button
            style={btn()}
            onClick={onOpenPageSettings}
            title="Настройки страницы"
          >
            <IconSettings size="sm" />
          </button>
        )}
        <span
          className="style-badge"
          style={{
            fontSize: "10px",
            padding: "4px 8px",
            background: "rgba(75,116,255,0.1)",
            borderRadius: "4px",
            color: "#64748b",
            cursor: "pointer",
          }}
          title={`Стиль: ${styleConfig.name}\nШрифт: ${styleConfig.fontSize}pt\nИнтервал: ${styleConfig.lineHeight}\nКликните для настройки`}
          onClick={onOpenPageSettings}
        >
          {citationStyle.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
