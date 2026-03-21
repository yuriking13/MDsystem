import React from "react";
import { Link } from "react-router-dom";

interface FooterCta {
  title: string;
  subtitle: string;
  cta1: string;
  cta2: string;
}

interface LandingFooterProps {
  language: "ru" | "en";
  theme: "light" | "dark";
  cta?: FooterCta;
}

export default function LandingFooter({
  language,
  theme,
  cta,
}: LandingFooterProps) {
  return (
    <footer
      className={`landing-footer ${cta ? "py-24" : "py-16"} px-6 ${theme === "dark" ? "bg-slate-800" : "bg-slate-900"} text-white`}
    >
      <div className="max-w-4xl mx-auto text-center">
        {cta && (
          <>
            <h2 className="text-4xl md:text-5xl font-light mb-6">
              {cta.title}
            </h2>
            <p className="text-xl text-slate-300 mb-8 font-light">
              {cta.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
              <Link
                to="/register"
                className="bg-blue-600 text-white px-10 py-4 rounded-xl text-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {cta.cta1}
              </Link>
              <Link
                to="/demo"
                className="border-2 border-white text-white px-10 py-4 rounded-xl text-lg font-medium hover:bg-white/10 transition-colors"
              >
                {cta.cta2}
              </Link>
            </div>
          </>
        )}

        <div className="border-t border-slate-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <Link
              to="/"
              className="text-2xl font-bold text-white hover:text-slate-200 transition-colors"
            >
              Scientiaiter
            </Link>

            <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm">
              <Link
                to="/privacy"
                className="text-slate-400 hover:text-white transition-colors"
              >
                {language === "ru" ? "Конфиденциальность" : "Privacy"}
              </Link>
              <Link
                to="/ethics"
                className="text-slate-400 hover:text-white transition-colors"
              >
                {language === "ru" ? "Этика платформы" : "Platform Ethics"}
              </Link>
              <Link
                to="/terms"
                className="text-slate-400 hover:text-white transition-colors"
              >
                {language === "ru" ? "Условия" : "Terms"}
              </Link>
              <Link
                to="/support"
                className="text-slate-400 hover:text-white transition-colors"
              >
                {language === "ru" ? "Поддержка" : "Support"}
              </Link>
            </div>

            <div className="text-slate-500 text-sm">© 2026 Scientiaiter</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
