import TableCell from '@tiptap/extension-table-cell';

export const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.style.backgroundColor || element.getAttribute('data-bgcolor'),
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            'data-bgcolor': attributes.backgroundColor,
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
      textAlign: {
        default: 'left',
        parseHTML: (element) => element.style.textAlign || 'left',
        renderHTML: (attributes) => {
          if (!attributes.textAlign || attributes.textAlign === 'left') {
            return {};
          }
          return {
            style: `text-align: ${attributes.textAlign}`,
          };
        },
      },
      verticalAlign: {
        default: 'top',
        parseHTML: (element) => element.style.verticalAlign || 'top',
        renderHTML: (attributes) => {
          if (!attributes.verticalAlign || attributes.verticalAlign === 'top') {
            return {};
          }
          return {
            style: `vertical-align: ${attributes.verticalAlign}`,
          };
        },
      },
    };
  },
});

export default CustomTableCell;
