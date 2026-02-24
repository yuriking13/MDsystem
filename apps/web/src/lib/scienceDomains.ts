export const SCIENCE_DISCIPLINES = [
  {
    slug: "med",
    label: "Медицина",
    code: "MED",
    description:
      "Клинические исследования, медицинские данные, систематические обзоры и публикации.",
    fallbackPath: "/med",
  },
  {
    slug: "physics",
    label: "Физика",
    code: "PHYS",
    description:
      "Теоретическая и прикладная физика, моделирование процессов и валидация гипотез.",
    fallbackPath: "/science/physics",
  },
  {
    slug: "chemistry",
    label: "Химия",
    code: "CHEM",
    description:
      "Органическая, неорганическая и аналитическая химия, экспериментальные протоколы.",
    fallbackPath: "/science/chemistry",
  },
  {
    slug: "biology",
    label: "Биология",
    code: "BIO",
    description:
      "Молекулярная биология, генетика, клеточные процессы и биоинформатические подходы.",
    fallbackPath: "/science/biology",
  },
  {
    slug: "astronomy",
    label: "Астрономия",
    code: "ASTRO",
    description:
      "Наблюдательные и теоретические исследования космоса, обработка астрофизических данных.",
    fallbackPath: "/science/astronomy",
  },
  {
    slug: "earth",
    label: "Науки о Земле",
    code: "EARTH",
    description:
      "Геология, география, геофизика и междисциплинарные исследования природных систем.",
    fallbackPath: "/science/earth",
  },
  {
    slug: "ecology",
    label: "Экология",
    code: "ECO",
    description:
      "Экосистемные исследования, устойчивое развитие и оценка антропогенного воздействия.",
    fallbackPath: "/science/ecology",
  },
] as const;

export type ScienceDiscipline = (typeof SCIENCE_DISCIPLINES)[number];
export type ScienceDisciplineSlug = ScienceDiscipline["slug"];

const DISCIPLINE_SET = new Set<ScienceDisciplineSlug>(
  SCIENCE_DISCIPLINES.map((item) => item.slug),
);

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().trim().replace(/:\d+$/, "");
}

function hostLabels(hostname: string): string[] {
  return normalizeHost(hostname).split(".").filter(Boolean);
}

function isLocalHost(hostname: string): boolean {
  const host = normalizeHost(hostname);
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1"
  );
}

export function isScienceDisciplineSlug(
  value: string,
): value is ScienceDisciplineSlug {
  return DISCIPLINE_SET.has(value as ScienceDisciplineSlug);
}

export function getDisciplineBySlug(
  slug: string,
): ScienceDiscipline | undefined {
  if (!isScienceDisciplineSlug(slug)) return undefined;
  return SCIENCE_DISCIPLINES.find((discipline) => discipline.slug === slug);
}

export function resolveScienceDisciplineFromHostname(
  hostname: string,
): ScienceDisciplineSlug | null {
  const labels = hostLabels(hostname);
  if (labels.length < 2) return null;

  const firstLabel = labels[0] === "www" ? labels[1] : labels[0];
  if (!firstLabel) return null;
  return isScienceDisciplineSlug(firstLabel) ? firstLabel : null;
}

function resolveBaseDomain(hostname: string): string | null {
  const labels = hostLabels(hostname);
  if (labels.length < 2 || isLocalHost(hostname)) return null;

  if (labels[0] === "www") {
    return labels.slice(1).join(".");
  }

  if (isScienceDisciplineSlug(labels[0])) {
    return labels.slice(1).join(".");
  }

  return labels.join(".");
}

export function getScienceMainHref(defaultPath = "/science"): string {
  if (typeof window === "undefined") return defaultPath;
  const baseDomain = resolveBaseDomain(window.location.hostname);
  if (!baseDomain) return defaultPath;

  const protocol = window.location.protocol || "https:";
  const port = window.location.port ? `:${window.location.port}` : "";
  return `${protocol}//${baseDomain}${port}${defaultPath}`;
}

export function getScienceDisciplineHref(
  slug: ScienceDisciplineSlug,
  fallbackPath: string,
): string {
  if (typeof window === "undefined") return fallbackPath;
  const baseDomain = resolveBaseDomain(window.location.hostname);
  if (!baseDomain) return fallbackPath;

  const protocol = window.location.protocol || "https:";
  const port = window.location.port ? `:${window.location.port}` : "";
  return `${protocol}//${slug}.${baseDomain}${port}`;
}
