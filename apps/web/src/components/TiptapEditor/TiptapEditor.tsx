import React, { useEffect, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import { CustomTableCell } from './extensions/CustomTableCell';
import { CustomTableHeader } from './extensions/CustomTableHeader';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Paragraph from '@tiptap/extension-paragraph';
import { PaginationPlus } from 'tiptap-pagination-plus';

import TiptapToolbar from './TiptapToolbar';
import DocumentOutline from './DocumentOutline';
import BibliographySidebar from './BibliographySidebar';
import PageSettingsModal, { type PageSettings } from './PageSettingsModal';
import { ChartNode, insertChartIntoEditor, type ChartNodeAttrs } from './extensions/ChartNode';
import { CitationMark, type CitationAttrs } from './extensions/CitationMark';
import { TableFigureNumbering } from './extensions/TableFigureNumbering';
import './TiptapEditor.css';

import type { CitationStyle } from '../../lib/api';
import type { Citation } from '../../lib/api';

// Custom Paragraph extension with indent support
const CustomParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      indent: {
        default: false,
        parseHTML: (element: HTMLElement) => element.classList.contains('indent'),
        renderHTML: (attributes: any) => {
          if (!attributes.indent) {
            return {};
          }
          return {
            class: 'indent',
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
          return commands.updateAttributes('paragraph', {
            indent: (attrs: any) => !attrs.indent,
          });
        },
      setIndent:
        (indent: boolean) =>
        ({ commands }: any) => {
          return commands.updateAttributes('paragraph', { indent });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      Tab: () => (this.editor.commands as any).toggleIndent(),
      'Shift-Tab': () => (this.editor.commands as any).setIndent(false),
    };
  },
});

// Style configurations for different citation formats
export const STYLE_CONFIGS = {
  gost: {
    name: 'ГОСТ Р 7.0.5-2008',
    pageWidth: 794,  // A4 at 96 DPI
    pageHeight: 1123,
    marginTop: 76,   // 20mm
    marginBottom: 76, // 20mm
    marginLeft: 95,  // 25mm (for binding)
    marginRight: 38, // 10mm
    fontSize: 14,
    lineHeight: 1.5,
    paragraphIndent: '1.25cm',
    fontFamily: "'Times New Roman', Times, serif",
    textAlign: 'justify',
    pageNumberPosition: 'center-top',
  },
  vancouver: {
    name: 'Vancouver',
    pageWidth: 794,
    pageHeight: 1123,
    marginTop: 72,   // ~19mm standard
    marginBottom: 72,
    marginLeft: 72,
    marginRight: 72,
    fontSize: 12,
    lineHeight: 2.0,
    paragraphIndent: '0',
    fontFamily: "'Times New Roman', Times, serif",
    textAlign: 'left',
    pageNumberPosition: 'right-top',
  },
  apa: {
    name: 'APA 7th Edition',
    pageWidth: 794,
    pageHeight: 1123,
    marginTop: 97,   // 2.54cm = 1 inch
    marginBottom: 97,
    marginLeft: 97,
    marginRight: 97,
    fontSize: 12,
    lineHeight: 2.0,
    paragraphIndent: '1.27cm',
    fontFamily: "'Times New Roman', Times, serif",
    textAlign: 'left',
    pageNumberPosition: 'right-top',
  },
};

const PAGE_GAP = 24;

export type ChartData = {
  id: string;
  config: any;
  table_data: any;
};

interface TiptapEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  onInsertCitation?: () => void;
  onImportStatistic?: () => void;
  onCreateChartFromTable?: (tableHtml: string) => void;
  onRemoveCitation?: (citationId: string) => void;
  onUpdateCitationNote?: (citationId: string, note: string) => void;
  citations?: Citation[];
  citationStyle?: CitationStyle;
  editable?: boolean;
}

