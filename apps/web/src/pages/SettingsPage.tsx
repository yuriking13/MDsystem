import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiDeleteApiKey, apiGetApiKeys, apiSaveApiKey } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { resetOnboarding } from "../components/OnboardingTour";
import SidebarLayout from "../components/Layout/SidebarLayout";

const Providers = ["pubmed", "doaj", "wiley", "openrouter"] as const;

// Provider metadata with icons and descriptions
const ProviderMeta: Record<string, { name: string; description: string; docsUrl?: string }> = {
  pubmed: {
    name: "PubMed",
    description: "API ключ для поиска и загрузки связей между статьями",
    docsUrl: "https://www.ncbi.nlm.nih.gov/account/settings/#/",
  },
  doaj: {
    name: "DOAJ",
    description: "Directory of Open Access Journals — поиск статей открытого доступа",
    docsUrl: "https://doaj.org/api/v2/docs",
  },
  wiley: {
    name: "Wiley TDM",
    description: "Wiley Text & Data Mining API для доступа к полнотекстовым статьям",
    docsUrl: "https://onlinelibrary.wiley.com/library-info/resources/text-and-datamining",
  },
  openrouter: {
    name: "OpenRouter",
    description: "API для перевода статей и AI-детекции статистики",
    docsUrl: "https://openrouter.ai/keys",
  },
};

