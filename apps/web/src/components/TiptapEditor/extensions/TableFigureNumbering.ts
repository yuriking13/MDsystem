import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

const createCaption = (
  kind: "table" | "figure",
  number: number,
  title: string,
): HTMLDivElement => {
  const container = document.createElement("div");
  container.className =
    kind === "table" ? "table-caption-container" : "figure-caption-container";
  container.contentEditable = "false";

  const numberSpan = document.createElement("span");
  numberSpan.className = "editor-caption-number";
  numberSpan.textContent =
    kind === "table" ? `Таблица №${number}` : `Рисунок №${number}`;
  container.appendChild(numberSpan);

  if (title) {
    const titleSpan = document.createElement("span");
    titleSpan.className = "editor-caption-title";
    titleSpan.textContent = ` – ${title}`;
    container.appendChild(titleSpan);
  }

  return container;
};

// Extension для автоматической нумерации таблиц и графиков
// Формат: "Таблица №X – Название" (над таблицей, выравнивание влево)
// Формат: "Рисунок №X – Название" (под рисунком/графиком)
export const TableFigureNumbering = Extension.create({
  name: "tableFigureNumbering",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("tableFigureNumbering"),

        props: {
          decorations: (state) => {
            const decorations: Decoration[] = [];
            let tableNumber = 0;
            let figureNumber = 0;

            state.doc.descendants((node, pos) => {
              // Нумерация таблиц - формат "Таблица №X – Название"
              if (node?.type?.name === "table") {
                tableNumber++;
                const currentTableNumber = tableNumber;

                // Пытаемся получить название таблицы из атрибутов
                const tableTitle =
                  node.attrs?.tableTitle || node.attrs?.caption || "";
                const titleText = tableTitle
                  ? `Таблица №${currentTableNumber} – ${tableTitle}`
                  : `Таблица №${currentTableNumber}`;

                const decoration = Decoration.widget(
                  pos,
                  () => createCaption("table", currentTableNumber, tableTitle),
                  { side: -1, key: `table-${pos}` },
                );
                decorations.push(decoration);
              }

              // Нумерация графиков и рисунков (chartNode, image) - формат "Рисунок №X – Название"
              if (
                node?.type?.name === "chartNode" ||
                node?.type?.name === "image"
              ) {
                figureNumber++;
                const currentFigureNumber = figureNumber;

                // Получаем название из атрибутов
                let figureTitle = "";
                if (node?.type?.name === "chartNode") {
                  figureTitle =
                    node.attrs?.title || node.attrs?.config?.title || "";
                } else if (node?.type?.name === "image") {
                  figureTitle =
                    node.attrs?.figureTitle ||
                    node.attrs?.alt ||
                    node.attrs?.title ||
                    "";
                }

                const decoration = Decoration.widget(
                  pos + node.nodeSize,
                  () =>
                    createCaption("figure", currentFigureNumber, figureTitle),
                  { side: 1, key: `figure-${pos}` },
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
