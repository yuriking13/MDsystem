import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  $getSelection, 
  $isRangeSelection, 
  FORMAT_TEXT_COMMAND, 
  FORMAT_ELEMENT_COMMAND,
  $createParagraphNode,
  UNDO_COMMAND,
  REDO_COMMAND,
} from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import { $createCodeNode } from '@lexical/code';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import React, { useCallback, useEffect, useState } from 'react';

type ViewMode = 'scroll' | 'pages';

interface ToolbarPluginProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onInsertCitation?: () => void;
  onImportStatistic?: () => void;
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
  const [showTableMenu, setShowTableMenu] = useState(false);

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

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode());
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

  const formatAlignment = (align: 'left' | 'center' | 'right' | 'justify') => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, align);
  };

  const insertTable = (rows: number, cols: number) => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, { rows: String(rows), columns: String(cols) });
    setShowTableMenu(false);
  };

  const insertCode = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createCodeNode());
      }
    });
  };

  const insertQuote = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode());
      }
    });
  };

  const insertLink = () => {
    const url = prompt('Введите URL:');
    if (url) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
    }
  };

  // Compact button style
  const btn = (active = false, color?: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    padding: '0',
    border: 'none',
    background: active ? '#4b74ff' : (color || 'transparent'),
    color: active ? '#fff' : '#a9b7da',
    cursor: 'pointer',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.1s',
  });

  const btnWide = (color?: string, textColor?: string): React.CSSProperties => ({
    ...btn(false, color),
    width: 'auto',
    padding: '0 10px',
    gap: '4px',
    color: textColor || '#a9b7da',
    border: color ? `1px solid ${color}` : 'none',
  });

  const divider: React.CSSProperties = {
    width: '1px',
    height: '20px',
    background: 'rgba(255,255,255,0.1)',
    margin: '0 6px',
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '4px',
      padding: '6px 10px',
      background: 'rgba(0,0,0,0.3)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      minHeight: '40px',
      maxHeight: '80px',
    }}>
      {/* Row 1: Format buttons */}
      <button style={btn(isBold)} onClick={() => formatText('bold')} title="Жирный (Ctrl+B)">B</button>
      <button style={btn(isItalic)} onClick={() => formatText('italic')} title="Курсив (Ctrl+I)"><i>I</i></button>
      <button style={btn(isUnderline)} onClick={() => formatText('underline')} title="Подчёркнутый"><u>U</u></button>
      <button style={btn(isStrikethrough)} onClick={() => formatText('strikethrough')} title="Зачёркнутый"><s>S</s></button>
      
      <div style={divider} />
      
      <button style={btn()} onClick={() => formatHeading('h1')} title="Заголовок 1">H1</button>
      <button style={btn()} onClick={() => formatHeading('h2')} title="Заголовок 2">H2</button>
      <button style={btn()} onClick={() => formatHeading('h3')} title="Заголовок 3">H3</button>
      <button style={btn()} onClick={formatParagraph} title="Абзац">¶</button>
      
      <div style={divider} />
      
      <button style={btn()} onClick={() => formatList('bullet')} title="Маркированный список">•</button>
      <button style={btn()} onClick={() => formatList('number')} title="Нумерованный список">1.</button>
      
      <div style={divider} />
      
      <button style={btn()} onClick={insertLink} title="Ссылка">🔗</button>
      
      {/* Table dropdown */}
      <div style={{ position: 'relative' }}>
        <button style={btn()} onClick={() => setShowTableMenu(!showTableMenu)} title="Таблица">▦</button>
        {showTableMenu && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            background: '#1e293b',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            padding: '8px',
            zIndex: 1000,
            minWidth: '120px',
          }}>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>Вставить таблицу</div>
            {[[2,2], [3,3], [4,4], [5,3]].map(([r, c]) => (
              <button
                key={`${r}x${c}`}
                onClick={() => insertTable(r, c)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '4px 8px',
                  background: 'transparent',
                  border: 'none',
                  color: '#a9b7da',
                  fontSize: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderRadius: '4px',
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(75,116,255,0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {r} × {c}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <button style={btn()} onClick={insertQuote} title="Цитата">❝</button>
      <button style={btn()} onClick={insertCode} title="Код">&lt;/&gt;</button>
      
      <div style={divider} />
      
      <button style={btn()} onClick={() => formatAlignment('left')} title="По левому краю">⫷</button>
      <button style={btn()} onClick={() => formatAlignment('center')} title="По центру">⫸</button>
      <button style={btn()} onClick={() => formatAlignment('right')} title="По правому краю">⫸</button>
      <button style={btn()} onClick={() => formatAlignment('justify')} title="По ширине">☰</button>
      
      <div style={divider} />
      
      {/* Citation & Import */}
      {onInsertCitation && (
        <button 
          style={btnWide('rgba(74,222,128,0.3)', '#4ade80')} 
          onClick={onInsertCitation} 
          title="Вставить цитату"
        >
          ❝ Цитата
        </button>
      )}
      {onImportStatistic && (
        <button 
          style={btnWide('rgba(75,116,255,0.3)', '#4b74ff')} 
          onClick={onImportStatistic} 
          title="Импорт из статистики"
        >
          📊 Импорт
        </button>
      )}
      
      {/* Spacer */}
      <div style={{ flex: 1 }} />
      
      {/* View mode */}
      <div style={{
        display: 'inline-flex',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '6px',
        padding: '2px',
      }}>
        <button
          style={{
            padding: '4px 10px',
            border: 'none',
            background: viewMode === 'scroll' ? '#4b74ff' : 'transparent',
            color: viewMode === 'scroll' ? '#fff' : '#a9b7da',
            cursor: 'pointer',
            borderRadius: '4px',
            fontSize: '12px',
          }}
          onClick={() => onViewModeChange('scroll')}
        >
          📜 Лента
        </button>
        <button
          style={{
            padding: '4px 10px',
            border: 'none',
            background: viewMode === 'pages' ? '#4b74ff' : 'transparent',
            color: viewMode === 'pages' ? '#fff' : '#a9b7da',
            cursor: 'pointer',
            borderRadius: '4px',
            fontSize: '12px',
          }}
          onClick={() => onViewModeChange('pages')}
        >
          📄 Страницы
        </button>
      </div>
    </div>
  );
}
