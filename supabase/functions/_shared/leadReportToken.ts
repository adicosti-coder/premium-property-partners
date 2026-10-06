// Per-lead capability token proving the caller is the visitor who just
// submitted that lead (returned once by submit-lead, never stored).
const enc = new TextEncoder();
async function hmacHex(msg: string): Promise<string> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
  return [...sig].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export const createLeadReportToken = (leadId: string) => hmacHex(`yield-report:${leadId}`);
export async function verifyLeadReportToken(leadId: string, token: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(leadId) || !/^[0-9a-f]{64}$/.test(token)) return false;
  const expected = await createLeadReportToken(leadId);
  let r = 0;
  for (let i = 0; i < 64; i++) r |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return r === 0;
}
