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
  type Project,
  type ProjectMember,
  type Document,
} from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import ArticlesSection from "../components/ArticlesSection";

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
  
  // Create document
  const [showCreateDoc, setShowCreateDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [creatingDoc, setCreatingDoc] = useState(false);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "editor">("viewer");
  const [inviting, setInviting] = useState(false);

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
    } catch (err: any) {
      setError(err?.message || "Failed to load project");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleSave() {
    if (!id || !project) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiUpdateProject(id, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
      });
      setProject(res.project);
      setEditing(false);
      setOk("Saved!");
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
      setOk("Member invited!");
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to invite");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(userId: string, email: string) {
    if (!id) return;
    if (!confirm(`Remove ${email} from project?`)) return;
    setError(null);
    try {
      await apiRemoveProjectMember(id, userId);
      setOk("Member removed");
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to remove member");
    }
  }

  const canEdit = project && (project.role === "owner" || project.role === "editor");
  const isOwner = project?.role === "owner";

  async function handleCreateDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !newDocTitle.trim()) return;
    setCreatingDoc(true);
    try {
      const res = await apiCreateDocument(id, newDocTitle.trim());
      setDocuments([...documents, res.document]);
      setNewDocTitle("");
      setShowCreateDoc(false);
      // Открыть новый документ
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

  if (loading) {
    return (
      <div className="container">
        <div className="card">Loading project…</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container">
        <div className="card">
          <div className="alert">{error || "Project not found"}</div>
          <button className="btn" onClick={() => nav("/projects")} type="button">
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div className="row space" style={{ marginBottom: 16 }}>
          <button className="btn secondary" onClick={() => nav("/projects")} type="button">
            ← Back
          </button>
          <div className="row gap">
            {canEdit && !editing && (
              <button className="btn secondary" onClick={() => setEditing(true)} type="button">
                Edit
              </button>
            )}
          </div>
        </div>

        {error && <div className="alert">{error}</div>}
        {ok && <div className="ok">{ok}</div>}

        {/* Project info */}
        {editing ? (
          <div className="stack" style={{ marginBottom: 20 }}>
            <label className="stack">
              <span>Project Name</span>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </label>
            <label className="stack">
              <span>Description</span>
              <input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </label>
            <div className="row gap">
              <button className="btn" onClick={handleSave} disabled={saving} type="button">
                {saving ? "Saving…" : "Save"}
              </button>
              <button className="btn secondary" onClick={() => setEditing(false)} type="button">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1>{project.name}</h1>
            {project.description && (
              <p className="muted" style={{ marginBottom: 16 }}>
                {project.description}
              </p>
            )}
            <div className="muted" style={{ marginBottom: 20, fontSize: 13 }}>
              Your role: <strong>{project.role}</strong> •
              Created: {new Date(project.created_at).toLocaleDateString()} •
              Updated: {new Date(project.updated_at).toLocaleDateString()}
            </div>
          </>
        )}

        {/* Members section */}
        <h2>Team Members</h2>
        
        {isOwner && (
          <div style={{ marginBottom: 12 }}>
            {!showInvite ? (
              <button className="btn" onClick={() => setShowInvite(true)} type="button">
                + Invite Member
              </button>
            ) : (
              <form onSubmit={handleInvite} className="card">
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
                    <span>Role</span>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as "viewer" | "editor")}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #2a3a66",
                        background: "#0f1626",
                        color: "#e8eefc",
                      }}
                    >
                      <option value="viewer">Viewer (read only)</option>
                      <option value="editor">Editor (can edit)</option>
                    </select>
                  </label>
                  <div className="row gap">
                    <button className="btn" disabled={inviting} type="submit">
                      {inviting ? "Inviting…" : "Invite"}
                    </button>
                    <button
                      className="btn secondary"
                      onClick={() => setShowInvite(false)}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="table table-members">
          <div className="thead">
            <div>Email</div>
            <div>Role</div>
            <div>Joined</div>
            <div>{isOwner ? "Actions" : ""}</div>
          </div>
          {members.map((m) => (
            <div className="trow" key={m.user_id}>
              <div className="mono" style={{ fontSize: 13 }}>
                {m.email} {m.user_id === user?.id && "(you)"}
              </div>
              <div>{m.role}</div>
              <div>{new Date(m.joined_at).toLocaleDateString()}</div>
              <div>
                {isOwner && m.role !== "owner" && (
                  <button
                    className="btn secondary"
                    onClick={() => handleRemoveMember(m.user_id, m.email)}
                    type="button"
                    style={{ fontSize: 12, padding: "6px 10px" }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Articles Database */}
        {id && <ArticlesSection projectId={id} canEdit={!!canEdit} />}

        {/* Documents Section */}
        <div style={{ marginTop: 24 }}>
          <div className="row space" style={{ marginBottom: 12 }}>
            <h2>Документы</h2>
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
              {documents.map((doc) => (
                <div key={doc.id} className="document-item">
                  <div
                    className="document-title"
                    onClick={() => nav(`/projects/${id}/documents/${doc.id}`)}
                  >
                    📄 {doc.title}
                  </div>
                  <div className="document-meta muted">
                    Обновлено: {new Date(doc.updated_at).toLocaleString()}
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
        </div>
      </div>
    </div>
  );
}
