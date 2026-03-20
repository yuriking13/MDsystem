import React, { useState, useEffect } from "react";
import { useLanguage } from "../lib/LanguageContext";

// Helper function to get translated onboarding steps
const getOnboardingSteps = (t: (ru: string, en: string) => string) => [
  {
    id: "welcome",
    title: t(
      "Добро пожаловать в систему исследований!",
      "Welcome to the Research Platform!",
    ),
    content: t(
      "Давайте познакомим вас с основными возможностями платформы. Это займёт всего пару минут.",
      "Let's introduce you to the main features of the platform. This will only take a couple of minutes.",
    ),
    icon: (
      <svg
        className="icon-lg"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
        />
      </svg>
    ),
  },
  {
    id: "projects",
    title: t("Проекты", "Projects"),
    content: t(
      "Создавайте проекты для каждого исследования. Внутри проекта вы сможете собирать статьи, писать документы, анализировать данные и работать в команде.",
      "Create projects for each research study. Within a project you can collect articles, write documents, analyze data and collaborate with your team.",
    ),
    icon: (
      <svg
        className="icon-lg"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
        />
      </svg>
    ),
  },
  {
    id: "articles",
    title: t("База статей", "Article Database"),
    content: t(
      "Ищите научные статьи в PubMed, Semantic Scholar и других базах данных. Добавляйте их в проект и автоматически формируйте список литературы.",
      "Search for scientific articles in PubMed, Semantic Scholar and other databases. Add them to your project and automatically generate bibliography.",
    ),
    icon: (
      <svg
        className="icon-lg"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
        />
      </svg>
    ),
  },
  {
    id: "documents",
    title: t("Документы", "Documents"),
    content: t(
      "Пишите главы вашего исследования в мощном редакторе. Вставляйте цитаты одним кликом, добавляйте таблицы и графики, экспортируйте в Word или PDF.",
      "Write chapters of your research in a powerful editor. Insert citations with one click, add tables and charts, export to Word or PDF.",
    ),
    icon: (
      <svg
        className="icon-lg"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>
    ),
  },
  {
    id: "statistics",
    title: t("Статистика", "Statistics"),
    content: t(
      "Создавайте таблицы данных и строите на их основе графики. ИИ-помощник может автоматически найти и добавить статистику из аннотаций статей.",
      "Create data tables and build charts from them. AI assistant can automatically find and add statistics from article abstracts.",
    ),
    icon: (
      <svg
        className="icon-lg"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        />
      </svg>
    ),
  },
  {
    id: "graph",
    title: t("Граф цитирований", "Citation Graph"),
    content: t(
      "Визуализируйте связи между статьями. Находите ключевые источники, расширяйте исследование через ссылки и используйте ИИ-ассистента для поиска.",
      "Visualize connections between articles. Find key sources, expand research through links and use AI assistant for search.",
    ),
    icon: (
      <svg
        className="icon-lg"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
        />
      </svg>
    ),
  },
  {
    id: "team",
    title: t("Командная работа", "Team Collaboration"),
    content: t(
      "Приглашайте коллег в проект. Назначайте роли (владелец, редактор, наблюдатель) и работайте над документами вместе в реальном времени.",
      "Invite colleagues to your project. Assign roles (owner, editor, observer) and collaborate on documents together in real time.",
    ),
    icon: (
      <svg
        className="icon-lg"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
        />
      </svg>
    ),
  },
  {
    id: "done",
    title: t("Готово!", "Done!"),
    content: t(
      "Теперь вы знаете основы. Создайте свой первый проект и начните исследование. Если нужна помощь, загляните в раздел документации.",
      "Now you know the basics. Create your first project and start researching. If you need help, check out the documentation section.",
    ),
    icon: (
      <svg
        className="icon-lg"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
        />
      </svg>
    ),
  },
];

const STORAGE_KEY = "onboarding_completed";

interface OnboardingTourProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export default function OnboardingTour({
  onComplete,
  forceShow = false,
}: OnboardingTourProps) {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if onboarding was already completed
    if (forceShow) {
      setIsVisible(true);
      return;
    }

    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // First time user - show onboarding
      setIsVisible(true);
    }
  }, [forceShow]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
    onComplete?.();
  };

  if (!isVisible) return null;

  const ONBOARDING_STEPS = getOnboardingSteps(t);
  const step = ONBOARDING_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="onboarding-close-btn"
          type="button"
          title={t("Пропустить обучение", "Skip tutorial")}
        >
          <svg
            width={20}
            height={20}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Step indicator */}
        <div className="onboarding-indicators">
          {ONBOARDING_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`onboarding-indicator${
                idx === currentStep
                  ? " onboarding-indicator--active"
                  : idx < currentStep
                    ? " onboarding-indicator--completed"
                    : ""
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="onboarding-icon-wrap">
          <div className="onboarding-icon-badge">{step.icon}</div>
        </div>

        {/* Title */}
        <h2 className="onboarding-title">{step.title}</h2>

        {/* Content */}
        <p className="onboarding-content">{step.content}</p>

        {/* Navigation */}
        <div className="onboarding-nav">
          <button
            onClick={handlePrev}
            disabled={isFirstStep}
            type="button"
            className={`onboarding-nav-btn onboarding-nav-btn--secondary${
              isFirstStep ? " onboarding-nav-btn--disabled" : ""
            }`}
          >
            <svg
              width={16}
              height={16}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
            {t("Назад", "Back")}
          </button>

          <span className="onboarding-step-count">
            {currentStep + 1} / {ONBOARDING_STEPS.length}
          </span>

          <button
            onClick={handleNext}
            type="button"
            className={`onboarding-nav-btn onboarding-nav-btn--primary${
              isLastStep ? " onboarding-nav-btn--success" : ""
            }`}
          >
            {isLastStep ? (
              <>
                {t("Начать", "Start")}
                <svg
                  width={16}
                  height={16}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              </>
            ) : (
              <>
                {t("Далее", "Next")}
                <svg
                  width={16}
                  height={16}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </>
            )}
          </button>
        </div>

        {/* Skip link */}
        {!isLastStep && (
          <div className="onboarding-skip-wrap">
            <button
              onClick={handleSkip}
              className="onboarding-skip-btn"
              type="button"
            >
              {t("Пропустить обучение", "Skip tutorial")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to reset onboarding (for testing or settings)
export function resetOnboarding(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Helper to check if onboarding was completed
export function isOnboardingCompleted(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}
