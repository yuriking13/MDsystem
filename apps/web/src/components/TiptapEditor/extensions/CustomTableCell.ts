import TableCell from '@tiptap/extension-table-cell';

export const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) => {
          return element.style.backgroundColor || element.getAttribute('data-bgcolor') || null;
        },
        renderHTML: (attributes) => {
          return {};  // Handled in combined style below
        },
      },
      textAlign: {
        default: null,
        parseHTML: (element) => element.style.textAlign || null,
        renderHTML: (attributes) => {
          return {};  // Handled in combined style below
        },
      },
      verticalAlign: {
        default: null,
        parseHTML: (element) => element.style.verticalAlign || null,
        renderHTML: (attributes) => {
          return {};  // Handled in combined style below
        },
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs;
    const customStyles: string[] = [];
    
    if (attrs.backgroundColor) {
      customStyles.push(`background-color: ${attrs.backgroundColor}`);
    }
    if (attrs.textAlign && attrs.textAlign !== 'left') {
      customStyles.push(`text-align: ${attrs.textAlign}`);
    }
    if (attrs.verticalAlign && attrs.verticalAlign !== 'top') {
      customStyles.push(`vertical-align: ${attrs.verticalAlign}`);
    }
    
    // Объединяем стили от TipTap (с шириной) и наши пользовательские стили
    const existingStyle = HTMLAttributes.style || '';
    const newStyle = customStyles.join('; ');
    const combinedStyle = [existingStyle, newStyle].filter(s => s?.trim()).join('; ');
    
    const combinedAttrs: Record<string, any> = {
      ...HTMLAttributes,
      ...(combinedStyle ? { style: combinedStyle } : {}),
      ...(attrs.backgroundColor ? { 'data-bgcolor': attrs.backgroundColor } : {}),
    };
    
    // КРИТИЧНО: сохраняем colwidth для ресайза
    if (attrs.colwidth) {
      combinedAttrs.colwidth = attrs.colwidth;
    }
    if (attrs.colspan) {
      combinedAttrs.colspan = attrs.colspan;
    }
    if (attrs.rowspan) {
      combinedAttrs.rowspan = attrs.rowspan;
    }
    
    return ['td', combinedAttrs, 0];
  },
});

export default CustomTableCell;
