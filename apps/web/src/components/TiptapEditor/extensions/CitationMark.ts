import { Node, mergeAttributes } from '@tiptap/react';
import { Node as PMNode } from 'prosemirror-model';
import { Plugin, PluginKey } from 'prosemirror-state';

export interface CitationMarkOptions {
  HTMLAttributes: Record<string, any>;
}

export interface CitationAttrs {
  citationId: string;
  citationNumber: number;
  articleId: string;
  note?: string;
}

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    citation: {
      setCitation: (attrs: CitationAttrs) => ReturnType;
      updateCitationNumbers: () => ReturnType;
    };
  }
}

// Inline node для цитаты [1]
export const CitationMark = Node.create<CitationMarkOptions>({
  name: 'citation',

  group: 'inline',
  
  inline: true,
  
  atom: true,
  
  selectable: true,
  
  draggable: false,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      citationId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-citation-id'),
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.citationId) {
            return {};
          }
          return {
            'data-citation-id': attributes.citationId,
          };
        },
      },
      citationNumber: {
        default: 1,
        parseHTML: (element: HTMLElement) => {
          const num = element.getAttribute('data-citation-number');
          return num ? parseInt(num, 10) : 1;
        },
        renderHTML: (attributes: Record<string, any>) => {
          return {
            'data-citation-number': attributes.citationNumber,
          };
        },
      },
      articleId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-article-id'),
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.articleId) {
            return {};
          }
          return {
            'data-article-id': attributes.articleId,
          };
        },
      },
      note: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-note') || '',
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.note) {
            return {};
          }
          return {
            'data-note': attributes.note,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span.citation-ref',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }: { node: any; HTMLAttributes: Record<string, any> }) {
    const num = node.attrs.citationNumber || 1;
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'citation-ref',
      }),
      `[${num}]`,
    ];
  },

  addCommands() {
    return {
      setCitation:
        (attrs: CitationAttrs) =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },

      // Перенумеровать все цитаты в документе
      updateCitationNumbers:
        () =>
        ({ tr, state, dispatch }: any) => {
          const citations: Array<{ pos: number; node: PMNode; articleId: string }> = [];

          // Собрать все цитаты
          state.doc.descendants((node: any, pos: number) => {
            if (node?.type?.name === this.name) {
              citations.push({
                pos,
                node,
                articleId: node.attrs.articleId,
              });
            }
          });

          // Создать маппинг articleId -> номер
          const articleToNumber = new Map<string, number>();
          let currentNumber = 1;

          // Присвоить номера в порядке появления в документе
          for (const citation of citations) {
            if (!articleToNumber.has(citation.articleId)) {
              articleToNumber.set(citation.articleId, currentNumber);
              currentNumber++;
            }
          }

          // Обновить номера
          for (const citation of citations) {
            const newNumber = articleToNumber.get(citation.articleId);
            if (newNumber !== undefined && newNumber !== citation.node.attrs.citationNumber) {
              tr.setNodeMarkup(citation.pos, undefined, {
                ...citation.node.attrs,
                citationNumber: newNumber,
              });
            }
          }

          if (dispatch) {
            dispatch(tr);
          }

          return true;
        },
    };
  },

  // Плагин для автоматической перенумерации при изменениях
  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('citationRenumber');
    
    return [
      new Plugin({
        key: pluginKey,
        state: {
          init: () => null,
          apply: (tr: any, value: any) => {
            // Запускаем перенумерацию при изменении документа
            if (tr.docChanged) {
              // Используем setTimeout, чтобы не блокировать основной поток
              setTimeout(() => {
                (this.editor.commands as any).updateCitationNumbers();
              }, 0);
            }
            return value;
          },
        },
      }),
    ];
  },
});

export default CitationMark;
