import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  apiGetProjects,
  apiCreateProject,
  apiDeleteProject,
  type Project,
} from "../lib/api";
import SidebarLayout from "../components/Layout/SidebarLayout";

export default function ProjectsPage() {
  const nav = useNavigate();

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
    } catch (err: any) {
      setError(err?.message || "Failed to load projects");
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
    } catch (err: any) {
      setError(err?.message || "Failed to create project");
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
    } catch (err: any) {
      setError(err?.message || "Failed to delete project");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SidebarLayout>
      <div className="max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white sm:text-3xl">
            Мои проекты
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Управление научными исследовательскими проектами
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center p-4 mb-4 text-sm text-red-800 border border-red-300 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400 dark:border-red-800" role="alert">
            <svg className="flex-shrink-0 inline w-4 h-4 mr-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"/>
            </svg>
            <span className="sr-only">Ошибка</span>
            <div>{error}</div>
          </div>
        )}
        
        {ok && (
          <div className="flex items-center p-4 mb-4 text-sm text-green-800 border border-green-300 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400 dark:border-green-800" role="alert">
            <svg className="flex-shrink-0 inline w-4 h-4 mr-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"/>
            </svg>
            <span className="sr-only">Успех</span>
            <div>{ok}</div>
          </div>
        )}

        {/* Create button */}
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            type="button"
            className="mb-6 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Новый проект
          </button>
        )}

        {/* Create form */}
        {showCreate && (
          <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Создать проект
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label htmlFor="project-name" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Название проекта *
                </label>
                <input
                  type="text"
                  id="project-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                  placeholder="напр. Диссертация: Анализ лечения"
                  required
                />
              </div>
              <div>
                <label htmlFor="project-desc" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Описание (опционально)
                </label>
                <textarea
                  id="project-desc"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                  placeholder="Краткое описание исследования"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Создание...
                    </>
                  ) : (
                    "Создать"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-gray-700"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Projects list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="ml-3 text-gray-500 dark:text-gray-400">Загрузка проектов...</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg className="w-16 h-16 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              Нет проектов
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Создайте свой первый исследовательский проект!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <div key={p.id} className="bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
                <div className="p-5">
                  <h5 className="mb-2 text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                    {p.name}
                  </h5>
                  {p.description && (
                    <p className="mb-3 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {p.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mb-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-800 bg-gray-100 rounded dark:bg-gray-700 dark:text-gray-300">
                      {p.role === "owner" ? "Владелец" : p.role}
                    </span>
                    <span>•</span>
                    <span>Обновлён: {new Date(p.updated_at).toLocaleDateString("ru-RU")}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => nav(`/projects/${p.id}`)}
                      type="button"
                      className="flex-1 inline-flex justify-center items-center px-3 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
                    >
                      Открыть
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                    {p.role === "owner" && (
                      <button
                        onClick={() => openDeleteConfirm(p)}
                        type="button"
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-white border border-red-700 rounded-lg hover:bg-red-50 focus:ring-4 focus:ring-red-300 dark:border-red-500 dark:text-red-500 dark:hover:text-white dark:hover:bg-red-600 dark:focus:ring-red-900"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 dark:bg-gray-900/80">
            <div className="relative p-4 w-full max-w-md">
              <div className="relative bg-white rounded-lg shadow dark:bg-gray-700">
                <button
                  type="button"
                  onClick={closeDeleteConfirm}
                  className="absolute top-3 right-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-800 dark:hover:text-white"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                <div className="p-6 text-center">
                  <svg className="mx-auto mb-4 text-red-500 w-12 h-12 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                    Удаление проекта
                  </h3>
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    Вы уверены, что хотите удалить проект <strong className="text-gray-900 dark:text-white">"{deleteTarget.name}"</strong>?
                  </p>
                  <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                    Это действие необратимо. Все данные проекта будут потеряны.
                  </p>
                  <div className="mb-4">
                    <label htmlFor="confirm-delete" className="block mb-2 text-sm font-medium text-left text-gray-900 dark:text-white">
                      Для подтверждения введите название проекта:
                    </label>
                    <input
                      type="text"
                      id="confirm-delete"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                      placeholder={deleteTarget.name}
                    />
                  </div>
                  {error && (
                    <div className="mb-4 p-3 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
                      {error}
                    </div>
                  )}
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting || deleteConfirmText !== deleteTarget.name}
                      className="text-white bg-red-600 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Удаление...
                        </>
                      ) : (
                        "Удалить проект"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={closeDeleteConfirm}
                      className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