export default function TiptapEditor({
  content = '',
  onChange,
  onInsertCitation,
  onImportStatistic,
  onCreateChartFromTable,
  onRemoveCitation,
  onUpdateCitationNote,
  citations = [],
  citationStyle = 'gost',
  editable = true,
}: TiptapEditorProps) {
  const [showOutline, setShowOutline] = useState(true);
  const [showBibliography, setShowBibliography] = useState(true);
  const [showPageSettings, setShowPageSettings] = useState(false);
  const [headings, setHeadings] = useState<Array<{level: number; text: string; id: string}>>([]);
  const [currentStyle, setCurrentStyle] = useState<CitationStyle>(citationStyle);
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
    const config = STYLE_CONFIGS[citationStyle];
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
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        paragraph: false, // Отключаем стандартный paragraph
      }),
      CustomParagraph, // Используем свой paragraph с indent
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'tiptap-link',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'tiptap-image',
        },
      }),
      Placeholder.configure({
        placeholder: 'Начните писать...',
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'tiptap-table',
        },
      }),
      TableRow,
      CustomTableCell,
      CustomTableHeader,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      ChartNode,
      CitationMark,
      TableFigureNumbering,
      PaginationPlus.configure({
        pageHeight: styleConfig.pageHeight,
        pageWidth: styleConfig.pageWidth,
        pageGap: PAGE_GAP,
        marginTop: styleConfig.marginTop,
        marginRight: styleConfig.marginRight,
        marginBottom: styleConfig.marginBottom,
        marginLeft: styleConfig.marginLeft,
        headerRight: citationStyle === 'gost' ? '' : '{page}',
        headerLeft: '',
        footerRight: '',
        footerLeft: citationStyle === 'gost' ? '{page}' : '',
        pageBreakBackground: '#4a5568',
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
      updateHeadings(editor);
    },
  });

  // Extract headings from document for outline
  const updateHeadings = useCallback((editorInstance: any) => {
    if (!editorInstance) return;
    
    const doc = editorInstance.state.doc;
    const newHeadings: Array<{level: number; text: string; id: string}> = [];
    
    doc.descendants((node: any, pos: number) => {
      if (node.type.name === 'heading') {
        const id = `heading-${pos}`;
        newHeadings.push({
          level: node.attrs.level,
          text: node.textContent,
          id,
        });
      }
    });
    
    setHeadings(newHeadings);
  }, []);

  // Register global insert functions
  useEffect(() => {
    if (!editor) return;
    
    // Insert citation function
    const insertCitation = (citationAttrs: CitationAttrs) => {
      if (!editor.isEditable || !editor.view || editor.isDestroyed) {
        console.warn('Editor is not ready for citation insertion');
        return;
      }
      editor.commands.setCitation(citationAttrs);
    };
    
    // Insert chart function - uses the new ChartNode extension
    // If we're inside a table, insert AFTER the table
    const insertChart = (chartData: ChartData) => {
      if (!editor.isEditable || !editor.view || editor.isDestroyed) {
        console.warn('Editor is not ready for chart insertion');
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
        if (node.type.name === 'table') {
          // Found a table, get its end position
          const tableStart = $from.before(depth);
          tableEndPos = tableStart + node.nodeSize;
          break;
        }
      }
      
      if (tableEndPos > 0) {
        // We're inside a table - insert chart after the table
        editor.chain()
          .focus()
          .setTextSelection(tableEndPos)
          .insertContent({ type: 'chartNode', attrs })
          .run();
      } else {
        // Not in a table, insert at current position
        insertChartIntoEditor(editor, attrs);
      }
    };
    
    // Insert table function - improved version
    const insertTable = (tableData: { headers: string[]; rows: string[][] }, title?: string) => {
      if (!editor.isEditable || !editor.view || editor.isDestroyed) {
        console.warn('Editor is not ready for table insertion');
        return;
      }
      
      // Validate data
      const headers = tableData.headers || [];
      const dataRows = tableData.rows || [];
      
      if (headers.length === 0 && dataRows.length === 0) {
        console.warn('No table data to insert');
        return;
      }
      
      const numCols = headers.length || (dataRows[0]?.length || 3);
      const numRows = dataRows.length + 1; // +1 for header row
      
      // Build table HTML manually for more reliable insertion
      let tableHtml = '<table class="tiptap-table">';
      
      // Header row
      tableHtml += '<tr>';
      for (let i = 0; i < numCols; i++) {
        const headerText = headers[i] || `Колонка ${i + 1}`;
        tableHtml += `<th>${headerText}</th>`;
      }
      tableHtml += '</tr>';
      
      // Data rows
      for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
        const row = dataRows[rowIdx] || [];
        tableHtml += '<tr>';
        for (let colIdx = 0; colIdx < numCols; colIdx++) {
          const cellText = row[colIdx] || '';
          tableHtml += `<td>${cellText}</td>`;
        }
        tableHtml += '</tr>';
      }
      
      tableHtml += '</table>';
      
      // Insert the table
      editor.chain()
        .focus()
        .insertContent(tableHtml)
        .run();
    };
    
    (window as any).__editorInsertCitation = insertCitation;
    (window as any).__editorInsertChart = insertChart;
    (window as any).__editorInsertTable = insertTable;
    
    return () => {
      delete (window as any).__editorInsertCitation;
      delete (window as any).__editorInsertChart;
      delete (window as any).__editorInsertTable;
    };
  }, [editor]);

  // Update content when prop changes
  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content);
      updateHeadings(editor);
    }
  }, [content, editor, updateHeadings]);

  // Update pagination settings when citation style changes
  useEffect(() => {
    if (!editor) return;
    
    editor.chain()
      .updateMargins({
        top: styleConfig.marginTop,
        bottom: styleConfig.marginBottom,
        left: styleConfig.marginLeft,
        right: styleConfig.marginRight,
      })
      .run();
  }, [citationStyle, editor, styleConfig]);

  // Navigate to heading
  const scrollToHeading = useCallback((headingId: string) => {
    if (!editor) return;
    
    const pos = parseInt(headingId.replace('heading-', ''));
    editor.chain().focus().setTextSelection(pos).run();
    
    // Scroll the heading into view
    setTimeout(() => {
      const view = editor.view;
      const coords = view.coordsAtPos(pos);
      const editorWrapper = document.querySelector('.tiptap-content-wrapper');
      if (editorWrapper && coords) {
        const wrapperRect = editorWrapper.getBoundingClientRect();
        editorWrapper.scrollTo({
          top: editorWrapper.scrollTop + (coords.top - wrapperRect.top) - 100,
          behavior: 'smooth'
        });
      }
    }, 10);
  }, [editor]);

  // Cleanup
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  if (!editor) {
    return <div className="tiptap-loading">Загрузка редактора...</div>;
  }

  // Apply page settings (custom or style defaults)
  const handleApplyPageSettings = useCallback((settings: PageSettings) => {
    setPageSettings(settings);
    
    // Update editor margins via PaginationPlus
    if (editor) {
      editor.chain()
        .updateMargins({
          top: settings.marginTop,
          bottom: settings.marginBottom,
          left: settings.marginLeft,
          right: settings.marginRight,
        })
        .run();
    }
  }, [editor]);

  // Apply style preset
  const handleApplyStyle = useCallback((style: CitationStyle) => {
    setCurrentStyle(style);
    const config = STYLE_CONFIGS[style];
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
      editor.chain()
        .updateMargins({
          top: config.marginTop,
          bottom: config.marginBottom,
          left: config.marginLeft,
          right: config.marginRight,
        })
        .run();
    }
  }, [editor]);

  // CSS variables for styling based on page settings
  const styleVars = {
    '--editor-font-size': `${pageSettings.fontSize}pt`,
    '--editor-line-height': pageSettings.lineHeight,
    '--editor-paragraph-indent': pageSettings.paragraphIndent,
    '--editor-font-family': pageSettings.fontFamily,
    '--editor-text-align': pageSettings.textAlign,
  } as React.CSSProperties;

  return (
    <div className="tiptap-editor-wrapper" style={styleVars}>
      {editable && (
        <TiptapToolbar 
          editor={editor} 
          onInsertCitation={onInsertCitation}
          onImportStatistic={onImportStatistic}
          onCreateChartFromTable={onCreateChartFromTable}
          onToggleOutline={() => setShowOutline(!showOutline)}
          onToggleBibliography={() => setShowBibliography(!showBibliography)}
          onOpenPageSettings={() => setShowPageSettings(true)}
          showOutline={showOutline}
          showBibliography={showBibliography}
          citationStyle={currentStyle}
        />
      )}
      <div className="tiptap-main-area">
        {/* Левый сайдбар - Содержание */}
        {showOutline && (
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
        {showBibliography && citations && citations.length > 0 && (
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
    </div>
  );
}
