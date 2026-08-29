import { SupabaseClient } from "@supabase/supabase-js";
import { PhaseType, SelectedService, ServiceVariant } from "./types/types";

type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | { [key: string]: any }
  | ClassValue[];

let clsx: ((...inputs: ClassValue[]) => string) | undefined;
let twMerge: ((input: string) => string) | undefined;

// Dynamic imports with fallback - using globalThis to avoid eval
if (typeof globalThis !== "undefined" && (globalThis as any).require) {
  try {
    const clsxModule = (globalThis as any).require("clsx");
    clsx = clsxModule.clsx;
  } catch {
    // clsx not available
  }

  try {
    const twMergeModule = (globalThis as any).require("tailwind-merge");
    twMerge = twMergeModule.twMerge;
  } catch {
    // tailwind-merge not available
  }
}

export function cn(...inputs: ClassValue[]): string {
  if (!clsx || !twMerge) {
    return inputs.filter(Boolean).join(" ");
  }
  return twMerge(clsx(inputs));
}

export function getImageUrl(
  imagePath: string | null,
  supabase: SupabaseClient,
  bucket: string = "company"
): string | null {
  if (!imagePath) return null;

  const { data } = supabase.storage.from(bucket).getPublicUrl(imagePath);
  return data.publicUrl;
}

export const formatTimeDisplay = (time24h: string): string => {
  if (!time24h.includes("AM") && !time24h.includes("PM")) {
    try {
      const [hours, minutes] = time24h.split(":").map(Number);
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
    } catch (error) {
      console.error("Error formatting time:", error);
      return time24h;
    }
  }

  try {
    const [timePart, period] = time24h.split(" ");
    const [h, m] = timePart.split(":").map(Number);
    const hours =
      period === "PM" && h !== 12
        ? h + 12
        : period === "AM" && h === 12
          ? 0
          : h;
    const minutes = m;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  } catch (error) {
    console.error("Error formatting time:", error);
    return time24h;
  }
};

export const calculateTotalPrice = (selectedServices: SelectedService[]) => {
  return selectedServices.reduce((total, item) => total + item.variant.price, 0);
};

export const calculateTotalPriceRange = (
  selectedServices: SelectedService[]
) => {
  const baseTotal = selectedServices.reduce(
    (total, item) => total + (item.variant.price < 0 ? 0 : item.variant.price),
    0
  );

  const maxTotal = selectedServices.reduce((total, item) => {
    const maxPrice = item.variant.max_price;
    const basePrice = item.variant.price < 0 ? 0 : item.variant.price;

    // If max_price is 9999 or above, treat it as "open-ended" for total calculation
    if (maxPrice && maxPrice >= 9999) {
      return total + basePrice;
    }
    return total + (maxPrice && maxPrice < 0 ? 0 : maxPrice || basePrice);
  }, 0);

  const hasOpenEndedPricing = selectedServices.some(
    (item) => item.variant.max_price && item.variant.max_price >= 9999
  );

  return {
    baseTotal,
    maxTotal,
    hasRange: baseTotal !== maxTotal,
    hasOpenEndedPricing,
  };
};

/** Client visit length: busy + free only. Buffer is staff lock, never advertised. */
export function isClientFacingPhase(phase: {
  phase_type: PhaseType;
}): boolean {
  return phase.phase_type === "busy" || phase.phase_type === "free";
}

export function variantClientDurationMinutes(variant: ServiceVariant): number {
  const clientPhases = variant.phases?.filter(isClientFacingPhase) ?? [];
  if (clientPhases.length > 0) {
    return clientPhases.reduce(
      (total, phase) => total + phase.duration_minutes,
      0
    );
  }
  return variant.client_duration_minutes;
}

export const clientDurationMinutes = (item: SelectedService): number => {
  return variantClientDurationMinutes(item.variant);
};

export function addMinutesToClockTime(
  time: string,
  minutesToAdd: number
): string {
  const display = formatTimeDisplay(time);
  const [hours, minutes] = display.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time;
  const total =
    (((hours * 60 + minutes + minutesToAdd) % (24 * 60)) + 24 * 60) %
    (24 * 60);
  const nextHours = Math.floor(total / 60);
  const nextMinutes = total % 60;
  return `${nextHours.toString().padStart(2, "0")}:${nextMinutes
    .toString()
    .padStart(2, "0")}`;
}

/** Normalize a slot ISO instant. Rejects clock labels like "09:30". */
export function toIsoInstant(value: string | undefined | null): string | null {
  if (!value || !value.includes("T")) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
}

export const calculateTotalDuration = (selectedServices: SelectedService[]) => {
  return selectedServices.reduce(
    (total, item) => total + clientDurationMinutes(item),
    0
  );
};

export const uniqueStaffIds = (selectedServices: SelectedService[]) => {
  return Array.from(
    new Set(
      selectedServices
        .map((item) => item.staffId)
        .filter((id): id is string => Boolean(id))
    )
  );
};

export function daySlotCount(day: {
  slots?: unknown[];
  staff?: Record<string, { slots: unknown[] }>;
} | undefined): number {
  if (!day) return 0;
  if (day.slots && day.slots.length > 0) return day.slots.length;
  if (!day.staff) return 0;
  return Object.values(day.staff).reduce(
    (total, staffMember) => total + staffMember.slots.length,
    0
  );
}

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[0-9+\-\s]{10,15}$/;
  return phoneRegex.test(phone);
};
