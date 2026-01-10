import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiDeleteApiKey, apiGetApiKeys, apiSaveApiKey } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { resetOnboarding } from "../components/OnboardingTour";

const Providers = ["pubmed", "doaj", "wiley", "openrouter"] as const;

// Provider metadata with icons and descriptions
const ProviderMeta: Record<string, { name: string; description: string; icon: React.ReactNode }> = {
  pubmed: {
    name: "PubMed",
    description: "API ключ для поиска и загрузки связей между статьями",
    icon: (
      <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  doaj: {
    name: "DOAJ",
    description: "Directory of Open Access Journals — поиск статей открытого доступа",
    icon: (
      <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  wiley: {
    name: "Wiley TDM",
    description: "Wiley Text & Data Mining API для доступа к полнотекстовым статьям",
    icon: (
      <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  openrouter: {
    name: "OpenRouter",
    description: "API для перевода статей и AI-детекции статистики",
    icon: (
      <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
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
      setError("Key is empty");
      return;
    }

    setBusy(true);
    try {
      await apiSaveApiKey(provider, key);
      setDraft((d) => ({ ...d, [provider]: "" }));
      setOk(`Saved: ${provider}`);
      await load();
    } catch (err: any) {
      setError(err?.message || "Save failed");
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
      setOk(`Deleted: ${provider}`);
      await load();
    } catch (err: any) {
      setError(err?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      {/* Header Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="row space">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg className="icon-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div>
              <h1 style={{ margin: 0 }}>Настройки</h1>
              <p className="muted" style={{ margin: 0 }}>Профиль и API ключи</p>
            </div>
          </div>
          <div className="row gap">
            <button className="btn secondary" onClick={() => nav("/projects")} type="button">
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Проекты
            </button>
            <button className="btn secondary" onClick={logout} type="button">
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Выйти
            </button>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="settings-card" style={{ marginBottom: 20 }}>
        <div className="settings-card-header">
          <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h4 style={{ margin: 0 }}>Профиль</h4>
        </div>
        <div className="settings-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px 20px', alignItems: 'center' }}>
            <div className="muted" style={{ fontSize: 13 }}>User ID</div>
            <div style={{ fontFamily: 'monospace', fontSize: 13 }}>{user?.id || "—"}</div>
            <div className="muted" style={{ fontSize: 13 }}>Email</div>
            <div style={{ fontSize: 14 }}>{user?.email || "—"}</div>
          </div>
        </div>
      </div>

      {/* Help & Documentation Card */}
      <div className="settings-card" style={{ marginBottom: 20 }}>
        <div className="settings-card-header">
          <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h4 style={{ margin: 0 }}>Справка</h4>
        </div>
        <div className="settings-card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <button 
                className="btn secondary" 
                onClick={() => nav("/docs")} 
                type="button"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Документация
              </button>
              <button 
                className="btn secondary" 
                onClick={() => {
                  resetOnboarding();
                  window.location.reload();
                }} 
                type="button"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Повторить обучение
              </button>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
              Ознакомьтесь с документацией, чтобы узнать обо всех возможностях платформы, или повторите обучение для новых пользователей.
            </p>
          </div>
        </div>
      </div>

      {/* API Keys Card */}
      <div className="settings-card">
        <div className="settings-card-header">
          <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <h4 style={{ margin: 0 }}>API Ключи</h4>
        </div>
        <div className="settings-card-body">
          <p className="settings-hint">
            Ключи хранятся в зашифрованном виде. Введённый ключ не отображается после сохранения.
          </p>

          {busy && (
            <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div className="loading-spinner" />
              Загрузка...
            </div>
          )}
          {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}
          {ok && <div className="ok" style={{ marginBottom: 16 }}>{ok}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {list.map(({ p, has, meta }) => (
              <div 
                key={p}
                style={{ 
                  padding: 16,
                  background: 'var(--bg-glass-light)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 12,
                  borderLeft: has ? '3px solid var(--success)' : '3px solid var(--border-glass)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                  <div style={{ 
                    width: 40, 
                    height: 40, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: has ? 'rgba(74, 222, 128, 0.1)' : 'var(--bg-glass)',
                    borderRadius: 10,
                    color: has ? 'var(--success)' : 'var(--text-muted)',
                    flexShrink: 0,
                  }}>
                    {meta?.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <strong style={{ fontSize: 15 }}>{meta?.name || p}</strong>
                      {has ? (
                        <span style={{ 
                          fontSize: 11, 
                          padding: '3px 8px', 
                          background: 'rgba(74, 222, 128, 0.15)', 
                          color: 'var(--success)',
                          borderRadius: 6,
                          fontWeight: 500,
                        }}>
                          ✓ Настроен
                        </span>
                      ) : (
                        <span style={{ 
                          fontSize: 11, 
                          padding: '3px 8px', 
                          background: 'rgba(255, 255, 255, 0.05)', 
                          color: 'var(--text-muted)',
                          borderRadius: 6,
                        }}>
                          Не настроен
                        </span>
                      )}
                    </div>
                    <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.4 }}>
                      {meta?.description}
                    </p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="password"
                    placeholder={has ? "Обновить ключ..." : "Вставьте API ключ..."}
                    value={draft[p] || ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [p]: e.target.value }))}
                    style={{ flex: 1, padding: '10px 14px', fontSize: 13 }}
                  />
                  <button 
                    className="btn" 
                    onClick={() => save(p)} 
                    disabled={busy} 
                    type="button"
                    style={{ padding: '10px 18px', fontSize: 13 }}
                  >
                    <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Сохранить
                  </button>
                  <button
                    className="btn secondary"
                    onClick={() => del(p)}
                    disabled={busy || !has}
                    type="button"
                    style={{ padding: '10px 18px', fontSize: 13, color: has ? 'var(--danger)' : undefined }}
                  >
                    <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
