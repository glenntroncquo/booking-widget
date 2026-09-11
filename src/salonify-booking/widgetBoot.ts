export type WidgetBootKind = "ready" | "missing-company" | "missing-env";

export type CompanyRef =
  | { kind: "id"; value: string }
  | { kind: "slug"; value: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Same rule as the host booking path: UUID vs public slug. */
export function isCompanyUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

function firstQueryValue(
  params: URLSearchParams,
  names: string[]
): string | null {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  for (const [key, value] of params.entries()) {
    if (wanted.has(key.toLowerCase()) && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

/**
 * Read company identifiers from the widget query string.
 * Keys are matched case-insensitively (`companySlug`, `companyslug`, `company_slug`).
 */
export function readCompanyQuery(
  search: string | URLSearchParams
): { companyId: string | null; companySlug: string | null } {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;
  return {
    companyId: firstQueryValue(params, ["companyId", "company_id"]),
    companySlug: firstQueryValue(params, ["companySlug", "company_slug"]),
  };
}

/**
 * Host `/glennie` names the path param companyId but the value is a slug.
 * A UUID is used as-is; any other non-empty companyId is resolved as a slug.
 */
export function classifyCompanyRef(input: {
  companyId?: string | null;
  companySlug?: string | null;
}): CompanyRef | null {
  const companyId = input.companyId?.trim() ?? "";
  const companySlug = input.companySlug?.trim() ?? "";
  if (companyId && isCompanyUuid(companyId)) {
    return { kind: "id", value: companyId };
  }
  const slug = companyId && !isCompanyUuid(companyId) ? companyId : companySlug;
  if (!slug) return null;
  return { kind: "slug", value: slug.toLowerCase() };
}

/**
 * Bare widget root (no companyId / companySlug) is a help state, not a crash.
 * Missing Supabase env with a company present is still a real config error.
 */
export function classifyWidgetBoot(input: {
  companyId?: string | null;
  companySlug?: string | null;
  supabaseUrl?: string | null;
  supabaseKey?: string | null;
}): WidgetBootKind {
  if (!classifyCompanyRef(input)) {
    return "missing-company";
  }
  if (!input.supabaseUrl || !input.supabaseKey) {
    return "missing-env";
  }
  return "ready";
}
