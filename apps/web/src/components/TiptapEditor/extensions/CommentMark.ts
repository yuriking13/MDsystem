import { Mark, mergeAttributes, CommandProps } from '@tiptap/react';

export interface CommentMarkOptions {
  HTMLAttributes: Record<string, any>;
}

export interface CommentAttrs {
  commentId: string;
  authorId?: string;
  authorEmail?: string;
  text: string;
  createdAt: string;
  resolved?: boolean;
}

export const CommentMark = Mark.create<CommentMarkOptions>({
  name: 'comment',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-comment-id'),
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.commentId) return {};
          return { 'data-comment-id': attributes.commentId };
        },
      },
      authorId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-author-id'),
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.authorId) return {};
          return { 'data-author-id': attributes.authorId };
        },
      },
      authorEmail: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-author-email'),
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.authorEmail) return {};
          return { 'data-author-email': attributes.authorEmail };
        },
      },
      text: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-comment-text'),
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.text) return {};
          return { 'data-comment-text': attributes.text };
        },
      },
      createdAt: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-created-at'),
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.createdAt) return {};
          return { 'data-created-at': attributes.createdAt };
        },
      },
      resolved: {
        default: false,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-resolved') === 'true',
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.resolved) return {};
          return { 'data-resolved': 'true' };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-comment-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const isResolved = HTMLAttributes['data-resolved'] === 'true';
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: isResolved ? 'comment-mark comment-resolved' : 'comment-mark',
        style: isResolved 
          ? 'background-color: rgba(100, 116, 139, 0.15); border-bottom: 1px dashed #94a3b8;' 
          : 'background-color: rgba(251, 191, 36, 0.25); border-bottom: 2px solid #fbbf24;',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setComment:
        (attrs: CommentAttrs) =>
        ({ commands }: CommandProps) => {
          return commands.setMark(this.name, attrs);
        },
      unsetComment:
        () =>
        ({ commands }: CommandProps) => {
          return commands.unsetMark(this.name);
        },
    } as any;
  },
});

export default CommentMark;
