import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import type { CitationStyle } from '../../lib/api';
import { STYLE_CONFIGS } from './TiptapEditor';

interface TiptapToolbarProps {
  editor: Editor;
  onInsertCitation?: () => void;
  onImportStatistic?: () => void;
  onToggleOutline?: () => void;
  onCreateChartFromTable?: (tableHtml: string) => void;
  showOutline?: boolean;
  citationStyle?: CitationStyle;
}

export default function TiptapToolbar({ 
  editor, 
  onInsertCitation,
  onImportStatistic,
  onToggleOutline,
  onCreateChartFromTable,
  showOutline,
  citationStyle = 'gost',
}: TiptapToolbarProps) {
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showTableEditMenu, setShowTableEditMenu] = useState(false);
  const tableMenuRef = useRef<HTMLDivElement>(null);
  const tableEditMenuRef = useRef<HTMLDivElement>(null);

  const styleConfig = STYLE_CONFIGS[citationStyle];

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

  const isInTable = editor.isActive('table');

  // Button styles
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
    minWidth: '160px',
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

  const insertTable = (rows: number, cols: number) => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    setShowTableMenu(false);
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = prompt('Введите URL:', previousUrl || 'https://');
    if (url === null) return;
    
    if (url === '') {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="tiptap-toolbar">
      {/* Outline toggle */}
      <button 
        style={btn(showOutline, showOutline ? 'rgba(75,116,255,0.2)' : undefined)} 
        onClick={onToggleOutline}
        title="Содержание документа"
      >
        📑
      </button>

      <div style={divider} />

      {/* Text formatting */}
      <button 
        style={btn(editor.isActive('bold'))} 
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Жирный (Ctrl+B)"
      >
        <b>B</b>
      </button>
      <button 
        style={btn(editor.isActive('italic'))} 
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Курсив (Ctrl+I)"
      >
        <i>I</i>
      </button>
      <button 
        style={btn(editor.isActive('underline'))} 
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Подчёркнутый (Ctrl+U)"
      >
        <u>U</u>
      </button>
      <button 
        style={btn(editor.isActive('strike'))} 
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Зачёркнутый"
      >
        <s>S</s>
      </button>

      <div style={divider} />

      {/* Headings */}
      <button 
        style={btn(editor.isActive('heading', { level: 1 }))} 
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Заголовок 1"
      >
        H1
      </button>
      <button 
        style={btn(editor.isActive('heading', { level: 2 }))} 
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Заголовок 2"
      >
        H2
      </button>
      <button 
        style={btn(editor.isActive('heading', { level: 3 }))} 
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Заголовок 3"
      >
        H3
      </button>
      <button 
        style={btn()} 
        onClick={() => editor.chain().focus().setParagraph().run()}
        title="Абзац"
      >
        ¶
      </button>

      <div style={divider} />

      {/* Lists */}
      <button 
        style={btn(editor.isActive('bulletList'))} 
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Маркированный список"
      >
        •
      </button>
      <button 
        style={btn(editor.isActive('orderedList'))} 
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Нумерованный список"
      >
        1.
      </button>

      <div style={divider} />

      {/* Link */}
      <button 
        style={btn(editor.isActive('link'))} 
        onClick={setLink}
        title="Ссылка"
      >
        🔗
      </button>

      {/* Insert Table */}
      <div style={{ position: 'relative' }} ref={tableMenuRef}>
        <button 
          style={btn()} 
          onClick={() => { setShowTableMenu(!showTableMenu); setShowTableEditMenu(false); }}
          title="Вставить таблицу"
        >
          ▦
        </button>
        {showTableMenu && (
          <div style={dropdownStyle}>
            <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', padding: '0 4px' }}>
              Вставить таблицу
            </div>
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

      {/* Edit Table (when in table) */}
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
              <button 
                onClick={() => { editor.chain().focus().addRowBefore().run(); setShowTableEditMenu(false); }}
                style={dropdownItemStyle}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(75,116,255,0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                ↑ Добавить строку выше
              </button>
              <button 
                onClick={() => { editor.chain().focus().addRowAfter().run(); setShowTableEditMenu(false); }}
                style={dropdownItemStyle}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(75,116,255,0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                ↓ Добавить строку ниже
              </button>
              <button 
                onClick={() => { editor.chain().focus().deleteRow().run(); setShowTableEditMenu(false); }}
                style={{...dropdownItemStyle, color: '#f87171'}}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(248,113,113,0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                ✕ Удалить строку
              </button>
              
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '6px 0' }} />
              
              <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', padding: '0 4px' }}>Столбцы</div>
              <button 
                onClick={() => { editor.chain().focus().addColumnBefore().run(); setShowTableEditMenu(false); }}
                style={dropdownItemStyle}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(75,116,255,0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                ← Добавить столбец слева
              </button>
              <button 
                onClick={() => { editor.chain().focus().addColumnAfter().run(); setShowTableEditMenu(false); }}
                style={dropdownItemStyle}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(75,116,255,0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                → Добавить столбец справа
              </button>
              <button 
                onClick={() => { editor.chain().focus().deleteColumn().run(); setShowTableEditMenu(false); }}
                style={{...dropdownItemStyle, color: '#f87171'}}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(248,113,113,0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                ✕ Удалить столбец
              </button>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '6px 0' }} />

              <button 
                onClick={() => { editor.chain().focus().mergeCells().run(); setShowTableEditMenu(false); }}
                style={dropdownItemStyle}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(75,116,255,0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                ⊞ Объединить ячейки
              </button>
              <button 
                onClick={() => { editor.chain().focus().splitCell().run(); setShowTableEditMenu(false); }}
                style={dropdownItemStyle}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(75,116,255,0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                ⊟ Разделить ячейку
              </button>
              <button 
                onClick={() => { editor.chain().focus().deleteTable().run(); setShowTableEditMenu(false); }}
                style={{...dropdownItemStyle, color: '#f87171'}}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(248,113,113,0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                🗑 Удалить таблицу
              </button>

              {onCreateChartFromTable && (
                <>
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '6px 0' }} />
                  <button 
                    onClick={() => {
                      // Get the table HTML from the editor
                      const { state } = editor;
                      const { from } = state.selection;
                      let tableNode: any = null;
                      
                      state.doc.nodesBetween(0, state.doc.content.size, (node, pos) => {
                        if (node.type.name === 'table') {
                          if (pos <= from && pos + node.nodeSize >= from) {
                            tableNode = node;
                          }
                        }
                      });
                      
                      if (tableNode) {
                        // Create HTML from the table node
                        const div = document.createElement('div');
                        const tableEl = document.createElement('table');
                        
                        tableNode.content.forEach((row: any) => {
                          const tr = document.createElement('tr');
                          row.content.forEach((cell: any) => {
                            const cellEl = document.createElement(cell.type.name === 'tableHeader' ? 'th' : 'td');
                            cellEl.textContent = cell.textContent;
                            tr.appendChild(cellEl);
                          });
                          tableEl.appendChild(tr);
                        });
                        
                        div.appendChild(tableEl);
                        onCreateChartFromTable(div.innerHTML);
                      }
                      setShowTableEditMenu(false);
                    }}
                    style={{...dropdownItemStyle, color: '#4ade80'}}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(74,222,128,0.2)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    📊 Создать график
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <button 
        style={btn(editor.isActive('blockquote'))} 
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Цитата"
      >
        ❝
      </button>
      <button 
        style={btn(editor.isActive('codeBlock'))} 
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Код"
      >
        &lt;/&gt;
      </button>

      <div style={divider} />

      {/* Alignment */}
      <button 
        style={btn(editor.isActive({ textAlign: 'left' }))} 
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        title="По левому краю"
      >
        ⫷
      </button>
      <button 
        style={btn(editor.isActive({ textAlign: 'center' }))} 
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        title="По центру"
      >
        ☰
      </button>
      <button 
        style={btn(editor.isActive({ textAlign: 'right' }))} 
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        title="По правому краю"
      >
        ⫸
      </button>
      <button 
        style={btn(editor.isActive({ textAlign: 'justify' }))} 
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        title="По ширине"
      >
        ≡
      </button>

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
          title="Импорт графика"
        >
          📊 Импорт
        </button>
      )}

      {/* Style indicator */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span 
          className="style-badge"
          style={{
            fontSize: '10px',
            padding: '4px 8px',
            background: 'rgba(75,116,255,0.1)',
            borderRadius: '4px',
            color: '#64748b',
          }}
          title={`Стиль: ${styleConfig.name}`}
        >
          {citationStyle.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
