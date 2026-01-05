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
          return {};
        },
      },
      textAlign: {
        default: null,
        parseHTML: (element) => element.style.textAlign || null,
        renderHTML: (attributes) => {
          return {};
        },
      },
      verticalAlign: {
        default: null,
        parseHTML: (element) => element.style.verticalAlign || null,
        renderHTML: (attributes) => {
          return {};
        },
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs;
    const styleParts: string[] = [];

    if (HTMLAttributes.style) {
      styleParts.push(HTMLAttributes.style as string);
    }
    if (attrs.backgroundColor) {
      styleParts.push(`background-color: ${attrs.backgroundColor}`);
    }
    if (attrs.textAlign && attrs.textAlign !== 'left') {
      styleParts.push(`text-align: ${attrs.textAlign}`);
    }
    if (attrs.verticalAlign && attrs.verticalAlign !== 'top') {
      styleParts.push(`vertical-align: ${attrs.verticalAlign}`);
    }

    const mergedAttrs: Record<string, any> = {
      ...HTMLAttributes,
      ...(styleParts.length ? { style: styleParts.join('; ') } : {}),
      ...(attrs.backgroundColor ? { 'data-bgcolor': attrs.backgroundColor } : {}),
    };

    return ['th', mergedAttrs, 0];
  },
});

export default CustomTableHeader;
