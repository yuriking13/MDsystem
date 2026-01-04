import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiDeleteApiKey, apiGetApiKeys, apiSaveApiKey } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

const Providers = ["pubmed", "crossref", "wiley", "openrouter"] as const;

export default function SettingsPage() {
  const nav = useNavigate();
  const { user, logout, refreshMe } = useAuth();

  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const list = useMemo(() => Providers.map((p) => ({ p, has: !!keys[p] })), [keys]);

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
      <div className="card">
        <div className="row space">
          <div>
            <h1>Settings</h1>
            <p className="muted">Profile + API keys</p>
          </div>
          <div className="row gap">
            <button className="btn secondary" onClick={() => nav("/projects")} type="button">
              Projects
            </button>
            <button className="btn secondary" onClick={logout} type="button">
              Logout
            </button>
          </div>
        </div>

        <h2>Profile</h2>
        <div className="kv">
          <div className="muted">User ID</div>
          <div>{user?.id || "—"}</div>
          <div className="muted">Email</div>
          <div>{user?.email || "—"}</div>
        </div>

        <h2>API Keys</h2>

        {busy && <div className="muted">Loading…</div>}
        {error && <div className="alert">{error}</div>}
        {ok && <div className="ok">{ok}</div>}

        <div className="table">
          <div className="thead">
            <div>Provider</div>
            <div>Status</div>
            <div>New key</div>
            <div>Actions</div>
          </div>

          {list.map(({ p, has }) => (
            <div className="trow" key={p}>
              <div className="mono">{p}</div>
              <div>{has ? "✅ set" : "—"}</div>
              <div>
                <input
                  type="password"
                  placeholder={has ? "Update key…" : "Paste key…"}
                  value={draft[p] || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [p]: e.target.value }))}
                />
              </div>
              <div className="row gap">
                <button className="btn" onClick={() => save(p)} disabled={busy} type="button">
                  Save
                </button>
                <button
                  className="btn secondary"
                  onClick={() => del(p)}
                  disabled={busy || !has}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="muted" style={{ marginTop: 12 }}>
          Keys are stored encrypted in DB. UI never shows full stored key.
        </p>
      </div>
    </div>
  );
}
