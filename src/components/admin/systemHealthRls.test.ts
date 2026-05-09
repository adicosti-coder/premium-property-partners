import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

// RLS smoke test: anonymous (non-admin) clients MUST NOT receive any audit rows.
const SUPABASE_URL = "https://mvzssjyzbwccioqvhjpo.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12enNzanl6YndjY2lvcXZoanBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjQxNjIsImV4cCI6MjA4MjAwMDE2Mn0.60JJMqMaDwIz1KXi3AZNqOd0lUU9pu2kqbg3Os3qbC8";

describe("e2e_test_runs RLS", () => {
  it("denies access to anonymous (non-admin) clients", async () => {
    const sb = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data, error } = await sb.from("e2e_test_runs").select("*").limit(5);
    // Either RLS returns empty array, or returns an explicit error. Both are acceptable.
    if (error) {
      expect(error.message.toLowerCase()).toMatch(/permission|denied|policy|rls/);
    } else {
      expect(data).toEqual([]);
    }
  }, 15000);

  it("denies INSERT to anonymous clients", async () => {
    const sb = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { error } = await sb.from("e2e_test_runs").insert({
      test_type: "voice", status: "passed", duration_ms: 1,
    } as any);
    expect(error).not.toBeNull();
  }, 15000);
});
