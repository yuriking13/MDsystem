import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  apiGetProject,
  apiUpdateProject,
  apiGetProjectMembers,
  apiInviteProjectMember,
  apiRemoveProjectMember,
  apiGetDocuments,
  apiCreateDocument,
  apiDeleteDocument,
  apiGetBibliography,
  apiExportProject,
  type Project,
  type ProjectMember,
  type Document,
  type BibliographyItem,
  type CitationStyle,
} from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import ArticlesSection from "../components/ArticlesSection";
import CitationGraph from "../components/CitationGraph";
import { exportToWord } from "../lib/exportWord";

type Tab = "articles" | "documents" | "graph" | "team" | "settings";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Активная вкладка
  const [activeTab, setActiveTab] = useState<Tab>("articles");

  // Edit mode (settings)
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [citationStyle, setCitationStyle] = useState<"gost" | "apa" | "vancouver">("gost");
  const [saving, setSaving] = useState(false);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "editor">("viewer");
  const [inviting, setInviting] = useState(false);

  // Create document
  const [showCreateDoc, setShowCreateDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [creatingDoc, setCreatingDoc] = useState(false);

  // Подсчёт статей для вкладки
  const [articleCounts, setArticleCounts] = useState({ candidate: 0, selected: 0, excluded: 0, total: 0 });

  // Библиография и экспорт
  const [bibliography, setBibliography] = useState<BibliographyItem[]>([]);
  const [loadingBib, setLoadingBib] = useState(false);
  const [showBibliography, setShowBibliography] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function load() {
    if (!id) return;
    setError(null);
    setLoading(true);
    try {
      const [pRes, mRes, dRes] = await Promise.all([
        apiGetProject(id),
        apiGetProjectMembers(id),
        apiGetDocuments(id),
      ]);
      setProject(pRes.project);
      setMembers(mRes.members);
      setDocuments(dRes.documents);
      setEditName(pRes.project.name);
      setEditDesc(pRes.project.description || "");
      setCitationStyle(pRes.project.citation_style || "gost");
    } catch (err: any) {
      setError(err?.message || "Failed to load project");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  const canEdit = project && (project.role === "owner" || project.role === "editor");
  const isOwner = project?.role === "owner";

  // === Handlers ===

  async function handleSaveSettings() {
    if (!id || !project) return;
    setSaving(true);
    setError(null);
    try {
      await apiUpdateProject(id, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        citationStyle,
      });
      setOk("Настройки сохранены");
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !inviteEmail.trim()) return;
    setInviting(true);
    setError(null);
    try {
      await apiInviteProjectMember(id, inviteEmail.trim(), inviteRole);
      setInviteEmail("");
      setShowInvite(false);
      setOk("Участник приглашён");
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to invite");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(userId: string, email: string) {
    if (!id) return;
    if (!confirm(`Удалить ${email} из проекта?`)) return;
    try {
      await apiRemoveProjectMember(id, userId);
      setOk("Участник удалён");
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to remove member");
    }
  }

  async function handleCreateDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !newDocTitle.trim()) return;
    setCreatingDoc(true);
    try {
      const res = await apiCreateDocument(id, newDocTitle.trim());
      setDocuments([...documents, res.document]);
      setNewDocTitle("");
      setShowCreateDoc(false);
      nav(`/projects/${id}/documents/${res.document.id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create document");
    } finally {
      setCreatingDoc(false);
    }
  }

  async function handleDeleteDocument(docId: string, title: string) {
    if (!id) return;
    if (!confirm(`Удалить документ "${title}"?`)) return;
    try {
      await apiDeleteDocument(id, docId);
      setDocuments(documents.filter((d) => d.id !== docId));
    } catch (err: any) {
      setError(err?.message || "Failed to delete document");
    }
  }

  // Загрузка библиографии
  async function handleLoadBibliography() {
    if (!id) return;
    setLoadingBib(true);
    try {
      const res = await apiGetBibliography(id);
      setBibliography(res.bibliography);
      setShowBibliography(true);
    } catch (err: any) {
      setError(err?.message || "Ошибка загрузки библиографии");
    } finally {
      setLoadingBib(false);
    }
  }

  // Экспорт проекта в TXT
  async function handleExportTxt() {
    if (!id) return;
    setExporting(true);
    try {
      const res = await apiExportProject(id);
      
      // Формируем текстовый документ
      let content = `# ${res.projectName}\n\n`;
      
      // Добавляем все документы
      res.documents.forEach((doc, idx) => {
        content += `## ${idx + 1}. ${doc.title}\n\n`;
        // Убираем HTML теги для простого текста
        const plainText = doc.content?.replace(/<[^>]*>/g, '') || '';
        content += plainText + '\n\n';
      });
      
      // Добавляем список литературы
      if (res.bibliography.length > 0) {
        content += `## Список литературы\n\n`;
        res.bibliography.forEach((item) => {
          content += `${item.number}. ${item.formatted}\n`;
        });
      }
      
      // Скачиваем как текстовый файл
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${res.projectName.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      
      setOk('Документ экспортирован в TXT');
    } catch (err: any) {
      setError(err?.message || "Ошибка экспорта");
    } finally {
      setExporting(false);
    }
  }

  // Экспорт проекта в Word
  async function handleExportWord() {
    if (!id) return;
    setExporting(true);
    try {
      const res = await apiExportProject(id);
      
      await exportToWord(
        res.projectName,
        res.documents.map(d => ({ title: d.title, content: d.content })),
        res.bibliography,
        res.citationStyle
      );
      
      setOk('Документ экспортирован в Word');
    } catch (err: any) {
      setError(err?.message || "Ошибка экспорта");
    } finally {
      setExporting(false);
    }
  }

  // Копировать библиографию в буфер
  function handleCopyBibliography() {
    const text = bibliography.map(item => `${item.number}. ${item.formatted}`).join('\n');
    navigator.clipboard.writeText(text);
    setOk('Список литературы скопирован в буфер');
  }

  if (loading) {
    return (
      <div className="container">
        <div className="muted">Загрузка проекта...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container">
        <div className="alert">{error || "Проект не найден"}</div>
        <button className="btn" onClick={() => nav("/projects")} type="button">
          ← К проектам
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div className="row space" style={{ marginBottom: 16 }}>
        <div className="row gap">
          <button className="btn secondary" onClick={() => nav("/projects")} type="button">
            ← Проекты
          </button>
          <h1 style={{ margin: 0 }}>{project.name}</h1>
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
          {project.role} • Обновлён: {new Date(project.updated_at).toLocaleDateString()}
        </div>
      </div>

      {error && <div className="alert" style={{ marginBottom: 12 }}>{error}</div>}
      {ok && <div className="ok" style={{ marginBottom: 12 }}>{ok}</div>}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button
          className={`tab ${activeTab === "articles" ? "active" : ""}`}
          onClick={() => setActiveTab("articles")}
        >
          📚 База статей ({articleCounts.total})
        </button>
        <button
          className={`tab ${activeTab === "documents" ? "active" : ""}`}
          onClick={() => setActiveTab("documents")}
        >
          📄 Документы ({documents.length})
        </button>
        <button
          className={`tab ${activeTab === "graph" ? "active" : ""}`}
          onClick={() => setActiveTab("graph")}
        >
          🔗 Граф цитирований
        </button>
        <button
          className={`tab ${activeTab === "team" ? "active" : ""}`}
          onClick={() => setActiveTab("team")}
        >
          👥 Команда ({members.length})
        </button>
        <button
          className={`tab ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          ⚙️ Настройки
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* === ARTICLES TAB === */}
        {activeTab === "articles" && id && (
          <ArticlesSection 
            projectId={id} 
            canEdit={!!canEdit} 
            onCountsChange={setArticleCounts}
          />
        )}

        {/* === DOCUMENTS TAB === */}
        {activeTab === "documents" && (
          <div>
            <div className="row space" style={{ marginBottom: 16 }}>
              <h2>Документы проекта</h2>
              {canEdit && (
                <button
                  className="btn"
                  onClick={() => setShowCreateDoc(true)}
                  type="button"
                >
                  + Новый документ
                </button>
              )}
            </div>

            {showCreateDoc && (
              <form onSubmit={handleCreateDocument} className="card" style={{ marginBottom: 16 }}>
                <div className="stack">
                  <label className="stack">
                    <span>Название документа</span>
                    <input
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      placeholder="Глава 1. Обзор литературы"
                      required
                    />
                  </label>
                  <div className="row gap">
                    <button className="btn" disabled={creatingDoc} type="submit">
                      {creatingDoc ? "Создание..." : "Создать"}
                    </button>
                    <button
                      className="btn secondary"
                      onClick={() => setShowCreateDoc(false)}
                      type="button"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </form>
            )}

            {documents.length === 0 ? (
              <div className="muted">
                Нет документов. Создайте первый документ для написания текста диссертации.
              </div>
            ) : (
              <div className="documents-list">
                {documents.map((doc, idx) => (
                  <div key={doc.id} className="document-item">
                    <div className="document-order">{idx + 1}</div>
                    <div
                      className="document-title"
                      onClick={() => nav(`/projects/${id}/documents/${doc.id}`)}
                    >
                      📄 {doc.title}
                    </div>
                    <div className="document-meta muted">
                      {new Date(doc.updated_at).toLocaleString()}
                    </div>
                    {canEdit && (
                      <button
                        className="btn secondary"
                        onClick={() => handleDeleteDocument(doc.id, doc.title)}
                        style={{ padding: "4px 8px", fontSize: 11 }}
                        type="button"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Библиография и экспорт */}
            <div className="card" style={{ marginTop: 16 }}>
              <div className="row space" style={{ marginBottom: 12 }}>
                <h4 style={{ margin: 0 }}>📚 Библиография и экспорт</h4>
                <span className="id-badge">
                  {citationStyle.toUpperCase()}
                </span>
              </div>
              
              <div className="row gap" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
                <button 
                  className="btn secondary" 
                  onClick={handleLoadBibliography}
                  disabled={loadingBib}
                  type="button"
                >
                  {loadingBib ? '⏳ Загрузка...' : '📋 Список литературы'}
                </button>
                <button 
                  className="btn" 
                  onClick={handleExportWord}
                  disabled={exporting || documents.length === 0}
                  type="button"
                >
                  {exporting ? '⏳ Экспорт...' : '📥 Экспорт в Word'}
                </button>
                <button 
                  className="btn secondary" 
                  onClick={handleExportTxt}
                  disabled={exporting || documents.length === 0}
                  type="button"
                >
                  📄 TXT
                </button>
              </div>

              {showBibliography && (
                <div style={{ marginTop: 12 }}>
                  <div className="row space" style={{ marginBottom: 8 }}>
                    <span className="muted">
                      Всего источников: {bibliography.length}
                    </span>
                    <button 
                      className="btn secondary" 
                      onClick={handleCopyBibliography}
                      style={{ padding: '4px 10px', fontSize: 12 }}
                      type="button"
                    >
                      📋 Копировать
                    </button>
                  </div>
                  
                  {bibliography.length === 0 ? (
                    <div className="muted">
                      Нет цитат. Добавьте цитаты в документы.
                    </div>
                  ) : (
                    <div className="bibliography-list">
                      {bibliography.map((item) => (
                        <div key={item.articleId} className="bibliography-item">
                          <span className="bib-number">{item.number}.</span>
                          <span className="bib-text">{item.formatted}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* === GRAPH TAB === */}
        {activeTab === "graph" && id && (
          <div>
            <div className="row space" style={{ marginBottom: 16 }}>
              <h2>Граф цитирований</h2>
              <div className="muted" style={{ fontSize: 13 }}>
                Визуализация связей между статьями проекта
              </div>
            </div>
            <CitationGraph projectId={id} />
            <div className="card" style={{ marginTop: 16 }}>
              <h4>💡 Как работает граф</h4>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#a9b7da', fontSize: 13 }}>
                <li>Каждый <strong>узел</strong> — статья из вашего проекта</li>
                <li><strong>Стрелки</strong> показывают, какая статья цитирует какую</li>
                <li>Данные о связях берутся из <strong>Crossref</strong> (обогатите статьи кнопкой "📚 Crossref")</li>
                <li>Кликните на узел чтобы открыть статью по DOI</li>
              </ul>
            </div>
          </div>
        )}

        {/* === TEAM TAB === */}
        {activeTab === "team" && (
          <div>
            <div className="row space" style={{ marginBottom: 16 }}>
              <h2>Команда проекта</h2>
              {isOwner && !showInvite && (
                <button className="btn" onClick={() => setShowInvite(true)} type="button">
                  + Пригласить
                </button>
              )}
            </div>

            {showInvite && (
              <form onSubmit={handleInvite} className="card" style={{ marginBottom: 16 }}>
                <div className="stack">
                  <label className="stack">
                    <span>Email</span>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      required
                    />
                  </label>
                  <label className="stack">
                    <span>Роль</span>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                    >
                      <option value="viewer">Читатель (только просмотр)</option>
                      <option value="editor">Редактор (может редактировать)</option>
                    </select>
                  </label>
                  <div className="row gap">
                    <button className="btn" disabled={inviting} type="submit">
                      {inviting ? "Приглашаем..." : "Пригласить"}
                    </button>
                    <button
                      className="btn secondary"
                      onClick={() => setShowInvite(false)}
                      type="button"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="table table-members">
              <div className="thead">
                <div>Email</div>
                <div>Роль</div>
                <div>Присоединился</div>
                <div>Действия</div>
              </div>
              {members.map((m) => (
                <div className="trow" key={m.user_id}>
                  <div className="mono" style={{ fontSize: 13 }}>
                    {m.email} {m.user_id === user?.id && "(вы)"}
                  </div>
                  <div>
                    {m.role === "owner" ? "Владелец" : m.role === "editor" ? "Редактор" : "Читатель"}
                  </div>
                  <div>{new Date(m.joined_at).toLocaleDateString()}</div>
                  <div>
                    {isOwner && m.role !== "owner" && (
                      <button
                        className="btn secondary"
                        onClick={() => handleRemoveMember(m.user_id, m.email)}
                        type="button"
                        style={{ fontSize: 12, padding: "6px 10px" }}
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === SETTINGS TAB === */}
        {activeTab === "settings" && (
          <div>
            <h2>Настройки проекта</h2>

            <div className="card" style={{ marginBottom: 16 }}>
              <h4>Основные</h4>
              <div className="stack">
                <label className="stack">
                  <span>Название проекта</span>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </label>
                <label className="stack">
                  <span>Описание</span>
                  <input
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Описание проекта..."
                  />
                </label>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <h4>Стиль библиографии</h4>
              <p className="muted" style={{ marginBottom: 12 }}>
                Выберите стиль оформления списка литературы для всех документов проекта
              </p>
              <div className="stack">
                <label className="row gap" style={{ alignItems: "center" }}>
                  <input
                    type="radio"
                    name="citationStyle"
                    value="gost"
                    checked={citationStyle === "gost"}
                    onChange={() => setCitationStyle("gost")}
                    style={{ width: "auto" }}
                  />
                  <div>
                    <strong>ГОСТ Р 7.0.5-2008</strong>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Иванов И.И. Название статьи // Журнал. — 2024. — Т. 1, № 2. — С. 10-20.
                    </div>
                  </div>
                </label>
                <label className="row gap" style={{ alignItems: "center" }}>
                  <input
                    type="radio"
                    name="citationStyle"
                    value="apa"
                    checked={citationStyle === "apa"}
                    onChange={() => setCitationStyle("apa")}
                    style={{ width: "auto" }}
                  />
                  <div>
                    <strong>APA 7th Edition</strong>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Ivanov, I. I. (2024). Article title. Journal Name, 1(2), 10-20.
                    </div>
                  </div>
                </label>
                <label className="row gap" style={{ alignItems: "center" }}>
                  <input
                    type="radio"
                    name="citationStyle"
                    value="vancouver"
                    checked={citationStyle === "vancouver"}
                    onChange={() => setCitationStyle("vancouver")}
                    style={{ width: "auto" }}
                  />
                  <div>
                    <strong>Vancouver</strong>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Ivanov II. Article title. Journal Name. 2024;1(2):10-20.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {canEdit && (
              <button
                className="btn"
                onClick={handleSaveSettings}
                disabled={saving}
                type="button"
              >
                {saving ? "Сохранение..." : "Сохранить настройки"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
