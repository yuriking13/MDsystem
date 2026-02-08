import TableRow from "@tiptap/extension-table-row";

export const CustomTableRow = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      rowHeight: {
        default: null,
        parseHTML: (element) => {
          // Parse from data-attribute first (more reliable), then fallback to style
          const dataHeight = element.getAttribute('data-row-height');
          const styleHeight = element.style.height;
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
            'data-row-height': String(safeHeight),
            style: `height: ${safeHeight}px; min-height: ${safeHeight}px;`,
          };
        },
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setRowHeight:
        (height: number) =>
        ({ state, dispatch }: any) => {
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
        ({ state, dispatch }: any) => {
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
