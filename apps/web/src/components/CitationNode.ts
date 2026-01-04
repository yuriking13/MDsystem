import { Node, mergeAttributes } from "@tiptap/react";

export interface CitationNodeOptions {
  HTMLAttributes: Record<string, unknown>;
}

/**
 * Citation Node - inline node для ссылки на источник [n]
 * В отличие от Mark, Node не может "растекаться" на соседний текст
 */
export const CitationNode = Node.create<CitationNodeOptions>({
  name: "citationNode",
  
  group: "inline",
  inline: true,
  atom: true, // Атомарный узел - не редактируется изнутри
  selectable: true,
  draggable: false,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      citationNumber: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-citation-number"),
        renderHTML: (attributes) => ({
          "data-citation-number": attributes.citationNumber,
        }),
      },
      citationId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-citation-id"),
        renderHTML: (attributes) => ({
          "data-citation-id": attributes.citationId,
        }),
      },
      note: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-note"),
        renderHTML: (attributes) => {
          if (!attributes.note) return {};
          return {
            "data-note": attributes.note,
            title: attributes.note,
          };
        },
      },
      articleTitle: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-article-title"),
        renderHTML: (attributes) => {
          if (!attributes.articleTitle) return {};
          return {
            "data-article-title": attributes.articleTitle,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span.citation-ref[data-citation-number]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const num = node.attrs.citationNumber || "?";
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: "citation-ref",
      }),
      `[${num}]`,
    ];
  },
});

export default CitationNode;
