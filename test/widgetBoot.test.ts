import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyCompanyRef,
  classifyWidgetBoot,
  readCompanyQuery,
} from "../src/salonify-booking/widgetBoot.ts";

describe("readCompanyQuery", () => {
  it("reads companySlug from the smoke query", () => {
    assert.deepEqual(readCompanyQuery("?companySlug=glennie"), {
      companyId: null,
      companySlug: "glennie",
    });
  });

  it("accepts case-insensitive and snake_case keys", () => {
    assert.deepEqual(readCompanyQuery("?companyslug=glennie"), {
      companyId: null,
      companySlug: "glennie",
    });
    assert.deepEqual(readCompanyQuery("?company_slug=glennie"), {
      companyId: null,
      companySlug: "glennie",
    });
    assert.deepEqual(readCompanyQuery("?company_id=glennie"), {
      companyId: "glennie",
      companySlug: null,
    });
  });
});

describe("classifyCompanyRef", () => {
  it("keeps a UUID companyId", () => {
    assert.deepEqual(
      classifyCompanyRef({
        companyId: "b66720ac-dcb8-4051-b287-f8f8b6291cc0",
      }),
      { kind: "id", value: "b66720ac-dcb8-4051-b287-f8f8b6291cc0" }
    );
  });

  it("treats a non-UUID companyId as a slug like host /glennie", () => {
    assert.deepEqual(classifyCompanyRef({ companyId: "glennie" }), {
      kind: "slug",
      value: "glennie",
    });
    assert.deepEqual(classifyCompanyRef({ companyId: "Glennie" }), {
      kind: "slug",
      value: "glennie",
    });
  });

  it("resolves companySlug when companyId is absent", () => {
    assert.deepEqual(classifyCompanyRef({ companySlug: "glennie" }), {
      kind: "slug",
      value: "glennie",
    });
  });

  it("lets a UUID companyId win over companySlug", () => {
    assert.deepEqual(
      classifyCompanyRef({
        companyId: "b66720ac-dcb8-4051-b287-f8f8b6291cc0",
        companySlug: "other",
      }),
      { kind: "id", value: "b66720ac-dcb8-4051-b287-f8f8b6291cc0" }
    );
  });
});

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
    assert.equal(
      classifyWidgetBoot({
        companyId: "glennie",
        supabaseUrl: "https://example.supabase.co",
        supabaseKey: "anon",
      }),
      "ready"
    );
  });
});
