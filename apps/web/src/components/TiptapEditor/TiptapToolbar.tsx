import React, { useState, useRef, useEffect } from "react";
import { Editor } from "@tiptap/react";
import type { CitationStyle } from "../../lib/api";
import { STYLE_CONFIGS } from "./TiptapEditor";
import { editorEvents } from "../../lib/editorEvents";

// SVG Icons (Flowbite/Heroicons style)
const DocumentTextIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
    />
  </svg>
);

const BookOpenIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
    />
  </svg>
);

const LinkIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
    />
  </svg>
);

const TableCellsIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125"
    />
  </svg>
);

const CogIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const PaintBrushIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42"
    />
  </svg>
);

const ChatBubbleQuoteIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
    />
  </svg>
);

const CodeBracketIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
    />
  </svg>
);

const ChartBarIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
    />
  </svg>
);

const ArrowsPointingOutIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
    />
  </svg>
);

const TrashIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
);

const Bars3BottomLeftIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"
    />
  </svg>
);

const Bars3CenterIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6.75h16.5M3.75 12h16.5M6.75 17.25h10.5"
    />
  </svg>
);

const Bars3BottomRightIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
    />
  </svg>
);

const ArrowRightOnRectIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
    />
  </svg>
);

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
              <DocumentTextIcon />
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
              <BookOpenIcon />
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
        <LinkIcon />
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
          <TableCellsIcon />
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
              <CogIcon />
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
                      <ArrowsPointingOutIcon /> Редактор таблицы
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
                  <TrashIcon /> Удалить таблицу
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
                      <ChartBarIcon /> Создать график
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
              <PaintBrushIcon />
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
                    <Bars3BottomLeftIcon />
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
                    <Bars3CenterIcon />
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
                    <Bars3BottomRightIcon />
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
                    <svg
                      width={12}
                      height={12}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l7.5-7.5 7.5 7.5m-15 6l7.5-7.5 7.5 7.5"
                      />
                    </svg>
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
                    <svg
                      width={12}
                      height={12}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 9h16.5m-16.5 6.75h16.5"
                      />
                    </svg>
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
                    <svg
                      width={12}
                      height={12}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 5.25l-7.5 7.5-7.5-7.5m15 6l-7.5 7.5-7.5-7.5"
                      />
                    </svg>
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
        <ChatBubbleQuoteIcon />
      </button>
      <button
        style={btn(editor.isActive("codeBlock"))}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Код"
      >
        <CodeBracketIcon />
      </button>

      <div style={divider} />

      {/* Alignment */}
      <button
        style={btn(editor.isActive({ textAlign: "left" }))}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        title="По левому краю"
      >
        <Bars3BottomLeftIcon />
      </button>
      <button
        style={btn(editor.isActive({ textAlign: "center" }))}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        title="По центру"
      >
        <Bars3CenterIcon />
      </button>
      <button
        style={btn(editor.isActive({ textAlign: "right" }))}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        title="По правому краю"
      >
        <Bars3BottomRightIcon />
      </button>
      <button
        style={btn(editor.isActive({ textAlign: "justify" }))}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        title="По ширине"
      >
        <Bars3BottomRightIcon />
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
          <ChatBubbleQuoteIcon size={12} /> Цитата
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
          <ChartBarIcon size={12} /> Статистика
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
          <svg
            style={{ width: 12, height: 12, marginRight: 4 }}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
            />
          </svg>
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
          <svg
            width={12}
            height={12}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
            />
          </svg>
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
          <svg
            width={12}
            height={12}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
            />
          </svg>
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
            <CogIcon />
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
