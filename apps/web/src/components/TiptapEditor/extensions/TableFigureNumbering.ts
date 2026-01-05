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
        
        state: {
          init: () => {
            return {
              tableCount: 0,
              figureCount: 0,
            };
          },
          apply: (tr, value) => {
            return value;
          },
        },

        props: {
          decorations: (state) => {
            const decorations: Decoration[] = [];
            let tableNumber = 0;
            let figureNumber = 0;

            state.doc.descendants((node, pos) => {
              // Нумерация таблиц
              if (node.type.name === 'table') {
                tableNumber++;
                const decoration = Decoration.widget(
                  pos,
                  () => {
                    const el = document.createElement('div');
                    el.className = 'table-number';
                    el.textContent = `Таблица ${tableNumber}`;
                    el.contentEditable = 'false';
                    el.style.cssText = `
                      font-weight: bold;
                      text-align: center;
                      margin-bottom: 8px;
                      color: #1e293b;
                      font-size: 14px;
                      user-select: none;
                    `;
                    return el;
                  },
                  { side: -1 }
                );
                decorations.push(decoration);
              }

              // Нумерация графиков (chartNode)
              if (node.type.name === 'chartNode') {
                figureNumber++;
                const decoration = Decoration.widget(
                  pos,
                  () => {
                    const el = document.createElement('div');
                    el.className = 'figure-number';
                    el.textContent = `Рисунок ${figureNumber}`;
                    el.contentEditable = 'false';
                    el.style.cssText = `
                      font-weight: bold;
                      text-align: center;
                      margin-top: 8px;
                      color: #1e293b;
                      font-size: 14px;
                      user-select: none;
                    `;
                    return el;
                  },
                  { side: 1 }
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
