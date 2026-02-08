import TableRow from '@tiptap/extension-table-row';

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
          const parsed = rawHeight ? parseInt(rawHeight, 10) : null;
          // Enforce minimum height of 10px
          return parsed ? Math.max(10, parsed) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.rowHeight) {
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
        ({ commands }: any) => {
          return commands.updateAttributes('tableRow', { rowHeight: height });
        },
      deleteRowHeight:
        () =>
        ({ commands }: any) => {
          return commands.updateAttributes('tableRow', { rowHeight: null });
        },
    };
  },
});

export default CustomTableRow;