export default function SettingsPage() {
  const nav = useNavigate();
  const { user, logout, refreshMe } = useAuth();

  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Modal states
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  const list = useMemo(() => Providers.map((p) => ({ p, has: !!keys[p], meta: ProviderMeta[p] })), [keys]);

  async function load() {
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      await refreshMe();
      const res = await apiGetApiKeys();
      setKeys(res.keys || {});
    } catch (err: any) {
      setError(err?.message || "Failed to load settings");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(provider: string) {
    setError(null);
    setOk(null);

    const key = (draft[provider] || "").trim();
    if (!key) {
      setError("Ключ пустой");
      return;
    }

    setBusy(true);
    try {
      await apiSaveApiKey(provider, key);
      setDraft((d) => ({ ...d, [provider]: "" }));
      setOk(`Сохранено: ${ProviderMeta[provider]?.name || provider}`);
      setShowGenerateModal(false);
      setSelectedProvider(null);
      await load();
    } catch (err: any) {
      setError(err?.message || "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  }

  async function del(provider: string) {
    setError(null);
    setOk(null);

    setBusy(true);
    try {
      await apiDeleteApiKey(provider);
      setOk(`Удалён: ${ProviderMeta[provider]?.name || provider}`);
      setShowDeleteModal(null);
      await load();
    } catch (err: any) {
      setError(err?.message || "Ошибка удаления");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SidebarLayout>
      <div className="max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white sm:text-3xl">
            Настройки
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Управление профилем и API ключами
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center p-4 mb-4 text-sm text-red-800 border border-red-300 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400 dark:border-red-800" role="alert">
            <svg className="flex-shrink-0 inline w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"/>
            </svg>
            <div>{error}</div>
          </div>
        )}
        
        {ok && (
          <div className="flex items-center p-4 mb-4 text-sm text-green-800 border border-green-300 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400 dark:border-green-800" role="alert">
            <svg className="flex-shrink-0 inline w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"/>
            </svg>
            <div>{ok}</div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Left column - Profile and Help */}
          <div className="xl:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary-600 dark:text-primary-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Профиль</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email || "—"}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">User ID</span>
                  <span className="font-mono text-gray-900 dark:text-white">{user?.id?.slice(0, 8)}...</span>
                </div>
              </div>
            </div>

            {/* Help Card */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Справка</h3>
              <div className="space-y-3">
                <button
                  onClick={() => nav("/docs")}
                  type="button"
                  className="w-full flex items-center p-3 text-base font-medium text-gray-900 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
                >
                  <svg className="w-5 h-5 mr-3 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                  Документация
                </button>
                <button
                  onClick={() => {
                    resetOnboarding();
                    window.location.reload();
                  }}
                  type="button"
                  className="w-full flex items-center p-3 text-base font-medium text-gray-900 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
                >
                  <svg className="w-5 h-5 mr-3 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Повторить обучение
                </button>
              </div>
            </div>
          </div>

          {/* Right column - API Keys */}
          <div className="xl:col-span-2">
            <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">API Ключи</h3>
                <button
                  onClick={() => setShowGenerateModal(true)}
                  type="button"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Добавить ключ
                </button>
              </div>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                Ключи хранятся в зашифрованном виде. Введённый ключ не отображается после сохранения.
              </p>

              {busy && (
                <div className="flex items-center justify-center py-4">
                  <svg className="animate-spin h-5 w-5 text-primary-600 mr-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-gray-500 dark:text-gray-400">Загрузка...</span>
                </div>
              )}

              {/* API Keys Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                      <th scope="col" className="px-4 py-3">Провайдер</th>
                      <th scope="col" className="px-4 py-3">Статус</th>
                      <th scope="col" className="px-4 py-3">Описание</th>
                      <th scope="col" className="px-4 py-3 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map(({ p, has, meta }) => (
                      <tr key={p} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${has ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-700'}`}>
                              <svg className={`w-4 h-4 ${has ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                            {meta?.name || p}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {has ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Настроен
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                              Не настроен
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                          {meta?.description}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {meta?.docsUrl && (
                              <a
                                href={meta.docsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                Docs
                              </a>
                            )}
                            <button
                              onClick={() => {
                                setSelectedProvider(p);
                                setShowGenerateModal(true);
                              }}
                              type="button"
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-700"
                            >
                              {has ? "Обновить" : "Добавить"}
                            </button>
                            {has && (
                              <button
                                onClick={() => setShowDeleteModal(p)}
                                type="button"
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-700 rounded-lg hover:bg-red-50 dark:border-red-500 dark:text-red-500 dark:hover:text-white dark:hover:bg-red-600"
                              >
                                Удалить
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Generate/Edit Key Modal */}
        {showGenerateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 dark:bg-gray-900/80">
            <div className="relative p-4 w-full max-w-md">
              <div className="relative bg-white rounded-lg shadow dark:bg-gray-700">
                <div className="flex items-center justify-between p-4 border-b rounded-t dark:border-gray-600">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedProvider ? `${keys[selectedProvider] ? "Обновить" : "Добавить"} ключ: ${ProviderMeta[selectedProvider]?.name}` : "Добавить API ключ"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGenerateModal(false);
                      setSelectedProvider(null);
                    }}
                    className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <div className="p-6">
                  {!selectedProvider && (
                    <div className="mb-4">
                      <label htmlFor="provider" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Провайдер
                      </label>
                      <select
                        id="provider"
                        value={selectedProvider || ""}
                        onChange={(e) => setSelectedProvider(e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                      >
                        <option value="">Выберите провайдера...</option>
                        {Providers.map((p) => (
                          <option key={p} value={p}>{ProviderMeta[p]?.name || p}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {selectedProvider && (
                    <>
                      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                        {ProviderMeta[selectedProvider]?.description}
                      </p>
                      <div className="mb-4">
                        <label htmlFor="api-key" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                          API Ключ
                        </label>
                        <input
                          type="password"
                          id="api-key"
                          value={draft[selectedProvider] || ""}
                          onChange={(e) => setDraft((d) => ({ ...d, [selectedProvider!]: e.target.value }))}
                          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                          placeholder="Вставьте API ключ..."
                        />
                      </div>
                      {ProviderMeta[selectedProvider]?.docsUrl && (
                        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                          Получить ключ можно на{" "}
                          <a href={ProviderMeta[selectedProvider].docsUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline dark:text-primary-500">
                            сайте провайдера
                          </a>
                        </p>
                      )}
                    </>
                  )}
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowGenerateModal(false);
                        setSelectedProvider(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={() => selectedProvider && save(selectedProvider)}
                      disabled={busy || !selectedProvider || !draft[selectedProvider || ""]?.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {busy ? "Сохранение..." : "Сохранить"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Key Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 dark:bg-gray-900/80">
            <div className="relative p-4 w-full max-w-md">
              <div className="relative bg-white rounded-lg shadow dark:bg-gray-700">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(null)}
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
                  <h3 className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
                    Вы уверены, что хотите удалить ключ <strong className="text-gray-900 dark:text-white">{ProviderMeta[showDeleteModal]?.name}</strong>?
                  </h3>
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => del(showDeleteModal)}
                      disabled={busy}
                      className="text-white bg-red-600 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 disabled:opacity-50"
                    >
                      {busy ? "Удаление..." : "Да, удалить"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteModal(null)}
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
