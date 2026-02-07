import React, { useEffect, useState } from "react";
import { getErrorMessage } from "../lib/errorUtils";
import { useNavigate } from "react-router-dom";
import {
  apiGetProjects,
  apiCreateProject,
  apiDeleteProject,
  type Project,
} from "../lib/api";
import {
  PlusIcon,
  FolderIcon,
  TrashIcon,
  ArrowRightIcon,
  CalendarIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { cn } from "../design-system/utils/cn";

export default function ProjectsPage() {
  const nav = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Auto-dismiss ok notification after 10 seconds
  useEffect(() => {
    if (!ok) return;
    const timer = setTimeout(() => setOk(null), 10000);
    return () => clearTimeout(timer);
  }, [ok]);

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
      setOk("Проект создан!");
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
    <div className="page-container">
      {/* Page Header */}
      <header className="page-header">
        <div>
          <h1 className="page-title">Мои проекты</h1>
          <p className="page-subtitle">Научно-исследовательские проекты</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <PlusIcon className="w-5 h-5" />
          Новый проект
        </button>
      </header>

      {/* Alerts */}
      {error && (
        <div className="alert-error">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="alert-close">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}
      {ok && (
        <div className="alert-success">
          <span>{ok}</span>
          <button onClick={() => setOk(null)} className="alert-close">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Create form modal */}
      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Создать проект</h2>
              <button
                className="modal-close"
                onClick={() => setShowCreate(false)}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <label className="form-label">
                  <span className="form-label-text">Название проекта *</span>
                  <input
                    type="text"
                    className="form-input"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="например: Диссертация: Анализ терапии"
                    required
                    autoFocus
                  />
                </label>
                <label className="form-label">
                  <span className="form-label-text">
                    Описание (опционально)
                  </span>
                  <textarea
                    className="form-input form-textarea"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Краткое описание исследования"
                    rows={3}
                  />
                </label>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating || !newName.trim()}
                >
                  {creating ? "Создание…" : "Создать проект"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Projects grid */}
      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>Загрузка проектов…</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <FolderIcon className="empty-state-icon" />
          <h3 className="empty-state-title">Нет проектов</h3>
          <p className="empty-state-desc">
            Создайте свой первый проект, чтобы начать работу
          </p>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <PlusIcon className="w-5 h-5" />
            Создать проект
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((p) => (
            <article
              key={p.id}
              className="project-card"
              onClick={() => nav(`/projects/${p.id}`)}
            >
              <div className="project-card-header">
                <div className="project-card-icon">
                  <FolderIcon className="w-6 h-6" />
                </div>
                <span
                  className={cn(
                    "project-role-badge",
                    p.role === "owner" && "project-role-badge--owner",
                    p.role === "editor" && "project-role-badge--editor",
                    p.role === "viewer" && "project-role-badge--viewer",
                  )}
                >
                  {p.role === "owner"
                    ? "Владелец"
                    : p.role === "editor"
                      ? "Редактор"
                      : "Читатель"}
                </span>
              </div>

              <h3 className="project-card-title">{p.name}</h3>

              {p.description && (
                <p className="project-card-desc">{p.description}</p>
              )}

              <div className="project-card-meta">
                <span className="project-meta-item">
                  <CalendarIcon className="w-4 h-4" />
                  {new Date(p.updated_at).toLocaleDateString("ru-RU")}
                </span>
              </div>

              <div className="project-card-actions">
                <button
                  className="project-action-open"
                  onClick={(e) => {
                    e.stopPropagation();
                    nav(`/projects/${p.id}`);
                  }}
                >
                  Открыть
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
                {p.role === "owner" && (
                  <button
                    className="project-action-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteConfirm(p);
                    }}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={closeDeleteConfirm}>
          <div
            className="modal-content modal-content--danger"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">Удаление проекта</h2>
              <button className="modal-close" onClick={closeDeleteConfirm}>
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Вы уверены что хотите удалить проект{" "}
                <strong>"{deleteTarget.name}"</strong>?
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                Это действие необратимо. Все данные проекта будут потеряны.
              </p>
              <label className="form-label mt-4">
                <span className="form-label-text">
                  Для подтверждения введите название проекта:
                </span>
                <input
                  type="text"
                  className="form-input"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={deleteTarget.name}
                />
              </label>
              {error && <div className="alert-error mt-4">{error}</div>}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={closeDeleteConfirm}
              >
                Отмена
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleDelete}
                disabled={deleting || deleteConfirmText !== deleteTarget.name}
              >
                {deleting ? "Удаление…" : "Удалить проект"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
