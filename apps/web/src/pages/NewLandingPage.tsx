import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";

export default function NewLandingPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [_activeSection, setActiveSection] = useState("hero");
  const heroRef = useRef<HTMLElement>(null);
  const problemsRef = useRef<HTMLElement>(null);
  const solutionRef = useRef<HTMLElement>(null);
  const featuresRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsLoaded(true);

    // Intersection Observer для активации секций
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.6 },
    );

    [heroRef, problemsRef, solutionRef, featuresRef, ctaRef].forEach((ref) => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
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
                href="#problems"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Проблемы
              </a>
              <a
                href="#solution"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Решение
              </a>
              <a
                href="#features"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Возможности
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

      {/* Hero Section */}
      <section
        id="hero"
        ref={heroRef}
        className={`min-h-screen flex items-center justify-center px-6 transition-all duration-1000 ${
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl md:text-7xl font-black mb-6 leading-none">
            <span className="block text-gray-900">Научные</span>
            <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              исследования
            </span>
            <span className="block text-gray-900">без боли</span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Перестаньте тратить месяцы на поиск литературы и анализ данных.
            Сосредоточьтесь на открытиях, а рутину доверьте ИИ.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              to="/register"
              className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transform hover:scale-105 hover:-translate-y-1 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Начать исследование
            </Link>
            <button
              onClick={() =>
                document
                  .getElementById("problems")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition-all duration-200"
            >
              Узнать больше
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[
              { value: "10x", label: "быстрее поиск" },
              { value: "90%", label: "меньше рутины" },
              { value: "24/7", label: "ИИ-ассистент" },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className={`transition-all duration-500 delay-${index * 200} ${
                  isLoaded
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-5"
                }`}
              >
                <div className="text-2xl font-bold text-blue-600">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problems Section */}
      <section id="problems" ref={problemsRef} className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Знакомые проблемы?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Каждый исследователь сталкивается с одними и теми же препятствиями
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: "😤",
                title: "Поиск литературы — это ад",
                description:
                  "Часы в PubMed, разрозненные базы данных, тысячи нерелевантных результатов. А потом ещё нужно всё это систематизировать.",
                pain: "До 40% времени исследования",
              },
              {
                icon: "📚",
                title: "Тонут в информации",
                description:
                  "Сотни статей, заметки в разных местах, потерянные ссылки. Как найти ту самую работу, которую читали месяц назад?",
                pain: "Потеря важных источников",
              },
              {
                icon: "✍️",
                title: "Писать научно — сложно",
                description:
                  "Академический стиль, правильная структура, оформление библиографии. На написание уходит больше времени, чем на исследование.",
                pain: "Недели на оформление",
              },
              {
                icon: "👥",
                title: "Хаос в командной работе",
                description:
                  "Кто что читал? Где последняя версия? Почему коллега дублирует вашу работу? Нет единого пространства для сотрудничества.",
                pain: "Потеря синхронизации",
              },
              {
                icon: "📊",
                title: "Анализ данных — болото",
                description:
                  "Какой метод выбрать? Правильно ли интерпретированы результаты? Excel не справляется, а R/Python требует программирования.",
                pain: "Ошибки в анализе",
              },
              {
                icon: "⏰",
                title: "Дедлайны поджимают",
                description:
                  "Гранты, конференции, защиты. Времени всегда не хватает, а качество страдает под давлением сроков.",
                pain: "Стресс и переработки",
              },
            ].map((problem, index) => (
              <div
                key={problem.title}
                className={`group relative p-6 bg-gray-50 rounded-2xl transition-all duration-500 hover:bg-red-50 hover:border-red-200 hover:shadow-lg transform hover:-translate-y-2 delay-${index * 100}`}
              >
                <div className="text-4xl mb-4 group-hover:animate-bounce">
                  {problem.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-red-700">
                  {problem.title}
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {problem.description}
                </p>
                <div className="text-sm text-red-600 font-medium bg-red-100 px-3 py-1 rounded-full inline-block">
                  💸 {problem.pain}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <div className="inline-block bg-red-100 px-6 py-3 rounded-xl">
              <p className="text-red-800 font-medium">
                <strong>Итог:</strong> До 70% времени уходит на рутину вместо
                настоящей науки
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section
        id="solution"
        ref={solutionRef}
        className="py-20 px-6 bg-blue-600 text-white"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6">А если бы было иначе?</h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Scientiaiter берёт на себя всю рутину, оставляя вам время на то,
              что действительно важно
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold mb-6">
                Представьте свой день:
              </h3>

              <div className="space-y-6">
                {[
                  {
                    time: "09:00",
                    action: "Умный поиск",
                    description:
                      "ИИ находит релевантные статьи за минуты, автоматически фильтрует по качеству",
                    icon: "🔍",
                  },
                  {
                    time: "09:15",
                    action: "Мгновенный анализ",
                    description:
                      "Граф цитирования показывает связи, выявляет пробелы в исследованиях",
                    icon: "📊",
                  },
                  {
                    time: "10:00",
                    action: "Совместная работа",
                    description:
                      "Команда синхронно работает над проектом, все в курсе прогресса",
                    icon: "👥",
                  },
                  {
                    time: "14:00",
                    action: "Автоматическое письмо",
                    description:
                      "ИИ-ассистент помогает структурировать мысли и улучшать текст",
                    icon: "✍️",
                  },
                ].map((item, index) => (
                  <div
                    key={item.time}
                    className={`flex items-start gap-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm transition-all duration-500 delay-${index * 150} hover:bg-white/20`}
                  >
                    <div className="text-2xl">{item.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm bg-white/20 px-2 py-1 rounded font-mono">
                          {item.time}
                        </span>
                        <span className="font-semibold">{item.action}</span>
                      </div>
                      <p className="text-blue-100 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8">
                <div className="text-6xl mb-6">🎯</div>
                <h4 className="text-2xl font-bold mb-4">Результат</h4>
                <div className="space-y-3 text-lg">
                  <div className="flex items-center justify-between">
                    <span>Экономия времени:</span>
                    <span className="font-bold text-yellow-300">70%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Качество исследований:</span>
                    <span className="font-bold text-yellow-300">
                      ↑ В 3 раза
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Стресс от дедлайнов:</span>
                    <span className="font-bold text-green-300">Минимум</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        ref={featuresRef}
        className="py-20 px-6 bg-gray-50"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Как это работает
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Полный цикл научной работы в одной платформе
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: "🔍",
                title: "Умный поиск литературы",
                description:
                  "ИИ анализирует ваш запрос и находит действительно релевантные источники. Интеграция с PubMed, Google Scholar и другими базами.",
                benefit: "В 10 раз быстрее обычного поиска",
              },
              {
                icon: "🕸️",
                title: "Граф цитирования",
                description:
                  "Визуализация связей между публикациями. Находите ключевые работы, тренды и белые пятна в исследованиях.",
                benefit: "Полная картина области знаний",
              },
              {
                icon: "📝",
                title: "ИИ-ассистент письма",
                description:
                  "Помощь в структурировании текста, проверке логики, соблюдении академических стандартов. Автоматическое оформление библиографии.",
                benefit: "Профессиональные тексты без усилий",
              },
              {
                icon: "📊",
                title: "Статистический анализ",
                description:
                  "Автоматический выбор подходящих методов, создание графиков, интерпретация результатов. Без программирования.",
                benefit: "Правильная статистика каждый раз",
              },
              {
                icon: "👥",
                title: "Командная работа",
                description:
                  "Общие проекты, комментирование, версионирование документов. Все участники всегда в курсе прогресса.",
                benefit: "Синхронная работа без хаоса",
              },
              {
                icon: "🏥",
                title: "Медицинская специализация",
                description:
                  "Особый фокус на медицинских исследованиях. Соблюдение стандартов доказательной медицины, клинические протоколы.",
                benefit: "Экспертиза в медицине",
              },
            ].map((feature, index) => (
              <div
                key={feature.title}
                className={`group relative p-6 bg-white rounded-2xl shadow-sm transition-all duration-500 hover:shadow-xl transform hover:-translate-y-2 delay-${index * 100}`}
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-200">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {feature.description}
                </p>
                <div className="text-sm text-green-600 font-medium bg-green-100 px-3 py-1 rounded-full inline-block">
                  ✅ {feature.benefit}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        id="cta"
        ref={ctaRef}
        className="py-20 px-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white"
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6">
            Хватит терять время на рутину
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Присоединяйтесь к исследователям, которые уже сосредоточились на
            настоящей науке
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              to="/register"
              className="bg-white text-blue-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-100 transform hover:scale-105 hover:-translate-y-1 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Начать бесплатно
            </Link>
            <Link
              to="/med"
              className="border-2 border-white text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white hover:text-blue-600 transition-all duration-200"
            >
              Медицинские исследования
            </Link>
          </div>

          {/* Social proof */}
          <div className="border-t border-blue-500 pt-12 mt-12">
            <p className="text-blue-200 mb-6">Нам доверяют исследователи из:</p>
            <div className="flex flex-wrap justify-center gap-8 text-blue-100">
              <span>🏥 Клиники</span>
              <span>🎓 Университеты</span>
              <span>🔬 НИИ</span>
              <span>💊 Фарма</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-4">
                Scientiaiter
              </div>
              <p className="text-gray-400">
                Платформа для научных исследований нового поколения
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Продукт</h4>
              <div className="space-y-2">
                <a
                  href="#features"
                  className="block text-gray-400 hover:text-white transition-colors"
                >
                  Возможности
                </a>
                <Link
                  to="/med"
                  className="block text-gray-400 hover:text-white transition-colors"
                >
                  Медицина
                </Link>
                <Link
                  to="/register"
                  className="block text-gray-400 hover:text-white transition-colors"
                >
                  Регистрация
                </Link>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Компания</h4>
              <div className="space-y-2">
                <Link
                  to="/privacy"
                  className="block text-gray-400 hover:text-white transition-colors"
                >
                  Конфиденциальность
                </Link>
                <Link
                  to="/terms"
                  className="block text-gray-400 hover:text-white transition-colors"
                >
                  Условия использования
                </Link>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Поддержка</h4>
              <div className="space-y-2">
                <a
                  href="mailto:support@scientiaiter.com"
                  className="block text-gray-400 hover:text-white transition-colors"
                >
                  Email
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Scientiaiter. Все права защищены.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
