import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND } from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode } from '@lexical/rich-text';
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import React, { useCallback, useEffect, useState } from 'react';

type ViewMode = 'scroll' | 'pages';

interface ToolbarPluginProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onInsertCitation?: () => void;
  onImportStatistic?: () => void;
}

// Inline styles to guarantee horizontal layout
const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 12px',
  background: 'rgba(0, 0, 0, 0.25)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  flexShrink: 0,
  flexWrap: 'nowrap',
  overflowX: 'auto',
  minHeight: '48px',
};

const groupStyle: React.CSSProperties = {
  display: 'inline-flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '2px',
  flexShrink: 0,
};

const dividerStyle: React.CSSProperties = {
  width: '1px',
  height: '24px',
  background: 'rgba(255, 255, 255, 0.12)',
  margin: '0 4px',
  flexShrink: 0,
};

const spacerStyle: React.CSSProperties = {
  flex: 1,
  minWidth: '8px',
};

const btnBaseStyle: React.CSSProperties = {
  display: 'inline-flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  minWidth: '32px',
  height: '32px',
  padding: '0 8px',
  border: 'none',
  background: 'transparent',
  color: 'rgba(169, 183, 218, 1)',
  cursor: 'pointer',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 500,
  transition: 'all 0.15s ease',
  flexShrink: 0,
  whiteSpace: 'nowrap',
};

const btnActiveStyle: React.CSSProperties = {
  ...btnBaseStyle,
  background: '#4b74ff',
  color: 'white',
};

const btnSuccessStyle: React.CSSProperties = {
  ...btnBaseStyle,
  background: 'rgba(74, 222, 128, 0.15)',
  color: '#4ade80',
  border: '1px solid rgba(74, 222, 128, 0.3)',
};

const btnAccentStyle: React.CSSProperties = {
  ...btnBaseStyle,
  background: 'rgba(75, 116, 255, 0.15)',
  color: '#4b74ff',
  border: '1px solid rgba(75, 116, 255, 0.3)',
};

const viewModeGroupStyle: React.CSSProperties = {
  display: 'inline-flex',
  flexDirection: 'row',
  background: 'rgba(20, 30, 50, 0.6)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '8px',
  padding: '2px',
  gap: '0',
  flexShrink: 0,
};

const viewModeBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '4px',
  padding: '6px 10px',
  border: 'none',
  background: 'transparent',
  color: 'rgba(169, 183, 218, 1)',
  cursor: 'pointer',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 500,
  transition: 'all 0.15s ease',
  whiteSpace: 'nowrap',
};

const viewModeBtnActiveStyle: React.CSSProperties = {
  ...viewModeBtnStyle,
  background: '#4b74ff',
  color: 'white',
};

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

  const getButtonStyle = (isActive: boolean, variant?: 'success' | 'accent') => {
    if (isActive) return btnActiveStyle;
    if (variant === 'success') return btnSuccessStyle;
    if (variant === 'accent') return btnAccentStyle;
    return btnBaseStyle;
  };

  return (
    <div style={toolbarStyle}>
      {/* Text formatting */}
      <div style={groupStyle}>
        <button
          type="button"
          style={getButtonStyle(isBold)}
          onClick={() => formatText('bold')}
          title="Жирный (Ctrl+B)"
        >
          <b>B</b>
        </button>
        <button
          type="button"
          style={getButtonStyle(isItalic)}
          onClick={() => formatText('italic')}
          title="Курсив (Ctrl+I)"
        >
          <i>I</i>
        </button>
        <button
          type="button"
          style={getButtonStyle(isUnderline)}
          onClick={() => formatText('underline')}
          title="Подчёркнутый (Ctrl+U)"
        >
          <u>U</u>
        </button>
        <button
          type="button"
          style={getButtonStyle(isStrikethrough)}
          onClick={() => formatText('strikethrough')}
          title="Зачёркнутый"
        >
          <s>S</s>
        </button>
      </div>

      <div style={dividerStyle} />

      {/* Headings */}
      <div style={groupStyle}>
        <button type="button" style={btnBaseStyle} onClick={() => formatHeading('h1')} title="Заголовок 1">
          H1
        </button>
        <button type="button" style={btnBaseStyle} onClick={() => formatHeading('h2')} title="Заголовок 2">
          H2
        </button>
        <button type="button" style={btnBaseStyle} onClick={() => formatHeading('h3')} title="Заголовок 3">
          H3
        </button>
      </div>

      <div style={dividerStyle} />

      {/* Lists */}
      <div style={groupStyle}>
        <button type="button" style={btnBaseStyle} onClick={() => formatList('bullet')} title="Маркированный список">
          •
        </button>
        <button type="button" style={btnBaseStyle} onClick={() => formatList('number')} title="Нумерованный список">
          1.
        </button>
      </div>

      <div style={dividerStyle} />

      {/* Alignment */}
      <div style={groupStyle}>
        <button type="button" style={btnBaseStyle} onClick={() => formatAlignment('left')} title="По левому краю">
          ≡
        </button>
        <button type="button" style={btnBaseStyle} onClick={() => formatAlignment('center')} title="По центру">
          ≡
        </button>
        <button type="button" style={btnBaseStyle} onClick={() => formatAlignment('right')} title="По правому краю">
          ≡
        </button>
      </div>

      <div style={dividerStyle} />

      {/* Citation & Import buttons */}
      <div style={groupStyle}>
        {onInsertCitation && (
          <button
            type="button"
            style={btnSuccessStyle}
            onClick={onInsertCitation}
            title="Вставить цитату"
          >
            ❝ Цитата
          </button>
        )}
        {onImportStatistic && (
          <button
            type="button"
            style={btnAccentStyle}
            onClick={onImportStatistic}
            title="Импорт из статистики"
          >
            📊 Импорт
          </button>
        )}
      </div>

      {/* Spacer */}
      <div style={spacerStyle} />

      {/* View mode toggle */}
      <div style={viewModeGroupStyle}>
        <button
          type="button"
          style={viewMode === 'scroll' ? viewModeBtnActiveStyle : viewModeBtnStyle}
          onClick={() => onViewModeChange('scroll')}
          title="Режим ленты"
        >
          📜 Лента
        </button>
        <button
          type="button"
          style={viewMode === 'pages' ? viewModeBtnActiveStyle : viewModeBtnStyle}
          onClick={() => onViewModeChange('pages')}
          title="Режим страниц"
        >
          📄 Страницы
        </button>
      </div>
    </div>
  );
}
