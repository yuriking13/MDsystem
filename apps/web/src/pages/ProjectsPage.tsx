import React, { useEffect, useState } from "react";
import { getErrorMessage } from "../lib/errorUtils";
import { useNavigate } from "react-router-dom";
import {
  apiGetProjects,
  apiCreateProject,
  apiDeleteProject,
  type Project,
} from "../lib/api";
import { useAuth } from "../lib/AuthContext";

export default function ProjectsPage() {
  const nav = useNavigate();
  const { logout } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const res = await apiGetProjects();
      setProjects(res.projects);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setError(null);
    setCreating(true);
    try {
      await apiCreateProject(newName.trim(), newDesc.trim() || undefined);
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
      setOk("Project created!");
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  function openDeleteConfirm(project: Project) {
    setDeleteTarget(project);
    setDeleteConfirmText("");
    setError(null);
  }

  function closeDeleteConfirm() {
    setDeleteTarget(null);
    setDeleteConfirmText("");
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    if (deleteConfirmText !== deleteTarget.name) {
      setError("Название проекта не совпадает");
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await apiDeleteProject(deleteTarget.id);
      setOk("Проект удалён");
      closeDeleteConfirm();
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <div className="row space">
          <div>
            <h1>My Projects</h1>
            <p className="muted">Scientific research projects</p>
          </div>
          <div className="row gap">
            <button
              className="btn secondary"
              onClick={() => nav("/settings")}
              type="button"
            >
              Settings
            </button>
            <button className="btn secondary" onClick={logout} type="button">
              Logout
            </button>
          </div>
        </div>

        {error && <div className="alert">{error}</div>}
        {ok && <div className="ok">{ok}</div>}

        {/* Create button */}
        {!showCreate && (
          <div style={{ marginBottom: 16 }}>
            <button
              className="btn"
              onClick={() => setShowCreate(true)}
              type="button"
            >
              + New Project
            </button>
          </div>
        )}

        {/* Create form */}
        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="card"
            style={{ marginBottom: 16 }}
          >
            <h3>Create Project</h3>
            <div className="stack">
              <label className="stack">
                <span>Project Name *</span>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. PhD Thesis: Treatment Analysis"
                  required
                />
              </label>
              <label className="stack">
                <span>Description (optional)</span>
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Brief description of the research"
                />
              </label>
              <div className="row gap">
                <button className="btn" disabled={creating} type="submit">
                  {creating ? "Creating…" : "Create"}
                </button>
                <button
                  className="btn secondary"
                  onClick={() => setShowCreate(false)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Projects list */}
        {loading ? (
          <div className="muted">Loading projects…</div>
        ) : projects.length === 0 ? (
          <div className="muted">No projects yet. Create your first one!</div>
        ) : (
          <div className="projects-list">
            {projects.map((p) => (
              <div key={p.id} className="project-card">
                <div className="row space">
                  <div>
                    <div className="project-name">{p.name}</div>
                    {p.description && (
                      <div className="muted" style={{ fontSize: 14 }}>
                        {p.description}
                      </div>
                    )}
                    <div
                      className="muted"
                      style={{ fontSize: 12, marginTop: 4 }}
                    >
                      Role: {p.role} • Updated:{" "}
                      {new Date(p.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="row gap">
                    <button
                      className="btn"
                      onClick={() => nav(`/projects/${p.id}`)}
                      type="button"
                    >
                      Open
                    </button>
                    {p.role === "owner" && (
                      <button
                        className="btn secondary"
                        onClick={() => openDeleteConfirm(p)}
                        type="button"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete confirmation modal */}
        {deleteTarget && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Удаление проекта</h3>
              <p>
                Вы уверены что хотите удалить проект{" "}
                <strong>"{deleteTarget.name}"</strong>?
              </p>
              <p className="muted" style={{ fontSize: 13 }}>
                Это действие необратимо. Все данные проекта будут потеряны.
              </p>
              <p style={{ marginTop: 12 }}>
                Для подтверждения введите название проекта:
              </p>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={deleteTarget.name}
                style={{ marginBottom: 12 }}
              />
              {error && (
                <div className="alert" style={{ marginBottom: 12 }}>
                  {error}
                </div>
              )}
              <div className="row gap">
                <button
                  className="btn danger"
                  onClick={handleDelete}
                  disabled={deleting || deleteConfirmText !== deleteTarget.name}
                  type="button"
                >
                  {deleting ? "Удаление…" : "Удалить проект"}
                </button>
                <button
                  className="btn secondary"
                  onClick={closeDeleteConfirm}
                  type="button"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
