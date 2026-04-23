import { SupabaseClient } from "@supabase/supabase-js";
import { SelectedTreatment } from "./types/types";

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

export const calculateTotalPrice = (selectedTreatments: SelectedTreatment[]) => {
  return selectedTreatments.reduce((total, item) => total + item.option.price, 0);
};

export const calculateTotalPriceRange = (
  selectedTreatments: SelectedTreatment[]
) => {
  const baseTotal = selectedTreatments.reduce(
    (total, item) => total + (item.option.price < 0 ? 0 : item.option.price),
    0
  );

  const maxTotal = selectedTreatments.reduce((total, item) => {
    const maxPrice = item.option.max_price;
    const basePrice = item.option.price < 0 ? 0 : item.option.price;

    // If max_price is 9999 or above, treat it as "open-ended" for total calculation
    if (maxPrice && maxPrice >= 9999) {
      return total + basePrice; // Use base price for total calculation
    }
    return total + (maxPrice && maxPrice < 0 ? 0 : maxPrice || basePrice);
  }, 0);

  const hasOpenEndedPricing = selectedTreatments.some(
    (item) => item.option.max_price && item.option.max_price >= 9999
  );

  return {
    baseTotal,
    maxTotal,
    hasRange: baseTotal !== maxTotal,
    hasOpenEndedPricing,
  };
};

export const calculateTotalDuration = (
  selectedTreatments: SelectedTreatment[]
) => {
  return selectedTreatments.reduce(
    (total, item) => total + item.option.duration_in_minutes,
    0
  );
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[0-9+\-\s]{10,15}$/;
  return phoneRegex.test(phone);
};

