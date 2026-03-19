import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import "../styles/cellular-landing.css";

export default function CellularLandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [_isLoaded, setIsLoaded] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsLoaded(true);

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Calculate cell explosion effect based on scroll
  const scrollProgress = Math.min(scrollY / 1000, 1);
  const animationPhase = Math.floor(scrollProgress * 5); // 0-4 phases

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-gray-200/50 z-50 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
            >
              Scientiaiter
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <a
                href="#research"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Исследования
              </a>
              <a
                href="#platform"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Платформа
              </a>
              <a
                href="#medicine"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Медицина
              </a>
            </nav>

            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Войти
              </Link>
              <Link
                to="/register"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-200"
              >
                Попробовать
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Cell */}
      <section
        ref={heroRef}
        className="min-h-screen flex items-center justify-center px-6 relative bg-gradient-to-br from-blue-50 to-indigo-100"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 cellular-bg-pattern" />
        </div>

        {/* Central Cell Container */}
        <div className="relative w-full max-w-4xl mx-auto">
          {/* Main Cell */}
          <div
            ref={cellRef}
            className={`relative mx-auto cell-container size-${animationPhase}`}
          >
            {/* Cell Membrane */}
            <div className="absolute inset-0 rounded-full border-4 border-blue-400/60 bg-gradient-to-br from-blue-100/80 to-indigo-200/80 backdrop-blur-sm shadow-2xl">
              {/* Nucleus - moves to top-left */}
              <div
                className={`absolute w-24 h-24 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full shadow-lg flex items-center justify-center nucleus pos-${animationPhase}`}
              >
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>

              {/* Mitochondria 1 - moves to top-right */}
              <div
                className={`absolute w-16 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full shadow-lg flex items-center justify-center mitochondria-1 pos-${animationPhase}`}
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              {/* Mitochondria 2 - moves to bottom-right */}
              <div
                className={`absolute w-16 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full shadow-lg flex items-center justify-center mitochondria-2 pos-${animationPhase}`}
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
              </div>

              {/* DNA Helix - moves to bottom-left */}
              <div
                className={`absolute w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-lg shadow-lg flex items-center justify-center dna-helix pos-${animationPhase}`}
              >
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>

              {/* Ribosomes - scatter around */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`absolute w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full shadow ribosome ribosome-${i} pos-${animationPhase}`}
                />
              ))}
            </div>
          </div>

          {/* Hero Text */}
          <div
            className={`absolute inset-0 flex items-center justify-center hero-text fade-${Math.min(animationPhase, 4)}`}
          >
            <div className="text-center max-w-2xl px-6">
              <h1 className="text-6xl md:text-7xl font-black mb-6 leading-none">
                <span className="block text-gray-900">Наука</span>
                <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  изнутри
                </span>
              </h1>

              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Погрузитесь в глубины научных исследований с платформой, которая
                понимает структуру знаний на молекулярном уровне
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/register"
                  className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transform hover:scale-105 hover:-translate-y-1 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Начать исследование
                </Link>
                <button
                  onClick={() =>
                    window.scrollTo({ top: 1000, behavior: "smooth" })
                  }
                  className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition-all duration-200"
                >
                  Изучить компоненты
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Component Explanation Sections */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Компоненты научной платформы
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Каждый элемент нашей системы выполняет специфическую функцию, как
              органеллы в живой клетке
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
            {/* Nucleus - Core System */}
            <div className="group relative">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full shadow-lg mb-6 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-10 h-10 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                Ядро системы
              </h3>
              <p className="text-gray-600 text-center leading-relaxed">
                Центральная база знаний, где хранятся и обрабатываются все
                научные данные. ИИ-движок анализирует паттерны и связи между
                исследованиями.
              </p>
            </div>

            {/* Mitochondria - Processing Power */}
            <div className="group relative">
              <div className="w-20 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full shadow-lg mb-6 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-10 h-10 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                Вычислительная мощность
              </h3>
              <p className="text-gray-600 text-center leading-relaxed">
                Высокопроизводительные алгоритмы обеспечивают энергией все
                процессы платформы. Быстрый поиск, мгновенный анализ, реальное
                время обработки.
              </p>
            </div>

            {/* DNA - Knowledge Structure */}
            <div className="group relative">
              <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-lg shadow-lg mb-6 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-10 h-10 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                Структура знаний
              </h3>
              <p className="text-gray-600 text-center leading-relaxed">
                Генетический код науки — связи между концепциями, методологиями
                и открытиями. Каждое исследование содержит ДНК знания.
              </p>
            </div>

            {/* Ribosomes - Content Generation */}
            <div className="group relative">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full shadow-lg mb-6 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                Синтез контента
              </h3>
              <p className="text-gray-600 text-center leading-relaxed">
                Микро-фабрики контента создают тексты, графики, анализы и
                отчёты. Автоматическая генерация научных материалов высокого
                качества.
              </p>
            </div>

            {/* Cell Membrane - Security */}
            <div className="group relative">
              <div className="w-20 h-20 border-4 border-blue-400 rounded-full shadow-lg mb-6 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform duration-300 bg-blue-50">
                <svg
                  className="w-10 h-10 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                Защитная оболочка
              </h3>
              <p className="text-gray-600 text-center leading-relaxed">
                Многуровневая система безопасности защищает ваши данные и
                интеллектуальную собственность. Конфиденциальность как основа
                доверия.
              </p>
            </div>

            {/* Network - Collaboration */}
            <div className="group relative">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full shadow-lg mb-6 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-10 h-10 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                Сетевое взаимодействие
              </h3>
              <p className="text-gray-600 text-center leading-relaxed">
                Каналы коммуникации между исследователями, обмен данными в
                режиме реального времени. Наука развивается в сотрудничестве.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Medicine Focus */}
      <section id="medicine" className="py-20 px-6 bg-blue-600 text-white">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6">Медицинские исследования</h2>
          <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto">
            Специализированные инструменты для клинических исследований и
            доказательной медицины
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-4">Клинические протоколы</h3>
              <p className="text-blue-100">
                Автоматизация создания и управления протоколами клинических
                исследований
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-4">Доказательная медицина</h3>
              <p className="text-blue-100">
                Систематические обзоры и мета-анализы с соблюдением
                международных стандартов
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-4">Публикации</h3>
              <p className="text-blue-100">
                Подготовка рукописей для медицинских журналов с автоматической
                проверкой стандартов
              </p>
            </div>
          </div>

          <div className="mt-12">
            <Link
              to="/med"
              className="bg-white text-blue-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-100 transform hover:scale-105 transition-all duration-200 inline-block"
            >
              Медицинское издательство
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6">
            Начните свое научное путешествие
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Каждое великое открытие начинается с первого шага
          </p>

          <Link
            to="/register"
            className="bg-blue-600 text-white px-12 py-6 rounded-2xl text-xl font-bold hover:bg-blue-700 transform hover:scale-105 hover:-translate-y-2 transition-all duration-300 shadow-2xl hover:shadow-3xl inline-block"
          >
            Создать аккаунт
          </Link>
        </div>
      </section>
    </div>
  );
}
