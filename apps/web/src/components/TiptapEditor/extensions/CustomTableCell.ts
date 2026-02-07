import TableCell from "@tiptap/extension-table-cell";

export const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) => {
          return (
            element.style.backgroundColor ||
            element.getAttribute("data-bgcolor") ||
            null
          );
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
      // Высота ячейки (для ручного изменения высоты строки)
      rowHeight: {
        default: null,
        parseHTML: (element) => {
          const h =
            element.style.height || element.getAttribute("data-row-height");
          return h ? parseInt(h, 10) || null : null;
        },
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
    if (attrs.textAlign && attrs.textAlign !== "left") {
      styleParts.push(`text-align: ${attrs.textAlign}`);
    }
    if (attrs.verticalAlign && attrs.verticalAlign !== "top") {
      styleParts.push(`vertical-align: ${attrs.verticalAlign}`);
    }
    if (attrs.rowHeight) {
      styleParts.push(`height: ${attrs.rowHeight}px`);
    }

    const mergedAttrs: Record<string, any> = {
      ...HTMLAttributes,
      ...(styleParts.length ? { style: styleParts.join("; ") } : {}),
      ...(attrs.backgroundColor
        ? { "data-bgcolor": attrs.backgroundColor }
        : {}),
      ...(attrs.rowHeight
        ? { "data-row-height": String(attrs.rowHeight) }
        : {}),
    };

    return ["td", mergedAttrs, 0];
  },
});

export default CustomTableCell;
