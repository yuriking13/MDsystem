import React, { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiLogin, apiRegister } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

export default function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation() as any;
  const { loginWithToken } = useAuth();

  const redirectTo = useMemo(() => loc.state?.from || "/settings", [loc.state]);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res =
        mode === "login"
          ? await apiLogin(email.trim(), password)
          : await apiRegister(email.trim(), password);

      await loginWithToken(res.token);
      nav(redirectTo, { replace: true });
    } catch (err: any) {
      setError(err?.message || "Login failed");
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
            <span>Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
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
