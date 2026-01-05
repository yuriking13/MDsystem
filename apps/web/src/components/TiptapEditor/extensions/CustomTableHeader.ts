import TableHeader from '@tiptap/extension-table-header';

export const CustomTableHeader = TableHeader.extend({
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
    const styles: string[] = [];
    
    if (attrs.backgroundColor) {
      styles.push(`background-color: ${attrs.backgroundColor}`);
    }
    if (attrs.textAlign && attrs.textAlign !== 'left') {
      styles.push(`text-align: ${attrs.textAlign}`);
    }
    if (attrs.verticalAlign && attrs.verticalAlign !== 'top') {
      styles.push(`vertical-align: ${attrs.verticalAlign}`);
    }
    
    const combinedAttrs: Record<string, any> = {
      ...HTMLAttributes,
      ...(styles.length > 0 ? { style: styles.join('; ') } : {}),
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
    
    return ['th', combinedAttrs, 0];
  },
});

export default CustomTableHeader;
