// ... (păstrează restul codului de Auth și validare de mai sus)

  // --- Pregătirea datelor pentru tabel ---
  const rows = leads.map((l: Record<string, any>) => ({
    title: String(l.title ?? ""),
    original_price: Number(l.original_price ?? 0),
    // Calculăm extra_profit_3y dacă lipsește, bazat pe monthly_extra
    extra_profit_3y: Number(l.extra_profit_3y ?? (Number(l.monthly_extra ?? 0) * 36)),
    monthly_extra: Number(l.monthly_extra ?? 0),
    lead_score: Number(l.lead_score ?? 0),
    whatsapp_message: l.whatsapp_message ? String(l.whatsapp_message) : null,
    url: String(l.url ?? ""),
    status: String(l.status ?? "new"),
    listing_type: String(l.listing_type ?? "vanzare"),
    // Aici preluăm sursa (OLX, Storia, Publi24) trimisă de hostscan_scraper_v2.py
    source: l.source ? String(l.source) : "OLX",
    // Adăugăm timestamp-ul de ingestie
    created_at: new Date().toISOString(),
  }));

  // --- Upsert folosind service_role ---
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase
    .from("scraper_leads")
    .upsert(rows, { 
      onConflict: "url", 
      ignoreDuplicates: false // Permite actualizarea datelor dacă URL-ul există deja
    })
    .select("id, title, source, url");

  if (error) {
    console.error("Supabase Upsert Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      count: data?.length ?? 0,
      message: `Ingestie reușită pentru ${data?.length ?? 0} lead-uri.` 
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
