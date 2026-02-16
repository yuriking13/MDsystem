import { Plugin } from "prosemirror-state";
import TableRow from "@tiptap/extension-table-row";
import type { CommandProps } from "@tiptap/react";
import { getInlineStyleValue } from "./inlineStyleUtils";

const createRowId = () =>
  `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const CustomTableRow = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      rowHeight: {
        default: null,
        parseHTML: (element) => {
          // Parse from data-attribute first (more reliable), then fallback to style
          const dataHeight = element.getAttribute("data-row-height");
          const styleHeight = getInlineStyleValue(element, "height");
          const rawHeight = dataHeight || styleHeight;
          if (!rawHeight) return null;
          const parsed = parseInt(rawHeight, 10);
          return parsed && parsed >= 10 ? parsed : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.rowHeight || attributes.rowHeight < 10) {
            return {};
          }
          // Enforce minimum height of 10px when rendering
          const safeHeight = Math.max(10, attributes.rowHeight);
          return {
            "data-row-height": String(safeHeight),
            style: `height: ${safeHeight}px; min-height: ${safeHeight}px;`,
          };
        },
      },
      rowId: {
        default: null,
        parseHTML: (element) => {
          return element.getAttribute("data-row-id") || createRowId();
        },
        renderHTML: (attributes) => {
          if (!attributes.rowId) {
            return {};
          }
          return { "data-row-id": attributes.rowId };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    const parentPlugins = this.parent?.() || [];
    const tableRowName = this.name;
    return [
      ...parentPlugins,
      new Plugin({
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) return null;
          let tr = newState.tr;
          let changed = false;

          newState.doc.descendants((node, pos) => {
            if (node.type.name === tableRowName && !node.attrs.rowId) {
              tr = tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                rowId: createRowId(),
              });
              changed = true;
            }
          });

          return changed ? tr : null;
        },
      }),
    ];
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setRowHeight:
        (height: number) =>
        ({ state, dispatch }: CommandProps) => {
          const safeHeight = Math.max(10, Math.round(height));
          const { $from } = state.selection;
          // Walk up the depth to find the tableRow node
          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            if (node?.type?.name === "tableRow") {
              const pos = $from.before(d);
              if (dispatch) {
                const tr = state.tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  rowHeight: safeHeight,
                });
                dispatch(tr);
              }
              return true;
            }
          }
          return false;
        },
      deleteRowHeight:
        () =>
        ({ state, dispatch }: CommandProps) => {
          const { $from } = state.selection;
          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            if (node?.type?.name === "tableRow") {
              const pos = $from.before(d);
              if (dispatch) {
                const tr = state.tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  rowHeight: null,
                });
                dispatch(tr);
              }
              return true;
            }
          }
          return false;
        },
    };
  },
});

export default CustomTableRow;
