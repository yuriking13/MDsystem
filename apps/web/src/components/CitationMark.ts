import { Mark, mergeAttributes } from "@tiptap/react";

export interface CitationOptions {
  HTMLAttributes: Record<string, unknown>;
  onCitationClick?: (citationNumber: number, citationId: string) => void;
}

export const CitationMark = Mark.create<CitationOptions>({
  name: "citation",

  addOptions() {
    return {
      HTMLAttributes: {},
      onCitationClick: undefined,
    };
  },

  addAttributes() {
    return {
      citationNumber: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-citation-number"),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.citationNumber) {
            return {};
          }
          return {
            "data-citation-number": attributes.citationNumber,
          };
        },
      },
      citationId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-citation-id"),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.citationId) {
            return {};
          }
          return {
            "data-citation-id": attributes.citationId,
          };
        },
      },
      note: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-note"),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.note) {
            return {};
          }
          return {
            "data-note": attributes.note,
            title: attributes.note as string,
          };
        },
      },
      articleTitle: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-article-title"),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.articleTitle) {
            return {};
          }
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
        tag: "span[data-citation-number]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: "citation-link",
      }),
      0,
    ];
  },
});

export default CitationMark;
