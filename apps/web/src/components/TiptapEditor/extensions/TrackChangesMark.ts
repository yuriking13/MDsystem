import { Mark, mergeAttributes, CommandProps } from '@tiptap/react';
import type { Transaction } from 'prosemirror-state';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

export interface TrackChangesMarkOptions {
  HTMLAttributes: Record<string, any>;
}

export type ChangeType = 'insert' | 'delete';

export interface TrackChangeAttrs {
  changeId: string;
  changeType: ChangeType;
  authorId?: string;
  authorEmail?: string;
  createdAt: string;
  accepted?: boolean;
}

export const TrackChangesMark = Mark.create<TrackChangesMarkOptions>({
  name: 'trackChange',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      changeId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-change-id'),
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.changeId) return {};
          return { 'data-change-id': attributes.changeId };
        },
      },
      changeType: {
        default: 'insert',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-change-type') || 'insert',
        renderHTML: (attributes: Record<string, any>) => {
          return { 'data-change-type': attributes.changeType || 'insert' };
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
      createdAt: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-created-at'),
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.createdAt) return {};
          return { 'data-created-at': attributes.createdAt };
        },
      },
      accepted: {
        default: false,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-accepted') === 'true',
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.accepted) return {};
          return { 'data-accepted': 'true' };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-change-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const changeType = HTMLAttributes['data-change-type'] || 'insert';
    const isAccepted = HTMLAttributes['data-accepted'] === 'true';
    
    let className = 'track-change';
    let style = '';
    
    if (isAccepted) {
      // Accepted changes look normal
      style = '';
      className = '';
    } else if (changeType === 'insert') {
      // Insertions: green underline
      className = 'track-change track-insert';
      style = 'background-color: rgba(74, 222, 128, 0.2); border-bottom: 2px solid #4ade80; text-decoration: underline; text-decoration-color: #4ade80;';
    } else if (changeType === 'delete') {
      // Deletions: red strikethrough
      className = 'track-change track-delete';
      style = 'background-color: rgba(248, 113, 113, 0.2); text-decoration: line-through; text-decoration-color: #f87171; color: #f87171;';
    }
    
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: className,
        style,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setTrackChange:
        (attrs: TrackChangeAttrs) =>
        ({ commands }: CommandProps) => {
          return commands.setMark(this.name, attrs);
        },
      unsetTrackChange:
        () =>
        ({ commands }: CommandProps) => {
          return commands.unsetMark(this.name);
        },
      acceptChange:
        (changeId: string) =>
        ({ tr, state, dispatch }: { tr: Transaction; state: any; dispatch: any }) => {
          // Find and accept the change
          let found = false;
          state.doc.descendants((node: ProseMirrorNode, pos: number) => {
            if (node.marks) {
              const mark = node.marks.find((m: any) => 
                m.type.name === 'trackChange' && 
                m.attrs.changeId === changeId
              );
              if (mark) {
                found = true;
                const changeType = mark.attrs.changeType;
                
                if (changeType === 'delete') {
                  // For deletions, remove the text
                  if (dispatch) {
                    tr.delete(pos, pos + node.nodeSize);
                  }
                } else {
                  // For insertions, just remove the mark
                  if (dispatch) {
                    tr.removeMark(pos, pos + node.nodeSize, mark.type);
                  }
                }
              }
            }
          });
          
          return found;
        },
      rejectChange:
        (changeId: string) =>
        ({ tr, state, dispatch }: { tr: Transaction; state: any; dispatch: any }) => {
          // Find and reject the change
          let found = false;
          state.doc.descendants((node: ProseMirrorNode, pos: number) => {
            if (node.marks) {
              const mark = node.marks.find((m: any) => 
                m.type.name === 'trackChange' && 
                m.attrs.changeId === changeId
              );
              if (mark) {
                found = true;
                const changeType = mark.attrs.changeType;
                
                if (changeType === 'insert') {
                  // For insertions, remove the text
                  if (dispatch) {
                    tr.delete(pos, pos + node.nodeSize);
                  }
                } else {
                  // For deletions, just remove the mark (keep the text)
                  if (dispatch) {
                    tr.removeMark(pos, pos + node.nodeSize, mark.type);
                  }
                }
              }
            }
          });
          
          return found;
        },
    } as any;
  },
});

export default TrackChangesMark;
