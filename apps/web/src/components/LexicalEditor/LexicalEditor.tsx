import React, { useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import type { EditorState, LexicalEditor as Editor } from 'lexical';
import { $generateHtmlFromNodes } from '@lexical/html';

import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';

import { CitationNode } from './nodes/CitationNode';
import { ChartNode } from './nodes/ChartNode';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import PagesPlugin from './plugins/PagesPlugin';

import './LexicalEditor.css';

type ViewMode = 'scroll' | 'pages';

interface LexicalEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  onInsertCitation?: () => void;
  onImportStatistic?: () => void;
  editable?: boolean;
  projectId?: string;
  documentId?: string;
}

function onError(error: Error) {
  console.error('Lexical Error:', error);
}

export default function LexicalEditor({
  content = '',
  onChange,
  onInsertCitation,
  onImportStatistic,
  editable = true,
  projectId,
  documentId,
}: LexicalEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('scroll');

  const initialConfig = {
    namespace: 'MDSystemEditor',
    theme: {
      paragraph: 'lexical-paragraph',
      heading: {
        h1: 'lexical-heading-h1',
        h2: 'lexical-heading-h2',
        h3: 'lexical-heading-h3',
      },
      list: {
        ul: 'lexical-list-ul',
        ol: 'lexical-list-ol',
        listitem: 'lexical-list-item',
      },
      link: 'lexical-link',
      text: {
        bold: 'lexical-text-bold',
        italic: 'lexical-text-italic',
        underline: 'lexical-text-underline',
        strikethrough: 'lexical-text-strikethrough',
        code: 'lexical-text-code',
      },
      table: 'lexical-table',
      tableCell: 'lexical-table-cell',
      tableCellHeader: 'lexical-table-cell-header',
      code: 'lexical-code-block',
      quote: 'lexical-quote',
    },
    onError,
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      AutoLinkNode,
      LinkNode,
      CitationNode,
      ChartNode,
    ],
    editable,
  };

  const handleEditorChange = (editorState: EditorState, editor: Editor) => {
    editorState.read(() => {
      const html = $generateHtmlFromNodes(editor, null);
      onChange?.(html);
    });
  };

  return (
    <div className="lexical-editor-wrapper">
      <LexicalComposer initialConfig={initialConfig}>
        {/* Fixed toolbar */}
        {editable && (
          <div className="lexical-toolbar-container">
            <ToolbarPlugin
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onInsertCitation={onInsertCitation}
              onImportStatistic={onImportStatistic}
            />
          </div>
        )}
        
        {/* Scrollable content area */}
        <div className="lexical-content-wrapper">
          <div className={`lexical-editor-scroll ${viewMode === 'pages' ? 'pages-layout' : 'scroll-layout'}`}>
            {viewMode === 'pages' ? (
              <PagesPlugin>
                <RichTextPlugin
                  contentEditable={<ContentEditable className="lexical-content" />}
                  placeholder={<div className="lexical-placeholder">Начните писать...</div>}
                  ErrorBoundary={LexicalErrorBoundary}
                />
              </PagesPlugin>
            ) : (
              <div className="lexical-scroll-container">
                <RichTextPlugin
                  contentEditable={<ContentEditable className="lexical-content" />}
                  placeholder={<div className="lexical-placeholder">Начните писать...</div>}
                  ErrorBoundary={LexicalErrorBoundary}
                />
              </div>
            )}
          </div>
        </div>

        <HistoryPlugin />
        <AutoFocusPlugin />
        <LinkPlugin />
        <ListPlugin />
        <TablePlugin />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        
        {onChange && (
          <OnChangePlugin onChange={handleEditorChange} />
        )}
      </LexicalComposer>
    </div>
  );
}
