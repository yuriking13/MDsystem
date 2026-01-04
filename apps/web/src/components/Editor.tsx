import React, { useCallback } from "react";
import { useEditor, EditorContent, Editor as TipTapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";

type Props = {
  content: string;
  onChange: (content: string) => void;
  onInsertCitation?: () => void;
  placeholder?: string;
  editable?: boolean;
};

// Панель инструментов
function Toolbar({ 
  editor, 
  onInsertCitation 
}: { 
  editor: TipTapEditor | null;
  onInsertCitation?: () => void;
}) {
  if (!editor) return null;

  return (
    <div className="editor-toolbar">
      <div className="toolbar-group">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "active" : ""}
          title="Жирный (Ctrl+B)"
        >
          <b>B</b>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "active" : ""}
          title="Курсив (Ctrl+I)"
        >
          <i>I</i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive("underline") ? "active" : ""}
          title="Подчёркнутый (Ctrl+U)"
        >
          <u>U</u>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={editor.isActive("highlight") ? "active" : ""}
          title="Выделение"
        >
          🖍️
        </button>
      </div>

      <div className="toolbar-group">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive("heading", { level: 1 }) ? "active" : ""}
          title="Заголовок 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive("heading", { level: 2 }) ? "active" : ""}
          title="Заголовок 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive("heading", { level: 3 }) ? "active" : ""}
          title="Заголовок 3"
        >
          H3
        </button>
      </div>

      <div className="toolbar-group">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "active" : ""}
          title="Маркированный список"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "active" : ""}
          title="Нумерованный список"
        >
          1.
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive("blockquote") ? "active" : ""}
          title="Цитата"
        >
          «»
        </button>
      </div>

      <div className="toolbar-group">
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={editor.isActive({ textAlign: "left" }) ? "active" : ""}
          title="По левому краю"
        >
          ⬅
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={editor.isActive({ textAlign: "center" }) ? "active" : ""}
          title="По центру"
        >
          ⬌
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={editor.isActive({ textAlign: "right" }) ? "active" : ""}
          title="По правому краю"
        >
          ➡
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          className={editor.isActive({ textAlign: "justify" }) ? "active" : ""}
          title="По ширине"
        >
          ☰
        </button>
      </div>

      <div className="toolbar-group">
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Отменить (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Повторить (Ctrl+Y)"
        >
          ↷
        </button>
      </div>

      {onInsertCitation && (
        <div className="toolbar-group">
          <button
            type="button"
            onClick={onInsertCitation}
            className="citation-btn"
            title="Вставить ссылку на литературу"
          >
            📖 Цитата
          </button>
        </div>
      )}
    </div>
  );
}

export default function Editor({
  content,
  onChange,
  onInsertCitation,
  placeholder = "Начните писать...",
  editable = true,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({
        multicolor: false,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Метод для вставки цитаты в текст
  const insertCitation = useCallback(
    (citationNumber: number) => {
      if (editor) {
        // Вставляем как простой текст с особым форматированием
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'text',
            marks: [{ type: 'bold' }],
            text: `[${citationNumber}]`,
          })
          .run();
      }
    },
    [editor]
  );

  // Экспортируем метод через ref или контекст если нужно
  (window as any).__editorInsertCitation = insertCitation;

  return (
    <div className="editor-container">
      {editable && <Toolbar editor={editor} onInsertCitation={onInsertCitation} />}
      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
}

// Вспомогательная функция для вставки цитаты извне
export function insertCitationToEditor(citationNumber: number) {
  const fn = (window as any).__editorInsertCitation;
  if (fn) fn(citationNumber);
}
