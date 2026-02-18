import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function applyTheme(nextTheme: "light" | "dark") {
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
  localStorage.setItem("theme", nextTheme);
}

export default function LandingPage() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      setTheme("light");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <div className="public-page">
      <header className="public-header">
        <div className="public-header-inner">
          <Link to="/landing" className="public-brand">
            <img
              src="/logo.svg"
              alt="Scientiaiter"
              className="public-brand-logo"
            />
            <span>Scientiaiter</span>
          </Link>

          <nav className="public-nav">
            <a href="#features">Преимущества</a>
            <a href="#goals">Цели и достижения</a>
            <a href="#pricing">Тарифы</a>
            <a href="#faq">FAQ</a>
            <Link to="/offer">Оферта</Link>
            <Link to="/project-faces">Лица проекта</Link>
          </nav>

          <div className="public-header-actions">
            <button
              type="button"
              className="public-theme-toggle"
              onClick={toggleTheme}
              aria-label="Сменить тему"
            >
              {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            </button>
            <Link to="/login" className="public-btn public-btn-secondary">
              Войти
            </Link>
            <Link to="/register" className="public-btn">
              Начать
            </Link>
          </div>
        </div>
      </header>

      <main className="public-main">
        <section className="public-hero">
          <div className="public-hero-content">
            <span className="public-badge">
              Платформа для научной аналитики
            </span>
            <h1>
              Поиск статей, граф цитирования и AI-аналитика в одном рабочем
              пространстве
            </h1>
            <p>
              Scientiaiter ускоряет систематические обзоры и подготовку научных
              текстов: от поиска литературы до выявления пробелов в
              исследованиях.
            </p>
            <div className="public-hero-actions">
              <Link to="/register" className="public-btn">
                Создать проект
              </Link>
              <Link to="/login" className="public-btn public-btn-secondary">
                Войти в кабинет
              </Link>
            </div>
          </div>
          <div className="public-hero-panel">
            <h3>Что внутри платформы</h3>
            <ul>
              <li>Интеграция с PubMed / DOAJ / Wiley</li>
              <li>Автоматическая карта связей и кластеризация</li>
              <li>Семантический поиск и gap-анализ</li>
              <li>Документы проекта с управлением библиографией</li>
            </ul>
          </div>
        </section>

        <section id="features" className="public-section">
          <div className="public-section-header">
            <h2>Плюсы платформы</h2>
            <p>
              Ключевые возможности для научных команд и индивидуальных авторов.
            </p>
          </div>
          <div className="public-grid public-grid-3">
            <article className="public-card">
              <h3>Быстрый старт поиска</h3>
              <p>
                Гибкие фильтры по типу публикаций, годам и источникам помогают
                быстро получить релевантный корпус статей.
              </p>
            </article>
            <article className="public-card">
              <h3>Граф без задержек</h3>
              <p>
                Автоматическая подготовка связей и семантики сокращает время
                ожидания перед анализом кластера и gaps.
              </p>
            </article>
            <article className="public-card">
              <h3>Работа в проекте</h3>
              <p>
                Командная модель ролей, единая структура документов и общий
                источник правды по литературе.
              </p>
            </article>
          </div>
        </section>

        <section id="goals" className="public-section">
          <div className="public-section-header">
            <h2>Цели и достижения</h2>
          </div>
          <div className="public-grid public-grid-2">
            <article className="public-card">
              <h3>Цели</h3>
              <ul className="public-list">
                <li>Сократить время на подготовку литературного обзора</li>
                <li>Сделать работу с источниками воспроизводимой</li>
                <li>Помочь находить реальные исследовательские gaps</li>
              </ul>
            </article>
            <article className="public-card">
              <h3>Что уже реализовано</h3>
              <ul className="public-list">
                <li>Мультиисточниковый поиск статей и дедупликация</li>
                <li>Граф цитирования с фильтрами и экспортом</li>
                <li>Семантические кластеры и AI-подсказки</li>
              </ul>
            </article>
          </div>
        </section>

        <section id="pricing" className="public-section">
          <div className="public-section-header">
            <h2>Ценовая политика</h2>
            <p>Базовая демонстрационная сетка тарифов.</p>
          </div>
          <div className="public-grid public-grid-3">
            <article className="public-card public-pricing-card">
              <h3>Free</h3>
              <p className="public-price">0 ₽ / мес</p>
              <ul className="public-list">
                <li>1 проект</li>
                <li>Базовый поиск по статьям</li>
                <li>Ограниченный AI-функционал</li>
              </ul>
            </article>
            <article className="public-card public-pricing-card public-pricing-card-highlight">
              <h3>Research</h3>
              <p className="public-price">2 490 ₽ / мес</p>
              <ul className="public-list">
                <li>До 10 проектов</li>
                <li>Автоподготовка графа</li>
                <li>Семантическое ядро и кластеры</li>
              </ul>
            </article>
            <article className="public-card public-pricing-card">
              <h3>Team</h3>
              <p className="public-price">6 990 ₽ / мес</p>
              <ul className="public-list">
                <li>Командные роли и аудит</li>
                <li>Расширенные лимиты и отчёты</li>
                <li>Приоритетная поддержка</li>
              </ul>
            </article>
          </div>
        </section>

        <section id="faq" className="public-section">
          <div className="public-section-header">
            <h2>Ответы на вопросы</h2>
          </div>
          <div className="public-faq">
            <details className="public-faq-item">
              <summary>Можно ли работать в светлой и тёмной теме?</summary>
              <p>
                Да. Тема переключается на странице и сохраняется для следующих
                сессий.
              </p>
            </details>
            <details className="public-faq-item">
              <summary>Поддерживается ли командная работа?</summary>
              <p>
                Да. Внутри проекта доступны роли owner/editor/viewer и
                централизованный доступ к статьям и документам.
              </p>
            </details>
            <details className="public-faq-item">
              <summary>Что даёт автоподготовка графа?</summary>
              <p>
                После поиска система сама готовит связи, семантическое ядро,
                кластеры и gaps, чтобы вы сразу переходили к анализу.
              </p>
            </details>
          </div>
        </section>
      </main>

      <footer className="public-footer">
        <div className="public-footer-inner">
          <span>© 2026 Scientiaiter</span>
          <div className="public-footer-links">
            <Link to="/offer">Публичная оферта</Link>
            <Link to="/project-faces">Лица проекта</Link>
            <Link to="/login">Войти</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
