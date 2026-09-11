export type WidgetBootKind = "ready" | "missing-company" | "missing-env";

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
  if (!input.companyId && !input.companySlug) {
    return "missing-company";
  }
  if (!input.supabaseUrl || !input.supabaseKey) {
    return "missing-env";
  }
  return "ready";
}
