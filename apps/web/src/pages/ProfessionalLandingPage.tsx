import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/professional-landing.css";
import LandingFooter from "../components/LandingFooter";

const HERO_IMAGE_URL =
  "https://storage.yandexcloud.net/scentiaiterpublic/landing/Cell-cenet.png";

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
        faq: "FAQ",
        login: "Войти",
        start: "Начать",
      },
      brandSubtitle: "Путь знания",
      hero: {
        badge: "Научная платформа нового поколения",
        title: "Умное рабочее пространство для научных работ по медицине",
        subtitle:
          "Профессиональная платформа для систематизации знаний, анализа данных и подготовки публикаций в области медицинских исследований",
        cta1: "Создать проект",
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
        plans: [
          {
            name: "Исследователь",
            price: "₽2,990",
            period: "/мес",
            description: "Для индивидуальных исследователей",
            benefits: [
              "До 3 активных проектов",
              "Базовый AI-ассистент",
              "Поиск и организация литературы",
              "Экспорт рукописей в DOCX/PDF",
            ],
          },
          {
            name: "Команда",
            price: "₽8,990",
            period: "/мес",
            description: "Для исследовательских групп",
            tag: "Популярный",
            benefits: [
              "До 20 участников в команде",
              "Совместная работа в реальном времени",
              "Расширенная аналитика и граф цитирования",
              "Приоритетная поддержка",
            ],
          },
          {
            name: "Институт",
            price: "Договор",
            period: "",
            description: "Для крупных организаций",
            benefits: [
              "Неограниченные проекты и пользователи",
              "Интеграции с внутренними системами",
              "Выделенный SLA и сопровождение",
              "Кастомные рабочие процессы",
            ],
          },
        ],
      },
      conference: {
        title: "Будущие мероприятия",
        subtitle: "Ближайшие конференции. Примите участие",
        moreBtn: "Узнать о других конференциях",
        emptyNote: "Конференции скоро появятся",
        banners: [] as {
          title: string;
          subtitle: string;
          image: string;
          logoUrl: string;
        }[],
      },
      faq: {
        title: "FAQ / Вопросы и ответы",
        items: [
          {
            q: "Можно ли работать командой над одной рукописью?",
            a: "Да, в платформе есть совместное редактирование, комментарии и отслеживание версий.",
          },
          {
            q: "Подходит ли платформа для обзоров литературы?",
            a: "Да, есть многоканальный поиск, дедупликация источников и структурирование материалов.",
          },
          {
            q: "Есть ли поддержка английского интерфейса?",
            a: "Да, интерфейс доступен на русском и английском языках.",
          },
        ],
      },
    },
    en: {
      nav: {
        platform: "Platform",
        capabilities: "Features",
        pricing: "Pricing",
        faq: "FAQ",
        login: "Log in",
        start: "Get Started",
      },
      brandSubtitle: "Path of Knowledge",
      hero: {
        badge: "Next-generation scientific platform",
        title: "Smart workspace for medical scientific publications",
        subtitle:
          "Professional platform for knowledge systematization, data analysis and publication preparation in medical research",
        cta1: "Create Project",
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
        plans: [
          {
            name: "Researcher",
            price: "$39",
            period: "/month",
            description: "For individual researchers",
            benefits: [
              "Up to 3 active projects",
              "Core AI writing assistant",
              "Literature search and organization",
              "DOCX/PDF export",
            ],
          },
          {
            name: "Team",
            price: "$119",
            period: "/month",
            description: "For research teams",
            tag: "Popular",
            benefits: [
              "Up to 20 team members",
              "Real-time collaboration",
              "Advanced citation graph",
              "Priority support",
            ],
          },
          {
            name: "Enterprise",
            price: "Custom",
            period: "",
            description: "For large organizations",
            benefits: [
              "Unlimited projects and users",
              "Internal system integrations",
              "Dedicated SLA and support",
              "Custom workflows",
            ],
          },
        ],
      },
      conference: {
        title: "Upcoming Events",
        subtitle: "Nearest conferences. Join in",
        moreBtn: "Discover more conferences",
        emptyNote: "Conferences coming soon",
        banners: [] as {
          title: string;
          subtitle: string;
          image: string;
          logoUrl: string;
        }[],
      },
      faq: {
        title: "FAQ",
        items: [
          {
            q: "Can teams work on the same manuscript?",
            a: "Yes, the platform includes collaborative editing, comments, and version tracking.",
          },
          {
            q: "Is the platform good for literature reviews?",
            a: "Yes, it provides multi-source search, source deduplication, and structured collections.",
          },
          {
            q: "Is there multilingual UI support?",
            a: "Yes, both Russian and English interface modes are available.",
          },
        ],
      },
    },
  };

  const t = content[language];

  return (
    <div
      className={`professional-landing min-h-screen transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 landing-style-bch" : "bg-slate-50 landing-style-chb"}`}
    >
      {/* Header + Hero Combined */}
      <section className="min-h-screen relative overflow-hidden modern-hero-shell">
        {/* Header */}
        <header className="relative z-50 px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <Link
                to="/"
                className={`brand-name-stack ${theme === "dark" ? "text-white" : "text-slate-900"}`}
              >
                <span className="brand-name-primary">Scientiaiter</span>
                <span className="brand-name-subtitle">{t.brandSubtitle}</span>
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
                <a
                  href="#faq"
                  className={`${theme === "dark" ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"} transition-colors font-medium`}
                >
                  {t.nav.faq}
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

                <Link to="/register" className="glass-button-wrap">
                  <span className="glass-button">
                    <span>{t.nav.start}</span>
                  </span>
                  <span className="glass-button-shadow" />
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Content */}
        <div className="relative z-40 min-h-[calc(100vh-100px)] px-6 flex items-center hero-content-shift">
          <div className="max-w-7xl w-full mx-auto hero-split-layout">
            <div className="hero-copy-block">
              <h1
                className={`text-5xl md:text-7xl font-bold mb-8 ${theme === "dark" ? "text-white" : "text-black"} leading-tight animate-fade-in-up-delay-1`}
              >
                {t.hero.title}
              </h1>

              <p
                className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-black"} mb-12 uppercase tracking-widest font-medium opacity-80 animate-fade-in-up-delay-2`}
              >
                {t.hero.subtitle}
              </p>

              <div className="flex flex-col sm:flex-row gap-6 animate-fade-in-up-delay-3">
                <Link
                  to="/register"
                  className="glass-button-wrap glass-button-wrap--hero"
                >
                  <span className="glass-button">
                    <span>{t.hero.cta1}</span>
                  </span>
                  <span className="glass-button-shadow" />
                </Link>
              </div>
            </div>

            <div className="hero-image-shell animate-fade-in-up-delay-2">
              <img
                src={HERO_IMAGE_URL}
                alt={
                  language === "ru"
                    ? "Клеточная визуализация"
                    : "Cellular visualization"
                }
                className="hero-cell-image"
              />
            </div>
          </div>
        </div>
      </section>

      <section
        className="partners-runner"
        aria-label={language === "ru" ? "Наши источники" : "Our sources"}
      >
        <div className="partners-runner-track">
          {[0, 1, 2, 3, 4, 5].map((copy) =>
            [
              {
                name: "Cochrane",
                src: "https://storage.yandexcloud.net/scentiaiterpublic/partners/Cochrane-logo.jpg",
              },
              {
                name: "DOAJ",
                src: "https://storage.yandexcloud.net/scentiaiterpublic/partners/DOAJ_idGdm4HXaq_0.png",
              },
              {
                name: "PubMed",
                src: "https://storage.yandexcloud.net/scentiaiterpublic/partners/US-NLM-PubMed-Logo.svg.png",
              },
              {
                name: "eLibrary",
                src: "https://storage.yandexcloud.net/scentiaiterpublic/partners/elibrary_ru2.svg",
              },
            ].map((p) => (
              <span key={`${copy}-${p.name}`} className="partner-logo-chip">
                <img src={p.src} alt={p.name} loading="lazy" />
              </span>
            )),
          )}
        </div>
      </section>

      {/* Capabilities Section — Futuristic Glass */}
      <section
        id="capabilities"
        className="py-24 px-6 modern-section-surface relative overflow-hidden"
      >
        <div className="capabilities-glow" aria-hidden="true" />
        <div className="max-w-7xl mx-auto relative z-10">
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

          <div className="capabilities-glass-grid">
            {t.capabilities.cards.map((card, index) => {
              const illustrations = [
                <svg
                  key="a"
                  className="capability-svg"
                  viewBox="0 0 120 120"
                  fill="none"
                >
                  <defs>
                    <linearGradient
                      id="cg0"
                      x1="0"
                      y1="120"
                      x2="120"
                      y2="0"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#0ea5e9" />
                      <stop offset="1" stopColor="#38bdf8" />
                    </linearGradient>
                  </defs>
                  <rect
                    x="12"
                    y="72"
                    width="18"
                    height="36"
                    rx="4"
                    fill="url(#cg0)"
                    opacity="0.45"
                  />
                  <rect
                    x="36"
                    y="52"
                    width="18"
                    height="56"
                    rx="4"
                    fill="url(#cg0)"
                    opacity="0.6"
                  />
                  <rect
                    x="60"
                    y="32"
                    width="18"
                    height="76"
                    rx="4"
                    fill="url(#cg0)"
                    opacity="0.78"
                  />
                  <rect
                    x="84"
                    y="14"
                    width="18"
                    height="94"
                    rx="4"
                    fill="url(#cg0)"
                  />
                  <path
                    d="M21 65L45 46L69 28L93 10"
                    stroke="#7dd3fc"
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity="0.5"
                  />
                  <circle cx="21" cy="65" r="3.5" fill="#7dd3fc" />
                  <circle cx="45" cy="46" r="3.5" fill="#7dd3fc" />
                  <circle cx="69" cy="28" r="3.5" fill="#7dd3fc" />
                  <circle cx="93" cy="10" r="3.5" fill="#7dd3fc" />
                </svg>,
                <svg
                  key="b"
                  className="capability-svg"
                  viewBox="0 0 120 120"
                  fill="none"
                >
                  <defs>
                    <linearGradient
                      id="cg1"
                      x1="0"
                      y1="0"
                      x2="120"
                      y2="120"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#10b981" />
                      <stop offset="1" stopColor="#34d399" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="60"
                    cy="60"
                    r="28"
                    stroke="url(#cg1)"
                    strokeWidth="2"
                    opacity="0.25"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="44"
                    stroke="url(#cg1)"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                    opacity="0.15"
                  />
                  <circle cx="60" cy="60" r="9" fill="url(#cg1)" />
                  <circle
                    cx="60"
                    cy="32"
                    r="5"
                    fill="url(#cg1)"
                    opacity="0.65"
                  />
                  <circle
                    cx="60"
                    cy="88"
                    r="5"
                    fill="url(#cg1)"
                    opacity="0.65"
                  />
                  <circle
                    cx="32"
                    cy="60"
                    r="5"
                    fill="url(#cg1)"
                    opacity="0.65"
                  />
                  <circle
                    cx="88"
                    cy="60"
                    r="5"
                    fill="url(#cg1)"
                    opacity="0.65"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="3.5"
                    fill="url(#cg1)"
                    opacity="0.4"
                  />
                  <circle
                    cx="80"
                    cy="40"
                    r="3.5"
                    fill="url(#cg1)"
                    opacity="0.4"
                  />
                  <circle
                    cx="40"
                    cy="80"
                    r="3.5"
                    fill="url(#cg1)"
                    opacity="0.4"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="3.5"
                    fill="url(#cg1)"
                    opacity="0.4"
                  />
                  <line
                    x1="60"
                    y1="51"
                    x2="60"
                    y2="37"
                    stroke="#34d399"
                    strokeWidth="1.5"
                    opacity="0.4"
                  />
                  <line
                    x1="60"
                    y1="69"
                    x2="60"
                    y2="83"
                    stroke="#34d399"
                    strokeWidth="1.5"
                    opacity="0.4"
                  />
                  <line
                    x1="51"
                    y1="60"
                    x2="37"
                    y2="60"
                    stroke="#34d399"
                    strokeWidth="1.5"
                    opacity="0.4"
                  />
                  <line
                    x1="69"
                    y1="60"
                    x2="83"
                    y2="60"
                    stroke="#34d399"
                    strokeWidth="1.5"
                    opacity="0.4"
                  />
                  <line
                    x1="55"
                    y1="55"
                    x2="43"
                    y2="43"
                    stroke="#34d399"
                    strokeWidth="1"
                    opacity="0.25"
                  />
                  <line
                    x1="65"
                    y1="55"
                    x2="77"
                    y2="43"
                    stroke="#34d399"
                    strokeWidth="1"
                    opacity="0.25"
                  />
                  <line
                    x1="55"
                    y1="65"
                    x2="43"
                    y2="77"
                    stroke="#34d399"
                    strokeWidth="1"
                    opacity="0.25"
                  />
                  <line
                    x1="65"
                    y1="65"
                    x2="77"
                    y2="77"
                    stroke="#34d399"
                    strokeWidth="1"
                    opacity="0.25"
                  />
                </svg>,
                <svg
                  key="c"
                  className="capability-svg"
                  viewBox="0 0 120 120"
                  fill="none"
                >
                  <defs>
                    <linearGradient
                      id="cg2"
                      x1="0"
                      y1="0"
                      x2="120"
                      y2="120"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#f59e0b" />
                      <stop offset="1" stopColor="#fbbf24" />
                    </linearGradient>
                  </defs>
                  <rect
                    x="18"
                    y="28"
                    width="52"
                    height="68"
                    rx="6"
                    stroke="url(#cg2)"
                    strokeWidth="2"
                    opacity="0.55"
                  />
                  <rect
                    x="28"
                    y="38"
                    width="32"
                    height="3"
                    rx="1.5"
                    fill="url(#cg2)"
                    opacity="0.35"
                  />
                  <rect
                    x="28"
                    y="46"
                    width="26"
                    height="3"
                    rx="1.5"
                    fill="url(#cg2)"
                    opacity="0.25"
                  />
                  <rect
                    x="28"
                    y="54"
                    width="30"
                    height="3"
                    rx="1.5"
                    fill="url(#cg2)"
                    opacity="0.25"
                  />
                  <rect
                    x="28"
                    y="62"
                    width="22"
                    height="3"
                    rx="1.5"
                    fill="url(#cg2)"
                    opacity="0.25"
                  />
                  <circle
                    cx="86"
                    cy="44"
                    r="18"
                    stroke="url(#cg2)"
                    strokeWidth="2"
                    opacity="0.45"
                  />
                  <line
                    x1="99"
                    y1="57"
                    x2="110"
                    y2="68"
                    stroke="url(#cg2)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.55"
                  />
                  <path
                    d="M70 82Q86 76 86 62"
                    stroke="#fbbf24"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    opacity="0.35"
                    fill="none"
                  />
                </svg>,
                <svg
                  key="d"
                  className="capability-svg"
                  viewBox="0 0 120 120"
                  fill="none"
                >
                  <defs>
                    <linearGradient
                      id="cg3"
                      x1="0"
                      y1="0"
                      x2="120"
                      y2="120"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#8b5cf6" />
                      <stop offset="1" stopColor="#a78bfa" />
                    </linearGradient>
                  </defs>
                  <line
                    x1="60"
                    y1="30"
                    x2="30"
                    y2="65"
                    stroke="#a78bfa"
                    strokeWidth="1.5"
                    opacity="0.25"
                  />
                  <line
                    x1="60"
                    y1="30"
                    x2="90"
                    y2="65"
                    stroke="#a78bfa"
                    strokeWidth="1.5"
                    opacity="0.25"
                  />
                  <line
                    x1="30"
                    y1="65"
                    x2="90"
                    y2="65"
                    stroke="#a78bfa"
                    strokeWidth="1.5"
                    opacity="0.25"
                  />
                  <line
                    x1="30"
                    y1="65"
                    x2="50"
                    y2="95"
                    stroke="#a78bfa"
                    strokeWidth="1.5"
                    opacity="0.25"
                  />
                  <line
                    x1="90"
                    y1="65"
                    x2="70"
                    y2="95"
                    stroke="#a78bfa"
                    strokeWidth="1.5"
                    opacity="0.25"
                  />
                  <line
                    x1="50"
                    y1="95"
                    x2="70"
                    y2="95"
                    stroke="#a78bfa"
                    strokeWidth="1.5"
                    opacity="0.25"
                  />
                  <circle
                    cx="60"
                    cy="30"
                    r="12"
                    fill="url(#cg3)"
                    opacity="0.75"
                  />
                  <circle
                    cx="30"
                    cy="65"
                    r="10"
                    fill="url(#cg3)"
                    opacity="0.55"
                  />
                  <circle
                    cx="90"
                    cy="65"
                    r="10"
                    fill="url(#cg3)"
                    opacity="0.55"
                  />
                  <circle
                    cx="50"
                    cy="95"
                    r="8"
                    fill="url(#cg3)"
                    opacity="0.38"
                  />
                  <circle
                    cx="70"
                    cy="95"
                    r="8"
                    fill="url(#cg3)"
                    opacity="0.38"
                  />
                  <circle cx="60" cy="30" r="5" fill="#c4b5fd" />
                  <circle cx="30" cy="65" r="4" fill="#c4b5fd" />
                  <circle cx="90" cy="65" r="4" fill="#c4b5fd" />
                </svg>,
              ];

              return (
                <div key={index} className="capability-glass-card">
                  <div className="capability-glass-illustration">
                    {illustrations[index]}
                  </div>
                  <h3
                    className={`capability-glass-title ${theme === "dark" ? "text-white" : "text-slate-900"}`}
                  >
                    {card.title}
                  </h3>
                  <p
                    className={`capability-glass-desc ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}
                  >
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Conference Banners */}
      <section className="py-20 px-6 modern-section-surface" id="conference">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className={`text-4xl md:text-5xl font-light ${theme === "dark" ? "text-white" : "text-slate-900"} mb-4`}
            >
              {t.conference.title}
            </h2>
            <p
              className={`${theme === "dark" ? "text-slate-300" : "text-slate-600"} text-lg`}
            >
              {t.conference.subtitle}
            </p>
          </div>
          <div className="conference-banner-grid">
            {t.conference.banners.length > 0 ? (
              t.conference.banners.map((banner) => (
                <div key={banner.title} className="conf-banner-card">
                  <div className="conf-banner-image">
                    {banner.image ? (
                      <img
                        src={banner.image}
                        alt={banner.title}
                        loading="lazy"
                      />
                    ) : (
                      <div className="conf-banner-placeholder">
                        <svg
                          viewBox="0 0 80 80"
                          fill="none"
                          className="conf-placeholder-svg"
                        >
                          <rect
                            x="8"
                            y="18"
                            width="64"
                            height="44"
                            rx="8"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            opacity="0.25"
                          />
                          <circle
                            cx="28"
                            cy="36"
                            r="7"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            opacity="0.25"
                          />
                          <path
                            d="M8 52l18-14 14 10 18-16 14 18"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            opacity="0.25"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="conf-banner-body">
                    {banner.logoUrl && (
                      <img
                        src={banner.logoUrl}
                        alt=""
                        className="conf-banner-logo"
                        loading="lazy"
                      />
                    )}
                    <h3 className="conf-banner-title">{banner.title}</h3>
                    <p className="conf-banner-sub">{banner.subtitle}</p>
                  </div>
                </div>
              ))
            ) : (
              <p
                className={`text-center col-span-full py-12 text-lg ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
              >
                {t.conference.emptyNote}
              </p>
            )}
          </div>
          <div className="text-center mt-10">
            <Link to="/conferences" className="glass-button-wrap">
              <span className="glass-button">
                <span>{t.conference.moreBtn}</span>
              </span>
              <span className="glass-button-shadow" />
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 modern-section-muted">
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

          <div className="pricing-grid max-w-6xl mx-auto">
            {t.pricing.plans.map((plan) => (
              <article
                key={plan.name}
                className={`pricing-offer-card ${plan.tag ? "pricing-offer-featured" : ""}`}
              >
                {plan.tag && (
                  <span className="pricing-offer-tag">{plan.tag}</span>
                )}
                <h3 className="pricing-offer-title">{plan.name}</h3>
                <div className="pricing-offer-price">
                  {plan.price}
                  {plan.period && <span>{plan.period}</span>}
                </div>
                <p className="pricing-offer-description">{plan.description}</p>
                <ul
                  className="pricing-offer-benefits"
                  aria-label={
                    language === "ru" ? "Преимущества тарифа" : "Plan benefits"
                  }
                >
                  {plan.benefits.map((benefit) => (
                    <li key={benefit}>{benefit}</li>
                  ))}
                </ul>
                <Link
                  to={
                    plan.name === "Институт" || plan.name === "Enterprise"
                      ? "/contact"
                      : "/register"
                  }
                  className="glass-button-wrap pricing-glass-action"
                >
                  <span className="glass-button">
                    <span>
                      {language === "ru" ? "Выбрать план" : "Choose plan"}
                    </span>
                  </span>
                  <span className="glass-button-shadow" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-24 px-6 modern-section-muted">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className={`text-4xl md:text-5xl font-light ${theme === "dark" ? "text-white" : "text-slate-900"}`}
            >
              {t.faq.title}
            </h2>
          </div>

          <div className="faq-list">
            {t.faq.items.map((item) => (
              <details key={item.q} className="faq-item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <LandingFooter language={language} theme={theme} />
    </div>
  );
}
