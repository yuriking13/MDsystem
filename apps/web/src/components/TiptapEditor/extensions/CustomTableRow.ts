import TableRow from '@tiptap/extension-table-row';

export const CustomTableRow = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      rowHeight: {
        default: null,
        parseHTML: (element) => {
          const height = element.style.height;
          return height ? parseInt(height, 10) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.rowHeight) {
            return {};
          }
          return {
            style: `height: ${attributes.rowHeight}px;`,
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
