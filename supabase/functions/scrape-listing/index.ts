import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";
import {
  scrapeWithScrapeDo,
  extractFromMarkdownWithAI,
  collectImages,
  buildExtracted,
  htmlToTextAndLinks,
} from "./extract.ts";
import { uploadImagesForProperty } from "./storage.ts";
import { cleanListingUrl, directFetchHtml, parseStructuredHtml } from "./directFetch.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/** Detect platform from URL */
function detectPlatform(url: string): string {
  if (url.includes('olx.ro')) return 'OLX';
  if (url.includes('imobiliare.ro')) return 'Imobiliare.ro';
  if (url.includes('storia.ro')) return 'Storia';
  if (url.includes('publi24.ro')) return 'Publi24';
  if (url.includes('anuntul.ro')) return 'Anuntul.ro';
  if (url.includes('booking.com')) return 'Booking.com';
  if (url.includes('airbnb.')) return 'Airbnb';
  return 'Altă sursă';
}

/** Build property data for insert */
function buildPropertyData(
  data: Record<string, any>,
  url: string,
  platform: string,
  listingType: string
): Record<string, any> {
  const slug = data.title
    ? data.title.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        .substring(0, 80)
    : `import-${Date.now()}`;

  return {
    name: data.title || 'Anunț Importat',
    location: data.location || 'Timișoara',
    description_ro: data.description_short || data.description_full || '',
    description_en: '',
    long_description_ro: data.description_full || '',
    long_description_en: '',
    features: data.features || [],
    booking_url: url,
    tag: listingType === 'vanzare' ? 'De Vânzare' : listingType === 'inchiriere' ? 'De Închiriat' : 'Disponibil',
    listing_type: listingType,
    slug,
    is_active: false,
    capacity: data.rooms ? Number(data.rooms) * 2 : 2,
    bedrooms: data.rooms ? Number(data.rooms) : 1,
    bathrooms: data.bathrooms ? Number(data.bathrooms) : 1,
    size: data.size ? Math.round(Number(data.size)) : 40,
    base_price_per_night: data.price ? Number(data.price) : null,
    capital_necesar: (listingType === 'vanzare' || listingType === 'investitie') ? (data.price ? Number(data.price) : null) : null,
    floor: data.floor || null,
    year_built: data.year_built ? Number(data.year_built) : null,
    parking: data.parking || null,
    heating_type: data.heating_type || null,
    energy_class: data.energy_class || null,
    furnished: data.furnished || null,
    construction_type: data.construction_type || null,
    compartimentare: data.compartimentare || null,
    source_url: url,
    source_platform: platform,
    // contact_name / contact_phone / contact_email are intentionally omitted —
    // those columns do not exist on public.properties (contact info lives on
    // prospect_listings / property owner records, not the published property).
    latitude: data.latitude ? Number(data.latitude) : null,
    longitude: data.longitude ? Number(data.longitude) : null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;

  try {
    const { url: rawUrl, listing_type, mode, editedData, wait_selector, geo_code, custom_wait } = await req.json();

    if (!rawUrl || typeof rawUrl !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const cleanUrl = cleanListingUrl(rawUrl);
    const url = cleanUrl;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const platform = detectPlatform(url);

    // ── MODE: SAVE with pre-edited data ──
    if (mode === 'save' && editedData) {
      console.log(`[Save] Saving edited listing from ${platform}: ${url}`);

      const finalListingType = listing_type || editedData.listing_type_hint || 'vanzare';
      const propertyData = buildPropertyData(editedData, url, platform, finalListingType);

      const { data: newProperty, error: insertError } = await supabase
        .from('properties')
        .insert(propertyData)
        .select('id, slug, name')
        .single();

      if (insertError) {
        console.error('[Save] Insert error:', insertError.message);
        return new Response(
          JSON.stringify({ success: false, error: `Failed to create: ${insertError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Upload ALL original images (draft + published)
      const publishedUrls = Array.isArray(editedData.images) ? editedData.images : [];
      const allOriginalUrls = Array.isArray(editedData.allOriginalImages) ? editedData.allOriginalImages : publishedUrls;
      console.log(`[Save] Uploading ${allOriginalUrls.length} total images (${publishedUrls.length} published, ${allOriginalUrls.length - publishedUrls.length} drafts)...`);
      const result = await uploadImagesForProperty(allOriginalUrls, publishedUrls, supabase, newProperty.id);

      console.log(`[Save] Done. Property: ${newProperty.name}, published: ${result.published.length}, drafts: ${result.drafts}`);
      return new Response(
        JSON.stringify({
          success: true,
          property: newProperty,
          extracted: editedData,
          images_uploaded: result.published.length,
          drafts_saved: result.drafts,
          listing_type: finalListingType,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── MODE: PREVIEW ──
    const logs: string[] = [];
    const pushLog = (m: string) => { const l = `[${new Date().toISOString()}] ${m}`; logs.push(l); console.log(l); };
    if (cleanUrl !== url) pushLog(`[Preview] URL curățat de parametri de urmărire: ${cleanUrl}`);

    // Step 1a: free direct fetch (server-rendered sites, agency sites, JSON-LD)
    let markdown = '';
    let pageLinks: string[] = [];
    let structured: Record<string, any> = {};
    let attempts = 0;
    const directHtml = await directFetchHtml(cleanUrl);
    if (directHtml) {
      const parsed = htmlToTextAndLinks(directHtml, cleanUrl);
      structured = parseStructuredHtml(directHtml);
      markdown = parsed.text;
      pageLinks = [...parsed.images, ...parsed.links];
      pushLog(`[Direct] Pagină citită direct: ${parsed.text.length} caractere, ${parsed.images.length} imagini, câmpuri structurate: ${Object.keys(structured).join(', ') || '—'}`);
    } else {
      pushLog('[Direct] Pagina nu se poate citi direct — folosesc Scrape.do');
    }

    // Step 1b: Scrape.do for JS-rendered / protected portals
    const directGood = markdown.length > 800 && (structured.title || structured.price);
    if (!directGood) {
      const scrapeDoKey = Deno.env.get('SCRAPE_DO_API_KEY');
      if (scrapeDoKey) {
        const scrapeOpts: Record<string, unknown> = {};
        if (typeof wait_selector === 'string' && wait_selector.trim()) scrapeOpts.waitSelector = wait_selector.trim();
        if (typeof geo_code === 'string' && geo_code.trim()) scrapeOpts.geoCode = geo_code.trim();
        if (typeof custom_wait === 'number' && Number.isFinite(custom_wait)) scrapeOpts.customWait = custom_wait;
        try {
          const r = await scrapeWithScrapeDo(cleanUrl, scrapeDoKey, scrapeOpts);
          logs.push(...r.logs);
          attempts = r.attempts;
          if (r.markdown.length > markdown.length) { markdown = r.markdown; pageLinks = [...pageLinks, ...r.pageLinks]; }
        } catch (e: any) {
          logs.push(...(Array.isArray(e?.logs) ? e.logs : []));
          if (!markdown) throw e;
          pushLog(`[Preview] Scrape.do a eșuat (${e?.message}) — continui cu datele citite direct`);
        }
      } else if (!markdown) {
        throw new Error('Pagina nu a putut fi citită și SCRAPE_DO_API_KEY lipsește');
      }
    }

    // Step 2: AI extraction on text, structured data wins where present
    let finalJsonData: Record<string, any> = {};
    if (markdown.length > 50) {
      pushLog('[Preview] Extracție AI din textul paginii');
      finalJsonData = await extractFromMarkdownWithAI(markdown, cleanUrl);
    } else {
      pushLog('[Preview] Pagina pare blocată sau goală.');
    }
    for (const [k, v] of Object.entries(structured)) {
      if (k === 'images') continue;
      if (v !== null && v !== undefined && v !== '') finalJsonData[k] = v;
    }
    if (Array.isArray(structured.images)) {
      finalJsonData.images = [...structured.images, ...(Array.isArray(finalJsonData.images) ? finalJsonData.images : [])];
    }

    // (Contacts come from the same AI pass above — a second identical call only doubled cost and time.)

    // Step 3: Collect images from all sources
    const imageUrls = collectImages(finalJsonData, pageLinks, markdown, url);
    pushLog(`[Preview] Total images collected: ${imageUrls.length}`);

    // Build result
    const extracted = buildExtracted(finalJsonData, imageUrls, url, platform);

    if (mode === 'preview') {
      return new Response(
        JSON.stringify({ success: true, extracted, logs, attempts }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Legacy save mode (without editedData)
    const finalListingType = listing_type || extracted.listing_type_hint || 'vanzare';
    const propertyData = buildPropertyData(extracted, url, platform, finalListingType);

    const { data: newProperty, error: insertError } = await supabase
      .from('properties')
      .insert(propertyData)
      .select('id, slug, name')
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to create: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await uploadImagesForProperty(imageUrls, imageUrls, supabase, newProperty.id);

    return new Response(
      JSON.stringify({
        success: true,
        property: newProperty,
        extracted,
        images_uploaded: result.published.length,
        drafts_saved: result.drafts,
        listing_type: finalListingType,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Error] Scrape listing error:', error);
    const firecrawlStatus = error?.firecrawl_status ?? null;
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        firecrawl_status: firecrawlStatus,
        logs: [
          ...(Array.isArray(error?.logs) ? error.logs : []),
          `[${new Date().toISOString()}] ${error.name || 'Error'}: ${error.message}`,
          firecrawlStatus ? `Scrape.do HTTP status: ${firecrawlStatus}` : null,
          typeof error?.attempts === 'number' ? `Attempts: ${error.attempts}` : null,
          error?.stack ? `Stack: ${String(error.stack).split('\n').slice(0, 5).join(' | ')}` : null,
        ].filter(Boolean),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
