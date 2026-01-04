import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor, { insertCitationToEditor } from "../components/Editor";
import {
  apiGetDocument,
  apiUpdateDocument,
  apiGetArticles,
  apiAddCitation,
  apiRemoveCitation,
  type Document,
  type Article,
  type Citation,
} from "../lib/api";

export default function DocumentPage() {
  const { projectId, docId } = useParams<{ projectId: string; docId: string }>();
  const nav = useNavigate();

  const [doc, setDoc] = useState<Document | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Модальное окно выбора статьи для цитаты
  const [showCitationPicker, setShowCitationPicker] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [searchArticle, setSearchArticle] = useState("");

  // Загрузка документа
  useEffect(() => {
    if (!projectId || !docId) return;

    async function load() {
      setLoading(true);
      try {
        const res = await apiGetDocument(projectId!, docId!);
        setDoc(res.document);
        setTitle(res.document.title);
        setContent(res.document.content || "");
      } catch (err: any) {
        setError(err?.message || "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [projectId, docId]);

  // Автосохранение при изменении контента
  const saveDocument = useCallback(
    async (newContent: string) => {
      if (!projectId || !docId) return;
      setSaving(true);
      try {
        await apiUpdateDocument(projectId, docId, { content: newContent });
      } catch (err) {
        console.error("Save error:", err);
      } finally {
        setSaving(false);
      }
    },
    [projectId, docId]
  );

  // Debounced save
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content && content !== doc?.content) {
        saveDocument(content);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [content, doc?.content, saveDocument]);

  // Сохранить заголовок
  async function handleTitleBlur() {
    if (!projectId || !docId || title === doc?.title) return;
    try {
      await apiUpdateDocument(projectId, docId, { title });
    } catch (err) {
      console.error("Title save error:", err);
    }
  }

  // Открыть picker для вставки цитаты
  async function openCitationPicker() {
    if (!projectId) return;
    setShowCitationPicker(true);

    try {
      const res = await apiGetArticles(projectId, "selected");
      setArticles(res.articles);
    } catch (err) {
      console.error("Load articles error:", err);
    }
  }

  // Добавить цитату
  async function handleAddCitation(article: Article) {
    if (!projectId || !docId) return;

    try {
      const res = await apiAddCitation(projectId, docId, article.id);
      // Вставить номер в текст
      insertCitationToEditor(res.citation.inline_number);
      
      // Обновить документ
      const updated = await apiGetDocument(projectId, docId);
      setDoc(updated.document);
      
      setShowCitationPicker(false);
    } catch (err: any) {
      setError(err?.message || "Ошибка добавления цитаты");
    }
  }

  // Удалить цитату
  async function handleRemoveCitation(citationId: string) {
    if (!projectId || !docId) return;
    
    try {
      await apiRemoveCitation(projectId, docId, citationId);
      // Обновить документ
      const updated = await apiGetDocument(projectId, docId);
      setDoc(updated.document);
    } catch (err: any) {
      setError(err?.message || "Ошибка удаления цитаты");
    }
  }

  // Фильтр статей
  const filteredArticles = searchArticle
    ? articles.filter(
        (a) =>
          a.title_en.toLowerCase().includes(searchArticle.toLowerCase()) ||
          a.title_ru?.toLowerCase().includes(searchArticle.toLowerCase())
      )
    : articles;

  if (loading) {
    return (
      <div className="container">
        <div className="muted">Загрузка документа...</div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="container">
        <div className="alert">Документ не найден</div>
        <button className="btn" onClick={() => nav(-1)}>
          ← Назад
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div className="row space" style={{ marginBottom: 16 }}>
        <button className="btn secondary" onClick={() => nav(`/projects/${projectId}`)}>
          ← К проекту
        </button>
        <div className="row gap">
          {saving && <span className="muted">Сохранение...</span>}
          {!saving && <span className="muted" style={{ color: "#4ade80" }}>✓ Сохранено</span>}
        </div>
      </div>

      {error && <div className="alert" style={{ marginBottom: 12 }}>{error}</div>}

      {/* Заголовок */}
      <input
        className="doc-title-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        placeholder="Название документа"
        style={{
          fontSize: 24,
          fontWeight: 600,
          marginBottom: 16,
          background: "transparent",
          border: "none",
          borderBottom: "2px solid transparent",
          width: "100%",
          color: "#e8eefc",
          padding: "8px 0",
        }}
      />

      {/* Редактор */}
      <div className="row gap" style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <Editor
            content={content}
            onChange={setContent}
            onInsertCitation={openCitationPicker}
            placeholder="Начните писать текст диссертации..."
          />
        </div>

        {/* Панель цитат */}
        <div className="citations-panel">
          <h4>Список литературы ({doc.citations?.length || 0})</h4>
          {doc.citations && doc.citations.length > 0 ? (
            <ol className="citations-list">
              {doc.citations.map((c) => (
                <li key={c.id}>
                  <div className="citation-item">
                    <div className="citation-text">
                      {c.article.authors?.slice(0, 2).join(", ")}
                      {c.article.authors && c.article.authors.length > 2 && " и др."}
                      {" "}
                      {c.article.title_ru || c.article.title_en}
                      {c.article.year && ` (${c.article.year})`}
                    </div>
                    <button
                      className="btn secondary"
                      onClick={() => handleRemoveCitation(c.id)}
                      style={{ padding: "2px 6px", fontSize: 11 }}
                      title="Удалить цитату"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="muted" style={{ fontSize: 13 }}>
              Нажмите "📖 Цитата" в редакторе чтобы добавить ссылки на литературу
            </div>
          )}
        </div>
      </div>

      {/* Модалка выбора статьи */}
      {showCitationPicker && (
        <div className="modal-overlay" onClick={() => setShowCitationPicker(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="row space" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Выберите статью</h3>
              <button
                className="btn secondary"
                onClick={() => setShowCitationPicker(false)}
              >
                ✕
              </button>
            </div>

            <input
              placeholder="Поиск по названию..."
              value={searchArticle}
              onChange={(e) => setSearchArticle(e.target.value)}
              style={{ marginBottom: 12 }}
            />

            <div style={{ maxHeight: 400, overflow: "auto" }}>
              {filteredArticles.length === 0 ? (
                <div className="muted">
                  Нет отобранных статей. Сначала отберите статьи в базе.
                </div>
              ) : (
                filteredArticles.map((a) => (
                  <div
                    key={a.id}
                    className="article-picker-item"
                    onClick={() => handleAddCitation(a)}
                  >
                    <div style={{ fontWeight: 500 }}>
                      {a.title_ru || a.title_en}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {a.authors?.slice(0, 2).join(", ")}
                      {a.year && ` • ${a.year}`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
