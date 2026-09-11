import { SupabaseClient } from "@supabase/supabase-js";
import {
  Service,
  ServiceVariant,
  ServiceVariantPhase,
  PhaseType,
} from "./types/types";

/** Fields sent on every location-aware edge invoke. */
export type LocationBodyFields = {
  location_id?: string;
  locationId?: string;
};

export interface ServiceListRequest extends LocationBodyFields {
  company_id: string;
  staff_ids?: string[];
}

export interface StaffListRequest extends LocationBodyFields {
  company_id: string;
}

/**
 * Attach a resolved location to an edge body.
 * Always sends `location_id` (DB / snake_case). CamelCase helpers also send
 * `locationId` so they match `companyId` if the backend PR used that name.
 */
export function locationBody(
  locationId?: string | null,
  alsoCamel = true
): LocationBodyFields {
  if (!locationId) return {};
  if (alsoCamel) return { location_id: locationId, locationId };
  return { location_id: locationId };
}

export interface AvailabilityServiceItem {
  serviceId: string;
  serviceVariantId: string;
  staffId?: string;
}

export interface AppointmentServiceItem {
  serviceId: string;
  serviceVariantId: string;
  staffId: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asNullableNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = asNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const ids = value.filter((item): item is string => typeof item === "string");
  return ids.length > 0 ? ids : undefined;
}

function normalizePhase(raw: unknown): ServiceVariantPhase | null {
  const row = asRecord(raw);
  if (!row) return null;
  const phaseType = asString(row.phase_type);
  if (
    phaseType !== "busy" &&
    phaseType !== "free" &&
    phaseType !== "buffer"
  ) {
    return null;
  }
  return {
    sequence: asNumber(row.sequence),
    phase_type: phaseType as PhaseType,
    duration_minutes: asNumber(row.duration_minutes),
    label: typeof row.label === "string" ? row.label : null,
  };
}

function normalizeVariant(raw: unknown): ServiceVariant | null {
  const row = asRecord(raw);
  if (!row || typeof row.id !== "string") return null;

  const phases = Array.isArray(row.phases)
    ? row.phases
        .map(normalizePhase)
        .filter((phase): phase is ServiceVariantPhase => phase !== null)
        .sort((a, b) => a.sequence - b.sequence)
    : Array.isArray(row.service_variant_phase)
      ? row.service_variant_phase
          .map(normalizePhase)
          .filter((phase): phase is ServiceVariantPhase => phase !== null)
          .sort((a, b) => a.sequence - b.sequence)
      : undefined;

  return {
    id: row.id,
    name: asString(row.name),
    price: asNumber(row.price),
    max_price: asNullableNumber(row.max_price),
    client_duration_minutes: asNumber(row.client_duration_minutes),
    staff_duration_minutes: asNullableNumber(row.staff_duration_minutes),
    image_path: typeof row.image_path === "string" ? row.image_path : null,
    display_order: asNumber(row.display_order ?? row.order),
    phases,
    staff_ids: asStringArray(row.staff_ids),
    deposit_amount: asNullableNumber(
      row.deposit_amount ?? row.depositAmount
    ),
  };
}

export function normalizeServiceList(data: unknown): Service[] {
  if (!Array.isArray(data)) return [];

  return data
    .map((item): Service | null => {
      const row = asRecord(item);
      if (!row || typeof row.id !== "string") return null;

      const variantsRaw = Array.isArray(row.service_variant)
        ? row.service_variant
        : [];

      return {
        id: row.id,
        name: asString(row.name),
        description: asString(row.description),
        display_order: asNullableNumber(row.display_order ?? row.order),
        service_variant: variantsRaw
          .map(normalizeVariant)
          .filter((variant): variant is ServiceVariant => variant !== null),
        staff_ids: asStringArray(row.staff_ids),
        deposit_amount: asNullableNumber(
          row.deposit_amount ?? row.depositAmount
        ),
      };
    })
    .filter((service): service is Service => service !== null);
}

export async function invokeServiceList(
  supabase: SupabaseClient,
  body: ServiceListRequest
) {
  return supabase.functions.invoke("service-list", { body });
}

export async function invokeStaffList(
  supabase: SupabaseClient,
  body: StaffListRequest
) {
  return supabase.functions.invoke("staff-list", { body });
}

/** Resolve a public company slug. Table SELECT first; existing company-get if RLS hides it. */
export async function resolveCompanyIdBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("company")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!error && data && typeof data.id === "string") {
    return data.id;
  }

  const invoked = await supabase.functions.invoke("company-get", {
    body: { slug },
  });
  if (invoked.error) {
    console.warn(
      "[Salonify Widget] company-get failed to resolve slug:",
      invoked.error.message
    );
    return null;
  }
  const root = asRecord(invoked.data);
  if (!root) return null;
  const nested = asRecord(root.data) ?? asRecord(root.company) ?? root;
  return typeof nested.id === "string" ? nested.id : null;
}

export async function invokeAvailabilityList(
  supabase: SupabaseClient,
  body: {
    companyId: string;
    startDate: string;
    endDate: string;
    services: AvailabilityServiceItem[];
    staffIds?: string[];
    location_id?: string;
    locationId?: string;
  }
) {
  return supabase.functions.invoke("availability-list", { body });
}

export async function invokeAppointmentCreate(
  supabase: SupabaseClient,
  body: {
    start: string;
    end?: string;
    companyId: string;
    staffId: string;
    services: AppointmentServiceItem[];
    price: number;
    duration?: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    notes: string;
    imageData: string | null;
    referralCode?: string;
    location_id?: string;
    locationId?: string;
    successUrl?: string;
    cancelUrl?: string;
    success_url?: string;
    cancel_url?: string;
  }
) {
  return supabase.functions.invoke("appointment-create", { body });
}

export function eligibleStaffIdsForVariant(
  service: Service,
  variant: ServiceVariant
): string[] | undefined {
  if (variant.staff_ids && variant.staff_ids.length > 0) {
    return variant.staff_ids;
  }
  if (service.staff_ids && service.staff_ids.length > 0) {
    return service.staff_ids;
  }
  return undefined;
}
