// apps/web/src/pages/Settings.tsx
import React, { useEffect, useMemo, useState } from "react";
import { api, clearToken } from "../api/client";
import { useNavigate } from "react-router-dom";

type MeResponse = { user: { id: string; email: string } };
type ApiKeysGetResponse = { items: Array<{ provider: string; hasKey: boolean }> };

const PROVIDERS = [
  { id: "pubmed", label: "PubMed API key" },
  { id: "wiley", label: "Wiley TDM API key" },
  { id: "openrouter", label: "OpenRouter API key (для перевода/LLM)" },
];

export default function Settings() {
  const nav = useNavigate();

  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("");

  const [inputs, setInputs] = useState<Record<string, string>>({
    pubmed: "",
    wiley: "",
    openrouter: "",
  });

  const providers = useMemo(() => PROVIDERS, []);

  async function load() {
    setMsg("");
    const meRes = await api<MeResponse>("/auth/me");
    setMe(meRes.user);

    const keysRes = await api<ApiKeysGetResponse>("/user/api-keys");
    const map: Record<string, boolean> = {};
    for (const p of providers) map[p.id] = false;
    for (const item of keysRes.items) map[item.provider] = item.hasKey;
    setStatus(map);
  }

  useEffect(() => {
    load().catch((e) => setMsg(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveKey(provider: string) {
    setSaving(provider);
    setMsg("");
    try {
      const key = inputs[provider]?.trim();
      if (!key) {
        setMsg("Ключ пустой — введи значение или нажми Удалить.");
        return;
      }

      await api("/user/api-keys", {
        method: "POST",
        body: JSON.stringify({ provider, key }),
      });

      setInputs((s) => ({ ...s, [provider]: "" }));
      await load();
      setMsg(`Сохранено: ${provider}`);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setSaving(null);
    }
  }

  async function deleteKey(provider: string) {
    setSaving(provider);
    setMsg("");
    try {
      await api(`/user/api-keys/${encodeURIComponent(provider)}`, { method: "DELETE" });
      await load();
      setMsg(`Удалено: ${provider}`);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setSaving(null);
    }
  }

  function logout() {
    clearToken();
    nav("/login");
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <h2>Настройки</h2>

      {me ? (
        <div style={{ marginBottom: 12 }}>
          <div><b>Email:</b> {me.email}</div>
          <div><b>User ID:</b> {me.id}</div>
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>Загрузка профиля…</div>
      )}

      <button onClick={logout}>Выйти</button>

      <hr style={{ margin: "16px 0" }} />

      <h3>API ключи (храним шифрованно, не показываем обратно)</h3>

      {providers.map((p) => (
        <div key={p.id} style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div><b>{p.label}</b></div>
              <div>Статус: {status[p.id] ? "✅ задан" : "❌ не задан"}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <input
              style={{ flex: "1 1 360px", padding: 8 }}
              placeholder="Вставь ключ и нажми Сохранить"
              value={inputs[p.id] ?? ""}
              onChange={(e) => setInputs((s) => ({ ...s, [p.id]: e.target.value }))}
            />
            <button disabled={saving === p.id} onClick={() => saveKey(p.id)}>
              {saving === p.id ? "..." : "Сохранить"}
            </button>
            <button disabled={saving === p.id} onClick={() => deleteKey(p.id)}>
              {saving === p.id ? "..." : "Удалить"}
            </button>
          </div>
        </div>
      ))}

      {msg ? <div style={{ marginTop: 12, color: "#333" }}>{msg}</div> : null}
    </div>
  );
}
