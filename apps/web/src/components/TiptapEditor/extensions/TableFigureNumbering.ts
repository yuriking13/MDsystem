import { Extension } from '@tiptap/react';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

// Extension для автоматической нумерации таблиц и графиков
// Формат: "Таблица №X – Название" (над таблицей, выравнивание влево)
// Формат: "Рисунок №X – Название" (под рисунком/графиком)
export const TableFigureNumbering = Extension.create({
  name: 'tableFigureNumbering',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('tableFigureNumbering'),
        
        props: {
          decorations: (state) => {
            const decorations: Decoration[] = [];
            let tableNumber = 0;
            let figureNumber = 0;

            state.doc.descendants((node, pos) => {
              // Нумерация таблиц - формат "Таблица №X – Название"
              if (node?.type?.name === 'table') {
                tableNumber++;
                const currentTableNumber = tableNumber;
                
                // Пытаемся получить название таблицы из атрибутов
                const tableTitle = node.attrs?.tableTitle || node.attrs?.caption || '';
                const titleText = tableTitle 
                  ? `Таблица №${currentTableNumber} – ${tableTitle}`
                  : `Таблица №${currentTableNumber}`;
                
                const decoration = Decoration.widget(
                  pos,
                  () => {
                    const container = document.createElement('div');
                    container.className = 'table-caption-container';
                    container.contentEditable = 'false';
                    container.style.cssText = `
                      text-align: left;
                      margin-bottom: 8px;
                      user-select: none;
                      pointer-events: none;
                    `;
                    
                    // Номер таблицы (жирный)
                    const numberSpan = document.createElement('span');
                    numberSpan.style.fontWeight = 'bold';
                    numberSpan.style.color = '#1e293b';
                    numberSpan.style.fontSize = '14px';
                    numberSpan.textContent = `Таблица №${currentTableNumber}`;
                    container.appendChild(numberSpan);
                    
                    // Название таблицы (обычный шрифт)
                    if (tableTitle) {
                      const titleSpan = document.createElement('span');
                      titleSpan.style.color = '#1e293b';
                      titleSpan.style.fontSize = '14px';
                      titleSpan.textContent = ` – ${tableTitle}`;
                      container.appendChild(titleSpan);
                    }
                    
                    return container;
                  },
                  { side: -1, key: `table-${pos}` }
                );
                decorations.push(decoration);
              }

              // Нумерация графиков и рисунков (chartNode, image) - формат "Рисунок №X – Название"
              if (node?.type?.name === 'chartNode' || node?.type?.name === 'image') {
                figureNumber++;
                const currentFigureNumber = figureNumber;
                
                // Получаем название из атрибутов
                let figureTitle = '';
                if (node?.type?.name === 'chartNode') {
                  figureTitle = node.attrs?.title || node.attrs?.config?.title || '';
                } else if (node?.type?.name === 'image') {
                  figureTitle = node.attrs?.figureTitle || node.attrs?.alt || node.attrs?.title || '';
                }
                
                const decoration = Decoration.widget(
                  pos + node.nodeSize,
                  () => {
                    const container = document.createElement('div');
                    container.className = 'figure-caption-container';
                    container.contentEditable = 'false';
                    container.style.cssText = `
                      text-align: center;
                      margin-top: 8px;
                      margin-bottom: 16px;
                      user-select: none;
                      pointer-events: none;
                    `;
                    
                    // Номер рисунка (жирный)
                    const numberSpan = document.createElement('span');
                    numberSpan.style.fontWeight = 'bold';
                    numberSpan.style.color = '#1e293b';
                    numberSpan.style.fontSize = '14px';
                    numberSpan.textContent = `Рисунок №${currentFigureNumber}`;
                    container.appendChild(numberSpan);
                    
                    // Название рисунка (обычный шрифт)
                    if (figureTitle) {
                      const titleSpan = document.createElement('span');
                      titleSpan.style.color = '#1e293b';
                      titleSpan.style.fontSize = '14px';
                      titleSpan.textContent = ` – ${figureTitle}`;
                      container.appendChild(titleSpan);
                    }
                    
                    return container;
                  },
                  { side: 1, key: `figure-${pos}` }
                );
                decorations.push(decoration);
              }
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

export default TableFigureNumbering;
