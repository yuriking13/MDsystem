import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import "../styles/professional-landing.css";
import LandingFooter from "../components/LandingFooter";

const SPECIALTIES = [
  { value: "", label: { ru: "Все направления", en: "All specialties" } },
  { value: "THERAPY", label: { ru: "Терапия", en: "Therapy" } },
  { value: "SURGERY", label: { ru: "Хирургия", en: "Surgery" } },
  { value: "DENTISTRY", label: { ru: "Стоматология", en: "Dentistry" } },
  { value: "CARDIOLOGY", label: { ru: "Кардиология", en: "Cardiology" } },
  {
    value: "ENDOCRINOLOGY",
    label: { ru: "Эндокринология", en: "Endocrinology" },
  },
  { value: "NEUROLOGY", label: { ru: "Неврология", en: "Neurology" } },
  {
    value: "TRAUMATOLOGY",
    label: { ru: "Травматология", en: "Traumatology" },
  },
  {
    value: "OTORHINOLARYNGOLOGY",
    label: { ru: "Оториноларингология", en: "Otorhinolaryngology" },
  },
  {
    value: "REHABILITATION",
    label: { ru: "Восстановительная медицина", en: "Rehabilitation" },
  },
  {
    value: "PLASTIC_SURGERY",
    label: { ru: "Пластическая хирургия", en: "Plastic Surgery" },
  },
  { value: "GENETICS", label: { ru: "Генетика", en: "Genetics" } },
] as const;

type Language = "ru" | "en";

interface Conference {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  date: string;
  specialty: string;
  imageUrl: string;
  logoUrl: string;
}

/* Data will come from API — empty for now */
const CONFERENCES: Conference[] = [];

function getMonthLabel(month: number, lang: Language) {
  const ru = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ];
  const en = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return lang === "ru" ? ru[month] : en[month];
}

function formatDate(iso: string, lang: Language) {
  const d = new Date(iso);
  const day = d.getDate();
  const month = getMonthLabel(d.getMonth(), lang).toLowerCase();
  return lang === "ru"
    ? `${day} ${month} ${d.getFullYear()}`
    : `${month} ${day}, ${d.getFullYear()}`;
}

function specialtyLabel(value: string, lang: Language) {
  const s = SPECIALTIES.find((sp) => sp.value === value);
  return s ? s.label[lang] : value;
}

