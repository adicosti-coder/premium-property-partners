import { describe, it, expect } from "vitest";
import { publicationState, makePublicationResult } from "../../supabase/functions/_shared/socialPublicationState";

describe("social publication confirmation", () => {
  it("returns a rejected scheduled post to drafts and saves the error", () => {
    expect(publicationState([], [{ platform: "instagram", ok: false, error: "Unsupported aspect ratio (36003)" }])).toEqual({ status: "draft", posted_to: [], scheduled_at: null, last_error: "instagram: Unsupported aspect ratio (36003)" });
  });
  it("requires a real external ID before marking published", () => {
    expect(publicationState([], [{ platform: "facebook", ok: true }]).status).toBe("draft");
    expect(publicationState([], [{ platform: "facebook", ok: true, id: "fb_123" }]).status).toBe("posted");
  });
  it("preserves partial publication and reports the rejected platform", () => {
    const result = publicationState([], [{ platform: "facebook", ok: true, id: "fb_123" }, { platform: "instagram", ok: false, error: "Rejected" }]);
    expect(result.posted_to).toEqual(["facebook"]);
    expect(result.status).toBe("posted");
    expect(result.last_error).toBe("instagram: Rejected");
  });
  it("never discards earlier confirmed publications on retry failure", () => {
    expect(publicationState(["facebook"], [{ platform: "instagram", ok: false, error: "Rejected" }]).posted_to).toEqual(["facebook"]);
  });
  it("does not count Make acceptance as publication", () => {
    expect(makePublicationResult("instagram", "Accepted").ok).toBe(false);
    expect(makePublicationResult("instagram", '{"success":true}').ok).toBe(false);
    expect(makePublicationResult("instagram", '{"error":"Meta rejected"}').error).toBe("Meta rejected");
    expect(makePublicationResult("instagram", '{"success":true,"external_id":"ig_123"}').ok).toBe(true);
  });
});