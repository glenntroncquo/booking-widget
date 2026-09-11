import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCheckoutReturnUrls,
  checkoutReturnBaseHref,
  parseAppointmentCreateResult,
  parseCheckoutReturn,
  stripCheckoutReturnParams,
  sumSelectedDepositAmount,
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