export default function ConferencesPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [language, setLanguage] = useState<Language>("ru");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  const toggleTheme = () =>
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  const toggleLanguage = () =>
    setLanguage((prev) => (prev === "ru" ? "en" : "ru"));

  const years = useMemo(() => {
    const set = new Set(CONFERENCES.map((c) => new Date(c.date).getFullYear()));
    return Array.from(set).sort();
  }, []);

  const months = Array.from({ length: 12 }, (_, i) => i);

  const filtered = useMemo(() => {
    return CONFERENCES.filter((c) => {
      const d = new Date(c.date);
      if (selectedSpecialty && c.specialty !== selectedSpecialty) return false;
      if (selectedYear && d.getFullYear() !== Number(selectedYear))
        return false;
      if (selectedMonth !== "" && d.getMonth() !== Number(selectedMonth))
        return false;
      return true;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [selectedSpecialty, selectedYear, selectedMonth]);

  const t = {
    ru: {
      title: "Научные конференции",
      subtitle: "Актуальные медицинские мероприятия, форумы и конгрессы",
      filterSpecialty: "Направление",
      filterYear: "Год",
      filterMonth: "Месяц",
      allYears: "Все годы",
      allMonths: "Все месяцы",
      noResults: "По выбранным фильтрам конференций не найдено",
      brandSubtitle: "Путь знания",
      login: "Войти",
      start: "Начать",
    },
    en: {
      title: "Scientific Conferences",
      subtitle: "Upcoming medical events, forums and congresses",
      filterSpecialty: "Specialty",
      filterYear: "Year",
      filterMonth: "Month",
      allYears: "All years",
      allMonths: "All months",
      noResults: "No conferences match the selected filters",
      brandSubtitle: "Path of Knowledge",
      login: "Log in",
      start: "Get Started",
    },
  }[language];

  return (
    <div
      className={`professional-landing min-h-screen transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 landing-style-bch" : "bg-slate-50 landing-style-chb"}`}
    >
      {/* Header */}
      <header className="relative z-50 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className={`brand-name-stack ${theme === "dark" ? "text-white" : "text-slate-900"}`}
            >
              <img
                src="https://storage.yandexcloud.net/scentiaiterpublic/landing/logo_scientiaiter_no_name_bw_nobg_small.png"
                alt=""
                className="brand-name-logo"
              />
              <div className="brand-name-text">
                <span className="brand-name-primary">Scientiaiter</span>
                <span className="brand-name-subtitle">{t.brandSubtitle}</span>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "text-yellow-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {theme === "dark" ? (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
              <button
                onClick={toggleLanguage}
                className={`px-3 py-2 rounded-lg font-medium transition-colors ${theme === "dark" ? "text-slate-300 hover:text-white hover:bg-slate-800" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"}`}
              >
                {language === "ru" ? "EN" : "RU"}
              </button>
              <Link
                to="/login"
                className={`${theme === "dark" ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"} transition-colors font-medium`}
              >
                {t.login}
              </Link>
              <Link to="/register" className="glass-button-wrap">
                <span className="glass-button">
                  <span>{t.start}</span>
                </span>
                <span className="glass-button-shadow" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-12 pb-8 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1
            className={`text-4xl md:text-6xl font-bold mb-4 ${theme === "dark" ? "text-white" : "text-black"}`}
          >
            {t.title}
          </h1>
          <p
            className={`text-lg ${theme === "dark" ? "text-slate-300" : "text-slate-600"} max-w-2xl mx-auto`}
          >
            {t.subtitle}
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="px-6 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="conf-filters">
            <div className="conf-filter-group">
              <label
                className={
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }
              >
                {t.filterSpecialty}
              </label>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="conf-filter-select"
              >
                {SPECIALTIES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label[language]}
                  </option>
                ))}
              </select>
            </div>
            <div className="conf-filter-group">
              <label
                className={
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }
              >
                {t.filterYear}
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="conf-filter-select"
              >
                <option value="">{t.allYears}</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="conf-filter-group">
              <label
                className={
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }
              >
                {t.filterMonth}
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="conf-filter-select"
              >
                <option value="">{t.allMonths}</option>
                {months.map((m) => (
                  <option key={m} value={m}>
                    {getMonthLabel(m, language)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="px-6 pb-24">
        <div className="max-w-7xl mx-auto">
          {filtered.length === 0 ? (
            <p
              className={`text-center py-20 text-lg ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
            >
              {t.noResults}
            </p>
          ) : (
            <div className="conf-grid">
              {filtered.map((c) => (
                <article key={c.id} className="conf-card">
                  <div className="conf-card-image">
                    {c.imageUrl ? (
                      <img src={c.imageUrl} alt={c.title} loading="lazy" />
                    ) : (
                      <div className="conf-card-placeholder">
                        <svg
                          viewBox="0 0 80 80"
                          fill="none"
                          className="conf-placeholder-icon"
                        >
                          <rect
                            x="10"
                            y="16"
                            width="60"
                            height="48"
                            rx="8"
                            stroke="currentColor"
                            strokeWidth="2"
                            opacity="0.3"
                          />
                          <circle
                            cx="30"
                            cy="36"
                            r="8"
                            stroke="currentColor"
                            strokeWidth="2"
                            opacity="0.3"
                          />
                          <path
                            d="M10 52l16-12 12 8 16-14 16 18"
                            stroke="currentColor"
                            strokeWidth="2"
                            opacity="0.3"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="conf-card-body">
                    {c.logoUrl && (
                      <img
                        src={c.logoUrl}
                        alt=""
                        className="conf-card-logo"
                        loading="lazy"
                      />
                    )}
                    <span className="conf-card-tag">
                      {specialtyLabel(c.specialty, language)}
                    </span>
                    <h3 className="conf-card-title">{c.title}</h3>
                    <p className="conf-card-subtitle">{c.subtitle}</p>
                    <div className="conf-card-meta">
                      <span>{c.location}</span>
                      <span>{formatDate(c.date, language)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <LandingFooter language={language} theme={theme} />
    </div>
  );
}
