import React from "react";
import { Link } from "react-router-dom";

export default function TermsOfUsePage() {
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
            <Link to="/register" className="public-btn public-btn-secondary">
              К регистрации
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
            <h1>Terms of Use / Условия использования</h1>
            <p>
              Данный документ описывает базовые условия использования платформы
              Scientiaiter. Юридическая команда может заменить текст финальной
              редакцией без изменения маршрута страницы.
            </p>
          </div>

          <article className="public-card public-legal-card">
            <h2>1. Принятие условий</h2>
            <p>
              Создавая аккаунт и/или используя платформу, пользователь
              подтверждает согласие с настоящими условиями использования.
            </p>

            <h2>2. Назначение сервиса</h2>
            <p>
              Платформа предоставляет инструменты для поиска, структурирования и
              подготовки научных материалов, включая AI-помощников и работу с
              документами.
            </p>

            <h2>3. Обязанности пользователя</h2>
            <ul className="public-list">
              <li>Использовать сервис в рамках применимого законодательства.</li>
              <li>
                Не загружать вредоносный, нарушающий права третьих лиц или
                запрещенный контент.
              </li>
              <li>
                Самостоятельно проверять корректность AI-результатов перед
                публикацией.
              </li>
            </ul>

            <h2>4. Ограничение ответственности</h2>
            <p>
              Сервис предоставляется по модели &quot;as is&quot;. Исполнитель не
              гарантирует абсолютную полноту или безошибочность AI-выводов и не
              несет ответственность за последствия их некорректного применения.
            </p>

            <h2>5. Изменения условий</h2>
            <p>
              Исполнитель вправе обновлять условия использования. Актуальная
              версия публикуется на этой странице.
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}
