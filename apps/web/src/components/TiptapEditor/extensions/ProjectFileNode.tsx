import { Node, mergeAttributes, type Editor } from '@tiptap/react';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useEffect, useState } from 'react';
import { apiGetFileDownloadUrl } from '../../../lib/api';

// Project file node attributes
export interface ProjectFileNodeAttrs {
  fileId: string;
  projectId: string;
  fileName: string;
  mimeType: string;
  category: 'image' | 'video' | 'audio' | 'document' | 'other';
  caption?: string;
}

// React component for rendering the file
function ProjectFileNodeView({ 
  node, 
  updateAttributes,
  deleteNode,
}: { 
  node: any; 
  updateAttributes: (attrs: Partial<ProjectFileNodeAttrs>) => void;
  deleteNode: () => void;
}) {
  const attrs = node.attrs as ProjectFileNodeAttrs;
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editCaption, setEditCaption] = useState(attrs.caption || '');

  useEffect(() => {
    if (!attrs.fileId || !attrs.projectId) {
      setError(true);
      setLoading(false);
      return;
    }

    let mounted = true;
    apiGetFileDownloadUrl(attrs.projectId, attrs.fileId)
      .then(({ url }) => {
        if (mounted) {
          setFileUrl(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setError(true);
          setLoading(false);
        }
      });

    return () => { mounted = false; };
  }, [attrs.fileId, attrs.projectId]);

  const handleSaveCaption = () => {
    updateAttributes({ caption: editCaption });
    setIsEditing(false);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="project-file-loading">
          <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          <span>Загрузка файла...</span>
        </div>
      );
    }

    if (error || !fileUrl) {
      return (
        <div className="project-file-error">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span>Файл не найден или удалён</span>
          <button onClick={deleteNode} className="project-file-remove-btn">
            Удалить
          </button>
        </div>
      );
    }

    // Render based on category
    if (attrs.category === 'image') {
      return (
        <figure className="project-file-figure">
          <img 
            src={fileUrl} 
            alt={attrs.fileName} 
            className="project-file-image"
          />
          {(attrs.caption || isEditing) && (
            <figcaption className="project-file-caption">
              {isEditing ? (
                <input
                  type="text"
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  onBlur={handleSaveCaption}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveCaption()}
                  placeholder="Подпись к изображению"
                  autoFocus
                />
              ) : (
                <span onClick={() => setIsEditing(true)}>
                  {attrs.caption || 'Нажмите для добавления подписи'}
                </span>
              )}
            </figcaption>
          )}
        </figure>
      );
    }

    if (attrs.category === 'video') {
      return (
        <figure className="project-file-figure">
          <video 
            src={fileUrl} 
            controls 
            className="project-file-video"
          />
          {(attrs.caption || isEditing) && (
            <figcaption className="project-file-caption">
              {isEditing ? (
                <input
                  type="text"
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  onBlur={handleSaveCaption}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveCaption()}
                  placeholder="Подпись к видео"
                  autoFocus
                />
              ) : (
                <span onClick={() => setIsEditing(true)}>
                  {attrs.caption || 'Нажмите для добавления подписи'}
                </span>
              )}
            </figcaption>
          )}
        </figure>
      );
    }

    if (attrs.category === 'audio') {
      return (
        <div className="project-file-audio-container">
          <div className="project-file-audio-info">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
            </svg>
            <span>{attrs.fileName}</span>
          </div>
          <audio src={fileUrl} controls className="project-file-audio" />
        </div>
      );
    }

    // Document or other - show as link
    return (
      <div className="project-file-document">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <div className="project-file-document-info">
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            {attrs.fileName}
          </a>
          <span className="muted">Нажмите для просмотра</span>
        </div>
      </div>
    );
  };

  return (
    <NodeViewWrapper className="project-file-node-wrapper" data-file-id={attrs.fileId}>
      <div className="project-file-container">
        {!loading && !error && (
          <div className="project-file-toolbar">
            {attrs.category === 'image' && !attrs.caption && !isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="project-file-btn"
                title="Добавить подпись"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                </svg>
              </button>
            )}
            <button 
              onClick={deleteNode}
              className="project-file-btn project-file-btn-danger"
              title="Удалить из документа"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        )}
        {renderContent()}
      </div>
    </NodeViewWrapper>
  );
}

// TipTap extension
export const ProjectFileNode = Node.create({
  name: 'projectFileNode',
  
  group: 'block',
  
  atom: true,
  
  draggable: true,
  
  addAttributes() {
    return {
      fileId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-file-id'),
        renderHTML: (attributes: Record<string, any>) => {
          return attributes.fileId ? { 'data-file-id': attributes.fileId } : {};
        },
      },
      projectId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-project-id'),
        renderHTML: (attributes: Record<string, any>) => {
          return attributes.projectId ? { 'data-project-id': attributes.projectId } : {};
        },
      },
      fileName: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-file-name') || '',
        renderHTML: (attributes: Record<string, any>) => {
          return attributes.fileName ? { 'data-file-name': attributes.fileName } : {};
        },
      },
      mimeType: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-mime-type') || '',
        renderHTML: (attributes: Record<string, any>) => {
          return attributes.mimeType ? { 'data-mime-type': attributes.mimeType } : {};
        },
      },
      category: {
        default: 'other',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-category') || 'other',
        renderHTML: (attributes: Record<string, any>) => {
          return attributes.category ? { 'data-category': attributes.category } : {};
        },
      },
      caption: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-caption') || '',
        renderHTML: (attributes: Record<string, any>) => {
          return attributes.caption ? { 'data-caption': attributes.caption } : {};
        },
      },
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'div[data-type="project-file-node"]',
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'project-file-node' })];
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(ProjectFileNodeView);
  },
});

// Helper function to insert file into editor
export function insertFileIntoEditor(editor: Editor, attrs: ProjectFileNodeAttrs) {
  if (!editor || !editor.view || editor.isDestroyed) {
    console.error('Editor is not available or has been destroyed');
    return false;
  }
  
  try {
    editor.chain().focus().insertContent({
      type: 'projectFileNode',
      attrs,
    }).run();
    return true;
  } catch (error) {
    console.error('Failed to insert file:', error);
    return false;
  }
}

// Helper to get all file IDs from editor content
export function getFileIdsFromEditor(editor: Editor): string[] {
  const fileIds: string[] = [];
  
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'projectFileNode' && node.attrs.fileId) {
      fileIds.push(node.attrs.fileId);
    }
    return true;
  });
  
  return fileIds;
}

export default ProjectFileNode;
