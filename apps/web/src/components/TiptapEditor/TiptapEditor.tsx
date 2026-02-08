import React, {
  useEffect,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useRef,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { CustomTable } from "./extensions/CustomTable";
import { CustomTableRow } from "./extensions/CustomTableRow";
import { CustomTableCell } from "./extensions/CustomTableCell";
import { CustomTableHeader } from "./extensions/CustomTableHeader";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Paragraph from "@tiptap/extension-paragraph";
import { PaginationPlus } from "tiptap-pagination-plus";
import FontFamily from "@tiptap/extension-font-family";
import { FontSize } from "./extensions/FontSize";

import TiptapToolbar from "./TiptapToolbar";
import DocumentOutline from "./DocumentOutline";
import BibliographySidebar from "./BibliographySidebar";
import PageSettingsModal, { type PageSettings } from "./PageSettingsModal";
import { editorEvents } from "../../lib/editorEvents";
import {
  ChartNode,
  insertChartIntoEditor,
  type ChartNodeAttrs,
} from "./extensions/ChartNode";
import { CitationMark, type CitationAttrs } from "./extensions/CitationMark";
import { TableFigureNumbering } from "./extensions/TableFigureNumbering";
import {
  ProjectFileNode,
  insertFileIntoEditor,
  getFileIdsFromEditor,
  type ProjectFileNodeAttrs,
} from "./extensions/ProjectFileNode";
import { CommentMark, type CommentAttrs } from "./extensions/CommentMark";
import {
  TrackChangesMark,
  type TrackChangeAttrs,
} from "./extensions/TrackChangesMark";
import StatisticEditModal from "../StatisticEditModal";
import TableEditorModal, {
  type TableEditorPayload,
} from "./TableEditorModal";
import type { ProjectStatistic, DataClassification } from "../../lib/api";
import type { TableData, ChartConfig } from "../ChartFromTable";
import { IconChatBubbleQuote, IconClose, IconPlus } from "../FlowbiteIcons";
import "./TiptapEditor.css";

import type { CitationStyle } from "../../lib/api";
import type { Citation } from "../../lib/api";

// Custom Paragraph extension with indent support
const CustomParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      indent: {
        default: false,
        parseHTML: (element: HTMLElement) =>
          element.classList.contains("indent"),
        renderHTML: (attributes: any) => {
          if (!attributes.indent) {
            return {};
          }
          return {
            class: "indent",
          };
        },
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      toggleIndent:
        () =>
        ({ commands }: any) => {
          return commands.updateAttributes("paragraph", {
            indent: (attrs: any) => !attrs.indent,
          });
        },
      setIndent:
        (indent: boolean) =>
        ({ commands }: any) => {
          return commands.updateAttributes("paragraph", { indent });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      Tab: () => (this.editor.commands as any).toggleIndent(),
      "Shift-Tab": () => (this.editor.commands as any).setIndent(false),
    };
  },
});

// Style configurations for different citation formats
export const STYLE_CONFIGS = {
  gost: {
    name: "ГОСТ Р 7.0.5-2008",
    pageWidth: 794, // A4 at 96 DPI
    pageHeight: 1123,
    marginTop: 76, // 20mm
    marginBottom: 76, // 20mm
    marginLeft: 95, // 25mm (for binding)
    marginRight: 38, // 10mm
    fontSize: 14,
    lineHeight: 1.5,
    paragraphIndent: "1.25cm",
    fontFamily: "'Times New Roman', Times, serif",
    textAlign: "justify",
    pageNumberPosition: "center-top",
  },
  "gost-r-7-0-5-2008": {
    name: "ГОСТ Р 7.0.5-2008",
    pageWidth: 794, // A4 at 96 DPI
    pageHeight: 1123,
    marginTop: 76, // 20mm
    marginBottom: 76, // 20mm
    marginLeft: 95, // 25mm (for binding)
    marginRight: 38, // 10mm
    fontSize: 14,
    lineHeight: 1.5,
    paragraphIndent: "1.25cm",
    fontFamily: "'Times New Roman', Times, serif",
    textAlign: "justify",
    pageNumberPosition: "center-top",
  },
  vancouver: {
    name: "Vancouver",
    pageWidth: 794,
    pageHeight: 1123,
    marginTop: 72, // ~19mm standard
    marginBottom: 72,
    marginLeft: 72,
    marginRight: 72,
    fontSize: 12,
    lineHeight: 2.0,
    paragraphIndent: "0",
    fontFamily: "'Times New Roman', Times, serif",
    textAlign: "left",
    pageNumberPosition: "right-top",
  },
  apa: {
    name: "APA 7th Edition",
    pageWidth: 794,
    pageHeight: 1123,
    marginTop: 97, // 2.54cm = 1 inch
    marginBottom: 97,
    marginLeft: 97,
    marginRight: 97,
    fontSize: 12,
    lineHeight: 2.0,
    paragraphIndent: "1.27cm",
    fontFamily: "'Times New Roman', Times, serif",
    textAlign: "left",
    pageNumberPosition: "right-top",
  },
} as const;

const PAGE_GAP = 24;

export type ChartData = {
  id: string;
  config: any;
  table_data: any;
};

type EditorHeading = {
  level: number;
  text: string;
  id: string;
};

