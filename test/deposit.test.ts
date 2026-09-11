import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCheckoutReturnUrls,
  checkoutReturnBaseHref,
  extractBookingErrorKey,
  followCheckoutUrl,
  isStripeCheckoutUrl,
  parseAppointmentCreateResult,
  parseCheckoutReturn,
  previewDepositHint,
  readHttpUrl,
  resolveDepositReturnUrls,
  stripCheckoutReturnParams,
  sumSelectedDepositAmount,
  usableStripeCheckoutUrl,
} from "../src/salonify-booking/deposit.ts";

describe("parseCheckoutReturn", () => {
  it("reads deposit=success", () => {
    assert.equal(
      parseCheckoutReturn("?companySlug=glennie&deposit=success"),
      "success"
    );
  });

  it("reads cancel aliases", () => {
    assert.equal(parseCheckoutReturn("deposit=cancel"), "cancel");
    assert.equal(parseCheckoutReturn("deposit=canceled"), "cancel");
    assert.equal(parseCheckoutReturn("checkout=cancelled"), "cancel");
  });

  it("returns null when absent", () => {
    assert.equal(parseCheckoutReturn("?companyId=abc"), null);
  });
});

describe("buildCheckoutReturnUrls", () => {
  it("preserves company query and sets deposit status", () => {
    const { successUrl, cancelUrl } = buildCheckoutReturnUrls(
      "https://widget.example/widget?companySlug=glennie&locationSlug=gent"
    );
    const success = new URL(successUrl);
    const cancel = new URL(cancelUrl);
    assert.equal(success.searchParams.get("companySlug"), "glennie");
    assert.equal(success.searchParams.get("locationSlug"), "gent");
    assert.equal(success.searchParams.get("deposit"), "success");
    assert.equal(cancel.searchParams.get("deposit"), "cancel");
  });
});

describe("stripCheckoutReturnParams", () => {
  it("drops deposit and session_id but keeps company", () => {
    const cleaned = stripCheckoutReturnParams(
      "https://widget.example/widget?companySlug=glennie&deposit=success&session_id=cs_test"
    );
    const url = new URL(cleaned);
    assert.equal(url.searchParams.get("companySlug"), "glennie");
    assert.equal(url.searchParams.get("deposit"), null);
    assert.equal(url.searchParams.get("session_id"), null);
  });
});

describe("checkoutReturnBaseHref", () => {
  it("prefers a distinct top href when readable", () => {
    assert.equal(
      checkoutReturnBaseHref(
        "https://widget.example/widget?companySlug=glennie",
        "https://booking.example/glennie"
      ),
      "https://booking.example/glennie"
    );
  });
});

describe("parseAppointmentCreateResult", () => {
  it("reads checkout_url and deposit_amount", () => {
    const result = parseAppointmentCreateResult({
      checkout_url: "https://checkout.stripe.com/c/pay/cs_test",
      deposit_amount: 25,
    });
    assert.equal(
      result.checkoutUrl,
      "https://checkout.stripe.com/c/pay/cs_test"
    );
    assert.equal(result.depositAmount, 25);
  });

  it("reads nested camelCase payload", () => {
    const result = parseAppointmentCreateResult({
      data: {
        checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test",
        depositAmount: "15.5",
      },
    });
    assert.equal(
      result.checkoutUrl,
      "https://checkout.stripe.com/c/pay/cs_test"
    );
    assert.equal(result.depositAmount, 15.5);
  });

  it("treats missing checkout as no deposit redirect", () => {
    const result = parseAppointmentCreateResult({ success: true, id: "appt" });
    assert.equal(result.checkoutUrl, null);
  });
});

describe("sumSelectedDepositAmount", () => {
  it("sums catalog deposits when present", () => {
    const total = sumSelectedDepositAmount([
      { variant: { deposit_amount: 10 }, service: {} },
      { variant: {}, service: { deposit_amount: 5 } },
    ]);
    assert.equal(total, 15);
  });

  it("returns null when no deposit fields", () => {
    assert.equal(
      sumSelectedDepositAmount([{ variant: {}, service: {} }]),
      null
    );
  });
});

describe("parseCheckoutReturn session_id", () => {
  it("treats Stripe session_id as success", () => {
    assert.equal(
      parseCheckoutReturn("?companySlug=glennie&session_id=cs_test"),
      "success"
    );
  });
});

describe("isStripeCheckoutUrl", () => {
  it("allows checkout.stripe.com https only", () => {
    assert.equal(
      isStripeCheckoutUrl("https://checkout.stripe.com/c/pay/cs_test"),
      true
    );
    assert.equal(
      isStripeCheckoutUrl("https://pay.checkout.stripe.com/c/pay/cs_test"),
      true
    );
    assert.equal(
      isStripeCheckoutUrl("https://evil.example/?u=https://checkout.stripe.com"),
      false
    );
    assert.equal(
      isStripeCheckoutUrl("http://checkout.stripe.com/c/pay/cs_test"),
      false
    );
  });
});

