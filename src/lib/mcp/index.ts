import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchProperties from "./tools/search-properties";
import listOwnerOutreach from "./tools/list-owner-outreach";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "realtrust-apart-hotel",
  title: "RealTrust & ApArt Hotel",
  version: "0.1.0",
  instructions:
    "Tools for RealTrust & ApArt Hotel (Timișoara real estate and short-stay apartments). Search active properties; admins can also review private-owner outreach status.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchProperties, listOwnerOutreach],
});
