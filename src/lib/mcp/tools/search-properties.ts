import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_properties",
  title: "Search properties",
  description: "Search active RealTrust properties in Timișoara by text, listing type and maximum price.",
  inputSchema: {
    query: z.string().max(100).optional().describe("Text matched against name and location."),
    listing_type: z.string().max(40).optional().describe("Listing type, e.g. vanzare, inchiriere, cazare."),
    max_price: z.number().positive().optional().describe("Maximum price in EUR."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ query, listing_type, max_price, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    let q = supabaseForUser(ctx)
      .from("properties")
      .select("id, name, location, listing_type, price_per_night:base_price_per_night, rooms, size, slug")
      .eq("is_active", true)
      .limit(limit ?? 20);
    if (query) {
      const s = query.replace(/[%,()]/g, " ");
      q = q.or(`name.ilike.%${s}%,location.ilike.%${s}%`);
    }
    if (listing_type) q = q.eq("listing_type", listing_type);
    if (max_price) q = q.lte("base_price_per_night", max_price);
    const { data, error } = await q;
    if (error) throw new ToolError(error.message);
    const rows = (data ?? []).map((r: any) => ({
      id: String(r.id),
      name: String(r.name ?? ""),
      location: r.location ?? null,
      listing_type: r.listing_type ?? null,
      price: r.price_per_night ?? null,
      rooms: r.rooms ?? null,
      size: r.size ?? null,
      url: r.slug ? `https://realtrust.ro/proprietate/${r.slug}` : null,
    }));
    return { content: [{ type: "text", text: JSON.stringify(rows) }], structuredContent: { properties: rows } };
  },
});
