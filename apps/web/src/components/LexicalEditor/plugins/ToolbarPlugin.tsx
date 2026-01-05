import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND } from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import React, { useCallback, useEffect, useState } from 'react';
import {
  HiBold,
  HiItalic,
} from 'react-icons/hi2';
import { 
  MdFormatUnderlined, 
  MdStrikethroughS,
  MdFormatAlignLeft, 
  MdFormatAlignCenter, 
  MdFormatAlignRight,
  MdFormatListBulleted,
  MdFormatListNumbered,
  MdFormatQuote,
  MdCode,
  MdLink,
  MdHorizontalRule,
} from 'react-icons/md';

type ViewMode = 'scroll' | 'pages';

interface ToolbarPluginProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onInsertCitation?: () => void;
  onImportStatistic?: () => void;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
  variant?: 'default' | 'accent' | 'success';
}

function ToolbarButton({ onClick, isActive, title, children, variant = 'default' }: ToolbarButtonProps) {
  let className = 'toolbar-btn';
  if (isActive) className += ' active';
  if (variant === 'accent') className += ' accent';
  if (variant === 'success') className += ' success';
  
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="toolbar-divider" />;
}

export default function ToolbarPlugin({
  viewMode,
  onViewModeChange,
  onInsertCitation,
  onImportStatistic,
}: ToolbarPluginProps) {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
    }
  }, []);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor, updateToolbar]);

  const formatText = (format: 'bold' | 'italic' | 'underline' | 'strikethrough') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatHeading = (level: 'h1' | 'h2' | 'h3') => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(level));
      }
    });
  };

  const formatList = (listType: 'bullet' | 'number') => {
    if (listType === 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    }
  };

  const formatAlignment = (align: 'left' | 'center' | 'right') => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, align);
  };

  return (
    <div className="lexical-toolbar">
      {/* Text formatting */}
      <div className="toolbar-group">
        <ToolbarButton 
          onClick={() => formatText('bold')} 
          isActive={isBold}
          title="Жирный (Ctrl+B)"
        >
          <HiBold />
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => formatText('italic')} 
          isActive={isItalic}
          title="Курсив (Ctrl+I)"
        >
          <HiItalic />
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => formatText('underline')} 
          isActive={isUnderline}
          title="Подчёркнутый (Ctrl+U)"
        >
          <MdFormatUnderlined />
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => formatText('strikethrough')} 
          isActive={isStrikethrough}
          title="Зачёркнутый"
        >
          <MdStrikethroughS />
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      {/* Headings */}
      <div className="toolbar-group">
        <ToolbarButton onClick={() => formatHeading('h1')} title="Заголовок 1">
          H1
        </ToolbarButton>
        <ToolbarButton onClick={() => formatHeading('h2')} title="Заголовок 2">
          H2
        </ToolbarButton>
        <ToolbarButton onClick={() => formatHeading('h3')} title="Заголовок 3">
          H3
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      {/* Lists */}
      <div className="toolbar-group">
        <ToolbarButton onClick={() => formatList('bullet')} title="Маркированный список">
          <MdFormatListBulleted />
        </ToolbarButton>
        <ToolbarButton onClick={() => formatList('number')} title="Нумерованный список">
          <MdFormatListNumbered />
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      {/* Alignment */}
      <div className="toolbar-group">
        <ToolbarButton onClick={() => formatAlignment('left')} title="По левому краю">
          <MdFormatAlignLeft />
        </ToolbarButton>
        <ToolbarButton onClick={() => formatAlignment('center')} title="По центру">
          <MdFormatAlignCenter />
        </ToolbarButton>
        <ToolbarButton onClick={() => formatAlignment('right')} title="По правому краю">
          <MdFormatAlignRight />
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      {/* Citation & Import buttons */}
      <div className="toolbar-group">
        {onInsertCitation && (
          <ToolbarButton 
            onClick={onInsertCitation} 
            title="Вставить цитату"
            variant="success"
          >
            <MdFormatQuote />
            <span className="toolbar-btn-label">Цитата</span>
          </ToolbarButton>
        )}
        {onImportStatistic && (
          <ToolbarButton 
            onClick={onImportStatistic} 
            title="Импорт из статистики"
            variant="accent"
          >
            📊
            <span className="toolbar-btn-label">Импорт</span>
          </ToolbarButton>
        )}
      </div>

      {/* View mode toggle - pushed to the right */}
      <div className="toolbar-spacer" />
      
      <div className="toolbar-group view-mode-group">
        <button
          type="button"
          className={`view-mode-btn ${viewMode === 'scroll' ? 'active' : ''}`}
          onClick={() => onViewModeChange('scroll')}
          title="Режим ленты"
        >
          📜 Лента
        </button>
        <button
          type="button"
          className={`view-mode-btn ${viewMode === 'pages' ? 'active' : ''}`}
          onClick={() => onViewModeChange('pages')}
          title="Режим страниц"
        >
          📄 Страницы
        </button>
      </div>
    </div>
  );
}
