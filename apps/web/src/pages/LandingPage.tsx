import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type ThemeMode = "light" | "dark";
type LandingLocale = "en" | "ru";

const THEME_STORAGE_KEY = "theme";
const LANGUAGE_STORAGE_KEY = "landing-language";

type LandingContent = {
  brandName: string;
  nav: {
    home: string;
    features: string;
    testimonials: string;
    pricing: string;
    faq: string;
    contact: string;
  };
  controls: {
    language: string;
    switchToLight: string;
    switchToDark: string;
    signIn: string;
    getStarted: string;
    openMainMenu: string;
    closeMainMenu: string;
  };
  hero: {
    title: string;
    description: string;
    primaryAction: string;
    secondaryAction: string;
    mockupAlt: string;
  };
  trustLogosTitle: string;
  featuresIntro: {
    title: string;
    description: string;
    cta: string;
  };
  featureCards: Array<{
    title: string;
    description: string;
  }>;
  workflowRows: Array<{
    title: string;
    description: string;
    bullets: string[];
    imageAlt: string;
  }>;
  testimonials: {
    title: string;
    description: string;
    cards: Array<{
      title: string;
      quote: string;
      name: string;
      role: string;
      avatar: string;
    }>;
  };
  stats: {
    title: string;
    description: string;
    items: Array<{
      value: string;
      label: string;
    }>;
  };
  pricing: {
    title: string;
    description: string;
    plans: Array<{
      name: string;
      description: string;
      price: string;
      period: string;
      features: string[];
      cta: string;
    }>;
  };
  faq: {
    title: string;
    description: string;
    searchPlaceholder: string;
    items: Array<{
      question: string;
      answer: string;
    }>;
  };
  cta: {
    title: string;
    description: string;
    action: string;
  };
  footer: {
    product: {
      title: string;
      links: Array<{ label: string; href: string }>;
    };
    legal: {
      title: string;
      links: Array<{ label: string; href: string }>;
    };
    company: {
      title: string;
      links: Array<{ label: string; href: string }>;
    };
    copyright: string;
  };
};

