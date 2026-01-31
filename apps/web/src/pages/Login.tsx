// apps/web/src/pages/Login.tsx
import React, { useState } from "react";
import { api, setTokens } from "../api/client";
import { useLocation, useNavigate } from "react-router-dom";
import { getErrorMessage } from "../lib/errorUtils";

type AuthResponse = {
  user: { id: string; email: string };
  token: string;
  accessToken?: string;
  refreshToken?: string;
};

interface LocationState {
  from?: string;
}

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation();
  const state = loc.state as LocationState | null;

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const res = await api<AuthResponse>(path, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      // Сохраняем оба токена (с fallback на старый формат)
      setTokens(res.accessToken ?? res.token, res.refreshToken ?? "");

      const to = state?.from ?? "/settings";
      nav(to);
    } catch (err) {
      setMsg(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
      <h2>{mode === "login" ? "Вход" : "Регистрация"}</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button disabled={mode === "login"} onClick={() => setMode("login")}>
          Вход
        </button>
        <button
          disabled={mode === "register"}
          onClick={() => setMode("register")}
        >
          Регистрация
        </button>
      </div>

      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <input
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        <button disabled={loading} type="submit">
          {loading ? "..." : "OK"}
        </button>
      </form>

      {msg ? <div style={{ marginTop: 12 }}>{msg}</div> : null}
    </div>
  );
}
