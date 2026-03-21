import React from "react";
import { Link } from "react-router-dom";

interface LandingFooterProps {
  language: "ru" | "en";
  theme: "light" | "dark";
}

export default function LandingFooter({ language, theme }: LandingFooterProps) {
  const linkClass =
    theme === "dark"
      ? "text-slate-300 hover:text-white"
      : "text-slate-600 hover:text-slate-900";

  return (
    <footer className="landing-footer px-6 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="landing-footer-inner">
          <Link
            to="/"
            className={`brand-name-stack ${theme === "dark" ? "text-white" : "text-slate-900"}`}
          >
            <img
              src="https://storage.yandexcloud.net/scentiaiterpublic/landing/logo_scientiaiter_no_name_bw_nobg_small.png"
              alt="Scientiaiter"
              className="brand-name-logo"
            />
            <div className="brand-name-text">
              <span className="brand-name-primary">Scientiaiter</span>
              <span className="brand-name-subtitle">
                {language === "ru" ? "Путь знания" : "Path of Knowledge"}
              </span>
            </div>
          </Link>

          <nav className="landing-footer-links">
            <Link
              to="/privacy"
              className={`${linkClass} transition-colors font-medium`}
            >
              {language === "ru" ? "Конфиденциальность" : "Privacy"}
            </Link>
            <Link
              to="/ethics"
              className={`${linkClass} transition-colors font-medium`}
            >
              {language === "ru" ? "Этика платформы" : "Platform Ethics"}
            </Link>
            <Link
              to="/terms"
              className={`${linkClass} transition-colors font-medium`}
            >
              {language === "ru" ? "Условия" : "Terms"}
            </Link>
            <Link
              to="/support"
              className={`${linkClass} transition-colors font-medium`}
            >
              {language === "ru" ? "Поддержка" : "Support"}
            </Link>
            <Link
              to="/med"
              className={`${linkClass} transition-colors font-medium`}
            >
              {language === "ru" ? "Издательство" : "Publisher"}
            </Link>
          </nav>

          <div
            className={`text-sm ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}
          >
            © 2026 Scientiaiter
          </div>
        </div>
      </div>
    </footer>
  );
}