const LANDING_CONTENT: Record<LandingLocale, LandingContent> = {
  en: {
    brandName: "MDsystem",
    nav: {
      home: "Home",
      features: "Features",
      testimonials: "Testimonials",
      pricing: "Pricing",
      faq: "FAQ",
      contact: "Contact",
    },
    controls: {
      language: "Language",
      switchToLight: "Switch to light mode",
      switchToDark: "Switch to dark mode",
      signIn: "Sign in",
      getStarted: "Get started",
      openMainMenu: "Open main menu",
      closeMainMenu: "Close main menu",
    },
    hero: {
      title: "Your research and document workflow in one MDsystem workspace",
      description:
        "MDsystem helps teams search literature, map citation relationships, and produce publication-ready documents with AI support.",
      primaryAction: "Create workspace",
      secondaryAction: "Pricing & FAQ",
      mockupAlt: "MDsystem dashboard overview",
    },
    trustLogosTitle: "Built with a modern tech stack and integrations",
    featuresIntro: {
      title: "Designed for research teams and product-minded analysts",
      description:
        "From early discovery to final manuscript, MDsystem keeps your sources, notes, and project docs connected.",
      cta: "See how it works",
    },
    featureCards: [
      {
        title: "Literature search",
        description:
          "Find relevant papers quickly with multi-source search, filters, and structured project collections.",
      },
      {
        title: "Workflow automation",
        description:
          "Automate repetitive steps: deduplication, metadata preparation, and reusable templates for teams.",
      },
      {
        title: "Citation graph",
        description:
          "Visualize references, semantic clusters, and knowledge gaps to focus your next research iteration.",
      },
      {
        title: "Project governance",
        description:
          "Use role-based access, centralized docs, and admin controls for secure collaborative work.",
      },
    ],
    workflowRows: [
      {
        title: "Work with tools your team already uses",
        description:
          "Connect discovery, analysis, and writing into one consistent flow instead of fragmented spreadsheets and chats.",
        bullets: [
          "Multi-source article imports and clean project libraries",
          "Fast filtering across titles, abstracts, and tags",
          "Shared team context for reproducible review cycles",
        ],
        imageAlt: "Team workspace overview",
      },
      {
        title: "From evidence map to final document",
        description:
          "Move from citation graph exploration to structured writing with less context switching and fewer manual handoffs.",
        bullets: [
          "Collaborative editor with bibliography support",
          "Reusable templates for project documentation",
          "Export-ready outputs for review and publication prep",
        ],
        imageAlt: "Document and analytics workspace",
      },
    ],
    testimonials: {
      title: "What teams say about MDsystem",
      description:
        "Research, product, and analytics teams use MDsystem to reduce manual overhead and improve traceability.",
      cards: [
        {
          title: "Solid foundation for collaborative reviews",
          quote:
            "We moved from scattered files to a single workflow for search, screening, and writing. The team became noticeably faster in the first month.",
          name: "Emily Carter",
          role: "Research Lead, Bioinformatics Lab",
          avatar:
            "https://flowbite.s3.amazonaws.com/blocks/marketing-ui/avatars/bonnie-green.png",
        },
        {
          title: "A practical graph for real decisions",
          quote:
            "The citation map helped us identify weak areas in our evidence base and prioritize follow-up analysis with confidence.",
          name: "Maksim Volkov",
          role: "Data Analyst, HealthTech Team",
          avatar:
            "https://flowbite.s3.amazonaws.com/blocks/marketing-ui/avatars/joseph-mcfall.png",
        },
        {
          title: "Better handoff between research and writing",
          quote:
            "Our editors finally work with the same structured source context as analysts. Fewer clarifications, clearer drafts.",
          name: "Sofia Nguyen",
          role: "Scientific Editor, Clinical Program",
          avatar:
            "https://flowbite.s3.amazonaws.com/blocks/marketing-ui/avatars/michael-gouch.png",
        },
      ],
    },
    stats: {
      title: "Platform capabilities that matter",
      description:
        "MDsystem is designed to support research operations in multilingual, collaborative environments.",
      items: [
        { value: "2", label: "Interface languages (English / Russian)" },
        { value: "2", label: "Theme modes (light / dark)" },
        { value: "Role-based", label: "Project access and collaboration model" },
        { value: "API-first", label: "Architecture for integrations and scaling" },
      ],
    },
    pricing: {
      title: "Choose a plan for your team stage",
      description:
        "Start small, validate workflows, and scale with advanced collaboration and governance.",
      plans: [
        {
          name: "Starter",
          description: "For personal research and side projects.",
          price: "$0",
          period: "/month",
          features: [
            "Up to 1 active project",
            "Core search and article cards",
            "Basic citation graph view",
            "Community support",
          ],
          cta: "Start free",
        },
        {
          name: "Research",
          description: "For focused teams running repeated reviews.",
          price: "$49",
          period: "/month",
          features: [
            "Up to 10 active projects",
            "Advanced filters and automation",
            "AI assistance for document workflows",
            "Priority support",
          ],
          cta: "Get Research",
        },
        {
          name: "Team",
          description: "For organizations with governance requirements.",
          price: "Custom",
          period: "",
          features: [
            "Unlimited projects and members",
            "Admin controls and audit support",
            "Dedicated onboarding",
            "Custom SLA options",
          ],
          cta: "Contact sales",
        },
      ],
    },
    faq: {
      title: "How can we help?",
      description:
        "A few common questions from teams evaluating MDsystem for scientific and analytical workflows.",
      searchPlaceholder: "Type keywords to find answers",
      items: [
        {
          question: "Can we switch between English and Russian?",
          answer:
            "Yes. Use the EN/RU toggle in the top navigation. Your selection is saved in the browser.",
        },
        {
          question: "Does MDsystem support dark and light themes?",
          answer:
            "Yes. Theme mode is available in the header and synced with the same local setting used across the web app.",
        },
        {
          question: "Is collaborative work supported?",
          answer:
            "Yes. Teams can collaborate in shared projects using role-based access with centralized documents and article data.",
        },
        {
          question: "Can we start with a small pilot?",
          answer:
            "Absolutely. The Starter plan is designed for validation, and you can upgrade as your team scales.",
        },
      ],
    },
    cta: {
      title: "Start your MDsystem workspace today",
      description:
        "Launch your first project, invite collaborators, and move from discovery to draft in one flow.",
      action: "Create free account",
    },
    footer: {
      product: {
        title: "Product",
        links: [
          { label: "Features", href: "#features" },
          { label: "Pricing", href: "#pricing" },
          { label: "FAQ", href: "#faq" },
          { label: "Project team", href: "/project-faces" },
        ],
      },
      legal: {
        title: "Legal",
        links: [
          { label: "Public offer", href: "/offer" },
          { label: "Terms of use", href: "/terms" },
          { label: "Privacy policy", href: "/privacy" },
        ],
      },
      company: {
        title: "Company",
        links: [
          { label: "Landing", href: "/landing" },
          { label: "Sign in", href: "/login" },
          { label: "Register", href: "/register" },
        ],
      },
      copyright: "All Rights Reserved.",
    },
  },
  ru: {
    brandName: "MDsystem",
    nav: {
      home: "Главная",
      features: "Возможности",
      testimonials: "Отзывы",
      pricing: "Тарифы",
      faq: "FAQ",
      contact: "Контакты",
    },
    controls: {
      language: "Язык",
      switchToLight: "Переключить на светлую тему",
      switchToDark: "Переключить на тёмную тему",
      signIn: "Войти",
      getStarted: "Начать",
      openMainMenu: "Открыть главное меню",
      closeMainMenu: "Закрыть главное меню",
    },
    hero: {
      title: "Исследования и документы в едином рабочем пространстве MDsystem",
      description:
        "MDsystem помогает командам искать литературу, строить граф цитирования и готовить документы к публикации с поддержкой AI.",
      primaryAction: "Создать workspace",
      secondaryAction: "Тарифы и FAQ",
      mockupAlt: "Обзор панели MDsystem",
    },
    trustLogosTitle: "Современный стек и интеграции платформы",
    featuresIntro: {
      title: "Разработано для исследовательских и продуктовых команд",
      description:
        "От первого запроса до финального текста: MDsystem связывает источники, заметки и документы проекта в одном контуре.",
      cta: "Как это работает",
    },
    featureCards: [
      {
        title: "Поиск литературы",
        description:
          "Быстро находите релевантные статьи через мульти-источниковый поиск, фильтры и структурированные коллекции.",
      },
      {
        title: "Автоматизация рутинных шагов",
        description:
          "Снижайте ручную нагрузку: дедупликация, подготовка метаданных и шаблоны для повторяемых процессов.",
      },
      {
        title: "Граф цитирования",
        description:
          "Визуализируйте связи, семантические кластеры и исследовательские пробелы для более точных решений.",
      },
      {
        title: "Управление проектом",
        description:
          "Ролевой доступ, централизованные документы и админ-инструменты для безопасной командной работы.",
      },
    ],
    workflowRows: [
      {
        title: "Работайте с привычными инструментами команды",
        description:
          "Объединяйте поиск, анализ и написание текста в единый процесс вместо разрозненных таблиц и переписок.",
        bullets: [
          "Импорт статей из нескольких источников и чистая библиотека проекта",
          "Быстрая фильтрация по заголовкам, аннотациям и тегам",
          "Общий контекст команды для воспроизводимых циклов обзора",
        ],
        imageAlt: "Обзор командного рабочего пространства",
      },
      {
        title: "От карты доказательств к итоговому документу",
        description:
          "Переходите от анализа графа к структурированному тексту без лишних переключений и ручных передач задач.",
        bullets: [
          "Совместный редактор с поддержкой библиографии",
          "Переиспользуемые шаблоны проектной документации",
          "Экспорт в форматах для ревью и подготовки публикации",
        ],
        imageAlt: "Рабочее пространство документа и аналитики",
      },
    ],
    testimonials: {
      title: "Что команды говорят о MDsystem",
      description:
        "Платформу используют исследовательские, продуктовые и аналитические команды для сокращения ручной рутины.",
      cards: [
        {
          title: "Надёжная база для совместных обзоров",
          quote:
            "Мы ушли от разрозненных файлов к единому циклу поиска, скрининга и написания. Команда заметно ускорилась уже в первый месяц.",
          name: "Екатерина Смирнова",
          role: "Research Lead, Bioinformatics Lab",
          avatar:
            "https://flowbite.s3.amazonaws.com/blocks/marketing-ui/avatars/bonnie-green.png",
        },
        {
          title: "Практичный граф для решений",
          quote:
            "Граф цитирования помог быстро увидеть слабые зоны в доказательной базе и правильно расставить приоритеты дальнейшего анализа.",
          name: "Максим Волков",
          role: "Data Analyst, HealthTech Team",
          avatar:
            "https://flowbite.s3.amazonaws.com/blocks/marketing-ui/avatars/joseph-mcfall.png",
        },
        {
          title: "Чёткая передача между анализом и текстом",
          quote:
            "Редакторы работают в том же контексте источников, что и аналитики. Меньше уточнений, выше качество черновиков.",
          name: "София Нгуен",
          role: "Scientific Editor, Clinical Program",
          avatar:
            "https://flowbite.s3.amazonaws.com/blocks/marketing-ui/avatars/michael-gouch.png",
        },
      ],
    },
    stats: {
      title: "Ключевые характеристики платформы",
      description:
        "MDsystem ориентирован на мультиязычную и командную работу в исследовательских сценариях.",
      items: [
        { value: "2", label: "Языка интерфейса (English / Russian)" },
        { value: "2", label: "Темы оформления (светлая / тёмная)" },
        { value: "Role-based", label: "Модель прав доступа внутри проектов" },
        { value: "API-first", label: "Архитектура для интеграций и масштабирования" },
      ],
    },
    pricing: {
      title: "Выберите тариф под этап команды",
      description:
        "Начните с малого, проверьте рабочий процесс и масштабируйтесь с расширенными возможностями.",
      plans: [
        {
          name: "Starter",
          description: "Для индивидуальной работы и пет-проектов.",
          price: "0 ₽",
          period: "/мес",
          features: [
            "До 1 активного проекта",
            "Базовый поиск и карточки статей",
            "Базовый режим графа цитирования",
            "Поддержка сообщества",
          ],
          cta: "Начать бесплатно",
        },
        {
          name: "Research",
          description: "Для команд, регулярно проводящих обзоры.",
          price: "2 490 ₽",
          period: "/мес",
          features: [
            "До 10 активных проектов",
            "Расширенные фильтры и автоматизация",
            "AI-поддержка документных сценариев",
            "Приоритетная поддержка",
          ],
          cta: "Выбрать Research",
        },
        {
          name: "Team",
          description: "Для организаций с требованиями к контролю.",
          price: "Индивидуально",
          period: "",
          features: [
            "Неограниченные проекты и участники",
            "Админ-контроль и аудит",
            "Выделенный онбординг",
            "Кастомные SLA-опции",
          ],
          cta: "Связаться с нами",
        },
      ],
    },
    faq: {
      title: "Чем можем помочь?",
      description:
        "Ниже — частые вопросы от команд, которые оценивают MDsystem для исследовательских процессов.",
      searchPlaceholder: "Введите ключевые слова для поиска ответа",
      items: [
        {
          question: "Можно ли переключаться между русским и английским?",
          answer:
            "Да. Используйте переключатель EN/RU в верхней панели. Выбор сохраняется в браузере.",
        },
        {
          question: "Поддерживаются светлая и тёмная темы?",
          answer:
            "Да. Переключение доступно в шапке и использует тот же локальный параметр темы, что и основное веб-приложение.",
        },
        {
          question: "Есть ли полноценная командная работа?",
          answer:
            "Да. Внутри проектов доступны ролевой доступ, общие документы и централизованные данные по статьям.",
        },
        {
          question: "Можно начать с небольшого пилота?",
          answer:
            "Конечно. Starter-план подходит для проверки гипотез и перехода к расширенному тарифу по мере роста команды.",
        },
      ],
    },
    cta: {
      title: "Запустите workspace в MDsystem уже сегодня",
      description:
        "Создайте первый проект, пригласите коллег и проходите путь от поиска до черновика в одном процессе.",
      action: "Создать бесплатный аккаунт",
    },
    footer: {
      product: {
        title: "Продукт",
        links: [
          { label: "Возможности", href: "#features" },
          { label: "Тарифы", href: "#pricing" },
          { label: "FAQ", href: "#faq" },
          { label: "Лица проекта", href: "/project-faces" },
        ],
      },
      legal: {
        title: "Правовая информация",
        links: [
          { label: "Публичная оферта", href: "/offer" },
          { label: "Условия использования", href: "/terms" },
          { label: "Политика конфиденциальности", href: "/privacy" },
        ],
      },
      company: {
        title: "Компания",
        links: [
          { label: "Лендинг", href: "/landing" },
          { label: "Войти", href: "/login" },
          { label: "Регистрация", href: "/register" },
        ],
      },
      copyright: "Все права защищены.",
    },
  },
};

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

