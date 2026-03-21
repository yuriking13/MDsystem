import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../styles/professional-landing.css";
import LandingFooter from "../components/LandingFooter";

export default function PrivacyPolicyPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [language, setLanguage] = useState<"ru" | "en">("ru");

  useEffect(() => {
    document.documentElement.className = theme === "dark" ? "dark" : "";
  }, [theme]);

  const toggleTheme = () => setTheme((p) => (p === "light" ? "dark" : "light"));
  const toggleLanguage = () => setLanguage((p) => (p === "ru" ? "en" : "ru"));

  const content = {
    ru: {
      title: "Политика конфиденциальности",
      subtitle:
        "Документ описывает, какие данные обрабатываются в сервисе Scientiaiter и с какой целью.",
      sections: [
        {
          heading: "1. Какие данные мы обрабатываем",
          items: [
            "Регистрационные данные (email, хеш пароля).",
            "Данные проектов: документы, метаданные статей, прикрепленные файлы.",
            "Технические данные для безопасности и аналитики (логи, IP-адрес, события ошибок).",
          ],
        },
        {
          heading: "2. Цели обработки",
          text: "Данные используются для предоставления функциональности платформы, обеспечения безопасности аккаунтов, мониторинга стабильности и улучшения качества сервиса.",
        },
        {
          heading: "3. AI-обработка",
          text: "Часть пользовательских данных может передаваться внешним AI-провайдерам исключительно в объёме, необходимом для выполнения пользовательского запроса. Мы не передаём данные для обучения моделей третьих лиц.",
        },
        {
          heading: "4. Хранение и защита",
          text: "Мы применяем технические меры защиты данных, включая контроль доступа, шифрование каналов передачи (TLS), логирование и регулярное резервное копирование.",
        },
        {
          heading: "5. Права пользователя",
          text: "Пользователь может запросить уточнение, обновление или удаление персональных данных в пределах требований применимого законодательства.",
        },
        {
          heading: "6. Cookies и аналитика",
          text: "Сервис использует минимальный набор cookies для аутентификации и обеспечения работы платформы. Мы не используем сторонние рекламные трекеры.",
        },
        {
          heading: "7. Изменения политики",
          text: "Мы вправе обновлять политику конфиденциальности. Актуальная версия всегда доступна на этой странице.",
        },
      ],
    },
    en: {
      title: "Privacy Policy",
      subtitle:
        "This document describes what data is processed by Scientiaiter and for what purpose.",
      sections: [
        {
          heading: "1. Data We Process",
          items: [
            "Registration data (email, password hash).",
            "Project data: documents, article metadata, attached files.",
            "Technical data for security and analytics (logs, IP address, error events).",
          ],
        },
        {
          heading: "2. Purpose of Processing",
          text: "Data is used to provide platform functionality, ensure account security, monitor stability, and improve service quality.",
        },
        {
          heading: "3. AI Processing",
          text: "Some user data may be sent to external AI providers strictly to the extent necessary for the user's request. We do not share data for third-party model training.",
        },
        {
          heading: "4. Storage and Protection",
          text: "We employ technical data protection measures including access control, transport encryption (TLS), logging, and regular backups.",
        },
        {
          heading: "5. User Rights",
          text: "Users may request clarification, update, or deletion of personal data within the limits of applicable law.",
        },
        {
          heading: "6. Cookies and Analytics",
          text: "The service uses a minimal set of cookies for authentication and platform functionality. We do not use third-party advertising trackers.",
        },
        {
          heading: "7. Policy Changes",
          text: "We may update this privacy policy. The current version is always available on this page.",
        },
      ],
    },
  };

  const t = content[language];

  return (
    <div
      className={`professional-landing min-h-screen transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 landing-style-bch" : "bg-slate-50 landing-style-chb"}`}
    >
      <header className="relative z-50 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className={`brand-name-stack ${theme === "dark" ? "text-white" : "text-slate-900"}`}
          >
            <img
              src="https://storage.yandexcloud.net/scentiaiterpublic/landing/logo_scientiaiter_no_name_bw_nobg_small.png"
              alt=""
              className="brand-name-logo"
            />
            <div className="brand-name-text">
              <span className="brand-name-primary">Scientiaiter</span>
              <span className="brand-name-subtitle">
                {language === "ru" ? "Путь знания" : "Path of Knowledge"}
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "text-yellow-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {theme === "dark" ? (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
            <button
              onClick={toggleLanguage}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${theme === "dark" ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {language === "ru" ? "EN" : "RU"}
            </button>
            <Link
              to="/login"
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${theme === "dark" ? "text-white bg-teal-700 hover:bg-teal-800" : "text-white bg-slate-900 hover:bg-slate-800"}`}
            >
              {language === "ru" ? "Войти" : "Log in"}
            </Link>
          </div>
        </div>
      </header>

      <main className="px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <h1
            className={`text-4xl md:text-5xl font-light mb-4 ${theme === "dark" ? "text-white" : "text-slate-900"}`}
          >
            {t.title}
          </h1>
          <p
            className={`text-lg mb-12 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
          >
            {t.subtitle}
          </p>

          <div className="policy-sections">
            {t.sections.map((s) => (
              <div key={s.heading} className="policy-section">
                <h2
                  className={`text-xl font-semibold mb-3 ${theme === "dark" ? "text-white" : "text-slate-900"}`}
                >
                  {s.heading}
                </h2>
                {"items" in s && s.items ? (
                  <ul
                    className={`list-disc pl-6 space-y-1 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}
                  >
                    {s.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p
                    className={`leading-relaxed ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}
                  >
                    {s.text}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      <LandingFooter language={language} theme={theme} />
    </div>
  );
}
