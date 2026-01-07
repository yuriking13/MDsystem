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
  subNumber?: number; // Номер цитаты внутри источника (n#k)
}

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    citation: {
      setCitation: (attrs: CitationAttrs) => ReturnType;
      updateCitationNumbers: () => ReturnType;
      removeCitationById: (citationId: string) => ReturnType;
    };
  }
}

// Inline node для цитаты [n] где n - номер источника
// Номера цитат всегда компактные (1, 2, 3...) без пропусков
// Один источник может иметь несколько цитат (n#1, n#2, n#3)
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
      subNumber: {
        default: 1,
        parseHTML: (element: HTMLElement) => {
          const num = element.getAttribute('data-sub-number');
          return num ? parseInt(num, 10) : 1;
        },
        renderHTML: (attributes: Record<string, any>) => {
          return {
            'data-sub-number': attributes.subNumber || 1,
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
    // Отображаем только номер источника [n]
    // Полный идентификатор n#k показывается в списке литературы
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
            attrs: {
              ...attrs,
              subNumber: attrs.subNumber || 1,
            },
          });
        },

      // Удалить цитату по ID
      removeCitationById:
        (citationId: string) =>
        ({ tr, state, dispatch }: any) => {
          let found = false;
          
          state.doc.descendants((node: any, pos: number) => {
            if (node?.type?.name === this.name && node.attrs.citationId === citationId) {
              tr.delete(pos, pos + node.nodeSize);
              found = true;
              return false; // stop iteration
            }
          });
          
          if (found && dispatch) {
            dispatch(tr);
          }
          
          return found;
        },

      // Перенумеровать все цитаты в документе
      // Логика:
      // 1. Собрать все цитаты в порядке появления
      // 2. Присвоить номера статьям в порядке первого появления
      // 3. Все цитаты одной статьи получают одинаковый номер
      // 4. Номера всегда последовательны (1, 2, 3...) без пропусков
      updateCitationNumbers:
        () =>
        ({ tr, state, dispatch }: any) => {
          const citations: Array<{ pos: number; node: PMNode; articleId: string; citationId: string }> = [];

          // Собрать все цитаты в порядке появления
          state.doc.descendants((node: any, pos: number) => {
            if (node?.type?.name === this.name) {
              citations.push({
                pos,
                node,
                articleId: node.attrs.articleId,
                citationId: node.attrs.citationId,
              });
            }
          });

          if (citations.length === 0) {
            return true;
          }

          // Создать маппинг articleId -> номер (в порядке первого появления)
          const articleToNumber = new Map<string, number>();
          let currentNumber = 1;

          for (const citation of citations) {
            if (!articleToNumber.has(citation.articleId)) {
              articleToNumber.set(citation.articleId, currentNumber);
              currentNumber++;
            }
          }

          // Подсчитать sub_number для каждой статьи (по порядку появления в документе)
          const articleSubCounters = new Map<string, number>();
          const citationToSubNumber = new Map<string, number>();

          for (const citation of citations) {
            const counter = (articleSubCounters.get(citation.articleId) || 0) + 1;
            articleSubCounters.set(citation.articleId, counter);
            citationToSubNumber.set(citation.citationId, counter);
          }

          // Обновить номера (в обратном порядке, чтобы позиции не сбивались)
          let hasChanges = false;
          const sortedCitations = [...citations].sort((a, b) => b.pos - a.pos);

          for (const citation of sortedCitations) {
            const newNumber = articleToNumber.get(citation.articleId);
            const newSubNumber = citationToSubNumber.get(citation.citationId) || 1;
            
            if (newNumber !== undefined && 
                (newNumber !== citation.node.attrs.citationNumber || 
                 newSubNumber !== citation.node.attrs.subNumber)) {
              tr.setNodeMarkup(citation.pos, undefined, {
                ...citation.node.attrs,
                citationNumber: newNumber,
                subNumber: newSubNumber,
              });
              hasChanges = true;
            }
          }

          if (hasChanges && dispatch) {
            dispatch(tr);
          }

          return true;
        },
    };
  },

  // Плагин для автоматической перенумерации при изменениях
  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('citationRenumber');
    let updateTimeout: ReturnType<typeof setTimeout> | null = null;
    
    return [
      new Plugin({
        key: pluginKey,
        state: {
          init: () => null,
          apply: (tr: any, value: any) => {
            // Запускаем перенумерацию при изменении документа
            if (tr.docChanged) {
              // Debounce для оптимизации
              if (updateTimeout) {
                clearTimeout(updateTimeout);
              }
              updateTimeout = setTimeout(() => {
                try {
                  (this.editor.commands as any).updateCitationNumbers();
                } catch (e) {
                  // Игнорируем ошибки если редактор уничтожен
                  console.warn('Citation renumber skipped:', e);
                }
              }, 50);
            }
            return value;
          },
        },
      }),
    ];
  },
});

export default CitationMark;
