import React from "react";
import { Link } from "react-router-dom";

export default function PrivacyPolicyPage() {
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
            <h1>Privacy Policy / Политика конфиденциальности</h1>
            <p>
              Документ описывает, какие данные обрабатываются в сервисе и с какой
              целью. Может быть заменен финальной юридической редакцией.
            </p>
          </div>

          <article className="public-card public-legal-card">
            <h2>1. Какие данные мы обрабатываем</h2>
            <ul className="public-list">
              <li>Регистрационные данные (email, хеш пароля).</li>
              <li>
                Данные проектов: документы, метаданные статей, прикрепленные
                файлы.
              </li>
              <li>
                Технические данные для безопасности и аналитики
                (логи, IP-адрес, события ошибок).
              </li>
            </ul>

            <h2>2. Цели обработки</h2>
            <p>
              Данные используются для предоставления функциональности платформы,
              обеспечения безопасности аккаунтов, мониторинга стабильности и
              улучшения качества сервиса.
            </p>

            <h2>3. AI-обработка</h2>
            <p>
              Часть пользовательских данных может передаваться внешним AI
              провайдерам только в объеме, необходимом для выполнения
              пользовательского запроса.
            </p>

            <h2>4. Хранение и защита</h2>
            <p>
              Мы применяем технические меры защиты данных, включая контроль
              доступа, логирование и защиту каналов передачи.
            </p>

            <h2>5. Права пользователя</h2>
            <p>
              Пользователь может запросить уточнение, обновление или удаление
              персональных данных в пределах требований применимого
              законодательства.
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}
