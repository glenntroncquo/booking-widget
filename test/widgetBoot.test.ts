import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyWidgetBoot } from "../src/salonify-booking/widgetBoot.ts";

describe("classifyWidgetBoot", () => {
  it("soft-lands when company params are missing", () => {
    assert.equal(
      classifyWidgetBoot({
        supabaseUrl: "https://example.supabase.co",
        supabaseKey: "anon",
      }),
      "missing-company"
    );
    assert.equal(
      classifyWidgetBoot({
        companyId: "",
        companySlug: null,
        supabaseUrl: "https://example.supabase.co",
        supabaseKey: "anon",
      }),
      "missing-company"
    );
  });

  it("soft-lands on a bare root even if env is also missing", () => {
    assert.equal(classifyWidgetBoot({}), "missing-company");
  });

  it("keeps a config error when company is present but env is missing", () => {
    assert.equal(
      classifyWidgetBoot({ companySlug: "glennie" }),
      "missing-env"
    );
    assert.equal(
      classifyWidgetBoot({
        companyId: "b66720ac-dcb8-4051-b287-f8f8b6291cc0",
        supabaseUrl: "",
        supabaseKey: "anon",
      }),
      "missing-env"
    );
  });

  it("is ready when companySlug or companyId is present with env", () => {
    assert.equal(
      classifyWidgetBoot({
        companySlug: "glennie",
        supabaseUrl: "https://example.supabase.co",
        supabaseKey: "anon",
      }),
      "ready"
    );
    assert.equal(
      classifyWidgetBoot({
        companyId: "b66720ac-dcb8-4051-b287-f8f8b6291cc0",
        supabaseUrl: "https://example.supabase.co",
        supabaseKey: "anon",
      }),
      "ready"
    );
  });
});
