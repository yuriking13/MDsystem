import React, { useMemo, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { apiLogin } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

// Парсинг ошибки в человекочитаемое сообщение
function parseError(msg: string): string {
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
  
  if (msg.includes("Invalid credentials")) {
    return "Неверный email или пароль";
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await apiLogin(email.trim(), password);
      await loginWithToken(res.token);
      nav(redirectTo, { replace: true });
    } catch (err: any) {
      setError(parseError(err?.message || "Ошибка входа"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-white dark:bg-gray-900">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-12">
        {/* Left side - Background image (on the left as requested) */}
        <aside className="relative block h-16 lg:order-first lg:col-span-5 lg:h-full xl:col-span-6">
          <img
            alt="MDsystem Background"
            src="/login-bg.png"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </aside>

        {/* Right side - Login form */}
        <main className="flex items-center justify-center px-8 py-8 sm:px-12 lg:col-span-7 lg:px-16 lg:py-12 xl:col-span-6">
          <div className="max-w-xl lg:max-w-3xl">
            {/* Logo */}
            <a className="flex items-center mb-6 text-2xl font-semibold text-gray-900 dark:text-white" href="/">
              <svg className="w-8 h-8 mr-2 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              MDsystem
            </a>

            <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl dark:text-white">
              Добро пожаловать
            </h1>

            <p className="mt-4 leading-relaxed text-gray-500 dark:text-gray-400">
              Система управления научными исследованиями. Войдите в аккаунт для доступа к проектам.
            </p>

            <form onSubmit={submit} className="mt-8 grid grid-cols-6 gap-6">
              <div className="col-span-6">
                <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="col-span-6">
                <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Пароль
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="col-span-6 flex items-center justify-between">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="remember"
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-primary-300 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-primary-600 dark:ring-offset-gray-800"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="remember" className="text-gray-500 dark:text-gray-300">
                      Запомнить меня
                    </label>
                  </div>
                </div>
                <Link to="/forgot-password" className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-500">
                  Забыли пароль?
                </Link>
              </div>

              {error && (
                <div className="col-span-6 p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
                  {error}
                </div>
              )}

              <div className="col-span-6">
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Вход...
                    </span>
                  ) : (
                    "Войти в аккаунт"
                  )}
                </button>
              </div>

              <p className="col-span-6 text-sm font-light text-gray-500 dark:text-gray-400">
                Нет аккаунта?{" "}
                <Link to="/register" className="font-medium text-primary-600 hover:underline dark:text-primary-500">
                  Зарегистрироваться
                </Link>
              </p>
            </form>
          </div>
        </main>
      </div>
    </section>
  );
}
