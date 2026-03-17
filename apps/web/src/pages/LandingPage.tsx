import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  SCIENCE_DISCIPLINES,
  getScienceDisciplineHref,
} from "../lib/scienceDomains";
import InteractiveLandingIllustration from "../components/InteractiveLandingIllustration";
import ScientificVisualization from "../components/ScientificVisualization";
import RevolutionaryHero from "../components/RevolutionaryHero";
import FullscreenHero from "../components/FullscreenHero";
import { useSectionTransition } from "../lib/useScrollEffect";

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
    switchToEnglish: string;
    switchToRussian: string;
    switchToLight: string;
    switchToDark: string;
    signIn: string;
    getStarted: string;
    openMainMenu: string;
    closeMainMenu: string;
  };
  hero: {
    title: string;
    subtitle: string;
    description: string;
    readMore: string;
    metaLeft: string;
    metaCenter: string;
    nextSection: string;
    ctaLabel: string;
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
    brandName: "Scientiaiter",
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
      switchToEnglish: "Switch language to English",
      switchToRussian: "Switch language to Russian",
      switchToLight: "Switch to light mode",
      switchToDark: "Switch to dark mode",
      signIn: "Sign in",
      getStarted: "Get started",
      openMainMenu: "Open main menu",
      closeMainMenu: "Close main menu",
    },
    hero: {
      title: "Research\nworkspace",
      subtitle: "We create intelligent research & document workflows",
      description:
        "An AI-powered platform that helps teams search literature, map citation relationships, and produce publication-ready documents. Our results speak for themselves.",
      readMore: "READ MORE",
      metaLeft: "Multi-source search across databases",
      metaCenter: "AI-powered citation analysis",
      nextSection: "Features that drive research forward",
      ctaLabel: "Get started",
    },
    trustLogosTitle: "Built with a modern tech stack and integrations",
    featuresIntro: {
      title: "Designed for research teams and product-minded analysts",
      description:
        "From early discovery to final manuscript, Scientiaiter keeps your sources, notes, and project docs connected.",
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
      {
        title: "AI writing assistant",
        description:
          "Improve text in academic style with AI, auto-generate tables and charts from selections, create scientific illustrations and look up full texts by DOI/PMID.",
      },
      {
        title: "Academic document editor",
        description:
          "Full-featured WYSIWYG editor with page layout, inline citations, document outline, comments, track changes, and embedded charts.",
      },
      {
        title: "Peer review & publishing",
        description:
          "Complete editorial workflow — manuscript submission, reviewer assignment, structured peer review, timeline tracking, and one-click publication.",
      },
      {
        title: "Statistical analysis",
        description:
          "Create research statistics with 8 chart types, auto-recommended methods based on data classification, and embed charts directly into documents.",
      },
      {
        title: "Document version control",
        description:
          "Automatic and manual versioning with full history, diff comparison, restore, and real-time WebSocket sync across the team.",
      },
      {
        title: "Smart file management",
        description:
          "Upload and organize project files with S3-compatible storage. AI-powered metadata extraction, automatic DOI detection, and full-text conversion.",
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
      title: "What teams say about Scientiaiter",
      description:
        "Research, product, and analytics teams use Scientiaiter to reduce manual overhead and improve traceability.",
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
        "Scientiaiter is designed to support research operations in multilingual, collaborative environments.",
      items: [
        { value: "2", label: "Interface languages (English / Russian)" },
        { value: "2", label: "Theme modes (light / dark)" },
        {
          value: "Role-based",
          label: "Project access and collaboration model",
        },
        {
          value: "API-first",
          label: "Architecture for integrations and scaling",
        },
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
        "A few common questions from teams evaluating Scientiaiter for scientific and analytical workflows.",
      searchPlaceholder: "Type keywords to find answers",
      items: [
        {
          question: "Can we switch between English and Russian?",
          answer:
            "Yes. Use the single RU/EN language button in the top navigation. Your selection is saved in the browser.",
        },
        {
          question: "Does Scientiaiter support dark and light themes?",
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
      title: "Start your Scientiaiter workspace today",
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
          { label: "Landing", href: "/" },
          { label: "Sign in", href: "/login" },
          { label: "Register", href: "/register" },
        ],
      },
      copyright: "All Rights Reserved.",
    },
  },
  ru: {
    brandName: "Scientiaiter",
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
      switchToEnglish: "Переключить язык на английский",
      switchToRussian: "Переключить язык на русский",
      switchToLight: "Переключить на светлую тему",
      switchToDark: "Переключить на тёмную тему",
      signIn: "Войти",
      getStarted: "Начать",
      openMainMenu: "Открыть главное меню",
      closeMainMenu: "Закрыть главное меню",
    },
    hero: {
      title: "Пространство\nисследований",
      subtitle: "Создаём интеллектуальные рабочие процессы для науки",
      description:
        "AI-платформа, которая помогает командам искать литературу, строить граф цитирования и готовить документы к публикации. Результаты говорят сами за себя.",
      readMore: "ПОДРОБНЕЕ",
      metaLeft: "Мульти-источниковый поиск по базам данных",
      metaCenter: "AI-анализ цитирования",
      nextSection: "Возможности для исследований",
      ctaLabel: "Начать",
    },
    trustLogosTitle: "Современный стек и интеграции платформы",
    featuresIntro: {
      title: "Разработано для исследовательских и продуктовых команд",
      description:
        "От первого запроса до финального текста: Scientiaiter связывает источники, заметки и документы проекта в одном контуре.",
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
      {
        title: "AI-ассистент написания",
        description:
          "Улучшение текста в академическом стиле с помощью ИИ, автогенерация таблиц и диаграмм, создание научных иллюстраций и поиск полных текстов по DOI/PMID.",
      },
      {
        title: "Академический редактор",
        description:
          "Полнофункциональный WYSIWYG-редактор с настройкой страниц, встроенными цитатами, навигацией по оглавлению, комментариями и отслеживанием правок.",
      },
      {
        title: "Рецензирование и публикация",
        description:
          "Полный редакционный цикл — подача рукописей, назначение рецензентов, структурированное рецензирование, хронология и публикация в один клик.",
      },
      {
        title: "Статистический анализ",
        description:
          "Создание статистики с 8 типами диаграмм, авторекомендация статметодов по классификации данных и встраивание графиков в документы.",
      },
      {
        title: "Версионирование документов",
        description:
          "Автоматическое и ручное версионирование с историей, сравнением, восстановлением и синхронизацией в реальном времени через WebSocket.",
      },
      {
        title: "Умное управление файлами",
        description:
          "Загрузка и организация файлов проекта с S3-хранилищем. Извлечение метаданных с помощью ИИ, автоопределение DOI и конвертация полного текста.",
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
      title: "Что команды говорят о Scientiaiter",
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
        "Scientiaiter ориентирован на мультиязычную и командную работу в исследовательских сценариях.",
      items: [
        { value: "2", label: "Языка интерфейса (English / Russian)" },
        { value: "2", label: "Темы оформления (светлая / тёмная)" },
        { value: "Role-based", label: "Модель прав доступа внутри проектов" },
        {
          value: "API-first",
          label: "Архитектура для интеграций и масштабирования",
        },
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
        "Ниже — частые вопросы от команд, которые оценивают Scientiaiter для исследовательских процессов.",
      searchPlaceholder: "Введите ключевые слова для поиска ответа",
      items: [
        {
          question: "Можно ли переключаться между русским и английским?",
          answer:
            "Да. Используйте единую кнопку RU/EN в верхней панели. Выбор сохраняется в браузере.",
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
      title: "Запустите workspace в Scientiaiter уже сегодня",
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
          { label: "Лендинг", href: "/" },
          { label: "Войти", href: "/login" },
          { label: "Регистрация", href: "/register" },
        ],
      },
      copyright: "Все права защищены.",
    },
  },
};

const HERO_SLIDES: Record<
  LandingLocale,
  Array<{
    stageLabel: string;
    title: string;
    description: string;
    heroTitle: string;
    heroSubtitle: string;
    heroDescription: string;
    metaLeft: string;
    metaCenter: string;
    highlights: string[];
  }>
> = {
  en: [
    {
      stageLabel: "DISCOVERY",
      title: "Literature search",
      description: "Start with evidence, not assumptions.",
      heroTitle: "Evidence-first\nresearch start",
      heroSubtitle:
        "Search across multiple sources with one structured query flow",
      heroDescription:
        "Scientiaiter aggregates publications from several databases, deduplicates records, and helps your team move from broad exploration to a focused corpus in minutes.",
      metaLeft: "Cross-database indexing and deduplication",
      metaCenter: "Team-ready source collections",
      highlights: [
        "Unified import from major literature sources",
        "Fast filters by title, abstract, tags, and year",
        "Shared folders for reproducible review cycles",
      ],
    },
    {
      stageLabel: "AUTOMATION",
      title: "Workflow automation",
      description: "Remove repeated manual operations.",
      heroTitle: "Fewer manual\nhandoffs",
      heroSubtitle: "Automate repetitive operations in every review iteration",
      heroDescription:
        "From metadata enrichment to reusable templates, Scientiaiter removes friction from routine steps so analysts and editors spend time on interpretation instead of formatting tasks.",
      metaLeft: "Template-driven operations",
      metaCenter: "Repeatable team processes",
      highlights: [
        "Reusable flows for screening and data prep",
        "Automatic normalization of article metadata",
        "Consistent outputs across projects and teams",
      ],
    },
    {
      stageLabel: "ANALYTICS",
      title: "Citation graph",
      description: "See structure behind the topic.",
      heroTitle: "Map the field\nwith citation context",
      heroSubtitle: "Visualize influence, clusters, and weak evidence zones",
      heroDescription:
        "Graph-based exploration reveals how publications connect, where consensus is strong, and where your next analysis can deliver the highest impact.",
      metaLeft: "Reference topology and cluster views",
      metaCenter: "Gap-aware research planning",
      highlights: [
        "Interactive graph exploration with semantic hints",
        "Detection of outliers and bridge publications",
        "Support for prioritizing next research steps",
      ],
    },
    {
      stageLabel: "WRITING",
      title: "AI writing assistant",
      description: "Draft with scientific structure.",
      heroTitle: "From evidence\nto manuscript",
      heroSubtitle: "Write, improve, and format text in one document workflow",
      heroDescription:
        "Compose publication-ready drafts with AI-assisted editing, structured citations, and document tools designed for scientific writing standards.",
      metaLeft: "Academic-style AI guidance",
      metaCenter: "Citations and layout in one editor",
      highlights: [
        "AI suggestions tuned for scientific tone",
        "Inline citations and bibliography support",
        "Embedded charts and research illustrations",
      ],
    },
    {
      stageLabel: "PUBLISHING",
      title: "Peer review & publishing",
      description: "Coordinate editorial decisions faster.",
      heroTitle: "Editorial workflow\nwithout fragmentation",
      heroSubtitle: "Manage submissions, reviewers, and publication timeline",
      heroDescription:
        "Scientiaiter supports the full editorial lifecycle: submission intake, reviewer assignment, decision tracking, and one-click publication handoff.",
      metaLeft: "Structured peer-review pipeline",
      metaCenter: "Clear decision history",
      highlights: [
        "Submission states with timeline visibility",
        "Role-based editor and reviewer workspaces",
        "Consistent handoff from review to publishing",
      ],
    },
    {
      stageLabel: "GOVERNANCE",
      title: "Project governance",
      description: "Operate securely at team scale.",
      heroTitle: "Controlled access\nfor every research role",
      heroSubtitle: "Keep data, permissions, and audit context aligned",
      heroDescription:
        "Role-aware access and centralized administration help organizations scale research programs while preserving traceability and operational consistency.",
      metaLeft: "Role-based permissions model",
      metaCenter: "Audit-friendly collaboration",
      highlights: [
        "Project-level access control and ownership",
        "Shared documentation and version history",
        "Operational visibility for admins and leads",
      ],
    },
  ],
  ru: [
    {
      stageLabel: "DISCOVERY",
      title: "Поиск литературы",
      description: "Начинайте с доказательной базы.",
      heroTitle: "Доказательная база\nс первого шага",
      heroSubtitle: "Поиск по нескольким источникам в едином контуре запроса",
      heroDescription:
        "Scientiaiter агрегирует публикации из разных баз, удаляет дубликаты и помогает команде быстро перейти от широкого поиска к рабочему корпусу источников.",
      metaLeft: "Кросс-базовая индексация и дедупликация",
      metaCenter: "Коллекции источников для всей команды",
      highlights: [
        "Единый импорт из ключевых научных источников",
        "Фильтрация по заголовкам, аннотациям, тегам и годам",
        "Общие папки для воспроизводимых циклов обзора",
      ],
    },
    {
      stageLabel: "AUTOMATION",
      title: "Автоматизация workflow",
      description: "Меньше рутины в каждом цикле.",
      heroTitle: "Меньше ручных\nопераций",
      heroSubtitle:
        "Автоматизируйте повторяющиеся этапы исследовательского процесса",
      heroDescription:
        "От обогащения метаданных до шаблонов сценариев: Scientiaiter снимает рутинную нагрузку, чтобы команда фокусировалась на анализе и выводах.",
      metaLeft: "Шаблоны повторяемых процессов",
      metaCenter: "Стабильные командные сценарии",
      highlights: [
        "Переиспользуемые потоки скрининга и подготовки данных",
        "Автонормализация метаданных публикаций",
        "Единый формат результатов для разных проектов",
      ],
    },
    {
      stageLabel: "ANALYTICS",
      title: "Граф цитирования",
      description: "Понимайте структуру области, а не только список статей.",
      heroTitle: "Карта знаний\nс контекстом цитирования",
      heroSubtitle:
        "Визуализируйте кластеры, влияние и пробелы в доказательствах",
      heroDescription:
        "Графовый анализ показывает, как связаны публикации, где доказательная база сильна, а где есть пространство для следующей исследовательской итерации.",
      metaLeft: "Кластеры и топология ссылок",
      metaCenter: "Планирование исследований по пробелам",
      highlights: [
        "Интерактивный граф с семантическими подсказками",
        "Выявление мостов и аномалий в цитировании",
        "Приоритизация следующих аналитических шагов",
      ],
    },
    {
      stageLabel: "WRITING",
      title: "AI-ассистент написания",
      description: "От заметок к публикационному тексту.",
      heroTitle: "От источников\nк рукописи",
      heroSubtitle:
        "Пишите, редактируйте и оформляйте материалы в одном редакторе",
      heroDescription:
        "Создавайте публикационно готовые тексты с AI-редактурой, встроенными цитатами и инструментами документирования, адаптированными под научный стиль.",
      metaLeft: "ИИ-помощь в академическом стиле",
      metaCenter: "Цитирование и верстка в одном месте",
      highlights: [
        "Подсказки для научного тона и структуры",
        "Встроенная библиография и ссылки по тексту",
        "Встраивание диаграмм и научных иллюстраций",
      ],
    },
    {
      stageLabel: "PUBLISHING",
      title: "Рецензирование и публикация",
      description: "Ускоряйте редакционный цикл.",
      heroTitle: "Редакционный процесс\nбез разрывов",
      heroSubtitle:
        "Управляйте подачами, рецензентами и решениями в одном контуре",
      heroDescription:
        "Scientiaiter поддерживает полный издательский цикл: прием рукописей, назначение рецензентов, фиксацию решений и передачу в публикацию.",
      metaLeft: "Структурированный peer-review процесс",
      metaCenter: "Прозрачная хронология решений",
      highlights: [
        "Статусы рукописей и timeline по этапам",
        "Ролевые кабинеты редактора и рецензента",
        "Согласованный переход от ревью к публикации",
      ],
    },
    {
      stageLabel: "GOVERNANCE",
      title: "Управление проектами",
      description: "Безопасная масштабируемая командная работа.",
      heroTitle: "Контроль доступа\nдля каждой роли",
      heroSubtitle: "Сохраняйте целостность данных и прозрачность процессов",
      heroDescription:
        "Ролевая модель доступа и централизованное управление помогают масштабировать исследовательские программы без потери прослеживаемости.",
      metaLeft: "Role-based модель прав",
      metaCenter: "Аудит и управляемая коллаборация",
      highlights: [
        "Права доступа на уровне проектов и задач",
        "Общая документация и история версий",
        "Операционная видимость для администраторов",
      ],
    },
  ],
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
  const [locale, setLocale] = useState<LandingLocale>(() =>
    resolveInitialLocale(),
  );
  const t = LANDING_CONTENT[locale];
  const heroCards = HERO_SLIDES[locale];
  const currentYear = new Date().getFullYear();

  // Хук для отслеживания активной секции и эффектов перехода
  useSectionTransition();

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

  const toggleLocale = () => {
    setLocale((prevLocale) => (prevLocale === "ru" ? "en" : "ru"));
  };

  const navItems = [
    { href: "#top", label: t.nav.home },
    { href: "#features", label: t.nav.features },
    { href: "#testimonials", label: t.nav.testimonials },
    { href: "#pricing", label: t.nav.pricing },
    { href: "#faq", label: t.nav.faq },
    { href: "#contact", label: t.nav.contact },
    { href: "#sciences", label: locale === "ru" ? "Науки" : "Sciences" },
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
          <Link to="/" className="public-brand">
            <img
              src="/logo.svg"
              alt={t.brandName}
              className="public-brand-logo"
            />
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
              className="public-theme-toggle public-lang-toggle"
              aria-label={
                locale === "ru"
                  ? t.controls.switchToEnglish
                  : t.controls.switchToRussian
              }
              onClick={toggleLocale}
            >
              {locale === "ru" ? "RU / EN" : "EN / RU"}
            </button>
            <button
              id="themeToggle"
              type="button"
              className="public-theme-toggle"
              onClick={toggleTheme}
              aria-label={
                theme === "dark"
                  ? t.controls.switchToLight
                  : t.controls.switchToDark
              }
            >
              {theme === "dark" ? "☀" : "🌙"}
            </button>
            <Link to="/login" className="public-theme-toggle">
              {t.controls.signIn}
            </Link>
            <Link to="/med" className="public-theme-toggle">
              {locale === "ru" ? "Издательство MED" : "MED Publisher"}
            </Link>
            <Link to="/register" className="public-btn">
              {t.controls.getStarted}
            </Link>
          </div>
        </div>
      </header>

      {/* Revolutionary Hero блок — Scientific Brutalism */}
      <RevolutionaryHero
        title={t.hero.title}
        subtitle={t.hero.subtitle}
        description={t.hero.description}
        ctaText={t.hero.ctaLabel}
        ctaLink="/register"
        secondaryText={t.hero.readMore}
        secondaryLink="#features"
      />

      {/* Fallback Полноэкранный Hero блок — editorial multi-zone layout */}
      {/* <FullscreenHero
        title={t.hero.title}
        subtitle={t.hero.subtitle}
        description={t.hero.description}
        ctaText={t.hero.ctaLabel}
        ctaLink="/register"
        readMoreText={t.hero.readMore}
        readMoreLink="#features"
        metaLeft={t.hero.metaLeft}
        metaCenter={t.hero.metaCenter}
        nextSectionTitle={t.hero.nextSection}
        cards={heroCards}
        slideNumber="01"
        verticalLinks={
          locale === "ru"
            ? ["Возможности", "Тарифы", "FAQ", "Контакты"]
            : ["Features", "Pricing", "FAQ", "Contact"]
        }
      /> */}

      <main className="public-main">
        <section
          id="features"
          className="public-section"
          data-section="features"
        >
          <div className="public-section-header">
            <h2>{t.featuresIntro.title}</h2>
            <p>{t.featuresIntro.description}</p>
          </div>
          <div className="crystal-grid crystal-grid-3">
            {t.featureCards.map((card, index) => (
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
            <h2>{t.featuresIntro.cta}</h2>
          </div>
          <div className="feature-with-illustration">
            <div className="feature-illustration">
              <ScientificVisualization variant="workflow" />
            </div>
            <div>
              <div className="crystal-grid crystal-grid-2">
                {t.workflowRows.map((row, index) => (
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

        <section className="public-section" data-section="stats">
          <div className="public-section-header">
            <h2>{t.stats.title}</h2>
            <p>{t.stats.description}</p>
          </div>
          <div className="feature-with-illustration">
            <div>
              <div className="public-grid public-grid-2">
                {t.stats.items.map((item) => (
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
              {locale === "ru"
                ? "Научные направления и издательство"
                : "Science disciplines & publishing"}
            </h2>
            <p>
              {locale === "ru"
                ? "Работайте с научными статьями по направлениям. Медицинский контур включает полный издательский workflow."
                : "Work with scientific articles across disciplines. The medical section includes a full publishing workflow."}
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
                        {locale === "ru" ? "Открыть" : "Open"}
                      </a>
                    ) : (
                      <Link
                        to={href}
                        className="public-btn public-btn-secondary"
                      >
                        {locale === "ru" ? "Открыть" : "Open"}
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <div className="public-hero-actions">
            <Link to="/med" className="public-btn">
              {locale === "ru"
                ? "Перейти в медицинское издательство"
                : "Open medical publishing"}
            </Link>
            <Link to="/science" className="public-btn public-btn-secondary">
              {locale === "ru" ? "Все научные направления" : "All disciplines"}
            </Link>
          </div>
        </section>

        <section id="pricing" className="public-section" data-section="pricing">
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

        <section id="faq" className="public-section" data-section="faq">
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

        <section id="contact" className="public-section" data-section="contact">
          <article className="public-card">
            <h2>{t.cta.title}</h2>
            <p>{t.cta.description}</p>
            <div className="public-hero-actions">
              <Link to="/register" className="public-btn">
                {t.cta.action}
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