interface TiptapEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  onInsertCitation?: () => void;
  onImportStatistic?: () => void;
  onImportFile?: () => void;
  onCreateChartFromTable?: (tableHtml: string) => void;
  onRemoveCitation?: (citationId: string) => void;
  onUpdateCitationNote?: (citationId: string, note: string) => void;
  onTableCreated?: (tableData: {
    rows: number;
    cols: number;
    data: any[][];
  }) => Promise<string | undefined>;
  onLoadStatistic?: (statId: string) => Promise<ProjectStatistic | null>;
  onSaveStatistic?: (
    statId: string | null,
    data: {
      title?: string;
      description?: string;
      config?: Record<string, any>;
      tableData?: TableData;
      dataClassification?: DataClassification;
      chartType?: string;
    },
  ) => Promise<string | null>;
  citations?: Citation[];
  citationStyle?: CitationStyle;
  editable?: boolean;
  projectId?: string;
  onHeadingsChange?: (headings: EditorHeading[]) => void;
  showLegacySidebars?: boolean;
}

type StatEditorState = {
  statistic: ProjectStatistic;
  tablePos: number;
  tableNodeSize: number;
  colWidths?: number[];
  rowHeights?: number[];
};

export interface TiptapEditorHandle {
  /** Force set content in the editor (bypasses internal state comparison) */
  forceSetContent: (html: string) => void;
  /** Get current editor HTML */
  getHTML: () => string;
  /** Insert a project file into the editor */
  insertFile: (attrs: ProjectFileNodeAttrs) => boolean;
  /** Get all file IDs used in the document */
  getFileIds: () => string[];
  /** Scroll to a heading in the editor */
  scrollToHeading: (headingId: string) => void;
  /** Remove a citation node from the editor by its ID */
  removeCitationById: (citationId: string) => boolean;
}

