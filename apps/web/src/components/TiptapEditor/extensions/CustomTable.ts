import { Table } from '@tiptap/extension-table';

/**
 * Custom Table extension that supports the data-statistic-id attribute
 * for syncing tables with the Statistics section.
 */
export const CustomTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      statisticId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-statistic-id'),
        renderHTML: (attributes) => {
          if (!attributes.statisticId) {
            return {};
          }
          return {
            'data-statistic-id': attributes.statisticId,
          };
        },
      },
    };
  },
});
