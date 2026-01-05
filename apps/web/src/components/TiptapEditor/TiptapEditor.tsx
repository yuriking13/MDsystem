import React, { useEffect } from 'react';
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
import './TiptapEditor.css';

// A4 dimensions at 96 DPI
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;
const PAGE_GAP = 24;

// Margins (GOST-style: left margin larger for binding)
const MARGIN_TOP = 72;
const MARGIN_RIGHT = 56;
const MARGIN_BOTTOM = 72;
const MARGIN_LEFT = 85;

interface TiptapEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  onInsertCitation?: () => void;
  onImportStatistic?: () => void;
  editable?: boolean;
}

export default function TiptapEditor({
  content = '',
  onChange,
  onInsertCitation,
  onImportStatistic,
  editable = true,
}: TiptapEditorProps) {
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
        pageHeight: A4_HEIGHT,
        pageWidth: A4_WIDTH,
        pageGap: PAGE_GAP,
        marginTop: MARGIN_TOP,
        marginRight: MARGIN_RIGHT,
        marginBottom: MARGIN_BOTTOM,
        marginLeft: MARGIN_LEFT,
        headerRight: '{page}',
        headerLeft: '',
        footerRight: '',
        footerLeft: '',
        pageBreakBackground: '#4a5568',
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
    },
  });

  // Update content when prop changes
  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Cleanup
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  if (!editor) {
    return <div className="tiptap-loading">Загрузка редактора...</div>;
  }

  return (
    <div className="tiptap-editor-wrapper">
      {editable && (
        <TiptapToolbar 
          editor={editor} 
          onInsertCitation={onInsertCitation}
          onImportStatistic={onImportStatistic}
        />
      )}
      <div className="tiptap-content-wrapper">
        <EditorContent editor={editor} className="tiptap-editor" />
      </div>
    </div>
  );
}
