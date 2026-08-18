import { describe, it, expect, beforeEach } from "vitest";
import {
  getIdempotencyKey,
  clearIdempotencyKey,
  idempotencyHeaders,
} from "@/lib/idempotency";

describe("idempotency keys", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("returns the same key for repeated calls in the same attempt", () => {
    const a = getIdempotencyKey("owner_form");
    const b = getIdempotencyKey("owner_form");
    expect(a).toBe(b);
  });

  it("isolates keys per scope", () => {
    expect(getIdempotencyKey("owner_form")).not.toBe(getIdempotencyKey("contact_form"));
  });

  it("issues a fresh key after the attempt is cleared", () => {
    const first = getIdempotencyKey("owner_form");
    clearIdempotencyKey("owner_form");
    expect(getIdempotencyKey("owner_form")).not.toBe(first);
  });

  it("exposes the key as the x-idempotency-key header", () => {
    const key = getIdempotencyKey("owner_form");
    expect(idempotencyHeaders("owner_form")).toEqual({ "x-idempotency-key": key });
  });

  it("persists the key in sessionStorage under a namespaced entry", () => {
    const key = getIdempotencyKey("owner_form");
    expect(sessionStorage.getItem("rt_idem:owner_form")).toBe(key);
  });
});
