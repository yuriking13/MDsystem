import { Node, mergeAttributes, type Editor } from "@tiptap/react";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import React, { useEffect, useState } from "react";
import { apiGetFileDownloadUrl } from "../../../lib/api";
import {
  IconRefresh,
  IconExclamation,
  IconMusicalNote,
  IconDocument,
  IconPencil,
  IconTrash,
} from "../../FlowbiteIcons";

// Project file node attributes
export interface ProjectFileNodeAttrs {
  fileId: string;
  projectId: string;
  fileName: string;
  mimeType: string;
  category: "image" | "video" | "audio" | "document" | "other";
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
  const [editCaption, setEditCaption] = useState(attrs.caption || "");

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

    return () => {
      mounted = false;
    };
  }, [attrs.fileId, attrs.projectId]);

  const handleSaveCaption = () => {
    updateAttributes({ caption: editCaption });
    setIsEditing(false);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="project-file-loading">
          <IconRefresh className="w-6 h-6 animate-spin" size="md" />
          <span>Загрузка файла...</span>
        </div>
      );
    }

    if (error || !fileUrl) {
      return (
        <div className="project-file-error">
          <IconExclamation className="w-6 h-6" size="md" />
          <span>Файл не найден или удалён</span>
          <button onClick={deleteNode} className="project-file-remove-btn">
            Удалить
          </button>
        </div>
      );
    }

    // Render based on category
    if (attrs.category === "image") {
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
                  onKeyDown={(e) => e.key === "Enter" && handleSaveCaption()}
                  placeholder="Подпись к изображению"
                  autoFocus
                />
              ) : (
                <span onClick={() => setIsEditing(true)}>
                  {attrs.caption || "Нажмите для добавления подписи"}
                </span>
              )}
            </figcaption>
          )}
        </figure>
      );
    }

    if (attrs.category === "video") {
      return (
        <figure className="project-file-figure">
          <video src={fileUrl} controls className="project-file-video" />
          {(attrs.caption || isEditing) && (
            <figcaption className="project-file-caption">
              {isEditing ? (
                <input
                  type="text"
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  onBlur={handleSaveCaption}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveCaption()}
                  placeholder="Подпись к видео"
                  autoFocus
                />
              ) : (
                <span onClick={() => setIsEditing(true)}>
                  {attrs.caption || "Нажмите для добавления подписи"}
                </span>
              )}
            </figcaption>
          )}
        </figure>
      );
    }

    if (attrs.category === "audio") {
      return (
        <div className="project-file-audio-container">
          <div className="project-file-audio-info">
            <IconMusicalNote className="w-8 h-8" size="lg" />
            <span>{attrs.fileName}</span>
          </div>
          <audio src={fileUrl} controls className="project-file-audio" />
        </div>
      );
    }

    // Document or other - show as link
    return (
      <div className="project-file-document">
        <IconDocument className="w-8 h-8" size="lg" />
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
    <NodeViewWrapper
      className="project-file-node-wrapper"
      data-file-id={attrs.fileId}
    >
      <div className="project-file-container">
        {!loading && !error && (
          <div className="project-file-toolbar">
            {attrs.category === "image" && !attrs.caption && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="project-file-btn"
                title="Добавить подпись"
              >
                <IconPencil className="w-4 h-4" size="sm" />
              </button>
            )}
            <button
              onClick={deleteNode}
              className="project-file-btn project-file-btn-danger"
              title="Удалить из документа"
            >
              <IconTrash className="w-4 h-4" size="sm" />
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
  name: "projectFileNode",

  group: "block",

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      fileId: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-file-id"),
        renderHTML: (attributes: Record<string, any>) => {
          return attributes.fileId ? { "data-file-id": attributes.fileId } : {};
        },
      },
      projectId: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-project-id"),
        renderHTML: (attributes: Record<string, any>) => {
          return attributes.projectId
            ? { "data-project-id": attributes.projectId }
            : {};
        },
      },
      fileName: {
        default: "",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-file-name") || "",
        renderHTML: (attributes: Record<string, any>) => {
          return attributes.fileName
            ? { "data-file-name": attributes.fileName }
            : {};
        },
      },
      mimeType: {
        default: "",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-mime-type") || "",
        renderHTML: (attributes: Record<string, any>) => {
          return attributes.mimeType
            ? { "data-mime-type": attributes.mimeType }
            : {};
        },
      },
      category: {
        default: "other",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-category") || "other",
        renderHTML: (attributes: Record<string, any>) => {
          return attributes.category
            ? { "data-category": attributes.category }
            : {};
        },
      },
      caption: {
        default: "",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-caption") || "",
        renderHTML: (attributes: Record<string, any>) => {
          return attributes.caption
            ? { "data-caption": attributes.caption }
            : {};
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
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "project-file-node" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ProjectFileNodeView);
  },
});

// Helper function to insert file into editor
export function insertFileIntoEditor(
  editor: Editor,
  attrs: ProjectFileNodeAttrs,
) {
  if (!editor || !editor.view || editor.isDestroyed) {
    console.error("Editor is not available or has been destroyed");
    return false;
  }

  try {
    editor
      .chain()
      .focus()
      .insertContent({
        type: "projectFileNode",
        attrs,
      })
      .run();
    return true;
  } catch (error) {
    console.error("Failed to insert file:", error);
    return false;
  }
}

// Helper to get all file IDs from editor content
export function getFileIdsFromEditor(editor: Editor): string[] {
  const fileIds: string[] = [];

  editor.state.doc.descendants((node) => {
    if (node.type.name === "projectFileNode" && node.attrs.fileId) {
      fileIds.push(node.attrs.fileId);
    }
    return true;
  });

  return fileIds;
}

export default ProjectFileNode;
