import React, { useEffect, useState } from "react";
import { getErrorMessage } from "../lib/errorUtils";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../lib/LanguageContext";
import {
  apiGetProjects,
  apiCreateProject,
  apiDeleteProject,
  type Project,
} from "../lib/api";
import {
  IconPlus as PlusIcon,
  IconFolder as FolderIcon,
  IconTrash as TrashIcon,
  IconArrowRight as ArrowRightIcon,
  IconCalendar as CalendarIcon,
  IconClose as XMarkIcon,
} from "../components/FlowbiteIcons";
import { cn } from "../design-system/utils/cn";

export default function ProjectsPage() {
  const nav = useNavigate();
  const { t, lang } = useLanguage();

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
      setOk(t("Проект создан!", "Project created!"));
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
      setError(
        t("Название проекта не совпадает", "Project name doesn't match"),
      );
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await apiDeleteProject(deleteTarget.id);
      setOk(t("Проект удалён", "Project deleted"));
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
          <h1 className="page-title">{t("Мои проекты", "My Projects")}</h1>
          <p className="page-subtitle">
            {t("Научно-исследовательские проекты", "Research projects")}
          </p>
        </div>
        <button
          className="btn-primary projects-create-btn"
          data-testid="projects-create-button"
          onClick={() => setShowCreate(true)}
        >
          <PlusIcon className="w-5 h-5" />
          {t("Новый проект", "New Project")}
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
              <h2 className="modal-title">
                {t("Создать проект", "Create Project")}
              </h2>
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
                  <span className="form-label-text">
                    {t("Название проекта *", "Project Name *")}
                  </span>
                  <input
                    type="text"
                    className="form-input"
                    data-testid="project-name-input"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={t(
                      "например: Диссертация: Анализ терапии",
                      "e.g.: Thesis: Therapy Analysis",
                    )}
                    required
                    autoFocus
                  />
                </label>
                <label className="form-label">
                  <span className="form-label-text">
                    {t("Описание (опционально)", "Description (optional)")}
                  </span>
                  <textarea
                    className="form-input form-textarea"
                    data-testid="project-description-input"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder={t(
                      "Краткое описание исследования",
                      "Brief research description",
                    )}
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
                  {t("Отмена", "Cancel")}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  data-testid="project-create-submit-button"
                  disabled={creating || !newName.trim()}
                >
                  {creating
                    ? t("Создание…", "Creating...")
                    : t("Создать проект", "Create Project")}
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
          <span>{t("Загрузка проектов…", "Loading projects...")}</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <FolderIcon className="empty-state-icon" />
          <h3 className="empty-state-title">
            {t("Нет проектов", "No Projects")}
          </h3>
          <p className="empty-state-desc">
            {t(
              "Создайте свой первый проект, чтобы начать работу",
              "Create your first project to get started",
            )}
          </p>
          <button
            className="btn-primary projects-create-btn"
            data-testid="projects-create-button"
            onClick={() => setShowCreate(true)}
          >
            <PlusIcon className="w-5 h-5" />
            {t("Создать проект", "Create Project")}
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((p) => (
            <article
              key={p.id}
              className="project-card"
              data-testid={`project-card-${p.id}`}
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
                    ? t("Владелец", "Owner")
                    : p.role === "editor"
                      ? t("Редактор", "Editor")
                      : t("Читатель", "Viewer")}
                </span>
              </div>

              <h3 className="project-card-title">{p.name}</h3>

              {p.description && (
                <p className="project-card-desc">{p.description}</p>
              )}

              <div className="project-card-meta">
                <span className="project-meta-item">
                  <CalendarIcon className="w-4 h-4" />
                  {new Date(p.updated_at).toLocaleDateString(
                    lang === "ru" ? "ru-RU" : "en-US",
                  )}
                </span>
              </div>

              <div className="project-card-actions">
                <button
                  className="project-action-open"
                  data-testid={`project-open-${p.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    nav(`/projects/${p.id}`);
                  }}
                >
                  {t("Открыть", "Open")}
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
              <h2 className="modal-title">
                {t("Удаление проекта", "Delete Project")}
              </h2>
              <button className="modal-close" onClick={closeDeleteConfirm}>
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body">
              <p>
                {t(
                  "Вы уверены что хотите удалить проект",
                  "Are you sure you want to delete project",
                )}{" "}
                <strong>"{deleteTarget.name}"</strong>?
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                {t(
                  "Это действие необратимо. Все данные проекта будут потеряны.",
                  "This action is irreversible. All project data will be lost.",
                )}
              </p>
              <label className="form-label mt-4">
                <span className="form-label-text">
                  {t(
                    "Для подтверждения введите название проекта:",
                    "To confirm, enter the project name:",
                  )}
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
                {t("Отмена", "Cancel")}
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleDelete}
                disabled={deleting || deleteConfirmText !== deleteTarget.name}
              >
                {deleting
                  ? t("Удаление…", "Deleting...")
                  : t("Удалить проект", "Delete Project")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
