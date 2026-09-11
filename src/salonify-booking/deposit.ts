/** Public booking deposits: consume appointment-create checkout_url. No new RPCs. */

import type { BookingData } from "./types/types";

export const DEPOSIT_QUERY_PARAM = "deposit";
export const WIDGET_CHECKOUT_EVENT = "salonify-checkout";
export const WIDGET_BOOKING_EVENT = "salonify-booking-event";

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
  if (params.get("session_id")) {
    return "success";
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

export function coalesceDepositAmount(
  ...amounts: Array<number | null | undefined>
): number | null {
  for (const amount of amounts) {
    if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
      return amount;
    }
  }
  return null;
}

/** Catalog + host hints for the book step. Server still decides checkout_url. */
export function previewDepositHint(
  catalogAmount: number | null,
  hostAmount?: number | null,
  hostEnabled?: boolean
): { amount: number | null; showCta: boolean } {
  const amount = coalesceDepositAmount(catalogAmount, hostAmount);
  return {
    amount,
    showCta: hostEnabled === true || amount != null,
  };
}

export function parsePositiveNumber(value: unknown): number | null {
  return coalesceDepositAmount(readNumber(value));
}

export function parseBooleanFlag(value: unknown): boolean | undefined {
  if (value === true || value === false) return value;
  if (typeof value !== "string") return undefined;
  const lower = value.trim().toLowerCase();
  if (["1", "true", "yes"].includes(lower)) return true;
  if (["0", "false", "no"].includes(lower)) return false;
  return undefined;
}

/**
 * Host #6 live once shipped `ttps://booking.salonify.co/...` (truncated https).
 * Repair that before rejecting, so appointment-create still gets both URLs.
 */
export function coerceHttpUrlString(value: string): string {
  const trimmed = value.trim();
  if (/^ttps:\/\//i.test(trimmed)) return `h${trimmed}`;
  return trimmed;
}

export function readHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    const url = new URL(coerceHttpUrlString(value));
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

const ERROR_KEY_FIELDS = ["errorKey", "error", "code", "message"] as const;

/**
 * appointment-create failures may be FunctionsHttpError context JSON
 * (`{code,message}` BOOT_ERROR), `{success:false,error}` in data, or errorKey.
 */
export function extractBookingErrorKey(
  errorBody?: Record<string, unknown> | null,
  data?: unknown,
  error?: unknown
): string | undefined {
  const nestedData = asRecord(data);
  const rows: Array<Record<string, unknown> | null> = [
    errorBody ?? null,
    nestedData,
    asRecord(nestedData?.data),
    asRecord(error),
  ];
  for (const row of rows) {
    if (!row) continue;
    const value = readString(...ERROR_KEY_FIELDS.map((field) => row[field]));
    if (value) return value;
  }
  return undefined;
}

/** Stripe Checkout only — never open-redirect. */
export function isStripeCheckoutUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return (
      host === "checkout.stripe.com" || host.endsWith(".checkout.stripe.com")
    );
  } catch {
    return false;
  }
}

/** Prefer host booking-path URLs (booking#6); otherwise build from the current widget href. */
export function resolveDepositReturnUrls(options: {
  successUrl?: string | null;
  cancelUrl?: string | null;
  fallbackHref: string;
}): { success_url: string; cancel_url: string } {
  const fallback = buildCheckoutReturnUrls(options.fallbackHref);
  return {
    success_url: readHttpUrl(options.successUrl) ?? fallback.successUrl,
    cancel_url: readHttpUrl(options.cancelUrl) ?? fallback.cancelUrl,
  };
}

export function emitCheckoutToHost(checkoutUrl: string): void {
  if (typeof window === "undefined") return;
  if (!(window.parent && window.parent !== window)) return;
  window.parent.postMessage(
    {
      type: WIDGET_CHECKOUT_EVENT,
      checkout_url: checkoutUrl,
      checkoutUrl,
    },
    "*"
  );
  window.parent.postMessage(
    {
      type: WIDGET_BOOKING_EVENT,
      event: "checkout",
      data: { checkout_url: checkoutUrl, checkoutUrl },
    },
    "*"
  );
}

/**
 * Follow appointment-create checkout_url.
 * Iframe: postMessage for the host (booking#6) then try top navigation.
 * Standalone: redirect this window. Never load Checkout inside a nested iframe.
 */
export function followCheckoutUrl(checkoutUrl: string): boolean {
  if (!isStripeCheckoutUrl(checkoutUrl)) return false;
  emitCheckoutToHost(checkoutUrl);
  const inIframe =
    typeof window !== "undefined" && window.parent !== window;
  if (inIframe) {
    try {
      window.top?.location.assign(checkoutUrl);
    } catch {
      // Cross-origin host redirects from salonify-checkout / checkout event.
    }
    return true;
  }
  window.location.assign(checkoutUrl);
  return true;
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
  followCheckoutUrl(checkoutUrl);
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
        type: WIDGET_BOOKING_EVENT,
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

