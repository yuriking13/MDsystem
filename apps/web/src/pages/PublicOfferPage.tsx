import React from "react";
import { Link } from "react-router-dom";

export default function PublicOfferPage() {
  return (
    <div className="public-page public-doc-page">
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
          <div className="public-header-actions">
            <Link to="/landing" className="public-btn public-btn-secondary">
              На лендинг
            </Link>
            <Link to="/login" className="public-btn">
              Войти
            </Link>
          </div>
        </div>
      </header>

      <main className="public-main">
        <section className="public-section">
          <div className="public-section-header">
            <h1>Публичная оферта</h1>
            <p>
              Базовая версия документа. Текст можно заменить юридически
              финальной редакцией.
            </p>
          </div>

          <article className="public-card public-legal-card">
            <h2>1. Общие положения</h2>
            <p>
              Настоящий документ является предложением заключить договор на
              использование платформы Scientiaiter для поиска, анализа и
              организации научных публикаций.
            </p>

            <h2>2. Предмет оферты</h2>
            <p>
              Исполнитель предоставляет доступ к функционалу сервиса, включая
              управление проектами, библиотекой статей, инструментами графа
              цитирования и AI-модулями.
            </p>

            <h2>3. Порядок акцепта</h2>
            <p>
              Акцептом оферты считается регистрация в сервисе и/или начало
              фактического использования платформы пользователем.
            </p>

            <h2>4. Стоимость и оплата</h2>
            <p>
              Условия тарификации, сроки оплаты и доступные планы определяются в
              интерфейсе сервиса и могут обновляться с уведомлением
              пользователя.
            </p>

            <h2>5. Права и обязанности сторон</h2>
            <ul className="public-list">
              <li>
                Пользователь обязуется использовать сервис в законных целях.
              </li>
              <li>
                Исполнитель обеспечивает работоспособность платформы в пределах
                разумной доступности.
              </li>
              <li>
                Пользователь несёт ответственность за корректность вводимых
                данных и соблюдение прав третьих лиц.
              </li>
            </ul>

            <h2>6. Ограничение ответственности</h2>
            <p>
              Платформа предоставляется по модели “as is”. Исполнитель не несёт
              ответственности за косвенные убытки, вызванные использованием или
              невозможностью использования сервиса.
            </p>

            <h2>7. Заключительные положения</h2>
            <p>
              Исполнитель вправе вносить изменения в настоящую оферту. Новая
              редакция вступает в силу с момента публикации на сайте.
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}
