/** Public booking deposits: consume appointment-create checkout_url. No new RPCs. */

import type { BookingData } from "./types/types";

export const DEPOSIT_QUERY_PARAM = "deposit";

export type CheckoutReturnStatus = "success" | "cancel" | null;

export type AppointmentCreateResult = {
  checkoutUrl: string | null;
  depositAmount: number | null;
};

export type DepositBookingSnapshot = {
  companyId: string;
  date: string;
  timeSlot: string;
  staffName: string;
  services: Array<{ serviceName: string; variantName: string }>;
  totalPrice: number;
  depositAmount: number | null;
  locationName?: string;
  locationAddress?: string;
  referralApplied?: boolean;
};

const SNAPSHOT_KEY = "salonify-deposit-booking";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return null;
}

function readNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value.replace(",", "."));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function unwrapCreatePayload(data: unknown): Record<string, unknown> | null {
  const root = asRecord(data);
  if (!root) return null;
  const nested = asRecord(root.data);
  if (
    nested &&
    (nested.checkout_url != null ||
      nested.checkoutUrl != null ||
      nested.deposit_amount != null ||
      nested.depositAmount != null ||
      nested.checkout != null)
  ) {
    return nested;
  }
  return root;
}

export function parseCheckoutReturn(search: string): CheckoutReturnStatus {
  const query = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  const raw = (
    params.get(DEPOSIT_QUERY_PARAM) ||
    params.get("checkout") ||
    ""
  ).toLowerCase();
  if (raw === "success" || raw === "paid" || raw === "complete") {
    return "success";
  }
  if (raw === "cancel" || raw === "canceled" || raw === "cancelled") {
    return "cancel";
  }
  return null;
}

export function stripCheckoutReturnParams(href: string): string {
  const url = new URL(href);
  url.searchParams.delete(DEPOSIT_QUERY_PARAM);
  url.searchParams.delete("checkout");
  url.searchParams.delete("session_id");
  return url.toString();
}

export function checkoutReturnBaseHref(
  locationHref: string,
  topHref?: string | null
): string {
  if (topHref && topHref !== locationHref) return topHref;
  return locationHref;
}

export function buildCheckoutReturnUrls(currentHref: string): {
  successUrl: string;
  cancelUrl: string;
} {
  const success = new URL(currentHref);
  success.searchParams.delete(DEPOSIT_QUERY_PARAM);
  success.searchParams.delete("checkout");
  success.searchParams.delete("session_id");
  success.searchParams.set(DEPOSIT_QUERY_PARAM, "success");

  const cancel = new URL(currentHref);
  cancel.searchParams.delete(DEPOSIT_QUERY_PARAM);
  cancel.searchParams.delete("checkout");
  cancel.searchParams.delete("session_id");
  cancel.searchParams.set(DEPOSIT_QUERY_PARAM, "cancel");

  return {
    successUrl: success.toString(),
    cancelUrl: cancel.toString(),
  };
}

export function parseAppointmentCreateResult(
  data: unknown
): AppointmentCreateResult {
  const payload = unwrapCreatePayload(data);
  if (!payload) return { checkoutUrl: null, depositAmount: null };

  const checkout = asRecord(payload.checkout);
  const checkoutUrl = readString(
    payload.checkout_url,
    payload.checkoutUrl,
    checkout?.url,
    checkout?.checkout_url
  );

  const deposit = asRecord(payload.deposit);
  const depositAmount = readNumber(
    payload.deposit_amount,
    payload.depositAmount,
    typeof payload.deposit === "number" || typeof payload.deposit === "string"
      ? payload.deposit
      : undefined,
    deposit?.amount
  );

  return {
    checkoutUrl,
    depositAmount:
      depositAmount != null && depositAmount > 0 ? depositAmount : null,
  };
}

export function readCatalogDepositAmount(item: {
  variant?: { deposit_amount?: number | null };
  service?: { deposit_amount?: number | null };
}): number | null {
  const variant = item.variant?.deposit_amount;
  if (typeof variant === "number" && Number.isFinite(variant) && variant > 0) {
    return variant;
  }
  const service = item.service?.deposit_amount;
  if (typeof service === "number" && Number.isFinite(service) && service > 0) {
    return service;
  }
  return null;
}

export function sumSelectedDepositAmount(
  services: Array<{
    variant?: { deposit_amount?: number | null };
    service?: { deposit_amount?: number | null };
  }>
): number | null {
  let total = 0;
  let found = false;
  for (const item of services) {
    const amount = readCatalogDepositAmount(item);
    if (amount != null) {
      total += amount;
      found = true;
    }
  }
  return found ? total : null;
}

export function formatEuro(amount: number): string {
  return amount.toFixed(2).replace(".", ",");
}

export function resolveCheckoutHref(): string {
  let topHref: string | null = null;
  try {
    if (window.top && window.top !== window) {
      topHref = window.top.location.href;
    }
  } catch {
    topHref = null;
  }
  return checkoutReturnBaseHref(window.location.href, topHref);
}

export function openCheckoutUrl(checkoutUrl: string): void {
  try {
    if (window.top && window.top !== window) {
      window.top.location.assign(checkoutUrl);
      return;
    }
  } catch {
    // Sandboxed / cross-origin iframe may block top navigation.
  }
  window.location.assign(checkoutUrl);
}

export function saveDepositBookingSnapshot(
  snapshot: DepositBookingSnapshot
): void {
  try {
    sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Private mode / quota.
  }
}

export function loadDepositBookingSnapshot(
  companyId: string
): DepositBookingSnapshot | null {
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DepositBookingSnapshot;
    if (!parsed || parsed.companyId !== companyId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDepositBookingSnapshot(): void {
  try {
    sessionStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    // ignore
  }
}

export function emitWidgetEvent(event: string, data?: unknown): void {
  if (typeof window === "undefined") return;
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(
      {
        type: "salonify-booking-event",
        event,
        data,
      },
      "*"
    );
  }
}

function snapshotServices(
  snapshot: DepositBookingSnapshot
): BookingData["services"] {
  return snapshot.services.map((item) => ({
    service: {
      id: item.serviceName,
      name: item.serviceName,
      description: "",
      service_variant: [],
    },
    variant: {
      id: item.variantName,
      name: item.variantName,
      price: 0,
      client_duration_minutes: 0,
    },
    staffId: null,
  }));
}

export function bookingDataFromSnapshot(
  snapshot: DepositBookingSnapshot,
  extras: { depositPaid?: boolean; depositCanceled?: boolean } = {}
): BookingData {
  const parsed = snapshot.date ? new Date(snapshot.date) : null;
  return {
    date: parsed && !Number.isNaN(parsed.getTime()) ? parsed : null,
    timeSlot: snapshot.timeSlot,
    staffName: snapshot.staffName,
    services: snapshotServices(snapshot),
    totalPrice: snapshot.totalPrice,
    referralApplied: snapshot.referralApplied,
    locationName: snapshot.locationName,
    locationAddress: snapshot.locationAddress,
    depositAmount: snapshot.depositAmount,
    depositPaid: extras.depositPaid,
    depositCanceled: extras.depositCanceled,
  };
}

export function emptyReturnBookingData(
  extras: {
    depositPaid?: boolean;
    depositCanceled?: boolean;
    depositAmount?: number | null;
  } = {}
): BookingData {
  return {
    date: null,
    timeSlot: "",
    staffName: "",
    services: [],
    totalPrice: 0,
    depositAmount: extras.depositAmount ?? null,
    depositPaid: extras.depositPaid,
    depositCanceled: extras.depositCanceled,
  };
}

