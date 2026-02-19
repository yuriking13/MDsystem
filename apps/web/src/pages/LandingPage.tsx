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
  const [isSticky, setIsSticky] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const t = LANDING_CONTENT[locale];
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const onScroll = () => setIsSticky(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  return (
    <div id="top" className="bg-white dark:bg-gray-900">
      <header>
        <nav
          id="mainNavbar"
          data-sticky={isSticky ? "true" : "false"}
          className="fixed start-0 top-0 z-40 w-full border-gray-200 bg-transparent py-2.5 data-[sticky=true]:border-b data-[sticky=true]:bg-white dark:bg-transparent dark:data-[sticky=true]:border-gray-700 dark:data-[sticky=true]:bg-gray-800"
        >
          <div className="mx-auto flex max-w-screen-xl flex-wrap items-center justify-between px-4">
            <Link to="/landing" className="flex items-center">
              <img src="/logo.svg" className="mr-3 h-8" alt={t.brandName} />
              <span className="self-center whitespace-nowrap text-2xl font-semibold text-gray-900 dark:text-white">
                {t.brandName}
              </span>
            </Link>
            <div className="flex items-center lg:order-2">
              <div
                className="mr-2.5 inline-flex rounded-lg border border-gray-200 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-800"
                aria-label={t.controls.language}
              >
                <button
                  type="button"
                  onClick={() => setLocale("en")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    locale === "en"
                      ? "bg-primary-700 text-white"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLocale("ru")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    locale === "ru"
                      ? "bg-primary-700 text-white"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  RU
                </button>
              </div>
              <button
                id="themeToggle"
                type="button"
                onClick={toggleTheme}
                className="mr-2.5 rounded-lg p-2.5 text-sm text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
                aria-label={
                  theme === "dark" ? t.controls.switchToLight : t.controls.switchToDark
                }
              >
                <svg
                  className={`${theme === "light" ? "block" : "hidden"} h-5 w-5`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
                </svg>
                <svg
                  className={`${theme === "dark" ? "block" : "hidden"} h-5 w-5`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                  ></path>
                </svg>
              </button>
              <Link
                to="/register"
                className="mr-2 inline-flex items-center rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 lg:px-5 lg:py-2.5 lg:mr-0"
              >
                {t.controls.getStarted}
              </Link>
              <button
                id="mobile-menu-button"
                type="button"
                className="ml-1 inline-flex items-center rounded-lg p-2 text-sm text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600 lg:hidden"
                aria-controls="mobile-menu-2"
                aria-expanded={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen((prevOpen) => !prevOpen)}
              >
                <span className="sr-only">
                  {isMobileMenuOpen
                    ? t.controls.closeMainMenu
                    : t.controls.openMainMenu}
                </span>
                <svg
                  className={`${isMobileMenuOpen ? "hidden" : "block"} h-6 w-6`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  ></path>
                </svg>
                <svg
                  className={`${isMobileMenuOpen ? "block" : "hidden"} h-6 w-6`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  ></path>
                </svg>
              </button>
            </div>
            <div
              id="mobile-menu-2"
              className={`${
                isMobileMenuOpen ? "flex" : "hidden"
              } mt-2 w-full items-center justify-between bg-white dark:bg-gray-800 lg:order-1 lg:mt-0 lg:flex lg:w-auto lg:bg-transparent lg:dark:bg-transparent`}
            >
              <ul className="flex flex-col rounded-lg font-medium lg:flex-row lg:space-x-8">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block border-b border-gray-100 py-2 pr-4 pl-3 text-gray-900 hover:bg-gray-100 lg:border-0 lg:p-0 lg:hover:bg-transparent lg:hover:text-primary-700 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white lg:dark:hover:bg-transparent lg:dark:hover:text-primary-500"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
                <li>
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block border-b border-gray-100 py-2 pr-4 pl-3 text-gray-900 hover:bg-gray-100 lg:border-0 lg:p-0 lg:hover:bg-transparent lg:hover:text-primary-700 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white lg:dark:hover:bg-transparent lg:dark:hover:text-primary-500"
                  >
                    {t.controls.signIn}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </nav>
      </header>

      <main className="w-full antialiased">
        <section className="bg-white dark:bg-gray-900">
          <div className="mx-auto max-w-screen-xl px-4 py-8 pt-20 sm:py-16 sm:pt-24 lg:py-24 lg:pt-32">
            <div className="text-center">
              <h1 className="text-4xl leading-none font-extrabold tracking-tight text-gray-900 md:text-5xl lg:text-6xl dark:text-white">
                {t.hero.title}
              </h1>
              <p className="mx-auto mt-4 max-w-3xl text-gray-500 md:text-lg lg:text-xl dark:text-gray-400">
                {t.hero.description}
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-lg bg-primary-700 px-5 py-3 text-base font-medium text-white hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-900"
              >
                {t.hero.primaryAction}
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-5 py-3 text-base font-medium text-gray-900 hover:bg-gray-100 hover:text-primary-700 focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-800"
              >
                {t.hero.secondaryAction}
                <svg
                  className="ml-2 -mr-1 h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                  ></path>
                </svg>
              </a>
            </div>

            <div className="mt-8 sm:mt-12 lg:mt-16">
              <img
                className="relative z-20 mx-auto rounded-lg border border-gray-200 shadow-xl dark:hidden dark:border-gray-700"
                src="https://flowbite.s3.amazonaws.com/blocks/marketing-ui/hero/dashboard-mockup.svg"
                alt={t.hero.mockupAlt}
              />
              <img
                className="relative z-20 mx-auto hidden rounded-lg border shadow-xl dark:block dark:border-gray-700"
                src="https://flowbite.s3.amazonaws.com/blocks/marketing-ui/hero/dashboard-mockup-dark.svg"
                alt={t.hero.mockupAlt}
              />
            </div>
          </div>

          <div className="z-2 -mt-48 bg-gray-50 pt-48 pb-8 sm:-mt-80 sm:pt-72 lg:pb-16 dark:bg-gray-800">
            <div className="mx-auto px-4 text-center md:max-w-screen-md lg:max-w-screen-lg lg:px-20">
              <p className="mb-8 text-sm font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                {t.trustLogosTitle}
              </p>
              <div className="flex flex-wrap items-center justify-center text-gray-500 sm:justify-between">
                <a
                  href="https://flowbite.com/"
                  className="mb-5 mr-5 transition hover:text-gray-900 lg:mb-0 dark:hover:text-gray-400"
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    className="h-8 w-auto"
                    src="https://flowbite.s3.amazonaws.com/blocks/marketing-ui/customers/amazon-grayscale.svg"
                    alt="Amazon"
                  />
                </a>
                <a
                  href="https://flowbite.com/"
                  className="mb-5 mr-5 transition hover:text-gray-900 lg:mb-0 dark:hover:text-gray-400"
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    className="h-8 w-auto"
                    src="https://flowbite.s3.amazonaws.com/blocks/marketing-ui/customers/google-grayscale.svg"
                    alt="Google"
                  />
                </a>
                <a
                  href="https://flowbite.com/"
                  className="mb-5 mr-5 transition hover:text-gray-900 lg:mb-0 dark:hover:text-gray-400"
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    className="h-8 w-auto"
                    src="https://flowbite.s3.amazonaws.com/blocks/marketing-ui/customers/microsoft-grayscale.svg"
                    alt="Microsoft"
                  />
                </a>
                <a
                  href="https://flowbite.com/"
                  className="mb-5 mr-5 transition hover:text-gray-900 lg:mb-0 dark:hover:text-gray-400"
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    className="h-6 w-auto"
                    src="https://flowbite.s3.amazonaws.com/blocks/marketing-ui/customers/oracle-grayscale.svg"
                    alt="Oracle"
                  />
                </a>
                <a
                  href="https://flowbite.com/"
                  className="mb-5 transition hover:text-gray-900 lg:mb-0 dark:hover:text-gray-400"
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    className="h-8 w-auto"
                    src="https://flowbite.s3.amazonaws.com/blocks/marketing-ui/customers/sap-grayscale.svg"
                    alt="SAP"
                  />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="bg-white dark:bg-gray-900">
          <div className="mx-auto max-w-screen-xl px-4 py-8 sm:py-16 lg:py-24">
            <div className="grid grid-cols-1 items-center gap-12 lg:gap-16 xl:grid-cols-3">
              <div className="space-y-4">
                <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
                  {t.featuresIntro.title}
                </h2>
                <p className="text-gray-500 sm:text-xl dark:text-gray-400">
                  {t.featuresIntro.description}
                </p>
                <div>
                  <a
                    href="#workflow"
                    className="inline-flex items-center text-lg font-medium text-primary-700 hover:underline dark:text-primary-500"
                  >
                    {t.featuresIntro.cta}
                    <svg
                      className="ml-1 h-6 w-6"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      ></path>
                    </svg>
                  </a>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:col-span-2">
                {t.featureCards.map((card) => (
                  <div key={card.title}>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900">
                      <svg
                        className="h-7 w-7 text-primary-700 dark:text-primary-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        ></path>
                      </svg>
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-gray-900 dark:text-white">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">
                      {card.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="workflow"
          className="border-y border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="mx-auto max-w-screen-xl px-4 py-8 sm:py-16 lg:py-24">
            <div className="space-y-12 lg:space-y-20">
              {t.workflowRows.map((row, index) => (
                <div
                  key={row.title}
                  className="items-center gap-8 lg:grid lg:grid-cols-2 xl:gap-16"
                >
                  <div
                    className={`mb-4 hidden lg:flex lg:mb-0 ${
                      index === 1 ? "lg:order-1" : ""
                    }`}
                  >
                    <img
                      className="w-full rounded-lg border border-gray-100 shadow-md"
                      src={
                        index === 0
                          ? "https://flowbite.s3.amazonaws.com/blocks/marketing-ui/features/feature-office-1.png"
                          : "https://flowbite.s3.amazonaws.com/blocks/marketing-ui/features/feature-office-2.png"
                      }
                      alt={row.imageAlt}
                    />
                  </div>
                  <div className={`text-gray-500 sm:text-lg dark:text-gray-400 ${index === 1 ? "lg:order-2" : ""}`}>
                    <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
                      {row.title}
                    </h2>
                    <p className="mb-8 lg:text-xl">{row.description}</p>
                    <ul
                      role="list"
                      className="my-7 space-y-5 border-t border-gray-200 pt-8 dark:border-gray-700"
                    >
                      {row.bullets.map((bullet) => (
                        <li key={bullet} className="flex space-x-3">
                          <div className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400">
                            <svg
                              className="h-3.5 w-3.5"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              />
                            </svg>
                          </div>
                          <span className="text-base leading-tight font-medium text-gray-900 dark:text-white">
                            {bullet}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="testimonials" className="bg-white dark:bg-gray-900">
          <div className="mx-auto max-w-screen-xl px-4 py-8 sm:py-16 lg:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
                {t.testimonials.title}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-gray-500 sm:text-xl lg:mb-16 dark:text-gray-400">
                {t.testimonials.description}
              </p>
            </div>
            <div className="mt-8 grid gap-6 sm:mt-12 lg:mt-16 lg:grid-cols-3">
              {t.testimonials.cards.map((item) => (
                <figure
                  key={item.title}
                  className="rounded-sm bg-gray-50 p-6 dark:bg-gray-800"
                >
                  <blockquote className="text-sm text-gray-500 dark:text-gray-400">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="my-4">&quot;{item.quote}&quot;</p>
                  </blockquote>
                  <figcaption className="flex items-center space-x-3">
                    <img
                      className="h-9 w-9 rounded-full"
                      src={item.avatar}
                      alt={item.name}
                    />
                    <div className="space-y-0.5 font-medium dark:text-white">
                      <div>{item.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {item.role}
                      </div>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto max-w-screen-xl px-4 py-8 sm:py-16 lg:py-24">
            <div className="items-center gap-8 lg:grid lg:grid-cols-2 xl:gap-16">
              <div className="text-gray-500 sm:text-lg">
                <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
                  {t.stats.title}
                </h2>
                <p className="mb-8 text-gray-500 lg:text-xl dark:text-gray-400">
                  {t.stats.description}
                </p>
                <div className="grid gap-6 lg:grid-cols-1 sm:grid-cols-2">
                  {t.stats.items.map((item) => (
                    <div key={item.label} className="flex">
                      <div className="mr-4 shrink-0">
                        <svg
                          className="h-8 w-8 text-primary-700 dark:text-primary-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.536-9.95a1 1 0 00-1.414-1.414L9 9.757 7.879 8.636a1 1 0 00-1.414 1.414l1.828 1.829a1 1 0 001.414 0l3.829-3.829z"
                          ></path>
                        </svg>
                      </div>
                      <div>
                        <p className="mb-1 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                          {item.value}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400">
                          {item.label}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <img
                className="mx-auto mb-4 hidden sm:flex"
                src="https://flowbite.s3.amazonaws.com/blocks/marketing-ui/social-proof/table-professor.svg"
                alt={t.stats.title}
              />
            </div>
          </div>
        </section>

        <section id="pricing" className="bg-white dark:bg-gray-900">
          <div className="mx-auto max-w-screen-xl px-4 py-8 sm:py-16 lg:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
                {t.pricing.title}
              </h2>
              <p className="mb-5 text-gray-500 sm:text-xl dark:text-gray-400">
                {t.pricing.description}
              </p>
            </div>
            <div className="mt-8 mb-8 grid gap-8 sm:mt-12 xl:grid-cols-3">
              {t.pricing.plans.map((plan) => (
                <div
                  key={plan.name}
                  className="mx-auto flex max-w-lg flex-col rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white xl:p-8"
                >
                  <h3 className="mb-4 text-2xl font-semibold">{plan.name}</h3>
                  <p className="text-gray-500 sm:text-lg dark:text-gray-400">
                    {plan.description}
                  </p>
                  <div className="my-8 flex items-baseline justify-center">
                    <span className="mr-2 text-5xl font-extrabold">{plan.price}</span>
                    {plan.period ? (
                      <span className="text-gray-500">{plan.period}</span>
                    ) : null}
                  </div>
                  <ul role="list" className="mb-8 space-y-4 text-left">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center space-x-3">
                        <svg
                          className="h-5 w-5 shrink-0 text-green-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          ></path>
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    className="rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-800 focus:ring-4 focus:ring-primary-200 focus:outline-none dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-900"
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="faq"
          className="border-y border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="mx-auto max-w-screen-xl px-4 py-8 sm:py-16 lg:py-24">
            <div className="mx-auto mb-8 max-w-2xl text-center lg:mb-16">
              <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
                {t.faq.title}
              </h2>
              <p className="mb-8 text-gray-500 sm:text-xl dark:text-gray-400">
                {t.faq.description}
              </p>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg
                    className="h-6 w-6 text-gray-500 dark:text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  className="block w-full rounded-lg border border-gray-300 bg-white p-4 pl-12 text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  placeholder={t.faq.searchPlaceholder}
                />
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {t.faq.items.map((item) => (
                <details
                  key={item.question}
                  className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-700"
                >
                  <summary className="cursor-pointer text-lg font-semibold text-gray-900 dark:text-white">
                    {item.question}
                  </summary>
                  <p className="mt-3 text-gray-500 dark:text-gray-400">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="bg-white dark:bg-gray-900">
          <div className="mx-auto max-w-screen-xl px-4 py-8 sm:py-16 lg:py-24">
            <div className="mx-auto max-w-screen-sm text-center">
              <h2 className="mb-4 text-3xl leading-tight font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
                {t.cta.title}
              </h2>
              <p className="mb-6 text-gray-500 md:text-lg dark:text-gray-400">
                {t.cta.description}
              </p>
              <Link
                to="/register"
                className="inline-flex rounded-lg bg-primary-700 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-primary-800 focus:ring-4 focus:ring-primary-200 focus:outline-none dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-900"
              >
                {t.cta.action}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-screen-xl px-4 py-8 sm:py-16 lg:py-24">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[t.footer.product, t.footer.legal, t.footer.company].map((group) => (
              <div key={group.title}>
                <h2 className="mb-6 text-sm font-semibold text-gray-900 uppercase dark:text-white">
                  {group.title}
                </h2>
                <ul className="text-gray-500 dark:text-gray-400">
                  {group.links.map((link) => (
                    <li key={`${group.title}-${link.label}`} className="mb-4">
                      {isHashLink(link.href) ? (
                        <a
                          href={link.href}
                          className="hover:text-gray-900 hover:underline dark:hover:text-white"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          to={link.href}
                          className="hover:text-gray-900 hover:underline dark:hover:text-white"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center sm:mt-12 lg:mt-16">
            <Link
              to="/landing"
              className="mb-5 flex items-center justify-center text-2xl font-semibold text-gray-900 dark:text-white"
            >
              <img src="/logo.svg" className="mr-2 h-8" alt={t.brandName} /> {t.brandName}
            </Link>
            <span className="block text-center text-sm text-gray-500 dark:text-gray-400">
              &copy; 2021-{currentYear} {t.brandName}. {t.footer.copyright}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
