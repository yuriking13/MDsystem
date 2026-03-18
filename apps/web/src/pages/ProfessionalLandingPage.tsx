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
                href="#pricing"
                className="text-slate-600 hover:text-slate-900 transition-colors font-medium"
              >
                Цены
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

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center px-6 relative bg-gradient-to-b from-slate-50 to-slate-100 pt-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-6">
            <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
              Научная платформа нового поколения
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-slate-900 leading-tight">
            Исследования
            <br />
            на новом
            <br />
            уровне
          </h1>

          <p className="text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto">
            Профессиональная платформа для систематизации знаний, анализа данных
            и подготовки публикаций в области медицинских исследований
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              to="/register"
              className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Попробовать платформу
            </Link>
            <Link
              to="/demo"
              className="border border-slate-300 text-slate-700 px-8 py-4 rounded-xl text-lg font-semibold hover:border-slate-400 hover:bg-slate-50 transition-all duration-200"
            >
              Запросить демо
            </Link>
          </div>

          {/* Feature highlights */}
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-3">
                Возможности платформы
              </h3>
              <ul className="text-left space-y-2 text-slate-600">
                <li>• Интеллектуальный поиск литературы с ИИ</li>
                <li>• Граф цитирования и связей между работами</li>
                <li>• Автоматизированный анализ данных</li>
                <li>• ИИ-ассистент для научного письма</li>
                <li>• Соблюдение стандартов доказательной медицины</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-3">
                Медицинская специализация
              </h3>
              <ul className="text-left space-y-2 text-slate-600">
                <li>• Поддержка протоколов CONSORT, PRISMA</li>
                <li>• Интеграция с PubMed, Cochrane</li>
                <li>• Соблюдение стандартов GCP</li>
                <li>• Автоматизация клинических протоколов</li>
                <li>• Подготовка для медицинских журналов</li>
              </ul>
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

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-6">
              Тарифные планы
            </h2>
            <p className="text-xl text-slate-600">
              Выберите подходящий план для ваших исследований
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl p-8 border border-slate-200">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                Исследователь
              </h3>
              <div className="text-4xl font-bold text-slate-900 mb-2">
                ₽2,990
                <span className="text-lg font-normal text-slate-600">/мес</span>
              </div>
              <p className="text-slate-600 mb-6">
                Для индивидуальных исследователей
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <svg
                    className="w-5 h-5 text-green-500 mr-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Поиск в 10+ научных базах
                </li>
                <li className="flex items-center">
                  <svg
                    className="w-5 h-5 text-green-500 mr-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  ИИ-ассистент для письма
                </li>
                <li className="flex items-center">
                  <svg
                    className="w-5 h-5 text-green-500 mr-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  5 проектов одновременно
                </li>
                <li className="flex items-center">
                  <svg
                    className="w-5 h-5 text-green-500 mr-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Email поддержка
                </li>
              </ul>
              <Link
                to="/register"
                className="w-full bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-800 transition-colors text-center block"
              >
                Выбрать план
              </Link>
            </div>

            <div className="bg-blue-600 rounded-2xl p-8 border-2 border-blue-600 relative">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <span className="bg-blue-100 text-blue-800 px-4 py-1 rounded-full text-sm font-medium">
                  Популярный
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Команда</h3>
              <div className="text-4xl font-bold text-white mb-2">
                ₽8,990
                <span className="text-lg font-normal text-blue-200">/мес</span>
              </div>
              <p className="text-blue-200 mb-6">Для исследовательских групп</p>
              <ul className="space-y-3 mb-8 text-white">
                <li className="flex items-center">
                  <svg
                    className="w-5 h-5 text-blue-200 mr-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Все возможности плана "Исследователь"
                </li>
                <li className="flex items-center">
                  <svg
                    className="w-5 h-5 text-blue-200 mr-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  До 10 участников команды
                </li>
                <li className="flex items-center">
                  <svg
                    className="w-5 h-5 text-blue-200 mr-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Совместная работа над проектами
                </li>
                <li className="flex items-center">
                  <svg
                    className="w-5 h-5 text-blue-200 mr-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Приоритетная поддержка
                </li>
              </ul>
              <Link
                to="/register"
                className="w-full bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors text-center block"
              >
                Выбрать план
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-slate-200">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                Институт
              </h3>
              <div className="text-4xl font-bold text-slate-900 mb-2">
                Договор
              </div>
              <p className="text-slate-600 mb-6">Для крупных организаций</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <svg
                    className="w-5 h-5 text-green-500 mr-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Все возможности плана "Команда"
                </li>
                <li className="flex items-center">
                  <svg
                    className="w-5 h-5 text-green-500 mr-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Неограниченное количество участников
                </li>
                <li className="flex items-center">
                  <svg
                    className="w-5 h-5 text-green-500 mr-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Персональный менеджер
                </li>
                <li className="flex items-center">
                  <svg
                    className="w-5 h-5 text-green-500 mr-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Индивидуальная интеграция
                </li>
              </ul>
              <Link
                to="/contact"
                className="w-full border-2 border-slate-900 text-slate-900 px-6 py-3 rounded-xl font-semibold hover:bg-slate-900 hover:text-white transition-colors text-center block"
              >
                Связаться с нами
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Готовы повысить качество ваших исследований?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Присоединяйтесь к исследователям, которые уже используют возможности
            интегрированной научной платформы
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors"
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
