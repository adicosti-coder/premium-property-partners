import { beforeEach, describe, expect, it, vi } from "vitest";
import { candidateOf, fetchOwnerContactReady, fetchOwnerReminders, fetchOwnerReview } from "./ownerFlowData";
import { ownerVerification } from "./ownerListingRules";

const tables = vi.hoisted(() => ({ values: {} as Record<string, unknown[]> }));
vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: (table: string) => {
      const result = { data: tables.values[table] ?? [], error: null };
      const builder: Record<string, unknown> = { then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve) };
      for (const method of ["select", "eq", "or", "order", "range", "in", "is", "not", "lt", "limit"]) builder[method] = () => builder;
      return builder;
    },
  },
}));

const listing = {
  id: "one", title: "Vând apartament 2 camere", description: "Apartament 2 camere", source_url: "https://www.olx.ro/d/oferta/apartament-IDabc123.html",
  prospect_type: "proprietar", is_active: true, lifecycle_status: "new", do_not_call: false,
  ai_score_breakdown: {}, phone_normalized: "+40722123456", contact_phone: null, lead_score: 80,
};

beforeEach(() => { tables.values = { prospect_listings: [listing], owner_outreach_messages: [], wa_conversations: [] }; });

describe("Owner Flow eligibility", () => {
  it("does not treat an old owner label as proof", async () => {
    expect(ownerVerification(candidateOf(listing))).toBe("review");
    expect(await fetchOwnerReview()).toHaveLength(1);
    expect(await fetchOwnerContactReady()).toHaveLength(0);
  });
  it("recognizes the saved manual confirmation", async () => {
    tables.values.prospect_listings = [{ ...listing, ai_score_breakdown: { explicit_owner_signal: true } }];
    expect(await fetchOwnerReview()).toHaveLength(0);
    expect(await fetchOwnerContactReady()).toHaveLength(1);
  });
  it("blocks prior conversations even when phone formatting differs", async () => {
    tables.values.prospect_listings = [{ ...listing, ai_score_breakdown: { explicit_owner_signal: true } }];
    tables.values.wa_conversations = [{ phone_normalized: "0722123456", last_inbound_at: "2026-10-01", last_outbound_at: null }];
    expect(await fetchOwnerContactReady()).toHaveLength(0);
  });
  it("removes reminders after a refusal or inbound response", async () => {
    tables.values.prospect_listings = [{ ...listing, ai_score_breakdown: { explicit_owner_signal: true }, do_not_call: true }];
    tables.values.owner_outreach_messages = [{ id: "reminder", prospect_listing_id: "one", phone_normalized: "+40722123456", next_reminder_at: "2026-01-01", reminder_stage: 0 }];
    expect((await fetchOwnerReminders()).due).toHaveLength(0);
    tables.values.prospect_listings = [{ ...listing, ai_score_breakdown: { explicit_owner_signal: true } }];
    tables.values.wa_conversations = [{ phone_normalized: "40722123456", last_inbound_at: "2026-10-01" }];
    expect((await fetchOwnerReminders()).due).toHaveLength(0);
  });
});