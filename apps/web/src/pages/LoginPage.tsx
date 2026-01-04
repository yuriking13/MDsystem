import React, { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiLogin, apiRegister } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

// Парсинг ошибки в человекочитаемое сообщение
function parseError(msg: string): string {
  // Попытка распарсить JSON массив ошибок Zod
  if (msg.includes('"code"') && msg.includes('"path"')) {
    try {
      const parsed = JSON.parse(msg.replace(/^API \d+:\s*/, ""));
      if (Array.isArray(parsed)) {
        const messages = parsed.map((e: any) => {
          const field = e.path?.[0] || "field";
          if (e.code === "too_small" && e.minimum) {
            return `${field === "password" ? "Пароль" : field}: минимум ${e.minimum} символов`;
          }
          if (e.code === "invalid_string" && e.validation === "email") {
            return "Введите корректный email";
          }
          return e.message || "Ошибка валидации";
        });
        return messages.join(". ");
      }
    } catch {
      // не JSON
    }
  }
  
  // Известные ошибки
  if (msg.includes("too_small") && msg.includes("password")) {
    return "Пароль должен быть минимум 8 символов";
  }
  if (msg.includes("User already exists")) {
    return "Пользователь с таким email уже существует";
  }
  if (msg.includes("Invalid credentials")) {
    return "Неверный email или пароль";
  }
  if (msg.includes("API 409")) {
    return "Пользователь с таким email уже существует";
  }
  if (msg.includes("API 401")) {
    return "Неверный email или пароль";
  }
  
  return msg;
}

export default function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation() as any;
  const { loginWithToken } = useAuth();

  const redirectTo = useMemo(() => loc.state?.from || "/projects", [loc.state]);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Валидация на фронтенде
    if (mode === "register" && password.length < 8) {
      setError("Пароль должен быть минимум 8 символов");
      return;
    }

    setBusy(true);
    try {
      const res =
        mode === "login"
          ? await apiLogin(email.trim(), password)
          : await apiRegister(email.trim(), password);

      await loginWithToken(res.token);
      nav(redirectTo, { replace: true });
    } catch (err: any) {
      setError(parseError(err?.message || "Ошибка входа"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>MDsystem</h1>
        <p className="muted">{mode === "login" ? "Login" : "Register"}</p>

        <div className="row gap">
          <button
            className={mode === "login" ? "btn" : "btn secondary"}
            onClick={() => setMode("login")}
            type="button"
          >
            Login
          </button>
          <button
            className={mode === "register" ? "btn" : "btn secondary"}
            onClick={() => setMode("register")}
            type="button"
          >
            Register
          </button>
        </div>

        <form onSubmit={submit} className="stack">
          <label className="stack">
            <span>Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="stack">
            <span>Password {mode === "register" && <span className="muted">(минимум 8 символов)</span>}</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={mode === "register" ? 8 : undefined}
              required
            />
          </label>

          {error && <div className="alert">{error}</div>}

          <button className="btn" disabled={busy}>
            {busy ? "…" : mode === "login" ? "Login" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
