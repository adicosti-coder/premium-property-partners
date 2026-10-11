import { beforeEach, describe, expect, it } from "vitest";
import { isChunkLoadError, reserveChunkReload } from "./chunkRecovery";

describe("chunk recovery", () => {
  beforeEach(() => sessionStorage.clear());

  it("recognizes browser and CSS chunk errors, not unrelated errors", () => {
    for (const message of ["Failed to fetch dynamically imported module", "Importing a module script failed", "Loading CSS chunk 42 failed", "error loading dynamically imported module"]) {
      expect(isChunkLoadError(new Error(message))).toBe(true);
    }
    expect(isChunkLoadError(new Error("Invalid phone number"))).toBe(false);
  });

  it("permits only one automatic reload per URL within a minute", () => {
    expect(reserveChunkReload(sessionStorage, "/cazare", true, 1000)).toBe(true);
    expect(reserveChunkReload(sessionStorage, "/cazare", true, 2000)).toBe(false);
    expect(reserveChunkReload(sessionStorage, "/cazare", true, 61000)).toBe(true);
  });

  it("does not reload offline", () => {
    expect(reserveChunkReload(sessionStorage, "/cazare", false)).toBe(false);
    expect(sessionStorage.length).toBe(0);
  });

  it("fails safely when storage is unavailable or corrupted", () => {
    expect(reserveChunkReload({ getItem: () => { throw new Error("denied"); }, setItem: () => {} }, "/", true)).toBe(false);
    sessionStorage.setItem("realtrust:chunk-recovery", "not-json");
    expect(reserveChunkReload(sessionStorage, "/", true)).toBe(false);
  });
});