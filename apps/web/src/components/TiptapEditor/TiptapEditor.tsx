import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { PaginationPlus } from 'tiptap-pagination-plus';

import TiptapToolbar from './TiptapToolbar';
import DocumentOutline from './DocumentOutline';
import './TiptapEditor.css';

import type { CitationStyle } from '../../lib/api';

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
  citationStyle?: CitationStyle;
  editable?: boolean;
}

export default function TiptapEditor({
  content = '',
  onChange,
  onInsertCitation,
  onImportStatistic,
  citationStyle = 'gost',
  editable = true,
}: TiptapEditorProps) {
  const [showOutline, setShowOutline] = useState(true);
  const [headings, setHeadings] = useState<Array<{level: number; text: string; id: string}>>([]);
  const styleConfig = STYLE_CONFIGS[citationStyle] || STYLE_CONFIGS.gost;
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
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

  // Register global chart insert function
  useEffect(() => {
    if (!editor) return;
    
    const insertChart = (chartData: ChartData) => {
      const chartHtml = `
        <div class="chart-container" data-chart='${JSON.stringify(chartData).replace(/'/g, "&#39;")}' data-chart-id="${chartData.id}">
          <p class="chart-placeholder">📊 График: ${chartData.config?.title || 'Без названия'}</p>
        </div>
      `;
      
      editor.chain().focus().insertContent(chartHtml).run();
    };
    
    (window as any).__editorInsertChart = insertChart;
    
    return () => {
      delete (window as any).__editorInsertChart;
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
          onToggleOutline={() => setShowOutline(!showOutline)}
          showOutline={showOutline}
          citationStyle={citationStyle}
        />
      )}
      <div className="tiptap-main-area">
        {showOutline && headings.length > 0 && (
          <DocumentOutline 
            headings={headings} 
            onNavigate={scrollToHeading}
            onClose={() => setShowOutline(false)}
          />
        )}
        <div className={`tiptap-content-wrapper ${citationStyle}-style`}>
          <EditorContent editor={editor} className="tiptap-editor" />
        </div>
      </div>
    </div>
  );
}
