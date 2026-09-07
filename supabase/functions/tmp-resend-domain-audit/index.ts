// TEMPORARY diagnostic: lists which sender domains are verified in Resend.
// Requires the internal TMP_AUDIT_SECRET header so it is not publicly usable.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const secret = Deno.env.get('TMP_AUDIT_SECRET')
  if (!secret || req.headers.get('x-internal-secret') !== secret) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const key = Deno.env.get('RESEND_API_KEY')
  const res = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${key}` },
  })
  const body = await res.text()
  return new Response(
    JSON.stringify({ status: res.status, body, resend_from_set: Boolean(Deno.env.get('RESEND_FROM')) }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