const TiptapEditor = forwardRef<TiptapEditorHandle, TiptapEditorProps>(
  function TiptapEditor(
    {
      content = "",
      onChange,
      onInsertCitation,
      onImportStatistic,
      onImportFile,
      onCreateChartFromTable,
      onRemoveCitation,
      onUpdateCitationNote,
      onTableCreated,
      onLoadStatistic,
      onSaveStatistic,
      citations = [],
      citationStyle = "gost",
      editable = true,
      projectId,
      onHeadingsChange,
      showLegacySidebars = true,
    }: TiptapEditorProps,
    ref,
  ) {
    const [showOutline, setShowOutline] = useState(false);
    const [showBibliography, setShowBibliography] = useState(false);
    const [showPageSettings, setShowPageSettings] = useState(false);
    const [reviewMode, setReviewMode] = useState(false);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [statEditorState, setStatEditorState] =
      useState<StatEditorState | null>(null);
    const [showTableEditor, setShowTableEditor] = useState(false);
    const [tableEditorData, setTableEditorData] = useState<{
      data: string[][];
      colWidths?: number[];
      rowHeights?: number[];
      pos: number;
      nodeSize: number;
    } | null>(null);
    const [headings, setHeadings] = useState<EditorHeading[]>([]);
    const [currentStyle, setCurrentStyle] =
      useState<CitationStyle>(citationStyle);
    const [editorError, setEditorError] = useState<string | null>(null);
    const editorInitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );
    const styleConfig = STYLE_CONFIGS[currentStyle] || STYLE_CONFIGS.gost;

    // Custom page settings (can override style defaults)
    const [pageSettings, setPageSettings] = useState<PageSettings>({
      marginTop: styleConfig.marginTop,
      marginBottom: styleConfig.marginBottom,
      marginLeft: styleConfig.marginLeft,
      marginRight: styleConfig.marginRight,
      fontSize: styleConfig.fontSize,
      lineHeight: styleConfig.lineHeight,
      paragraphIndent: styleConfig.paragraphIndent,
      fontFamily: styleConfig.fontFamily,
      textAlign: styleConfig.textAlign,
    });

    // Update page settings when citation style changes
    useEffect(() => {
      const config = STYLE_CONFIGS[citationStyle] || STYLE_CONFIGS.gost;
      setCurrentStyle(citationStyle);
      setPageSettings({
        marginTop: config.marginTop,
        marginBottom: config.marginBottom,
        marginLeft: config.marginLeft,
        marginRight: config.marginRight,
        fontSize: config.fontSize,
        lineHeight: config.lineHeight,
        paragraphIndent: config.paragraphIndent,
        fontFamily: config.fontFamily,
        textAlign: config.textAlign,
      });
    }, [citationStyle]);

    // Создаём расширения по одному с проверкой
    const extensions = useMemo(() => {
      const extList: any[] = [];

      // StarterKit
      try {
        const starterKit = StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          paragraph: false,
          link: false,
          underline: false,
        });
        if (starterKit) extList.push(starterKit);
      } catch (e) {
        console.error("TiptapEditor: Failed to configure StarterKit", e);
      }

      // CustomParagraph
      if (CustomParagraph) extList.push(CustomParagraph);

      // TextAlign
      try {
        const textAlign = TextAlign.configure({
          types: ["heading", "paragraph"],
          alignments: ["left", "center", "right", "justify"],
        });
        if (textAlign) extList.push(textAlign);
      } catch (e) {
        console.error("TiptapEditor: Failed to configure TextAlign", e);
      }

      // Image
      try {
        const image = Image.configure({
          HTMLAttributes: { class: "tiptap-image" },
        });
        if (image) extList.push(image);
      } catch (e) {
        console.error("TiptapEditor: Failed to configure Image", e);
      }

      // Placeholder
      try {
        const placeholder = Placeholder.configure({
          placeholder: "Начните писать...",
        });
        if (placeholder) extList.push(placeholder);
      } catch (e) {
        console.error("TiptapEditor: Failed to configure Placeholder", e);
      }

      // CustomTable
      try {
        const customTable = CustomTable.configure({
          resizable: true,
          allowTableNodeSelection: true,
          lastColumnResizable: true,
          cellMinWidth: 50,
          renderWrapper: true,
          HTMLAttributes: { class: "tiptap-table" },
        });
        if (customTable) extList.push(customTable);
      } catch (e) {
        console.error("TiptapEditor: Failed to configure CustomTable", e);
      }

      // Simple extensions
      if (CustomTableRow) extList.push(CustomTableRow);
      if (CustomTableCell) extList.push(CustomTableCell);
      if (CustomTableHeader) extList.push(CustomTableHeader);
      if (TextStyle) extList.push(TextStyle);
      if (Color) extList.push(Color);
      if (FontFamily) extList.push(FontFamily);
      if (FontSize) extList.push(FontSize);

      // Highlight
      try {
        const highlight = Highlight.configure({ multicolor: true });
        if (highlight) extList.push(highlight);
      } catch (e) {
        console.error("TiptapEditor: Failed to configure Highlight", e);
      }

      // Custom extensions
      if (ChartNode) extList.push(ChartNode);
      if (CitationMark) extList.push(CitationMark);
      if (TableFigureNumbering) extList.push(TableFigureNumbering);
      if (ProjectFileNode) extList.push(ProjectFileNode);
      if (Underline) extList.push(Underline);
      if (CommentMark) extList.push(CommentMark);
      if (TrackChangesMark) extList.push(TrackChangesMark);

      // Link
      try {
        const link = Link.configure({
          openOnClick: false,
          HTMLAttributes: { class: "tiptap-link" },
        });
        if (link) extList.push(link);
      } catch (e) {
        console.error("TiptapEditor: Failed to configure Link", e);
      }

      // PaginationPlus
      try {
        const pagination = PaginationPlus.configure({
          pageHeight: styleConfig.pageHeight,
          pageWidth: styleConfig.pageWidth,
          pageGap: PAGE_GAP,
          marginTop: styleConfig.marginTop,
          marginRight: styleConfig.marginRight,
          marginBottom: styleConfig.marginBottom,
          marginLeft: styleConfig.marginLeft,
          headerRight: citationStyle === "gost" ? "" : "{page}",
          headerLeft: "",
          footerRight: "",
          footerLeft: citationStyle === "gost" ? "{page}" : "",
          pageBreakBackground: "#4a5568",
        });
        if (pagination) extList.push(pagination);
      } catch (e) {
        console.error("TiptapEditor: Failed to configure PaginationPlus", e);
      }

      return extList;
    }, [citationStyle, styleConfig]);

    // Deduplicate extensions by name to avoid TipTap warnings
    const uniqueExtensions = useMemo(() => {
      const seen = new Set<string>();
      const result: any[] = [];

      for (const ext of extensions) {
        // Skip null/undefined
        if (ext == null) {
          console.warn("TiptapEditor: Skipping null/undefined extension");
          continue;
        }

        // Check if ext is a valid extension object
        if (typeof ext !== "object") {
          console.warn("TiptapEditor: Skipping non-object extension:", ext);
          continue;
        }

        // Get the name safely
        const extName = ext.name;

        // If no name, include it (some extensions might not have names)
        if (!extName) {
          result.push(ext);
          continue;
        }

        // Skip duplicates
        if (seen.has(extName)) {
          continue;
        }

        seen.add(extName);
        result.push(ext);
      }

      return result;
    }, [extensions]);

    // Track content changes for headings update
    const [editorUpdateCount, setEditorUpdateCount] = useState(0);

    const editor = useEditor({
      extensions: uniqueExtensions,
      content,
      editable,
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        onChange?.(html);
        // Trigger headings update via state change
        setEditorUpdateCount((c) => c + 1);
      },
    });

    // ===========================
    // Table external editor helpers
    // ===========================
    const getSelectedTableInfo = useCallback(() => {
      if (!editor) return null;
      try {
        const { state } = editor;
        const { $from } = state.selection;
        for (let depth = $from.depth; depth > 0; depth--) {
          const node = $from.node(depth);
          if (node?.type?.name === "table") {
            const pos = $from.before(depth);
            const dom = editor.view.nodeDOM(pos) as HTMLElement | null;
            return { node, pos, dom };
          }
        }
      } catch (err) {
        console.error("Error getting table info:", err);
      }
      return null;
    }, [editor]);

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const buildTableHtml = (
      data: string[][],
      widths?: number[],
      statisticId?: string | null,
      rowHeights?: number[],
    ) => {
      const cols = data.reduce((m, r) => Math.max(m, r.length), 0);
      let html = '<table class="tiptap-table"';
      if (statisticId) {
        html += ` data-statistic-id="${statisticId}"`;
      }
      html += ">";

      html += "<colgroup>";
      for (let c = 0; c < cols; c++) {
        const w = widths?.[c];
        const px = w ? Math.max(40, Math.round(w)) : 100;
        html += `<col style="width: ${px}px;" />`;
      }
      html += "</colgroup>";

      data.forEach((row, rowIdx) => {
        const rowHeight = rowHeights?.[rowIdx];
        const styleAttr = rowHeight ? ` style="height: ${rowHeight}px;"` : "";
        html += `<tr${styleAttr}>`;
        for (let c = 0; c < cols; c++) {
          const text = row[c] ?? "";
          const tag = rowIdx === 0 ? "th" : "td";
          const w = widths?.[c];
          const cwAttr = w ? ` colwidth="${Math.max(40, Math.round(w))}"` : "";
          html += `<${tag}${cwAttr}><p>${escapeHtml(text)}</p></${tag}>`;
        }
        html += "</tr>";
      });

      html += "</table>";
      return html;
    };

    const handleOpenTableEditor = useCallback(async () => {
      if (!editor || !editor.view) {
        alert("Редактор ещё не готов");
        return;
      }

      const info = getSelectedTableInfo();
      if (!info) {
        alert("Курсор должен быть внутри таблицы");
        return;
      }

      const { node, pos, dom } = info;
      const rowsData: string[][] = [];
      const colWidths: number[] = [];
      const rowHeights: number[] = [];

      node.forEach((rowNode: any) => {
        if (rowNode?.type?.name === "tableRow") {
          const rowArr: string[] = [];
          const rowHeight = rowNode.attrs?.rowHeight;
          if (rowHeight) {
            rowHeights.push(rowHeight);
          }
          rowNode.forEach((cellNode: any, colIdx: number) => {
            if (
              cellNode?.type?.name === "tableCell" ||
              cellNode?.type?.name === "tableHeader"
            ) {
              rowArr.push(cellNode.textContent || "");
              const cw = cellNode.attrs?.colwidth?.[0];
              if (cw) {
                colWidths[colIdx] = cw;
              }
            }
          });
          rowsData.push(rowArr);
        }
      });

      // Open table editor modal
      setTableEditorData({
        data: rowsData,
        colWidths: colWidths.length > 0 ? colWidths : undefined,
        rowHeights: rowHeights.length > 0 ? rowHeights : undefined,
        pos,
        nodeSize: node.nodeSize,
      });
      setShowTableEditor(true);
    }, [editor, getSelectedTableInfo]);

    const handleSaveTableEditor = useCallback(
      (payload: TableEditorPayload) => {
        if (!editor || !tableEditorData) return;

        const { pos, nodeSize } = tableEditorData;
        const html = buildTableHtml(
          [payload.data[0], ...payload.data.slice(1)] || [],
          payload.colWidths,
          null,
          payload.rowHeights,
        );

        editor
          .chain()
          .focus()
          .setTextSelection({ from: pos, to: pos + nodeSize })
          .insertContent(html)
          .run();

        setShowTableEditor(false);
        setTableEditorData(null);
      },
      [editor, tableEditorData],
    );

    const handleSaveStatisticEditor = useCallback(
      async (updates: {
        title?: string;
        description?: string;
        config?: Record<string, any>;
        tableData?: TableData;
        dataClassification?: DataClassification;
        chartType?: string;
      }) => {
        if (!editor || !statEditorState) return;

        const { statistic, tablePos, tableNodeSize, colWidths, rowHeights } =
          statEditorState;
        const currentTableData =
          updates.tableData || (statistic.table_data as TableData);
        const dataArray = [
          currentTableData.headers || [],
          ...(currentTableData.rows || []),
        ];

        let statisticId = statistic.id || null;
        if (onSaveStatistic) {
          try {
            statisticId = await onSaveStatistic(statisticId, {
              title: updates.title || statistic.title,
              description: updates.description || statistic.description,
              config:
                updates.config || (statistic.config as Record<string, any>),
              tableData: currentTableData,
              dataClassification:
                updates.dataClassification || statistic.data_classification,
              chartType: updates.chartType || statistic.chart_type || "bar",
            });
          } catch (e) {
            console.error("Failed to save statistic", e);
          }
        }

        const html = buildTableHtml(
          dataArray,
          colWidths,
          statisticId || statistic.id || null,
          rowHeights,
        );

        editor
          .chain()
          .focus()
          .setTextSelection({ from: tablePos, to: tablePos + tableNodeSize })
          .insertContent(html)
          .run();

        setStatEditorState(null);
      },
      [editor, onSaveStatistic, statEditorState],
    );

    // Extract headings from document for outline
    const updateHeadings = useCallback(
      (editorInstance: any) => {
        if (!editorInstance) return;

        const doc = editorInstance.state.doc;
        const newHeadings: EditorHeading[] = [];

        doc.descendants((node: any, pos: number) => {
          if (node?.type?.name === "heading") {
            const id = `heading-${pos}`;
            newHeadings.push({
              level: node.attrs?.level || 1,
              text: node.textContent || "",
              id,
            });
          }
        });
        setHeadings(newHeadings);
        onHeadingsChange?.(newHeadings);
      },
      [onHeadingsChange],
    );

    const scrollToHeading = useCallback(
      (headingId: string) => {
        if (!editor) return;

        const pos = parseInt(headingId.replace("heading-", ""));
        editor.chain().focus().setTextSelection(pos).run();

        // Scroll the heading into view
        setTimeout(() => {
          const view = editor.view;
          const coords = view.coordsAtPos(pos);
          const editorWrapper = document.querySelector(
            ".tiptap-content-wrapper",
          );
          if (editorWrapper && coords) {
            const wrapperRect = editorWrapper.getBoundingClientRect();
            editorWrapper.scrollTo({
              top:
                editorWrapper.scrollTop + (coords.top - wrapperRect.top) - 100,
              behavior: "smooth",
            });
          }
        }, 10);
      },
      [editor],
    );

    // Expose imperative methods to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        forceSetContent: (html: string) => {
          if (editor) {
            editor.commands.setContent(html);
            updateHeadings(editor);
          }
        },
        getHTML: () => editor?.getHTML() || "",
        insertFile: (attrs: ProjectFileNodeAttrs) => {
          if (editor && !editor.isDestroyed) {
            return insertFileIntoEditor(editor, attrs);
          }
          return false;
        },
        getFileIds: () => {
          if (editor && !editor.isDestroyed) {
            return getFileIdsFromEditor(editor);
          }
          return [];
        },
        scrollToHeading: (headingId: string) => {
          scrollToHeading(headingId);
        },
        removeCitationById: (citationId: string) => {
          if (editor && !editor.isDestroyed) {
            return (editor.commands as any).removeCitationById(citationId);
          }
          return false;
        },
      }),
      [editor, updateHeadings, scrollToHeading],
    );

    // Register global insert functions
    useEffect(() => {
      if (!editor) return;

      // Insert citation function
      const insertCitation = (citationAttrs: CitationAttrs) => {
        if (!editor.isEditable || !editor.view || editor.isDestroyed) {
          console.warn("Editor is not ready for citation insertion");
          return;
        }
        editor.commands.setCitation(citationAttrs);
      };

      // Insert chart function - uses the new ChartNode extension
      // If we're inside a table, insert AFTER the table
      const insertChart = (chartData: ChartData) => {
        if (!editor.isEditable || !editor.view || editor.isDestroyed) {
          console.warn("Editor is not ready for chart insertion");
          return;
        }

        const attrs: ChartNodeAttrs = {
          chartId: chartData.id || `chart_${Date.now()}`,
          tableData: chartData.table_data,
          config: chartData.config,
          title: chartData.config?.title,
        };

        // Check if we're inside a table
        const { state } = editor;
        const { $from } = state.selection;
        let tableEndPos = -1;

        // Find if we're inside a table and get its end position
        for (let depth = $from.depth; depth > 0; depth--) {
          const node = $from.node(depth);
          if (node?.type?.name === "table") {
            // Found a table, get its end position
            const tableStart = $from.before(depth);
            tableEndPos = tableStart + node.nodeSize;
            break;
          }
        }

        if (tableEndPos > 0) {
          // We're inside a table - insert chart after the table
          editor
            .chain()
            .focus()
            .setTextSelection(tableEndPos)
            .insertContent({ type: "chartNode", attrs })
            .run();
        } else {
          // Not in a table, insert at current position
          insertChartIntoEditor(editor, attrs);
        }
      };

      // Insert table function - improved version
      const insertTable = (
        tableData: { headers: string[]; rows: string[][] },
        title?: string,
        statisticId?: string,
      ) => {
        if (!editor.isEditable || !editor.view || editor.isDestroyed) {
          console.warn("Editor is not ready for table insertion");
          return;
        }

        // Validate data
        const headers = tableData.headers || [];
        const dataRows = tableData.rows || [];

        if (headers.length === 0 && dataRows.length === 0) {
          console.warn("No table data to insert");
          return;
        }

        const numCols = headers.length || dataRows[0]?.length || 3;
        const numRows = dataRows.length + 1; // +1 for header row

        // Build table HTML manually for more reliable insertion
        let tableHtml = '<table class="tiptap-table"';
        if (statisticId) {
          tableHtml += ` data-statistic-id="${statisticId}"`;
        }
        tableHtml += ">";

        // Header row
        tableHtml += "<tr>";
        for (let i = 0; i < numCols; i++) {
          const headerText = headers[i] || `Колонка ${i + 1}`;
          tableHtml += `<th><p>${headerText}</p></th>`;
        }
        tableHtml += "</tr>";

        // Data rows
        for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
          const row = dataRows[rowIdx] || [];
          tableHtml += "<tr>";
          for (let colIdx = 0; colIdx < numCols; colIdx++) {
            const cellText = row[colIdx] || "";
            tableHtml += `<td><p>${cellText}</p></td>`;
          }
          tableHtml += "</tr>";
        }

        tableHtml += "</table>";

        // Insert the table
        editor.chain().focus().insertContent(tableHtml).run();
      };

      // Subscribe to editor events using the event system
      const unsubCitation = editorEvents.on<CitationAttrs>(
        "insertCitation",
        insertCitation,
      );
      const unsubChart = editorEvents.on<ChartData>("insertChart", insertChart);
      const unsubTable = editorEvents.on<{
        headers: string[];
        rows: string[][];
        title?: string;
        statisticId?: string;
      }>("insertTable", (data) =>
        insertTable(data, data.title, data.statisticId),
      );

      // Backward compatibility: also set window functions during migration
      (window as any).__editorInsertCitation = insertCitation;
      (window as any).__editorInsertChart = insertChart;
      (window as any).__editorInsertTable = insertTable;

      return () => {
        unsubCitation();
        unsubChart();
        unsubTable();
        delete (window as any).__editorInsertCitation;
        delete (window as any).__editorInsertChart;
        delete (window as any).__editorInsertTable;
      };
    }, [editor]);

    // Hover highlighting: citation [n] in editor ↔ sidebar bibliography item
    useEffect(() => {
      if (!editor) return;
      const editorDom = editor.view.dom;

      const handleMouseOver = (e: Event) => {
        const target = (e.target as HTMLElement).closest?.(".citation-ref");
        if (target) {
          const citationId = target.getAttribute("data-citation-id");
          if (citationId) {
            // Highlight corresponding sidebar item
            document
              .querySelectorAll(`[data-sidebar-citation-id="${citationId}"]`)
              .forEach((el) => el.classList.add("sidebar-hover-highlight"));
          }
        }
      };

      const handleMouseOut = (e: Event) => {
        const target = (e.target as HTMLElement).closest?.(".citation-ref");
        if (target) {
          const citationId = target.getAttribute("data-citation-id");
          if (citationId) {
            document
              .querySelectorAll(`[data-sidebar-citation-id="${citationId}"]`)
              .forEach((el) => el.classList.remove("sidebar-hover-highlight"));
          }
        }
      };

      editorDom.addEventListener("mouseover", handleMouseOver);
      editorDom.addEventListener("mouseout", handleMouseOut);

      return () => {
        editorDom.removeEventListener("mouseover", handleMouseOver);
        editorDom.removeEventListener("mouseout", handleMouseOut);
      };
    }, [editor]);

    // Row height resize: drag bottom edge of table cells to change row height
    useEffect(() => {
      if (!editor) return;
      const editorDom = editor.view.dom;
      const EDGE_ZONE = 5; // px from bottom edge to trigger resize
      let resizing = false;
      let startY = 0;
      let startHeight = 0;
      let targetRow: HTMLTableRowElement | null = null;

      const handleMouseDown = (e: MouseEvent) => {
        const cell = (e.target as HTMLElement).closest?.(
          "td, th",
        ) as HTMLTableCellElement | null;
        if (!cell) return;
        const rect = cell.getBoundingClientRect();
        if (rect.bottom - e.clientY > EDGE_ZONE) return;

        // Start resizing
        e.preventDefault();
        resizing = true;
        targetRow = cell.closest("tr");
        if (!targetRow) return;
        startY = e.clientY;
        startHeight = targetRow.offsetHeight;
        document.body.style.cursor = "row-resize";
        document.body.style.userSelect = "none";
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (resizing && targetRow) {
          const delta = e.clientY - startY;
          const newHeight = Math.max(24, startHeight + delta);
          targetRow.style.height = `${newHeight}px`;
          // Apply to all cells in the row
          targetRow.querySelectorAll("td, th").forEach((c) => {
            (c as HTMLElement).style.height = `${newHeight}px`;
          });
          return;
        }
        // Show row-resize cursor near bottom edge of cells
        const cell = (e.target as HTMLElement).closest?.(
          "td, th",
        ) as HTMLTableCellElement | null;
        if (cell) {
          const rect = cell.getBoundingClientRect();
          if (rect.bottom - e.clientY <= EDGE_ZONE) {
            cell.style.cursor = "row-resize";
          } else {
            cell.style.cursor = "";
          }
        }
      };

      const handleMouseUp = () => {
        if (resizing) {
          resizing = false;
          targetRow = null;
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
        }
      };

      editorDom.addEventListener("mousedown", handleMouseDown);
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        editorDom.removeEventListener("mousedown", handleMouseDown);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }, [editor]);

    // Update content when prop changes
    useEffect(() => {
      if (editor && content && editor.getHTML() !== content) {
        editor.commands.setContent(content);
        updateHeadings(editor);
      }
    }, [content, editor, updateHeadings]);

    // Update headings whenever editor content changes
    useEffect(() => {
      if (editor && editorUpdateCount > 0) {
        updateHeadings(editor);
      }
    }, [editor, editorUpdateCount, updateHeadings]);

    // Update pagination settings when citation style changes
    useEffect(() => {
      if (!editor) return;

      try {
        (editor.chain() as any)
          .updateMargins({
            top: styleConfig.marginTop,
            bottom: styleConfig.marginBottom,
            left: styleConfig.marginLeft,
            right: styleConfig.marginRight,
          })
          .run();
      } catch (e) {
        console.warn("Failed to update margins:", e);
      }
    }, [citationStyle, editor, styleConfig]);

    // Auto-save newly created tables to Statistics - only when created via toolbar
    useEffect(() => {
      if (!editor || !onTableCreated) return;

      const createTableHandler = async (rows: number, cols: number) => {
        // Insert table first
        editor
          .chain()
          .focus()
          .insertTable({ rows, cols, withHeaderRow: true })
          .run();

        // Wait for DOM update and additional render cycles
        await new Promise((resolve) => setTimeout(resolve, 250));

        // Find the newly created table without data-statistic-id
        const { state } = editor;
        const { $from } = state.selection;

        // Find parent table
        for (let depth = $from.depth; depth > 0; depth--) {
          const node = $from.node(depth);
          if (node?.type?.name === "table") {
            const pos = $from.before(depth);
            const tableElement = editor.view.nodeDOM(pos) as HTMLElement;

            // CRITICAL FIX: Ensure all col elements have width for resize to work
            if (tableElement) {
              const colgroup = tableElement.querySelector("colgroup");
              const colElements = tableElement.querySelectorAll("col");
              const headerCells = tableElement.querySelectorAll(
                "thead th, tbody tr:first-child th",
              );

              // If colgroup doesn't exist or is incomplete, create/fix it
              if (
                !colgroup ||
                colElements.length === 0 ||
                colElements.length < headerCells.length
              ) {
                // Ensure each column has a width so resize stays stable
                colElements.forEach((col, idx) => {
                  const currentWidth = col.style.width;
                  if (
                    !currentWidth ||
                    currentWidth === "auto" ||
                    currentWidth === "0px"
                  ) {
                    // Set a default width if none exists
                    const headerCell = headerCells[idx] as HTMLElement;
                    const cellWidth = headerCell?.offsetWidth || 100;
                    col.style.width = `${cellWidth}px`;
                  }
                });
              }
            }

            // Only process if no data-statistic-id
            if (
              tableElement &&
              !tableElement.hasAttribute("data-statistic-id")
            ) {
              // Extract table data
              const tableRows: string[][] = [];
              let tableCols = 0;

              node.forEach((rowNode: any) => {
                if (rowNode?.type?.name === "tableRow") {
                  const rowData: string[] = [];
                  rowNode.forEach((cellNode: any) => {
                    if (
                      cellNode?.type?.name === "tableCell" ||
                      cellNode?.type?.name === "tableHeader"
                    ) {
                      rowData.push(cellNode.textContent || "");
                    }
                  });
                  tableRows.push(rowData);
                  tableCols = Math.max(tableCols, rowData.length);
                }
              });

              // Save to Statistics
              const statisticId = await onTableCreated({
                rows: tableRows.length,
                cols: tableCols,
                data: tableRows,
              });

              // Update table with the statistic ID
              if (statisticId && tableElement) {
                tableElement.setAttribute("data-statistic-id", statisticId);
              }
            }
            break;
          }
        }
      };

      // Subscribe to createTable event
      const unsubCreateTable = editorEvents.on<{ rows: number; cols: number }>(
        "createTable",
        (data) => createTableHandler(data.rows, data.cols),
      );

      // Backward compatibility
      (window as any).__editorCreateTable = createTableHandler;

      return () => {
        unsubCreateTable();
        delete (window as any).__editorCreateTable;
      };
    }, [editor, onTableCreated]);

    // Cleanup
    useEffect(() => {
      return () => {
        if (editorInitTimeoutRef.current) {
          clearTimeout(editorInitTimeoutRef.current);
        }
        editor?.destroy();
      };
    }, [editor]);

    // Detect if editor initialization is taking too long
    useEffect(() => {
      if (!editor && !editorError) {
        editorInitTimeoutRef.current = setTimeout(() => {
          if (!editor) {
            setEditorError(
              "Редактор не смог инициализироваться. Попробуйте обновить страницу.",
            );
            console.error(
              "TiptapEditor: Initialization timeout - editor failed to load",
            );
          }
        }, 10000); // 10 second timeout
      }

      return () => {
        if (editorInitTimeoutRef.current) {
          clearTimeout(editorInitTimeoutRef.current);
        }
      };
    }, [editor, editorError]);

    // Show error state
    if (editorError) {
      return (
        <div
          className="tiptap-loading"
          style={{
            color: "#ef4444",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div>⚠️ {editorError}</div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "8px 16px",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Обновить страницу
          </button>
        </div>
      );
    }

    if (!editor) {
      return <div className="tiptap-loading">Загрузка редактора...</div>;
    }

    // Apply page settings (custom or style defaults)
    const handleApplyPageSettings = (settings: PageSettings) => {
      setPageSettings(settings);

      // Update editor margins via PaginationPlus
      if (editor) {
        try {
          (editor.chain() as any)
            .updateMargins({
              top: settings.marginTop,
              bottom: settings.marginBottom,
              left: settings.marginLeft,
              right: settings.marginRight,
            })
            .run();
        } catch (e) {
          console.warn("Failed to update margins:", e);
        }
      }
    };

    // Apply style preset
    const handleApplyStyle = (style: CitationStyle) => {
      setCurrentStyle(style);
      const config = STYLE_CONFIGS[style] || STYLE_CONFIGS.gost;
      const newSettings: PageSettings = {
        marginTop: config.marginTop,
        marginBottom: config.marginBottom,
        marginLeft: config.marginLeft,
        marginRight: config.marginRight,
        fontSize: config.fontSize,
        lineHeight: config.lineHeight,
        paragraphIndent: config.paragraphIndent,
        fontFamily: config.fontFamily,
        textAlign: config.textAlign,
      };
      setPageSettings(newSettings);

      if (editor) {
        try {
          (editor.chain() as any)
            .updateMargins({
              top: config.marginTop,
              bottom: config.marginBottom,
              left: config.marginLeft,
              right: config.marginRight,
            })
            .run();
        } catch (e) {
          console.warn("Failed to update margins:", e);
        }
      }
    };

    // CSS variables for styling based on page settings
    const styleVars = {
      "--editor-font-size": `${pageSettings.fontSize}pt`,
      "--editor-line-height": pageSettings.lineHeight,
      "--editor-paragraph-indent": pageSettings.paragraphIndent,
      "--editor-font-family": pageSettings.fontFamily,
      "--editor-text-align": pageSettings.textAlign,
    } as React.CSSProperties;

    return (
      <div className="tiptap-editor-wrapper" style={styleVars}>
        {editable && (
          <TiptapToolbar
            editor={editor}
            onInsertCitation={onInsertCitation}
            onImportStatistic={onImportStatistic}
            onImportFile={onImportFile}
            onCreateChartFromTable={onCreateChartFromTable}
            onOpenTableEditor={handleOpenTableEditor}
            onToggleOutline={
              showLegacySidebars
                ? () => setShowOutline((prev) => !prev)
                : undefined
            }
            onToggleBibliography={
              showLegacySidebars
                ? () => setShowBibliography((prev) => !prev)
                : undefined
            }
            onOpenPageSettings={() => setShowPageSettings(true)}
            showOutline={showLegacySidebars ? showOutline : undefined}
            showBibliography={showLegacySidebars ? showBibliography : undefined}
            citationStyle={currentStyle}
            reviewMode={reviewMode}
            onToggleReviewMode={() => setReviewMode(!reviewMode)}
            onAddComment={() => {
              // Check if there's a selection
              const { from, to } = editor.state.selection;
              if (from === to) {
                alert("Выделите текст для добавления комментария");
                return;
              }
              setShowCommentModal(true);
            }}
          />
        )}
        <div className="tiptap-main-area">
          {/* Левый сайдбар - Содержание */}
          {showLegacySidebars && showOutline && (
            <DocumentOutline
              headings={headings}
              onNavigate={scrollToHeading}
              onClose={() => setShowOutline(false)}
            />
          )}

          {/* Центральная область с редактором */}
          <div className={`tiptap-content-wrapper ${citationStyle}-style`}>
            <EditorContent editor={editor} className="tiptap-editor" />
          </div>

          {/* Правый сайдбар - Список литературы */}
          {showLegacySidebars &&
            showBibliography &&
            citations &&
            citations.length > 0 && (
              <BibliographySidebar
                citations={citations}
                onClose={() => setShowBibliography(false)}
                onRemoveCitation={onRemoveCitation}
                onUpdateCitationNote={onUpdateCitationNote}
              />
            )}
        </div>

        {/* Page Settings Modal */}
        <PageSettingsModal
          isOpen={showPageSettings}
          onClose={() => setShowPageSettings(false)}
          citationStyle={currentStyle}
          currentSettings={pageSettings}
          onApply={handleApplyPageSettings}
          onApplyStyle={handleApplyStyle}
        />
        {statEditorState && (
          <StatisticEditModal
            statistic={statEditorState.statistic}
            onClose={() => setStatEditorState(null)}
            onSave={handleSaveStatisticEditor}
          />
        )}

        {/* Comment Modal */}
        {showCommentModal && (
          <div
            className="modal-backdrop"
            onClick={() => setShowCommentModal(false)}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 400 }}
            >
              <div className="modal-header">
                <h3
                  className="modal-title"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <IconChatBubbleQuote className="w-5 h-5" size="md" />
                  Добавить комментарий
                </h3>
                <button
                  className="modal-close"
                  onClick={() => setShowCommentModal(false)}
                >
                  <IconClose className="w-4 h-4" size="sm" />
                </button>
              </div>
              <div className="modal-body">
                <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
                  Комментарий будет добавлен к выделенному тексту
                </p>
                <textarea
                  className="form-input form-textarea"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Введите комментарий..."
                  rows={4}
                  style={{ resize: "vertical" }}
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn-secondary"
                  onClick={() => setShowCommentModal(false)}
                >
                  Отмена
                </button>
                <button
                  className="btn-primary"
                  disabled={!commentText.trim()}
                  onClick={() => {
                    if (!commentText.trim()) return;

                    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const commentAttrs: CommentAttrs = {
                      commentId,
                      text: commentText.trim(),
                      createdAt: new Date().toISOString(),
                      resolved: false,
                    };

                    (editor.chain().focus() as any)
                      .setComment(commentAttrs)
                      .run();

                    setCommentText("");
                    setShowCommentModal(false);
                  }}
                >
                  <IconPlus
                    className="w-3.5 h-3.5"
                    size="sm"
                    style={{ marginRight: 4 }}
                  />
                  Добавить комментарий
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table Editor Modal */}
        {showTableEditor && tableEditorData && (
          <TableEditorModal
            open={showTableEditor}
            initialData={tableEditorData.data}
            initialColWidths={tableEditorData.colWidths}
            initialRowHeights={tableEditorData.rowHeights}
            onClose={() => {
              setShowTableEditor(false);
              setTableEditorData(null);
            }}
            onSave={handleSaveTableEditor}
          />
        )}
      </div>
    );
  },
);

export default TiptapEditor;
