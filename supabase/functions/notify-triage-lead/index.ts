import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const webhookUrl = Deno.env.get('MAKE_TRIAGE_WEBHOOK_URL');
    if (!webhookUrl) {
      return new Response(JSON.stringify({ error: 'MAKE_TRIAGE_WEBHOOK_URL not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    // Accept either a direct lead object or a DB-webhook style { record, old_record }
    const lead = body.record ?? body.lead ?? body;
    const oldRec = body.old_record ?? null;

    if (!lead?.id) {
      return new Response(JSON.stringify({ error: 'missing lead.id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Idempotency guard: only fire when transitioning INTO pending_review
    if (oldRec && oldRec.lifecycle_status === 'pending_review' && lead.lifecycle_status === 'pending_review') {
      return new Response(JSON.stringify({ skipped: 'already pending_review' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = {
      id: lead.id,
      zone: lead.zone ?? lead.location ?? 'necunoscut',
      price: lead.price ?? null,
      currency: lead.currency ?? 'EUR',
      url: lead.source_url ?? null,
      title: lead.title ?? null,
      rooms: lead.rooms ?? null,
      size: lead.size ?? null,
      source_platform: lead.source_platform ?? null,
      contact_phone: lead.contact_phone ?? null,
      lifecycle_status: lead.lifecycle_status ?? null,
      prospect_type: lead.prospect_type ?? null,
      admin_url: `https://realtrust.ro/admin?tab=voice-agent&triage=${lead.id}`,
      subject: '⚠️ Nou lead în Carantină - RealTrust Admin',
      message: `Un nou anunț din zona ${lead.zone ?? lead.location ?? 'necunoscută'} la prețul de ${lead.price ?? '?'} ${lead.currency ?? 'EUR'} a fost plasat în coada de triaj (carantină) pentru că nu are un semnal explicit de proprietar. Intră în dashboard pentru a-l aproba sau arhiva.`,
      triggered_at: new Date().toISOString(),
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    return new Response(JSON.stringify({ ok: res.ok, status: res.status, response: text.slice(0, 500) }), {
      status: res.ok ? 200 : 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
