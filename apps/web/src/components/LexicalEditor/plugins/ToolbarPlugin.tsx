import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  $getSelection, 
  $isRangeSelection, 
  FORMAT_TEXT_COMMAND, 
  FORMAT_ELEMENT_COMMAND,
  $createParagraphNode,
} from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { 
  INSERT_TABLE_COMMAND,
  $isTableCellNode,
  $isTableRowNode,
  TableCellNode,
  TableRowNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $insertTableColumn__EXPERIMENTAL,
  $insertTableRow__EXPERIMENTAL,
  $deleteTableColumn__EXPERIMENTAL,
  $deleteTableRow__EXPERIMENTAL,
} from '@lexical/table';
import { $createCodeNode } from '@lexical/code';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $getNearestNodeOfType } from '@lexical/utils';
import React, { useCallback, useEffect, useState, useRef } from 'react';

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
  const [showTableEditMenu, setShowTableEditMenu] = useState(false);
  const [isInTable, setIsInTable] = useState(false);
  const tableMenuRef = useRef<HTMLDivElement>(null);
  const tableEditMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tableMenuRef.current && !tableMenuRef.current.contains(e.target as Node)) {
        setShowTableMenu(false);
      }
      if (tableEditMenuRef.current && !tableEditMenuRef.current.contains(e.target as Node)) {
        setShowTableEditMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      
      // Check if in table
      const anchorNode = selection.anchor.getNode();
      const tableCell = $getNearestNodeOfType(anchorNode, TableCellNode);
      setIsInTable(tableCell !== null);
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

  // Table operations
  const insertRowAbove = () => {
    editor.update(() => {
      $insertTableRow__EXPERIMENTAL(false);
    });
    setShowTableEditMenu(false);
  };

  const insertRowBelow = () => {
    editor.update(() => {
      $insertTableRow__EXPERIMENTAL(true);
    });
    setShowTableEditMenu(false);
  };

  const insertColumnLeft = () => {
    editor.update(() => {
      $insertTableColumn__EXPERIMENTAL(false);
    });
    setShowTableEditMenu(false);
  };

  const insertColumnRight = () => {
    editor.update(() => {
      $insertTableColumn__EXPERIMENTAL(true);
    });
    setShowTableEditMenu(false);
  };

  const deleteRow = () => {
    editor.update(() => {
      $deleteTableRow__EXPERIMENTAL();
    });
    setShowTableEditMenu(false);
  };

  const deleteColumn = () => {
    editor.update(() => {
      $deleteTableColumn__EXPERIMENTAL();
    });
    setShowTableEditMenu(false);
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

  // Styles
  const toolbarStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    background: 'rgba(15, 23, 42, 0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    minHeight: '40px',
  };

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
    margin: '0 4px',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '4px',
    background: '#1e293b',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    padding: '6px',
    zIndex: 1000,
    minWidth: '140px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  };

  const dropdownItemStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '6px 10px',
    background: 'transparent',
    border: 'none',
    color: '#a9b7da',
    fontSize: '12px',
    textAlign: 'left',
    cursor: 'pointer',
    borderRadius: '4px',
  };

  return (
    <div style={toolbarStyle}>
      {/* Text formatting */}
      <button style={btn(isBold)} onClick={() => formatText('bold')} title="Жирный (Ctrl+B)"><b>B</b></button>
      <button style={btn(isItalic)} onClick={() => formatText('italic')} title="Курсив (Ctrl+I)"><i>I</i></button>
      <button style={btn(isUnderline)} onClick={() => formatText('underline')} title="Подчёркнутый"><u>U</u></button>
      <button style={btn(isStrikethrough)} onClick={() => formatText('strikethrough')} title="Зачёркнутый"><s>S</s></button>
      
      <div style={divider} />
      
      {/* Headings */}
      <button style={btn()} onClick={() => formatHeading('h1')} title="Заголовок 1">H1</button>
      <button style={btn()} onClick={() => formatHeading('h2')} title="Заголовок 2">H2</button>
      <button style={btn()} onClick={() => formatHeading('h3')} title="Заголовок 3">H3</button>
      <button style={btn()} onClick={formatParagraph} title="Абзац">¶</button>
      
      <div style={divider} />
      
      {/* Lists */}
      <button style={btn()} onClick={() => formatList('bullet')} title="Маркированный список">•</button>
      <button style={btn()} onClick={() => formatList('number')} title="Нумерованный список">1.</button>
      
      <div style={divider} />
      
      {/* Link */}
      <button style={btn()} onClick={insertLink} title="Ссылка">🔗</button>
      
      {/* Insert Table */}
      <div style={{ position: 'relative' }} ref={tableMenuRef}>
        <button style={btn()} onClick={() => { setShowTableMenu(!showTableMenu); setShowTableEditMenu(false); }} title="Вставить таблицу">
          ▦
        </button>
        {showTableMenu && (
          <div style={dropdownStyle}>
            <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', padding: '0 4px' }}>Вставить таблицу</div>
            {[[2,2], [3,3], [4,4], [5,3]].map(([r, c]) => (
              <button
                key={`${r}x${c}`}
                onClick={() => insertTable(r, c)}
                style={dropdownItemStyle}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(75,116,255,0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {r} × {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Edit Table (only visible when in table) */}
      {isInTable && (
        <div style={{ position: 'relative' }} ref={tableEditMenuRef}>
          <button 
            style={btn(false, 'rgba(75,116,255,0.2)')} 
            onClick={() => { setShowTableEditMenu(!showTableEditMenu); setShowTableMenu(false); }} 
            title="Редактировать таблицу"
          >
            ⚙
          </button>
          {showTableEditMenu && (
            <div style={dropdownStyle}>
              <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', padding: '0 4px' }}>Строки</div>
              <button onClick={insertRowAbove} style={dropdownItemStyle} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(75,116,255,0.2)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                ↑ Добавить строку выше
              </button>
              <button onClick={insertRowBelow} style={dropdownItemStyle} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(75,116,255,0.2)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                ↓ Добавить строку ниже
              </button>
              <button onClick={deleteRow} style={{...dropdownItemStyle, color: '#f87171'}} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(248,113,113,0.2)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                ✕ Удалить строку
              </button>
              
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '6px 0' }} />
              
              <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', padding: '0 4px' }}>Столбцы</div>
              <button onClick={insertColumnLeft} style={dropdownItemStyle} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(75,116,255,0.2)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                ← Добавить столбец слева
              </button>
              <button onClick={insertColumnRight} style={dropdownItemStyle} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(75,116,255,0.2)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                → Добавить столбец справа
              </button>
              <button onClick={deleteColumn} style={{...dropdownItemStyle, color: '#f87171'}} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(248,113,113,0.2)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                ✕ Удалить столбец
              </button>
            </div>
          )}
        </div>
      )}
      
      <button style={btn()} onClick={insertQuote} title="Цитата">❝</button>
      <button style={btn()} onClick={insertCode} title="Код">&lt;/&gt;</button>
      
      <div style={divider} />
      
      {/* Alignment */}
      <button style={btn()} onClick={() => formatAlignment('left')} title="По левому краю">⫷</button>
      <button style={btn()} onClick={() => formatAlignment('center')} title="По центру">☰</button>
      <button style={btn()} onClick={() => formatAlignment('right')} title="По правому краю">⫸</button>
      <button style={btn()} onClick={() => formatAlignment('justify')} title="По ширине">≡</button>
      
      <div style={divider} />
      
      {/* Citation & Import */}
      {onInsertCitation && (
        <button style={btnWide('rgba(74,222,128,0.3)', '#4ade80')} onClick={onInsertCitation} title="Вставить цитату">
          ❝ Цитата
        </button>
      )}
      {onImportStatistic && (
        <button style={btnWide('rgba(75,116,255,0.3)', '#4b74ff')} onClick={onImportStatistic} title="Импорт">
          📊 Импорт
        </button>
      )}
      
      <div style={{ flex: 1 }} />
      
      {/* View mode */}
      <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '2px' }}>
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
