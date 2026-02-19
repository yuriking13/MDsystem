import crypto from "crypto";

export function generateAdminToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashAdminToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function normalizePagination(
  pageInput: number,
  limitInput: number,
  defaultLimit: number,
): { page: number; limit: number; offset: number } {
  const page =
    Number.isFinite(pageInput) && pageInput > 0 ? Math.floor(pageInput) : 1;
  const rawLimit =
    Number.isFinite(limitInput) && limitInput > 0
      ? Math.floor(limitInput)
      : defaultLimit;
  const limit = Math.min(rawLimit, 100);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

const ADMIN_PROJECT_SORT_WHITELIST = {
  created_at: "p.created_at",
  updated_at: "p.updated_at",
  name: "p.name",
  documents_count: "COUNT(DISTINCT d.id)",
  articles_count: "COUNT(DISTINCT pa.article_id)",
} as const;

const SQL_META_CHARACTERS = /(--|\/\*|\*\/|;)/;

type AdminProjectsSortBy = keyof typeof ADMIN_PROJECT_SORT_WHITELIST;
type AdminProjectsSortOrder = "asc" | "desc";

function isAdminProjectsSortBy(value: string): value is AdminProjectsSortBy {
  return value in ADMIN_PROJECT_SORT_WHITELIST;
}

function isAdminProjectsSortOrder(
  value: string,
): value is AdminProjectsSortOrder {
  return value === "asc" || value === "desc";
}

export function buildAdminProjectsFilterAndSort(args: {
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}):
  | {
      ok: true;
      whereClause: string;
      params: unknown[];
      orderByClause: string;
    }
  | {
      ok: false;
      error: string;
    } {
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (typeof args.search === "string") {
    const search = args.search.trim();
    if (search.length === 0) {
      return { ok: false, error: "Invalid search filter value" };
    }
    if (
      search.length > 200 ||
      search.includes("\0") ||
      SQL_META_CHARACTERS.test(search)
    ) {
      return { ok: false, error: "Unsafe search filter value" };
    }

    params.push(`%${search}%`);
    const paramIndex = params.length;
    conditions.push(
      `(p.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`,
    );
  }

  const rawSortBy = (args.sortBy || "created_at").trim();
  if (!isAdminProjectsSortBy(rawSortBy)) {
    return { ok: false, error: "Invalid sortBy value" };
  }

  const rawSortOrder = (args.sortOrder || "desc").trim().toLowerCase();
  if (!isAdminProjectsSortOrder(rawSortOrder)) {
    return { ok: false, error: "Invalid sortOrder value" };
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderByClause = `ORDER BY ${
    ADMIN_PROJECT_SORT_WHITELIST[rawSortBy]
  } ${rawSortOrder.toUpperCase()}`;

  return {
    ok: true,
    whereClause,
    params,
    orderByClause,
  };
}
