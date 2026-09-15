// admin-create-team-user — creează conturi pentru colegii RealTrust (e-mail + parolă)
// și le acordă rolul de administrator, ca să poată intra în Admin și vedea discuțiile.
//
// Acces: doar administratori autentificați (JWT cu rol 'admin') sau apel intern.
// Acțiuni: list | create | revoke
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Body = {
  action?: "list" | "create" | "revoke";
  email?: string;
  password?: string;
  name?: string;
  user_id?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;

  let body: Body = {};
  try { body = await req.json(); } catch { /* default */ }
  const action = body.action ?? "list";

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── Lista colegilor cu acces la Admin ───────────────────────────────────────
  if (action === "list") {
    const { data: roles, error: rolesErr } = await admin
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "super_admin"]);
    if (rolesErr) return json({ error: rolesErr.message }, 500);

    const ids = [...new Set((roles ?? []).map((r) => r.user_id as string))];
    const members: Array<Record<string, unknown>> = [];
    for (const id of ids) {
      const { data } = await admin.auth.admin.getUserById(id);
      const u = data?.user;
      const userRoles = (roles ?? []).filter((r) => r.user_id === id).map((r) => r.role);
      members.push({
        user_id: id,
        email: u?.email ?? null,
        name: (u?.user_metadata as Record<string, unknown> | undefined)?.full_name ?? null,
        created_at: u?.created_at ?? null,
        last_sign_in_at: u?.last_sign_in_at ?? null,
        roles: userRoles,
      });
    }
    members.sort((a, b) => String(a.email ?? "").localeCompare(String(b.email ?? "")));
    return json({ ok: true, members });
  }

  // ── Cont nou pentru un coleg ────────────────────────────────────────────────
  if (action === "create") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const name = String(body.name ?? "").trim();

    if (!EMAIL_RE.test(email)) return json({ error: "E-mail invalid." }, 400);
    if (password.length < 10) {
      return json({ error: "Parola trebuie să aibă cel puțin 10 caractere." }, 400);
    }

    // Cont existent → doar acordăm rolul, fără să schimbăm parola.
    const { data: existingList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = (existingList?.users ?? []).find(
      (u) => String(u.email ?? "").toLowerCase() === email,
    );

    let userId = existing?.id ?? null;
    let created = false;

    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: name ? { full_name: name } : {},
      });
      if (error || !data?.user) {
        return json({ error: error?.message ?? "Contul nu a putut fi creat." }, 400);
      }
      userId = data.user.id;
      created = true;
    }

    const { error: roleErr } = await admin
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    if (roleErr) return json({ error: roleErr.message }, 500);

    try {
      await admin.from("admin_audit_log").insert({
        admin_user_id: auth.userId,
        action: created ? "team_member_created" : "team_member_role_granted",
        table_name: "user_roles",
        record_id: userId,
        new_values: { email, name: name || null, role: "admin" },
      });
    } catch { /* audit best-effort */ }

    return json({ ok: true, created, user_id: userId, email });
  }

  // ── Retragerea accesului ────────────────────────────────────────────────────
  if (action === "revoke") {
    const userId = String(body.user_id ?? "").trim();
    if (!userId) return json({ error: "user_id lipsă." }, 400);
    if (userId === auth.userId) {
      return json({ error: "Nu îți poți retrage propriul acces." }, 400);
    }

    const { error } = await admin
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "admin");
    if (error) return json({ error: error.message }, 500);

    try {
      await admin.from("admin_audit_log").insert({
        admin_user_id: auth.userId,
        action: "team_member_revoked",
        table_name: "user_roles",
        record_id: userId,
      });
    } catch { /* audit best-effort */ }

    return json({ ok: true, revoked: userId });
  }

  return json({ error: "Acțiune necunoscută." }, 400);
});
