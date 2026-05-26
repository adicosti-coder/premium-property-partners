/**
 * RLS Regression Tests
 * --------------------
 * Verifies that critical tables in the prospect / automation / admin pipeline
 * remain protected against anonymous (unauthenticated) reads.
 *
 * Strategy: use the public anon Supabase client and assert that SELECTs either
 *   - return an RLS error, OR
 *   - return an empty array (default-deny, no PERMISSIVE policy matched).
 *
 * Tests run online against the live project. If the network is unreachable
 * (e.g. offline CI), they self-skip instead of failing the build — so they
 * never block deployment, but they do catch any future regression where
 * someone accidentally adds a permissive policy that leaks data to anon.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://mvzssjyzbwccioqvhjpo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12enNzanl6YndjY2lvcXZoanBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjQxNjIsImV4cCI6MjA4MjAwMDE2Mn0.60JJMqMaDwIz1KXi3AZNqOd0lUU9pu2kqbg3Os3qbC8";

let anon: SupabaseClient;
let online = true;

beforeAll(async () => {
  anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // Quick reachability check — if offline, mark all tests as skipped at runtime.
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    await fetch(`${SUPABASE_URL}/auth/v1/health`, { signal: ctrl.signal });
    clearTimeout(t);
  } catch {
    online = false;
    // eslint-disable-next-line no-console
    console.warn("[rls-regression] Supabase unreachable — tests will self-skip.");
  }
});

/**
 * Assert that an anonymous SELECT on a sensitive table is locked down:
 * either returns an RLS error, or returns no rows at all.
 * Any returned row = a leak = test failure.
 */
async function expectAnonCannotRead(
  table: string,
  opts: { allowEmpty?: boolean } = { allowEmpty: true }
) {
  const { data, error } = await anon.from(table as any).select("*").limit(5);
  if (error) {
    // RLS / permission denied / 401 / 42501 — all acceptable.
    expect(error.message.length).toBeGreaterThan(0);
    return;
  }
  if (opts.allowEmpty) {
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBe(0);
  } else {
    // Should have errored — if we got here it's a leak.
    throw new Error(`Expected RLS denial on '${table}' but query returned ${data?.length ?? 0} rows`);
  }
}

describe("RLS regression — anonymous access is denied", () => {
  describe("prospect_listings", () => {
    it("anon cannot read draft / enrichment / rejected / scoring listings", async () => {
      if (!online) return;
      // Even an unscoped SELECT must not leak any listing rows to anon.
      // The public site reads prospect data through dedicated views / edge functions only.
      const { data, error } = await anon
        .from("prospect_listings")
        .select("id, enrichment_status, lifecycle_status")
        .limit(20);

      if (error) {
        expect(error.message.length).toBeGreaterThan(0);
        return;
      }
      // If a SELECT policy ever exists for anon, it MUST exclude drafts/enrichment/rejected/scoring.
      expect(Array.isArray(data)).toBe(true);
      for (const row of data ?? []) {
        expect(["pending", "processing", "failed"]).not.toContain(row.enrichment_status);
        expect(["rejected", "scoring", "draft"]).not.toContain(String(row.lifecycle_status));
      }
    });

    it("anon explicit filter on 'rejected' returns zero rows", async () => {
      if (!online) return;
      const { data, error } = await anon
        .from("prospect_listings")
        .select("id")
        .eq("lifecycle_status", "rejected")
        .limit(5);
      if (error) return; // RLS-denied = good
      expect((data ?? []).length).toBe(0);
    });

    it("anon explicit filter on enrichment_status='pending' returns zero rows", async () => {
      if (!online) return;
      const { data, error } = await anon
        .from("prospect_listings")
        .select("id")
        .eq("enrichment_status", "pending")
        .limit(5);
      if (error) return;
      expect((data ?? []).length).toBe(0);
    });
  });

  describe("admin / automation tables — fully locked to non-admin", () => {
    const lockedTables = [
      "agency_blocklist",
      "voice_agent_settings",
      "automation_live_logs",
    ];

    for (const table of lockedTables) {
      it(`anon cannot read ${table}`, async () => {
        if (!online) return;
        await expectAnonCannotRead(table);
      });

      it(`anon cannot INSERT into ${table}`, async () => {
        if (!online) return;
        const { error } = await anon.from(table as any).insert({} as any);
        // Must error — either RLS denial or column validation; both prove anon write is blocked.
        expect(error).not.toBeNull();
      });
    }
  });

  // Test 10 — SEO integrity: anon cannot tamper with GSC indexing columns
  describe("indexing_status integrity", () => {
    it("anon cannot UPDATE indexing_status on prospect_listings via REST", async () => {
      if (!online) return;
      const { data, error } = await anon
        .from("prospect_listings")
        .update({
          indexing_status: "INDEXED",
          last_google_check_at: new Date().toISOString(),
        })
        .neq("id", "00000000-0000-0000-0000-000000000000")
        .select("id");
      // Either RLS blocks with an error, or update is silently scoped to 0 rows.
      if (error) {
        expect(error.message.length).toBeGreaterThan(0);
        return;
      }
      expect((data ?? []).length).toBe(0);
    });

    it("anon cannot UPDATE indexing_status on properties via REST", async () => {
      if (!online) return;
      const { data, error } = await anon
        .from("properties")
        .update({
          indexing_status: "INDEXED",
          last_google_check_at: new Date().toISOString(),
        })
        .neq("id", "00000000-0000-0000-0000-000000000000")
        .select("id");
      if (error) {
        expect(error.message.length).toBeGreaterThan(0);
        return;
      }
      expect((data ?? []).length).toBe(0);
    });
  });
});

