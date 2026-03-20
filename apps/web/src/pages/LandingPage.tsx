import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  SCIENCE_DISCIPLINES,
  getScienceDisciplineHref,
} from "../lib/scienceDomains";
import InteractiveLandingIllustration from "../components/InteractiveLandingIllustration";
import ScientificVisualization from "../components/ScientificVisualization";
import RevolutionaryHero from "../components/RevolutionaryHero";
import { useSectionTransition } from "../lib/useScrollEffect";
import { useLanguage } from "../lib/LanguageContext";

type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "theme";

function applyTheme(nextTheme: ThemeMode) {
  document.documentElement.setAttribute("data-theme", nextTheme);
  if (nextTheme === "light") {
    document.documentElement.classList.add("light-theme");
    document.documentElement.classList.remove("dark");
    document.body.classList.add("light-theme");
    document.body.classList.remove("dark");
  } else {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light-theme");
    document.body.classList.add("dark");
    document.body.classList.remove("light-theme");
  }
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
}

function resolveInitialTheme(): ThemeMode {
  return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
}

function isHashLink(href: string): boolean {
  return href.startsWith("#");
}

export default function LandingPage() {
  const [theme, setTheme] = useState<ThemeMode>(() => resolveInitialTheme());
  const { lang, setLang, t } = useLanguage();
  const currentYear = new Date().getFullYear();

  // Хук для отслеживания активной секции и эффектов перехода
  useSectionTransition();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  const toggleLocale = () => {
    setLang(lang === "ru" ? "en" : "ru");
  };

  const navItems = [
    { href: "#top", label: t("Главная", "Home") },
    { href: "#features", label: t("Возможности", "Features") },
    { href: "#testimonials", label: t("Отзывы", "Testimonials") },
    { href: "#pricing", label: t("Тарифы", "Pricing") },
    { href: "#faq", label: "FAQ" },
    { href: "#contact", label: t("Контакты", "Contact") },
    { href: "#sciences", label: t("Науки", "Sciences") },
  ];

  const footerLinks = [
    { label: t("Возможности", "Features"), href: "#features" },
    { label: t("Тарифы", "Pricing"), href: "#pricing" },
    { label: "FAQ", href: "#faq" },
    { label: t("Лица проекта", "Project team"), href: "/project-faces" },
    { label: t("Публичная оферта", "Public offer"), href: "/offer" },
    { label: t("Условия использования", "Terms of use"), href: "/terms" },
    {
      label: t("Политика конфиденциальности", "Privacy policy"),
      href: "/privacy",
    },
    { label: t("Лендинг", "Landing"), href: "/" },
    { label: t("Войти", "Sign in"), href: "/login" },
    { label: t("Регистрация", "Register"), href: "/register" },
  ];

  return (
    <div id="top" className="public-page">
      <header className="public-header">
        <div className="public-header-inner">
          <Link to="/" className="public-brand">
            <img
              src="/logo.svg"
              alt="Scientiaiter"
              className="public-brand-logo"
            />
            <span>Scientiaiter</span>
          </Link>

          <nav
            className="public-nav"
            aria-label={t("Открыть главное меню", "Open main menu")}
          >
            {navItems.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="public-header-actions">
            <button
              type="button"
              className="public-theme-toggle public-lang-toggle"
              aria-label={
                lang === "ru"
                  ? t(
                      "Переключить язык на английский",
                      "Switch language to Russian",
                    )
                  : t(
                      "Переключить язык на русский",
                      "Switch language to English",
                    )
              }
              onClick={toggleLocale}
            >
              {lang === "ru" ? "RU / EN" : "EN / RU"}
            </button>
            <button
              id="themeToggle"
              type="button"
              className="public-theme-toggle"
              onClick={toggleTheme}
              aria-label={
                theme === "dark"
                  ? t("Переключить на светлую тему", "Switch to light mode")
                  : t("Переключить на тёмную тему", "Switch to dark mode")
              }
            >
              {theme === "dark" ? "☀" : "🌙"}
            </button>
            <Link to="/login" className="public-theme-toggle">
              {t("Войти", "Sign in")}
            </Link>
            <Link to="/med" className="public-theme-toggle">
              {t("Издательство MED", "MED Publisher")}
            </Link>
            <Link to="/register" className="public-btn">
              {t("Начать", "Get started")}
            </Link>
          </div>
        </div>
      </header>

      {/* Revolutionary Hero блок — Scientific Brutalism */}
      <RevolutionaryHero
        title={t("Пространство\nисследований", "Research\nworkspace")}
        subtitle={t(
          "Создаём интеллектуальные рабочие процессы для науки",
          "We create intelligent research & document workflows",
        )}
        description={t(
          "AI-платформа, которая помогает командам искать литературу, строить граф цитирования и готовить документы к публикации. Результаты говорят сами за себя.",
          "An AI-powered platform that helps teams search literature, map citation relationships, and produce publication-ready documents. Our results speak for themselves.",
        )}
        ctaText={t("Начать", "Get started")}
        ctaLink="/register"
        secondaryText={t("ПОДРОБНЕЕ", "READ MORE")}
        secondaryLink="#features"
      />

      <main className="public-main">
        <section
          id="features"
          className="public-section"
          data-section="features"
        >
          <div className="public-section-header">
            <h2>
              {t(
                "Разработано для исследовательских и продуктовых команд",
                "Designed for research teams and product-minded analysts",
              )}
            </h2>
            <p>
              {t(
                "От первого запроса до финального текста: Scientiaiter связывает источники, заметки и документы проекта в одном контуре.",
                "From early discovery to final manuscript, Scientiaiter keeps your sources, notes, and project docs connected.",
              )}
            </p>
          </div>
          <div className="crystal-grid crystal-grid-3">
            {[
              {
                title: t("Поиск литературы", "Literature search"),
                description: t(
                  "Быстро находите релевантные статьи через мульти-источниковый поиск, фильтры и структурированные коллекции.",
                  "Find relevant papers quickly with multi-source search, filters, and structured project collections.",
                ),
              },
              {
                title: t("Автоматизация рутинных шагов", "Workflow automation"),
                description: t(
                  "Снижайте ручную нагрузку: дедупликация, подготовка метаданных и шаблоны для повторяемых процессов.",
                  "Automate repetitive steps: deduplication, metadata preparation, and reusable templates for teams.",
                ),
              },
              {
                title: t("Граф цитирования", "Citation graph"),
                description: t(
                  "Визуализируйте связи, семантические кластеры и исследовательские пробелы для более точных решений.",
                  "Visualize references, semantic clusters, and knowledge gaps to focus your next research iteration.",
                ),
              },
              {
                title: t("Управление проектом", "Project governance"),
                description: t(
                  "Ролевой доступ, централизованные документы и админ-инструменты для безопасной командной работы.",
                  "Use role-based access, centralized docs, and admin controls for secure collaborative work.",
                ),
              },
              {
                title: t("AI-ассистент написания", "AI writing assistant"),
                description: t(
                  "Улучшение текста в академическом стиле с помощью ИИ, автогенерация таблиц и диаграмм, создание научных иллюстраций и поиск полных текстов по DOI/PMID.",
                  "Improve text in academic style with AI, auto-generate tables and charts from selections, create scientific illustrations and look up full texts by DOI/PMID.",
                ),
              },
              {
                title: t("Академический редактор", "Academic document editor"),
                description: t(
                  "Полнофункциональный WYSIWYG-редактор с настройкой страниц, встроенными цитатами, навигацией по оглавлению, комментариями и отслеживанием правок.",
                  "Full-featured WYSIWYG editor with page layout, inline citations, document outline, comments, track changes, and embedded charts.",
                ),
              },
              {
                title: t(
                  "Рецензирование и публикация",
                  "Peer review & publishing",
                ),
                description: t(
                  "Полный редакционный цикл — подача рукописей, назначение рецензентов, структурированное рецензирование, хронология и публикация в один клик.",
                  "Complete editorial workflow — manuscript submission, reviewer assignment, structured peer review, timeline tracking, and one-click publication.",
                ),
              },
              {
                title: t("Статистический анализ", "Statistical analysis"),
                description: t(
                  "Создание статистики с 8 типами диаграмм, авторекомендация статметодов по классификации данных и встраивание графиков в документы.",
                  "Create research statistics with 8 chart types, auto-recommended methods based on data classification, and embed charts directly into documents.",
                ),
              },
              {
                title: t(
                  "Версионирование документов",
                  "Document version control",
                ),
                description: t(
                  "Автоматическое и ручное версионирование с историей, сравнением, восстановлением и синхронизацией в реальном времени через WebSocket.",
                  "Automatic and manual versioning with full history, diff comparison, restore, and real-time WebSocket sync across the team.",
                ),
              },
              {
                title: t("Умное управление файлами", "Smart file management"),
                description: t(
                  "Загрузка и организация файлов проекта с S3-хранилищем. Извлечение метаданных с помощью ИИ, автоопределение DOI и конвертация полного текста.",
                  "Upload and organize project files with S3-compatible storage. AI-powered metadata extraction, automatic DOI detection, and full-text conversion.",
                ),
              },
            ].map((card, index) => (
              <article
                key={card.title}
                className={`apparatus-card reaction-appear feature-card-${index}`}
              >
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            ))}
          </div>
          <div className="feature-illustration-full">
            <ScientificVisualization variant="features" />
          </div>
        </section>

        <section
          id="workflow"
          className="public-section"
          data-section="workflow"
        >
          <div className="public-section-header">
            <h2>{t("Как это работает", "See how it works")}</h2>
          </div>
          <div className="feature-with-illustration">
            <div className="feature-illustration">
              <ScientificVisualization variant="workflow" />
            </div>
            <div>
              <div className="crystal-grid crystal-grid-2">
                {[
                  {
                    title: t(
                      "Работайте с привычными инструментами команды",
                      "Work with tools your team already uses",
                    ),
                    description: t(
                      "Объединяйте поиск, анализ и написание текста в единый процесс вместо разрозненных таблиц и переписок.",
                      "Connect discovery, analysis, and writing into one consistent flow instead of fragmented spreadsheets and chats.",
                    ),
                    bullets: [
                      t(
                        "Импорт статей из нескольких источников и чистая библиотека проекта",
                        "Multi-source article imports and clean project libraries",
                      ),
                      t(
                        "Быстрая фильтрация по заголовкам, аннотациям и тегам",
                        "Fast filtering across titles, abstracts, and tags",
                      ),
                      t(
                        "Общий контекст команды для воспроизводимых циклов обзора",
                        "Shared team context for reproducible review cycles",
                      ),
                    ],
                  },
                  {
                    title: t(
                      "От карты доказательств к итоговому документу",
                      "From evidence map to final document",
                    ),
                    description: t(
                      "Переходите от анализа графа к структурированному тексту без лишних переключений и ручных передач задач.",
                      "Move from citation graph exploration to structured writing with less context switching and fewer manual handoffs.",
                    ),
                    bullets: [
                      t(
                        "Совместный редактор с поддержкой библиографии",
                        "Collaborative editor with bibliography support",
                      ),
                      t(
                        "Переиспользуемые шаблоны проектной документации",
                        "Reusable templates for project documentation",
                      ),
                      t(
                        "Экспорт в форматах для ревью и подготовки публикации",
                        "Export-ready outputs for review and publication prep",
                      ),
                    ],
                  },
                ].map((row, index) => (
                  <article
                    key={row.title}
                    className={`apparatus-card reaction-appear workflow-card-${index}`}
                  >
                    <h3>{row.title}</h3>
                    <p>{row.description}</p>
                    <ul className="scientific-list">
                      {row.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="testimonials"
          className="public-section"
          data-section="testimonials"
        >
          <div className="public-section-header">
            <h2>
              {t(
                "Что команды говорят о Scientiaiter",
                "What teams say about Scientiaiter",
              )}
            </h2>
            <p>
              {t(
                "Платформу используют исследовательские, продуктовые и аналитические команды для сокращения ручной рутины.",
                "Research, product, and analytics teams use Scientiaiter to reduce manual overhead and improve traceability.",
              )}
            </p>
          </div>
          <div className="public-grid public-grid-3">
            {[
              {
                title: t(
                  "Надёжная база для совместных обзоров",
                  "Solid foundation for collaborative reviews",
                ),
                quote: t(
                  "Мы ушли от разрозненных файлов к единому циклу поиска, скрининга и написания. Команда заметно ускорилась уже в первый месяц.",
                  "We moved from scattered files to a single workflow for search, screening, and writing. The team became noticeably faster in the first month.",
                ),
                name: t("Екатерина Смирнова", "Emily Carter"),
                role: "Research Lead, Bioinformatics Lab",
                avatar:
                  "https://flowbite.s3.amazonaws.com/blocks/marketing-ui/avatars/bonnie-green.png",
              },
              {
                title: t(
                  "Практичный граф для решений",
                  "A practical graph for real decisions",
                ),
                quote: t(
                  "Граф цитирования помог быстро увидеть слабые зоны в доказательной базе и правильно расставить приоритеты дальнейшего анализа.",
                  "The citation map helped us identify weak areas in our evidence base and prioritize follow-up analysis with confidence.",
                ),
                name: t("Максим Волков", "Maksim Volkov"),
                role: "Data Analyst, HealthTech Team",
                avatar:
                  "https://flowbite.s3.amazonaws.com/blocks/marketing-ui/avatars/joseph-mcfall.png",
              },
              {
                title: t(
                  "Чёткая передача между анализом и текстом",
                  "Better handoff between research and writing",
                ),
                quote: t(
                  "Редакторы работают в том же контексте источников, что и аналитики. Меньше уточнений, выше качество черновиков.",
                  "Our editors finally work with the same structured source context as analysts. Fewer clarifications, clearer drafts.",
                ),
                name: t("София Нгуен", "Sofia Nguyen"),
                role: "Scientific Editor, Clinical Program",
                avatar:
                  "https://flowbite.s3.amazonaws.com/blocks/marketing-ui/avatars/michael-gouch.png",
              },
            ].map((item) => (
              <article key={item.title} className="public-card">
                <h3>{item.title}</h3>
                <p>&quot;{item.quote}&quot;</p>
                <p className="public-face-role">{item.name}</p>
                <p>{item.role}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="public-section" data-section="stats">
          <div className="public-section-header">
            <h2>
              {t(
                "Ключевые характеристики платформы",
                "Platform capabilities that matter",
              )}
            </h2>
            <p>
              {t(
                "Scientiaiter ориентирован на мультиязычную и командную работу в исследовательских сценариях.",
                "Scientiaiter is designed to support research operations in multilingual, collaborative environments.",
              )}
            </p>
          </div>
          <div className="feature-with-illustration">
            <div>
              <div className="public-grid public-grid-2">
                {[
                  {
                    value: "2",
                    label: t(
                      "Языка интерфейса (English / Russian)",
                      "Interface languages (English / Russian)",
                    ),
                  },
                  {
                    value: "2",
                    label: t(
                      "Темы оформления (светлая / тёмная)",
                      "Theme modes (light / dark)",
                    ),
                  },
                  {
                    value: "Role-based",
                    label: t(
                      "Модель прав доступа внутри проектов",
                      "Project access and collaboration model",
                    ),
                  },
                  {
                    value: "API-first",
                    label: t(
                      "Архитектура для интеграций и масштабирования",
                      "Architecture for integrations and scaling",
                    ),
                  },
                ].map((item) => (
                  <article key={item.label} className="public-card">
                    <p className="public-price">{item.value}</p>
                    <p>{item.label}</p>
                  </article>
                ))}
              </div>
            </div>
            <div className="feature-illustration">
              <InteractiveLandingIllustration variant="stats" />
            </div>
          </div>
        </section>

        <section
          id="sciences"
          className="public-section"
          data-section="sciences"
        >
          <div className="public-section-header">
            <h2>
              {t(
                "Научные направления и издательство",
                "Science disciplines & publishing",
              )}
            </h2>
            <p>
              {t(
                "Работайте с научными статьями по направлениям. Медицинский контур включает полный издательский workflow.",
                "Work with scientific articles across disciplines. The medical section includes a full publishing workflow.",
              )}
            </p>
          </div>
          <div className="public-grid public-grid-3">
            {SCIENCE_DISCIPLINES.map((disc) => {
              const href = getScienceDisciplineHref(
                disc.slug,
                disc.fallbackPath,
              );
              const isExternal = /^https?:\/\//.test(href);
              return (
                <article key={disc.slug} className="public-card">
                  <span className="public-badge">{disc.code}</span>
                  <h3>{disc.label}</h3>
                  <p>{disc.description}</p>
                  <div className="public-hero-actions">
                    {isExternal ? (
                      <a
                        href={href}
                        className="public-btn public-btn-secondary"
                      >
                        {t("Открыть", "Open")}
                      </a>
                    ) : (
                      <Link
                        to={href}
                        className="public-btn public-btn-secondary"
                      >
                        {t("Открыть", "Open")}
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <div className="public-hero-actions">
            <Link to="/med" className="public-btn">
              {t(
                "Перейти в медицинское издательство",
                "Open medical publishing",
              )}
            </Link>
            <Link to="/science" className="public-btn public-btn-secondary">
              {t("Все научные направления", "All disciplines")}
            </Link>
          </div>
        </section>

        <section id="pricing" className="public-section" data-section="pricing">
          <div className="public-section-header">
            <h2>
              {t(
                "Выберите тариф под этап команды",
                "Choose a plan for your team stage",
              )}
            </h2>
            <p>
              {t(
                "Начните с малого, проверьте рабочий процесс и масштабируйтесь с расширенными возможностями.",
                "Start small, validate workflows, and scale with advanced collaboration and governance.",
              )}
            </p>
          </div>
          <div className="public-grid public-grid-3">
            {[
              {
                name: "Starter",
                description: t(
                  "Для индивидуальной работы и пет-проектов.",
                  "For personal research and side projects.",
                ),
                price: t("0 ₽", "$0"),
                period: t("/мес", "/month"),
                features: [
                  t("До 1 активного проекта", "Up to 1 active project"),
                  t(
                    "Базовый поиск и карточки статей",
                    "Core search and article cards",
                  ),
                  t(
                    "Базовый режим графа цитирования",
                    "Basic citation graph view",
                  ),
                  t("Поддержка сообщества", "Community support"),
                ],
                cta: t("Начать бесплатно", "Start free"),
              },
              {
                name: "Research",
                description: t(
                  "Для команд, регулярно проводящих обзоры.",
                  "For focused teams running repeated reviews.",
                ),
                price: t("2 490 ₽", "$49"),
                period: t("/мес", "/month"),
                features: [
                  t("До 10 активных проектов", "Up to 10 active projects"),
                  t(
                    "Расширенные фильтры и автоматизация",
                    "Advanced filters and automation",
                  ),
                  t(
                    "AI-поддержка документных сценариев",
                    "AI assistance for document workflows",
                  ),
                  t("Приоритетная поддержка", "Priority support"),
                ],
                cta: t("Выбрать Research", "Get Research"),
              },
              {
                name: "Team",
                description: t(
                  "Для организаций с требованиями к контролю.",
                  "For organizations with governance requirements.",
                ),
                price: t("Индивидуально", "Custom"),
                period: "",
                features: [
                  t(
                    "Неограниченные проекты и участники",
                    "Unlimited projects and members",
                  ),
                  t(
                    "Админ-контроль и аудит",
                    "Admin controls and audit support",
                  ),
                  t("Выделенный онбординг", "Dedicated onboarding"),
                  t("Кастомные SLA-опции", "Custom SLA options"),
                ],
                cta: t("Связаться с нами", "Contact sales"),
              },
            ].map((plan, index) => (
              <article
                key={plan.name}
                className={`public-card public-pricing-card ${
                  index === 1 ? "public-pricing-card-highlight" : ""
                }`}
              >
                <h3>{plan.name}</h3>
                <p>{plan.description}</p>
                <p className="public-price">
                  {plan.price}
                  {plan.period}
                </p>
                <ul className="public-list">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Link to="/register" className="public-btn">
                  {plan.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section id="faq" className="public-section" data-section="faq">
          <div className="public-section-header">
            <h2>{t("Чем можем помочь?", "How can we help?")}</h2>
            <p>
              {t(
                "Ниже — частые вопросы от команд, которые оценивают Scientiaiter для исследовательских процессов.",
                "A few common questions from teams evaluating Scientiaiter for scientific and analytical workflows.",
              )}
            </p>
          </div>
          <div className="public-faq">
            {[
              {
                question: t(
                  "Можно ли переключаться между русским и английским?",
                  "Can we switch between English and Russian?",
                ),
                answer: t(
                  "Да. Используйте единую кнопку RU/EN в верхней панели. Выбор сохраняется в браузере.",
                  "Yes. Use the single RU/EN language button in the top navigation. Your selection is saved in the browser.",
                ),
              },
              {
                question: t(
                  "Поддерживаются светлая и тёмная темы?",
                  "Does Scientiaiter support dark and light themes?",
                ),
                answer: t(
                  "Да. Переключение доступно в шапке и использует тот же локальный параметр темы, что и основное веб-приложение.",
                  "Yes. Theme mode is available in the header and synced with the same local setting used across the web app.",
                ),
              },
              {
                question: t(
                  "Есть ли полноценная командная работа?",
                  "Is collaborative work supported?",
                ),
                answer: t(
                  "Да. Внутри проектов доступны ролевой доступ, общие документы и централизованные данные по статьям.",
                  "Yes. Teams can collaborate in shared projects using role-based access with centralized documents and article data.",
                ),
              },
              {
                question: t(
                  "Можно начать с небольшого пилота?",
                  "Can we start with a small pilot?",
                ),
                answer: t(
                  "Конечно. Starter-план подходит для проверки гипотез и перехода к расширенному тарифу по мере роста команды.",
                  "Absolutely. The Starter plan is designed for validation, and you can upgrade as your team scales.",
                ),
              },
            ].map((item) => (
              <details key={item.question} className="public-faq-item">
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="contact" className="public-section" data-section="contact">
          <article className="public-card">
            <h2>
              {t(
                "Запустите workspace в Scientiaiter уже сегодня",
                "Start your Scientiaiter workspace today",
              )}
            </h2>
            <p>
              {t(
                "Создайте первый проект, пригласите коллег и проходите путь от поиска до черновика в одном процессе.",
                "Launch your first project, invite collaborators, and move from discovery to draft in one flow.",
              )}
            </p>
            <div className="public-hero-actions">
              <Link to="/register" className="public-btn">
                {t("Создать бесплатный аккаунт", "Create free account")}
              </Link>
            </div>
          </article>
          <div className="feature-illustration">
            <InteractiveLandingIllustration variant="cta" />
          </div>
        </section>
      </main>

      <footer className="public-footer">
        <div className="public-footer-inner">
          <span>
            &copy; 2021-{currentYear} Scientiaiter.{" "}
            {t("Все права защищены.", "All Rights Reserved.")}
          </span>
          <div className="public-footer-links">
            {footerLinks.map((link) =>
              isHashLink(link.href) ? (
                <a key={`${link.href}-${link.label}`} href={link.href}>
                  {link.label}
                </a>
              ) : (
                <Link key={`${link.href}-${link.label}`} to={link.href}>
                  {link.label}
                </Link>
              ),
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
