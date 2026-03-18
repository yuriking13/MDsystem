import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import "../styles/professional-landing.css";

export default function ProfessionalLandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Calculate device explosion effect based on scroll
  const scrollProgress = Math.min(scrollY / 1200, 1);
  const animationPhase = Math.floor(scrollProgress * 5); // 0-4 phases

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-slate-900">
              Scientiaiter
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <a
                href="#platform"
                className="text-slate-600 hover:text-slate-900 transition-colors font-medium"
              >
                Платформа
              </a>
              <a
                href="#capabilities"
                className="text-slate-600 hover:text-slate-900 transition-colors font-medium"
              >
                Возможности
              </a>
              <a
                href="#research"
                className="text-slate-600 hover:text-slate-900 transition-colors font-medium"
              >
                Исследования
              </a>
            </nav>

            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-slate-600 hover:text-slate-900 transition-colors font-medium"
              >
                Войти
              </Link>
              <Link
                to="/register"
                className="bg-slate-900 text-white px-6 py-2.5 rounded-lg hover:bg-slate-800 transition-colors font-medium"
              >
                Начать
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Device */}
      <section className="min-h-screen flex items-center justify-center px-6 relative bg-gradient-to-b from-slate-50 to-slate-100">
        {/* Main Device Container */}
        <div className="relative w-full max-w-6xl mx-auto">
          {/* Central Research Platform Device */}
          <div className="relative mx-auto device-container">
            {/* Main Platform Body */}
            <div
              className={`main-platform phase-${Math.min(animationPhase, 4)}`}
            >
              {/* Screen */}
              <div className="main-screen">
                <div className="status-text">RESEARCH.PLATFORM.ACTIVE</div>
              </div>

              {/* LED Indicators */}
              <div className="led-indicators">
                <div className="led led-green"></div>
                <div className="led led-blue"></div>
              </div>
            </div>

            {/* Data Processing Unit - Top Left */}
            <div
              className={`analytics-engine phase-${Math.min(animationPhase, 4)}`}
            >
              <div className="module-screen">
                <svg
                  className="w-8 h-8 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div className="module-label">Analytics Engine</div>
            </div>

            {/* AI Processing Core - Top Right */}
            <div className={`ai-core phase-${Math.min(animationPhase, 4)}`}>
              <div className="module-screen">
                <svg
                  className="w-10 h-10 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div className="module-label">AI Core</div>
            </div>

            {/* Literature Database - Bottom Left */}
            <div
              className={`literature-db phase-${Math.min(animationPhase, 4)}`}
            >
              <div className="module-screen">
                <svg
                  className="w-8 h-8 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <div className="module-label">Literature DB</div>
            </div>

            {/* Collaboration Hub - Bottom Right */}
            <div className={`team-hub phase-${Math.min(animationPhase, 4)}`}>
              <div className="module-screen">
                <svg
                  className="w-8 h-8 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div className="module-label">Team Hub</div>
            </div>

            {/* Data Connections */}
            {animationPhase >= 2 && (
              <svg
                className={`absolute inset-0 w-full h-full pointer-events-none ${animationPhase >= 2 ? "connections-visible" : "connections-hidden"}`}
              >
                {/* Connection lines */}
                <line
                  x1="200"
                  y1="120"
                  x2="300"
                  y2="200"
                  stroke="#64748b"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  className="animate-pulse"
                />
                <line
                  x1="400"
                  y1="130"
                  x2="300"
                  y2="200"
                  stroke="#64748b"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  className="animate-pulse delay-300"
                />
                <line
                  x1="220"
                  y1="320"
                  x2="300"
                  y2="200"
                  stroke="#64748b"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  className="animate-pulse delay-150"
                />
                <line
                  x1="430"
                  y1="330"
                  x2="300"
                  y2="200"
                  stroke="#64748b"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  className="animate-pulse delay-450"
                />
              </svg>
            )}
          </div>

          {/* Hero Content */}
          <div
            className={`absolute inset-0 flex items-center justify-center pointer-events-none hero-content phase-${Math.min(animationPhase, 4)}`}
          >
            <div className="text-center max-w-3xl px-6 pointer-events-auto">
              <h1 className="text-6xl md:text-7xl font-bold mb-6 text-slate-900 leading-tight">
                Научные исследования
                <span className="block text-blue-600">нового уровня</span>
              </h1>

              <p className="text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto">
                Профессиональная платформа для систематизации знаний, анализа
                данных и подготовки публикаций в области медицинских
                исследований
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/register"
                  className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Попробовать платформу
                </Link>
                <button
                  onClick={() =>
                    window.scrollTo({ top: 1200, behavior: "smooth" })
                  }
                  className="border border-slate-300 text-slate-700 px-8 py-4 rounded-xl text-lg font-semibold hover:border-slate-400 hover:bg-slate-50 transition-all duration-200"
                >
                  Изучить возможности
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="capabilities" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-6">
              Интегрированная исследовательская экосистема
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Каждый компонент платформы работает в синергии, обеспечивая полный
              цикл научного исследования
            </p>
          </div>

          <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-8">
            {/* Analytics Engine */}
            <div className="group">
              <div className="bg-slate-50 rounded-2xl p-8 h-full border border-slate-200 hover:border-blue-200 hover:bg-blue-50/50 transition-all duration-300">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-200 transition-colors">
                  <svg
                    className="w-8 h-8 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  Аналитический движок
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Продвинутые статистические методы и машинное обучение для
                  анализа исследовательских данных. Автоматическая проверка
                  гипотез и выявление паттернов.
                </p>
              </div>
            </div>

            {/* AI Core */}
            <div className="group">
              <div className="bg-slate-50 rounded-2xl p-8 h-full border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all duration-300">
                <div className="w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-200 transition-colors">
                  <svg
                    className="w-8 h-8 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  ИИ-ядро
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Центральный искусственный интеллект для обработки
                  естественного языка, генерации гипотез и ассистирования в
                  написании научных текстов.
                </p>
              </div>
            </div>

            {/* Literature Database */}
            <div className="group">
              <div className="bg-slate-50 rounded-2xl p-8 h-full border border-slate-200 hover:border-amber-200 hover:bg-amber-50/50 transition-all duration-300">
                <div className="w-16 h-16 bg-amber-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-amber-200 transition-colors">
                  <svg
                    className="w-8 h-8 text-amber-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  База литературы
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Интегрированный доступ к ведущим научным базам данных. Умный
                  поиск, автоматическая категоризация и построение графов
                  цитирования.
                </p>
              </div>
            </div>

            {/* Team Hub */}
            <div className="group">
              <div className="bg-slate-50 rounded-2xl p-8 h-full border border-slate-200 hover:border-purple-200 hover:bg-purple-50/50 transition-all duration-300">
                <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-200 transition-colors">
                  <svg
                    className="w-8 h-8 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  Центр коллаборации
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Инструменты для командной работы: общие проекты,
                  рецензирование, версионирование документов и распределение
                  ролей.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Research Focus */}
      <section id="research" className="py-20 px-6 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">
                Специализация:
                <br />
                Медицинские исследования
              </h2>
              <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                Наша платформа разработана с учётом особых требований
                клинических исследований и принципов доказательной медицины.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-2">
                      Соблюдение стандартов GCP
                    </h4>
                    <p className="text-slate-300">
                      Полное соответствие принципам надлежащей клинической
                      практики и международным регулятивным требованиям.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-2">
                      Интеграция с медбазами
                    </h4>
                    <p className="text-slate-300">
                      Прямой доступ к PubMed, Cochrane Library,
                      ClinicalTrials.gov и другим специализированным ресурсам.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-2">
                      Автоматизация протоколов
                    </h4>
                    <p className="text-slate-300">
                      Шаблоны для CONSORT, PRISMA, STROBE и других
                      методологических стандартов медицинских публикаций.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  to="/med"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Медицинское издательство
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700">
                <h3 className="text-2xl font-bold mb-6 text-center">
                  Поддерживаемые стандарты
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    "CONSORT",
                    "PRISMA",
                    "STROBE",
                    "SPIRIT",
                    "CHEERS",
                    "STARD",
                    "ARRIVE",
                    "TRIPOD",
                  ].map((standard) => (
                    <div
                      key={standard}
                      className="bg-slate-700 rounded-lg p-4 text-center"
                    >
                      <div className="text-sm font-mono text-slate-300">
                        {standard}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Готовы повысить качество ваших исследований?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Присоединяйтесь к исследователям, которые уже используют возможности
            интегрированной научной платформы
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-white text-blue-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Начать бесплатный период
            </Link>
            <Link
              to="/demo"
              className="border border-white text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 transition-colors"
            >
              Запросить демо
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