describe("readHttpUrl", () => {
  it("repairs truncated https (ttps://) from the live host", () => {
    assert.equal(
      readHttpUrl("ttps://booking.salonify.co/glennie?deposit=success"),
      "https://booking.salonify.co/glennie?deposit=success"
    );
  });

  it("still rejects non-http schemes", () => {
    assert.equal(readHttpUrl("javascript:alert(1)"), null);
  });
});

describe("extractBookingErrorKey", () => {
  it("reads DEPOSIT_URLS_REQUIRED from data when the body was not on error.context", () => {
    assert.equal(
      extractBookingErrorKey(undefined, {
        success: false,
        error: "DEPOSIT_URLS_REQUIRED",
      }),
      "DEPOSIT_URLS_REQUIRED"
    );
  });

  it("reads BOOT_ERROR code from gateway JSON", () => {
    assert.equal(
      extractBookingErrorKey({
        code: "BOOT_ERROR",
        message: "Function failed to start (please check logs)",
      }),
      "BOOT_ERROR"
    );
  });

  it("reads CHARGES_NOT_ENABLED from errorKey", () => {
    assert.equal(
      extractBookingErrorKey({ errorKey: "CHARGES_NOT_ENABLED" }),
      "CHARGES_NOT_ENABLED"
    );
  });
});

describe("resolveDepositReturnUrls", () => {
  it("prefers host booking-path URLs", () => {
    const urls = resolveDepositReturnUrls({
      successUrl: "https://booking.salonify.co/glennie?deposit=success",
      cancelUrl: "https://booking.salonify.co/glennie?deposit=cancel",
      fallbackHref: "https://widget.example/widget?companySlug=glennie",
    });
    assert.equal(
      urls.success_url,
      "https://booking.salonify.co/glennie?deposit=success"
    );
    assert.equal(
      urls.cancel_url,
      "https://booking.salonify.co/glennie?deposit=cancel"
    );
  });

  it("repairs truncated host https so create still sends both booking-path URLs", () => {
    const urls = resolveDepositReturnUrls({
      successUrl: "ttps://booking.salonify.co/glennie?deposit=success",
      cancelUrl: "ttps://booking.salonify.co/glennie?deposit=cancel",
      fallbackHref: "https://widget.example/widget?companySlug=glennie",
    });
    assert.equal(
      urls.success_url,
      "https://booking.salonify.co/glennie?deposit=success"
    );
    assert.equal(
      urls.cancel_url,
      "https://booking.salonify.co/glennie?deposit=cancel"
    );
  });

  it("falls back to widget href when host URLs are missing", () => {
    const urls = resolveDepositReturnUrls({
      fallbackHref: "https://widget.example/widget?companySlug=glennie",
    });
    const success = new URL(urls.success_url);
    const cancel = new URL(urls.cancel_url);
    assert.equal(success.searchParams.get("companySlug"), "glennie");
    assert.equal(success.searchParams.get("deposit"), "success");
    assert.equal(cancel.searchParams.get("deposit"), "cancel");
  });

  it("rejects non-http host urls", () => {
    const urls = resolveDepositReturnUrls({
      successUrl: "javascript:alert(1)",
      fallbackHref: "https://widget.example/widget?companySlug=glennie",
    });
    assert.match(urls.success_url, /widget\.example/);
  });
});

describe("usableStripeCheckoutUrl", () => {
  it("returns null when checkout_url is missing", () => {
    assert.equal(usableStripeCheckoutUrl(null), null);
    assert.equal(usableStripeCheckoutUrl(""), null);
  });

  it("returns null for non-Stripe URLs so book can still confirm", () => {
    assert.equal(
      usableStripeCheckoutUrl("https://booking.salonify.co/glennie"),
      null
    );
  });

  it("keeps Stripe Checkout URLs", () => {
    const url = "https://checkout.stripe.com/c/pay/cs_test";
    assert.equal(usableStripeCheckoutUrl(url), url);
  });
});

describe("followCheckoutUrl", () => {
  it("rejects non-stripe urls", () => {
    assert.equal(followCheckoutUrl("https://evil.example/pay"), false);
  });
});

describe("previewDepositHint", () => {
  it("shows CTA when host enabled even without amount", () => {
    const hint = previewDepositHint(null, null, true);
    assert.equal(hint.amount, null);
    assert.equal(hint.showCta, true);
  });

  it("prefers catalog amount over host amount when host flag is unset", () => {
    const hint = previewDepositHint(25, 10, undefined);
    assert.equal(hint.amount, 25);
    assert.equal(hint.showCta, true);
  });

  it("hides deposit CTA when host says deposit_enabled is false", () => {
    const hint = previewDepositHint(25, 10, false);
    assert.equal(hint.amount, null);
    assert.equal(hint.showCta, false);
  });
});
