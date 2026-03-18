import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/professional-landing.css";

export default function ProfessionalLandingPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [language, setLanguage] = useState<"ru" | "en">("ru");

  useEffect(() => {
    // Apply theme to document
    document.documentElement.className = theme === "dark" ? "dark" : "";
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "ru" ? "en" : "ru"));
  };

  const content = {
    ru: {
      nav: {
        platform: "Платформа",
        capabilities: "Возможности",
        pricing: "Цены",
        login: "Войти",
        start: "Начать",
      },
      hero: {
        badge: "Научная платформа нового поколения",
        title: ["Исследования", "на новом", "уровне"],
        subtitle:
          "Профессиональная платформа для систематизации знаний, анализа данных и подготовки публикаций в области медицинских исследований",
        cta1: "Попробовать платформу",
        cta2: "Запросить демо",
      },
      capabilities: {
        title: "Интегрированная исследовательская экосистема",
        subtitle:
          "Каждый компонент платформы работает в синергии, обеспечивая полный цикл научного исследования",
        cards: [
          {
            title: "Аналитический движок",
            description:
              "Продвинутые статистические методы и машинное обучение для анализа исследовательских данных. Автоматическая проверка гипотез и выявление паттернов.",
          },
          {
            title: "ИИ-ядро",
            description:
              "Центральный искусственный интеллект для обработки естественного языка, генерации гипотез и ассистирования в написании научных текстов.",
          },
          {
            title: "База литературы",
            description:
              "Интегрированный доступ к ведущим научным базам данных. Умный поиск, автоматическая категоризация и построение графов цитирования.",
          },
          {
            title: "Центр коллаборации",
            description:
              "Инструменты для командной работы: общие проекты, рецензирование, версионирование документов и распределение ролей.",
          },
        ],
      },
      pricing: {
        title: "Тарифные планы",
        subtitle: "Выберите подходящий план для ваших исследований",
      },
      footer: {
        title: "Готовы повысить качество ваших исследований?",
        subtitle:
          "Присоединяйтесь к исследователям, которые уже используют возможности интегрированной научной платформы",
        cta1: "Начать бесплатный период",
        cta2: "Запросить демо",
      },
    },
    en: {
      nav: {
        platform: "Platform",
        capabilities: "Features",
        pricing: "Pricing",
        login: "Log in",
        start: "Get Started",
      },
      hero: {
        badge: "Next-generation scientific platform",
        title: ["Research", "at a new", "level"],
        subtitle:
          "Professional platform for knowledge systematization, data analysis and publication preparation in medical research",
        cta1: "Try Platform",
        cta2: "Request Demo",
      },
      capabilities: {
        title: "Integrated Research Ecosystem",
        subtitle:
          "Every component works in synergy to provide a complete scientific research cycle",
        cards: [
          {
            title: "Analytics Engine",
            description:
              "Advanced statistical methods and machine learning for research data analysis. Automatic hypothesis testing and pattern detection.",
          },
          {
            title: "AI Core",
            description:
              "Central artificial intelligence for natural language processing, hypothesis generation and scientific writing assistance.",
          },
          {
            title: "Literature Database",
            description:
              "Integrated access to leading scientific databases. Smart search, automatic categorization and citation graph building.",
          },
          {
            title: "Collaboration Hub",
            description:
              "Team collaboration tools: shared projects, peer review, document versioning and role management.",
          },
        ],
      },
      pricing: {
        title: "Pricing Plans",
        subtitle: "Choose the right plan for your research",
      },
      footer: {
        title: "Ready to enhance your research quality?",
        subtitle:
          "Join researchers who are already using the integrated scientific platform capabilities",
        cta1: "Start Free Trial",
        cta2: "Request Demo",
      },
    },
  };

  const t = content[language];

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${theme === "dark" ? "bg-slate-900" : "bg-slate-50"}`}
    >
      {/* Animated Background */}
      <div className="geometric-bg">
        <div className="geometric-shape shape-1"></div>
        <div className="geometric-shape shape-2"></div>
        <div className="geometric-shape shape-3"></div>
        <div className="geometric-shape shape-4"></div>
        <div className="geometric-shape shape-5"></div>
        <div className="geometric-shape shape-6"></div>
      </div>

      {/* Header + Hero Combined */}
      <section
        className={`min-h-screen relative overflow-hidden ${theme === "dark" ? "bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900" : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"}`}
      >
        {/* Header */}
        <header className="relative z-50 px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <Link
                to="/"
                className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}
              >
                Scientiaiter
              </Link>

              <nav className="hidden md:flex items-center gap-8">
                <a
                  href="#platform"
                  className={`${theme === "dark" ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"} transition-colors font-medium`}
                >
                  {t.nav.platform}
                </a>
                <a
                  href="#capabilities"
                  className={`${theme === "dark" ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"} transition-colors font-medium`}
                >
                  {t.nav.capabilities}
                </a>
                <a
                  href="#pricing"
                  className={`${theme === "dark" ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"} transition-colors font-medium`}
                >
                  {t.nav.pricing}
                </a>
              </nav>

              <div className="flex items-center gap-4">
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "text-yellow-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}
                  title={
                    theme === "dark"
                      ? "Switch to light mode"
                      : "Switch to dark mode"
                  }
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

                {/* Language Toggle */}
                <button
                  onClick={toggleLanguage}
                  className={`px-3 py-2 rounded-lg font-medium transition-colors ${theme === "dark" ? "text-slate-300 hover:text-white hover:bg-slate-800" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"}`}
                >
                  {language === "ru" ? "EN" : "RU"}
                </button>

                <Link
                  to="/login"
                  className={`${theme === "dark" ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"} transition-colors font-medium`}
                >
                  {t.nav.login}
                </Link>

                <Link
                  to="/register"
                  className={`${theme === "dark" ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-900 hover:bg-slate-800"} text-white px-6 py-2.5 rounded-lg transition-colors font-medium`}
                >
                  {t.nav.start}
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Content */}
        <div className="relative z-40 flex items-center justify-center min-h-[calc(100vh-100px)] px-6">
          <div className="max-w-5xl mx-auto text-center">
            <div className="mb-8 animate-fade-in-up">
              <span
                className={`${theme === "dark" ? "bg-blue-500/20 text-blue-300 border-blue-400/30" : "bg-blue-100 text-blue-800"} border px-6 py-3 rounded-full text-sm font-medium backdrop-blur-sm`}
              >
                {t.hero.badge}
              </span>
            </div>

            <h1
              className={`text-6xl md:text-8xl font-light mb-8 ${theme === "dark" ? "text-white" : "text-slate-900"} leading-tight animate-fade-in-up-delay-1`}
            >
              {t.hero.title.map((line, index) => (
                <div key={index} className="block">
                  {line}
                </div>
              ))}
            </h1>

            <p
              className={`text-xl md:text-2xl ${theme === "dark" ? "text-slate-300" : "text-slate-600"} mb-12 leading-relaxed max-w-4xl mx-auto font-light animate-fade-in-up-delay-2`}
            >
              {t.hero.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center animate-fade-in-up-delay-3">
              <Link
                to="/register"
                className={`${theme === "dark" ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-600 hover:bg-blue-700"} text-white px-10 py-4 rounded-xl text-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105`}
              >
                {t.hero.cta1}
              </Link>
              <Link
                to="/demo"
                className={`${theme === "dark" ? "border-slate-400 text-slate-300 hover:bg-slate-800" : "border-slate-300 text-slate-700 hover:bg-slate-50"} border-2 px-10 py-4 rounded-xl text-lg font-medium transition-all duration-200 hover:scale-105`}
              >
                {t.hero.cta2}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section
        id="capabilities"
        className={`py-24 px-6 ${theme === "dark" ? "bg-slate-800" : "bg-white"}`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2
              className={`text-4xl md:text-5xl font-light ${theme === "dark" ? "text-white" : "text-slate-900"} mb-6`}
            >
              {t.capabilities.title}
            </h2>
            <p
              className={`text-xl ${theme === "dark" ? "text-slate-300" : "text-slate-600"} max-w-3xl mx-auto font-light`}
            >
              {t.capabilities.subtitle}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-8">
            {t.capabilities.cards.map((card, index) => {
              const colors = [
                {
                  bg:
                    theme === "dark"
                      ? "bg-slate-700 hover:bg-blue-900"
                      : "bg-slate-50 hover:bg-blue-50",
                  icon:
                    theme === "dark"
                      ? "bg-blue-900 text-blue-300"
                      : "bg-blue-100 text-blue-600",
                },
                {
                  bg:
                    theme === "dark"
                      ? "bg-slate-700 hover:bg-emerald-900"
                      : "bg-slate-50 hover:bg-emerald-50",
                  icon:
                    theme === "dark"
                      ? "bg-emerald-900 text-emerald-300"
                      : "bg-emerald-100 text-emerald-600",
                },
                {
                  bg:
                    theme === "dark"
                      ? "bg-slate-700 hover:bg-amber-900"
                      : "bg-slate-50 hover:bg-amber-50",
                  icon:
                    theme === "dark"
                      ? "bg-amber-900 text-amber-300"
                      : "bg-amber-100 text-amber-600",
                },
                {
                  bg:
                    theme === "dark"
                      ? "bg-slate-700 hover:bg-purple-900"
                      : "bg-slate-50 hover:bg-purple-50",
                  icon:
                    theme === "dark"
                      ? "bg-purple-900 text-purple-300"
                      : "bg-purple-100 text-purple-600",
                },
              ];

              const svgIcons = [
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />,
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />,
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253"
                />,
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />,
              ];

              return (
                <div key={index} className="group">
                  <div
                    className={`${colors[index].bg} ${theme === "dark" ? "border-slate-600" : "border-slate-200"} rounded-2xl p-8 h-full border transition-all duration-300`}
                  >
                    <div
                      className={`w-16 h-16 ${colors[index].icon} rounded-xl flex items-center justify-center mb-6 transition-colors`}
                    >
                      <svg
                        className="w-8 h-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {svgIcons[index]}
                      </svg>
                    </div>
                    <h3
                      className={`text-xl font-medium ${theme === "dark" ? "text-white" : "text-slate-900"} mb-4`}
                    >
                      {card.title}
                    </h3>
                    <p
                      className={`${theme === "dark" ? "text-slate-300" : "text-slate-600"} leading-relaxed font-light`}
                    >
                      {card.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="pricing"
        className={`py-24 px-6 ${theme === "dark" ? "bg-slate-900" : "bg-slate-50"}`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2
              className={`text-4xl md:text-5xl font-light ${theme === "dark" ? "text-white" : "text-slate-900"} mb-6`}
            >
              {t.pricing.title}
            </h2>
            <p
              className={`text-xl ${theme === "dark" ? "text-slate-300" : "text-slate-600"} font-light`}
            >
              {t.pricing.subtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Individual Plan */}
            <div
              className={`${theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"} rounded-2xl p-8 border`}
            >
              <h3
                className={`text-2xl font-medium ${theme === "dark" ? "text-white" : "text-slate-900"} mb-2`}
              >
                {language === "ru" ? "Исследователь" : "Researcher"}
              </h3>
              <div
                className={`text-4xl font-light ${theme === "dark" ? "text-white" : "text-slate-900"} mb-2`}
              >
                ₽2,990
                <span
                  className={`text-lg font-normal ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}
                >
                  /мес
                </span>
              </div>
              <p
                className={`${theme === "dark" ? "text-slate-400" : "text-slate-600"} mb-6 font-light`}
              >
                {language === "ru"
                  ? "Для индивидуальных исследователей"
                  : "For individual researchers"}
              </p>
              <Link
                to="/register"
                className={`w-full ${theme === "dark" ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"} px-6 py-3 rounded-xl font-medium transition-colors text-center block`}
              >
                {language === "ru" ? "Выбрать план" : "Choose plan"}
              </Link>
            </div>

            {/* Team Plan - Popular */}
            <div
              className={`${theme === "dark" ? "bg-blue-900 border-blue-700" : "bg-blue-600 border-blue-600"} rounded-2xl p-8 border-2 relative transform scale-105`}
            >
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <span
                  className={`${theme === "dark" ? "bg-blue-200 text-blue-900" : "bg-blue-100 text-blue-800"} px-4 py-1 rounded-full text-sm font-medium`}
                >
                  {language === "ru" ? "Популярный" : "Popular"}
                </span>
              </div>
              <h3 className="text-2xl font-medium text-white mb-2">
                {language === "ru" ? "Команда" : "Team"}
              </h3>
              <div className="text-4xl font-light text-white mb-2">
                ₽8,990
                <span
                  className={`text-lg font-normal ${theme === "dark" ? "text-blue-300" : "text-blue-200"}`}
                >
                  /мес
                </span>
              </div>
              <p
                className={`${theme === "dark" ? "text-blue-300" : "text-blue-200"} mb-6 font-light`}
              >
                {language === "ru"
                  ? "Для исследовательских групп"
                  : "For research teams"}
              </p>
              <Link
                to="/register"
                className="w-full bg-white text-blue-600 px-6 py-3 rounded-xl font-medium hover:bg-blue-50 transition-colors text-center block"
              >
                {language === "ru" ? "Выбрать план" : "Choose plan"}
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div
              className={`${theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"} rounded-2xl p-8 border`}
            >
              <h3
                className={`text-2xl font-medium ${theme === "dark" ? "text-white" : "text-slate-900"} mb-2`}
              >
                {language === "ru" ? "Институт" : "Enterprise"}
              </h3>
              <div
                className={`text-4xl font-light ${theme === "dark" ? "text-white" : "text-slate-900"} mb-2`}
              >
                {language === "ru" ? "Договор" : "Custom"}
              </div>
              <p
                className={`${theme === "dark" ? "text-slate-400" : "text-slate-600"} mb-6 font-light`}
              >
                {language === "ru"
                  ? "Для крупных организаций"
                  : "For large organizations"}
              </p>
              <Link
                to="/contact"
                className={`w-full border-2 ${theme === "dark" ? "border-slate-400 text-slate-300 hover:bg-slate-700" : "border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white"} px-6 py-3 rounded-xl font-medium transition-colors text-center block`}
              >
                {language === "ru" ? "Связаться с нами" : "Contact us"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className={`py-24 px-6 ${theme === "dark" ? "bg-slate-800" : "bg-slate-900"} text-white`}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-light mb-6">
            {t.footer.title}
          </h2>
          <p
            className={`text-xl ${theme === "dark" ? "text-slate-300" : "text-slate-300"} mb-8 font-light`}
          >
            {t.footer.subtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
            <Link
              to="/register"
              className="bg-blue-600 text-white px-10 py-4 rounded-xl text-lg font-medium hover:bg-blue-700 transition-colors"
            >
              {t.footer.cta1}
            </Link>
            <Link
              to="/demo"
              className="border-2 border-white text-white px-10 py-4 rounded-xl text-lg font-medium hover:bg-white/10 transition-colors"
            >
              {t.footer.cta2}
            </Link>
          </div>

          {/* Footer Links */}
          <div className="border-t border-slate-700 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-2xl font-bold">Scientiaiter</div>

              <div className="flex gap-8 text-sm">
                <Link
                  to="/privacy"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {language === "ru" ? "Конфиденциальность" : "Privacy"}
                </Link>
                <Link
                  to="/terms"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {language === "ru" ? "Условия" : "Terms"}
                </Link>
                <Link
                  to="/support"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {language === "ru" ? "Поддержка" : "Support"}
                </Link>
              </div>

              <div className="text-slate-500 text-sm">© 2026 Scientiaiter</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
