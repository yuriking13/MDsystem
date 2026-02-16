import TableHeader from "@tiptap/extension-table-header";
import { getInlineStyleValue } from "./inlineStyleUtils";

export const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) => {
          return (
            getInlineStyleValue(element, "background-color") ||
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
        parseHTML: (element) => getInlineStyleValue(element, "text-align"),
        renderHTML: (attributes) => {
          return {};
        },
      },
      verticalAlign: {
        default: null,
        parseHTML: (element) => getInlineStyleValue(element, "vertical-align"),
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

    const mergedAttrs: Record<string, unknown> = {
      ...HTMLAttributes,
      ...(styleParts.length ? { style: styleParts.join("; ") } : {}),
      ...(attrs.backgroundColor
        ? { "data-bgcolor": attrs.backgroundColor }
        : {}),
    };

    return ["th", mergedAttrs, 0];
  },
});

export default CustomTableHeader;
