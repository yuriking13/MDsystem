import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../styles/professional-landing.css";
import LandingFooter from "../components/LandingFooter";

export default function PlatformEthicsPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [language, setLanguage] = useState<"ru" | "en">("ru");

  useEffect(() => {
    document.documentElement.className = theme === "dark" ? "dark" : "";
  }, [theme]);

  const toggleTheme = () => setTheme((p) => (p === "light" ? "dark" : "light"));
  const toggleLanguage = () => setLanguage((p) => (p === "ru" ? "en" : "ru"));

  const content = {
    ru: {
      title: "Этика платформы",
      subtitle:
        "Принципы, которым мы следуем при разработке и эксплуатации научной платформы Scientiaiter.",
      sections: [
        {
          heading: "1. Научная добросовестность",
          text: "Мы поддерживаем стандарты научной добросовестности и не допускаем использование платформы для фальсификации, подлога или плагиата исследовательских данных.",
        },
        {
          heading: "2. Ответственное использование AI",
          text: "Инструменты искусственного интеллекта на платформе предназначены для помощи исследователям, а не для замены экспертной оценки. Пользователи несут ответственность за проверку и корректность любых результатов, сгенерированных с помощью AI.",
        },
        {
          heading: "3. Прозрачность алгоритмов",
          text: "Мы стремимся к прозрачности в работе наших алгоритмов поиска и рекомендаций. Платформа не продвигает контент на основании коммерческих интересов в ущерб качеству.",
        },
        {
          heading: "4. Защита авторских прав",
          text: "Платформа уважает авторские права и интеллектуальную собственность. Мы не используем загруженные пользователями материалы для обучения моделей без явного согласия.",
        },
        {
          heading: "5. Равный доступ",
          text: "Мы стремимся обеспечить доступ к инструментам платформы для исследователей вне зависимости от их аффилиации, географии или статуса учреждения.",
        },
        {
          heading: "6. Конфиденциальность данных",
          text: "Мы минимизируем объём собираемых данных и не передаём персональную информацию третьим сторонам в рекламных целях. Подробнее — в нашей Политике конфиденциальности.",
          link: { to: "/privacy", label: "Политика конфиденциальности" },
        },
        {
          heading: "7. Обратная связь",
          text: "Мы открыты для замечаний и предложений от научного сообщества. Если вы обнаружили этическое нарушение на платформе, свяжитесь с нами через раздел поддержки.",
        },
      ],
    },
    en: {
      title: "Platform Ethics",
      subtitle:
        "Principles we follow in the development and operation of the Scientiaiter research platform.",
      sections: [
        {
          heading: "1. Scientific Integrity",
          text: "We uphold standards of scientific integrity and do not allow the platform to be used for falsification, fabrication, or plagiarism of research data.",
        },
        {
          heading: "2. Responsible AI Use",
          text: "AI tools on the platform are designed to assist researchers, not replace expert judgement. Users are responsible for verifying the accuracy of any AI-generated results.",
        },
        {
          heading: "3. Algorithm Transparency",
          text: "We strive for transparency in our search and recommendation algorithms. The platform does not promote content based on commercial interests at the expense of quality.",
        },
        {
          heading: "4. Copyright Protection",
          text: "The platform respects copyrights and intellectual property. We do not use user-uploaded materials for model training without explicit consent.",
        },
        {
          heading: "5. Equal Access",
          text: "We aim to provide access to platform tools for researchers regardless of their affiliation, geography, or institution status.",
        },
        {
          heading: "6. Data Privacy",
          text: "We minimise the amount of data collected and do not share personal information with third parties for advertising purposes. See our Privacy Policy for details.",
          link: { to: "/privacy", label: "Privacy Policy" },
        },
        {
          heading: "7. Feedback",
          text: "We are open to feedback from the research community. If you discover an ethical violation on the platform, please contact us via the support section.",
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
                <p
                  className={`leading-relaxed ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}
                >
                  {s.text}
                  {"link" in s && s.link && (
                    <>
                      {" "}
                      <Link
                        to={s.link.to}
                        className="underline hover:no-underline"
                      >
                        {s.link.label}
                      </Link>
                    </>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <LandingFooter language={language} theme={theme} />
    </div>
  );
}
