import { Extension } from '@tiptap/react';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

// Extension для автоматической нумерации таблиц и графиков
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
              // Нумерация таблиц
              if (node?.type?.name === 'table') {
                tableNumber++;
                // Важно: захватываем текущее значение в локальную переменную
                const currentTableNumber = tableNumber;
                
                const decoration = Decoration.widget(
                  pos,
                  () => {
                    const el = document.createElement('div');
                    el.className = 'table-number-label';
                    el.textContent = `Таблица ${currentTableNumber}`;
                    el.contentEditable = 'false';
                    el.style.cssText = `
                      font-weight: bold;
                      text-align: center;
                      margin-bottom: 8px;
                      color: #1e293b;
                      font-size: 14px;
                      user-select: none;
                      pointer-events: none;
                    `;
                    return el;
                  },
                  { side: -1, key: `table-${pos}` }
                );
                decorations.push(decoration);
              }

              // Нумерация графиков (chartNode)
              if (node?.type?.name === 'chartNode') {
                figureNumber++;
                // Важно: захватываем текущее значение в локальную переменную
                const currentFigureNumber = figureNumber;
                
                const decoration = Decoration.widget(
                  pos + node.nodeSize,
                  () => {
                    const el = document.createElement('div');
                    el.className = 'figure-number-label';
                    el.textContent = `Рисунок ${currentFigureNumber}`;
                    el.contentEditable = 'false';
                    el.style.cssText = `
                      font-weight: bold;
                      text-align: center;
                      margin-top: 8px;
                      margin-bottom: 16px;
                      color: #1e293b;
                      font-size: 14px;
                      user-select: none;
                      pointer-events: none;
                    `;
                    return el;
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
