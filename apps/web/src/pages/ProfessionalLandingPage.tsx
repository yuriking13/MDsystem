import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/professional-landing.css";

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
        title: "Баннеры научных конференций",
        subtitle: "Место под 3 промо-баннера ближайших конференций",
        slots: [
          "Баннер конференции #1",
          "Баннер конференции #2",
          "Баннер конференции #3",
        ],
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
        title: "Scientific Conference Banners",
        subtitle: "Reserved area for 3 upcoming conference banners",
        slots: [
          "Conference banner #1",
          "Conference banner #2",
          "Conference banner #3",
        ],
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
      className={`professional-landing min-h-screen transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 landing-style-bch" : "bg-slate-50 landing-style-chb"}`}
    >
      {/* Animated Background with brand logos */}
      <div className="logo-bg" aria-hidden="true">
        <div className="logo-aura logo-aura-1" />
        <div className="logo-aura logo-aura-2" />
        <div className="logo-aura logo-aura-3" />
        <div className="floating-logo logo-1">
          <img src="/logo.svg" alt="" loading="lazy" />
        </div>
        <div className="floating-logo logo-2">
          <img src="/logo.svg" alt="" loading="lazy" />
        </div>
        <div className="floating-logo logo-3">
          <img src="/logo.svg" alt="" loading="lazy" />
        </div>
        <div className="floating-logo logo-4">
          <img src="/logo.svg" alt="" loading="lazy" />
        </div>
        <div className="floating-logo logo-5">
          <img src="/logo.svg" alt="" loading="lazy" />
        </div>
        <div className="floating-logo logo-6">
          <img src="/logo.svg" alt="" loading="lazy" />
        </div>
      </div>

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

      {/* Capabilities Section */}
      <section id="capabilities" className="py-24 px-6 modern-section-surface">
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
                  className="pricing-offer-action"
                >
                  {language === "ru" ? "Выбрать план" : "Choose plan"}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

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
            {t.conference.slots.map((slot) => (
              <a href="#" key={slot} className="conference-banner-slot">
                <span>{slot}</span>
              </a>
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
