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
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Paragraph from '@tiptap/extension-paragraph';
import { PaginationPlus } from 'tiptap-pagination-plus';

import TiptapToolbar from './TiptapToolbar';
import DocumentOutline from './DocumentOutline';
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
  citations = [],
  citationStyle = 'gost',
  editable = true,
}: TiptapEditorProps) {
  const [showOutline, setShowOutline] = useState(true);
  const [showBibliography, setShowBibliography] = useState(true);
  const [headings, setHeadings] = useState<Array<{level: number; text: string; id: string}>>([]);
  const styleConfig = STYLE_CONFIGS[citationStyle] || STYLE_CONFIGS.gost;
  
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
      TableCell,
      TableHeader,
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
      editor.commands.setCitation(citationAttrs);
    };
    
    // Insert chart function - uses the new ChartNode extension
    const insertChart = (chartData: ChartData) => {
      const attrs: ChartNodeAttrs = {
        chartId: chartData.id || `chart_${Date.now()}`,
        tableData: chartData.table_data,
        config: chartData.config,
        title: chartData.config?.title,
      };
      
      insertChartIntoEditor(editor, attrs);
    };
    
    // Insert table function
    const insertTable = (tableData: { headers: string[]; rows: string[][] }, title?: string) => {
      // Use TipTap's built-in table insertion
      const rows = tableData.rows?.length || 3;
      const cols = tableData.headers?.length || 3;
      
      editor.chain().focus().insertTable({ rows: rows + 1, cols, withHeaderRow: true }).run();
      
      // Fill in the data
      setTimeout(() => {
        // Get the table node and fill it
        const { state } = editor;
        let tablePos = -1;
        
        state.doc.descendants((node, pos) => {
          if (node.type.name === 'table' && tablePos === -1) {
            tablePos = pos;
          }
        });
        
        if (tablePos >= 0) {
          // Fill headers
          let cellIndex = 0;
          const headers = tableData.headers || [];
          const dataRows = tableData.rows || [];
          
          state.doc.nodesBetween(tablePos, state.doc.content.size, (node, pos) => {
            if (node.type.name === 'tableHeader' || node.type.name === 'tableCell') {
              const rowIdx = Math.floor(cellIndex / cols);
              const colIdx = cellIndex % cols;
              
              let text = '';
              if (rowIdx === 0 && colIdx < headers.length) {
                text = headers[colIdx];
              } else if (rowIdx > 0 && rowIdx - 1 < dataRows.length && colIdx < dataRows[rowIdx - 1].length) {
                text = dataRows[rowIdx - 1][colIdx];
              }
              
              if (text) {
                editor.chain()
                  .setTextSelection(pos + 1)
                  .insertContent(text)
                  .run();
              }
              
              cellIndex++;
            }
          });
        }
      }, 100);
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

  // CSS variables for styling based on citation style
  const styleVars = {
    '--editor-font-size': `${styleConfig.fontSize}pt`,
    '--editor-line-height': styleConfig.lineHeight,
    '--editor-paragraph-indent': styleConfig.paragraphIndent,
    '--editor-font-family': styleConfig.fontFamily,
    '--editor-text-align': styleConfig.textAlign,
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
          showOutline={showOutline}
          showBibliography={showBibliography}
          citationStyle={citationStyle}
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
        {showBibliography && citations.length > 0 && (
          <div className="bibliography-sidebar">
            <div className="bibliography-header">
              <span className="bibliography-title">📚 Список литературы ({citations.length})</span>
              <button 
                className="bibliography-close" 
                onClick={() => setShowBibliography(false)}
                title="Скрыть список литературы"
              >
                ✕
              </button>
            </div>
            <div className="bibliography-list">
              {citations.map((citation) => {
                const subNum = citation.sub_number || 1;
                const displayNum = subNum > 1 ? `${citation.inline_number}.${subNum}` : String(citation.inline_number);
                
                return (
                  <div key={citation.id} className="bibliography-item" id={`bib-${citation.id}`}>
                    <span className="bib-number">[{displayNum}]</span>
                    <div className="bib-content">
                      <div className="bib-article-info">
                        {citation.article?.authors && citation.article.authors.length > 0 && (
                          <div className="bib-authors">
                            {citation.article.authors.slice(0, 3).join(', ')}
                            {citation.article.authors.length > 3 && ' et al.'}
                          </div>
                        )}
                        <div className="bib-title">{citation.article?.title_en || 'Без названия'}</div>
                        {citation.article?.journal && (
                          <div className="bib-journal">{citation.article.journal}</div>
                        )}
                        {citation.article?.year && (
                          <div className="bib-year">{citation.article.year}</div>
                        )}
                      </div>
                      {citation.note && (
                        <div className="bib-note">{citation.note}</div>
                      )}
                      {onRemoveCitation && (
                        <button
                          className="bib-remove"
                          onClick={() => onRemoveCitation(citation.id)}
                          title="Удалить цитату"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