function resolveInitialLocale(): LandingLocale {
  const savedLocale = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (savedLocale === "en" || savedLocale === "ru") {
    return savedLocale;
  }
  return navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en";
}

function isHashLink(href: string): boolean {
  return href.startsWith("#");
}

export default function LandingPage() {
  const [theme, setTheme] = useState<ThemeMode>(() => resolveInitialTheme());
  const [locale, setLocale] = useState<LandingLocale>(() => resolveInitialLocale());
  const t = LANDING_CONTENT[locale];
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  const navItems = [
    { href: "#top", label: t.nav.home },
    { href: "#features", label: t.nav.features },
    { href: "#testimonials", label: t.nav.testimonials },
    { href: "#pricing", label: t.nav.pricing },
    { href: "#faq", label: t.nav.faq },
    { href: "#contact", label: t.nav.contact },
  ];

  const footerLinks = [
    ...t.footer.product.links,
    ...t.footer.legal.links,
    ...t.footer.company.links,
  ];

  return (
    <div id="top" className="public-page">
      <header className="public-header">
        <div className="public-header-inner">
          <Link to="/landing" className="public-brand">
            <img src="/logo.svg" alt={t.brandName} className="public-brand-logo" />
            <span>{t.brandName}</span>
          </Link>

          <nav className="public-nav" aria-label={t.controls.openMainMenu}>
            {navItems.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="public-header-actions">
            <button
              type="button"
              className="public-theme-toggle"
              aria-label={t.controls.language}
              aria-pressed={locale === "en"}
              onClick={() => setLocale("en")}
            >
              EN
            </button>
            <button
              type="button"
              className="public-theme-toggle"
              aria-label={t.controls.language}
              aria-pressed={locale === "ru"}
              onClick={() => setLocale("ru")}
            >
              RU
            </button>
            <button
              id="themeToggle"
              type="button"
              className="public-theme-toggle"
              onClick={toggleTheme}
              aria-label={
                theme === "dark" ? t.controls.switchToLight : t.controls.switchToDark
              }
            >
              {theme === "dark" ? "☀" : "🌙"}
            </button>
            <Link to="/login" className="public-theme-toggle">
              {t.controls.signIn}
            </Link>
            <Link to="/register" className="public-btn">
              {t.controls.getStarted}
            </Link>
          </div>
        </div>
      </header>

      <main className="public-main">
        <section className="public-hero">
          <article className="public-hero-content">
            <span className="public-badge">{t.trustLogosTitle}</span>
            <h1>{t.hero.title}</h1>
            <p>{t.hero.description}</p>
            <div className="public-hero-actions">
              <Link to="/register" className="public-btn">
                {t.hero.primaryAction}
              </Link>
              <a href="#pricing" className="public-btn public-btn-secondary">
                {t.hero.secondaryAction}
              </a>
            </div>
          </article>

          <aside className="public-hero-panel">
            <h3>{t.featuresIntro.title}</h3>
            <ul className="public-list">
              {t.featureCards.slice(0, 3).map((card) => (
                <li key={card.title}>
                  <strong>{card.title}:</strong> {card.description}
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <section id="features" className="public-section">
          <div className="public-section-header">
            <h2>{t.featuresIntro.title}</h2>
            <p>{t.featuresIntro.description}</p>
          </div>
          <div className="public-grid public-grid-2">
            {t.featureCards.map((card) => (
              <article key={card.title} className="public-card">
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="workflow" className="public-section">
          <div className="public-section-header">
            <h2>{t.featuresIntro.cta}</h2>
          </div>
          <div className="public-grid public-grid-2">
            {t.workflowRows.map((row) => (
              <article key={row.title} className="public-card">
                <h3>{row.title}</h3>
                <p>{row.description}</p>
                <ul className="public-list">
                  {row.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="testimonials" className="public-section">
          <div className="public-section-header">
            <h2>{t.testimonials.title}</h2>
            <p>{t.testimonials.description}</p>
          </div>
          <div className="public-grid public-grid-3">
            {t.testimonials.cards.map((item) => (
              <article key={item.title} className="public-card">
                <h3>{item.title}</h3>
                <p>&quot;{item.quote}&quot;</p>
                <p className="public-face-role">{item.name}</p>
                <p>{item.role}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="public-section">
          <div className="public-section-header">
            <h2>{t.stats.title}</h2>
            <p>{t.stats.description}</p>
          </div>
          <div className="public-grid public-grid-2">
            {t.stats.items.map((item) => (
              <article key={item.label} className="public-card">
                <p className="public-price">{item.value}</p>
                <p>{item.label}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="pricing" className="public-section">
          <div className="public-section-header">
            <h2>{t.pricing.title}</h2>
            <p>{t.pricing.description}</p>
          </div>
          <div className="public-grid public-grid-3">
            {t.pricing.plans.map((plan, index) => (
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

        <section id="faq" className="public-section">
          <div className="public-section-header">
            <h2>{t.faq.title}</h2>
            <p>{t.faq.description}</p>
          </div>
          <div className="public-faq">
            {t.faq.items.map((item) => (
              <details key={item.question} className="public-faq-item">
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="contact" className="public-section">
          <article className="public-card">
            <h2>{t.cta.title}</h2>
            <p>{t.cta.description}</p>
            <div className="public-hero-actions">
              <Link to="/register" className="public-btn">
                {t.cta.action}
              </Link>
            </div>
          </article>
        </section>
      </main>

      <footer className="public-footer">
        <div className="public-footer-inner">
          <span>
            &copy; 2021-{currentYear} {t.brandName}. {t.footer.copyright}
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
