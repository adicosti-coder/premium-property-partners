-- Pagini de căutare, categorii, agregatoare și articole salvate greșit ca anunțuri.
-- Oglindă SQL a isSearchPageUrl din src/lib/listingUrl.ts (verificată pe toate rândurile: același set de anunțuri).
CREATE OR REPLACE FUNCTION public.is_generic_search_listing(p_url text, p_title text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN v.u = '' THEN false
    WHEN v.u ~ '/d/oferta/|/oferta/|/anunt/|facebook\.com/marketplace/item/\d+|facebook\.com/groups/[^/]+/(posts|permalink)/\d+|/rooms/\d+' THEN false
    WHEN regexp_replace(coalesce(substring(v.u from '^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?([^/?#:]+)'), ''), '^www\.', '') ~ '(^|\.)(hartapreturilor\.ro|calculatorfiscal\.ro|bing\.com|google\.[a-z.]+)$' THEN true
    WHEN v.u ~ 'storia\.ro/(ro/)?rezultate/|olx\.ro/(imobiliare|locuri-de-munca)/|imobiliare\.ro/(vanzare|inchiriere|inchirieri)-[a-z-]+/(judetul-|timisoara)|imoradar24\.ro/[a-z-]+-de-(vanzare|inchiriat)/|laproprietar\.ro/imobiliare(/|$)|renthero\.ro/inchirieri(/|$)|facebook\.com/marketplace/(?!item/)|publi24\.ro/(?!.*/anunt/)|okazii\.ro/cautare(/|$)|imobiliare\.ro/(tip|imoexpert|ansamblu-rezidential)/|storia\.ro/(ro/)?(companii|imobiliare|ansamblu)/|lajumate\.ro/anunturi/[^?]*/in/|timisoreni\.ro/(info|harta)/|/(blog|stiri|articole?)/|/(cautare|search|rezultate)(/|$)|/page/\d+/?$|[?&](q|query|search|keyword|keywords|page|pag)=|/q-[^/]+/?$' THEN true
    WHEN v.u ~ '[-_]\d{4,}(\.html?|\.php)?/?(\?|$)' THEN false
    ELSE v.t <> '' AND v.t ~ '\y(apartamente|garsoniere|garsoneire|case|vile|penthouses?|terenuri|proprietati|locuinte|imobile)( noi)?( cu \d+ camere)? (de|la) (vanzare|inchiriat|inchiriere)\y|^\d[0-9.,]*\+? (anunturi|oferte|apartamente|garsoniere|garsoneire|case|vile|terenuri|proprietati|locuinte)\y|\yanunturi (imobiliare|gratuite)\y|\ynew and used .* for sale\y|\yproperty for sale in\y|\ymarketplace - buy and sell\y|\yevolutie(a)? preturi(lor)?\y|\yevolutia preturilor\y|\yindice(le)? imobiliar\y|\ypiata imobiliara\y|\ycalculator (roi|randament)\y|^top \d+ |descopera ofertele|apartamente de vanzare in zona|cele mai bune oferte|vezi anunturile'
  END
  FROM (SELECT lower(regexp_replace(coalesce(p_url, ''), '^\s+|\s+$', '', 'g')) AS u,
               btrim(regexp_replace(translate(lower(coalesce(p_title, '')), 'ăâîșşțţáàäãåéèëêíìïóòöôõúùüûçñýÿőűčďěňřšťžľĺŕśźżąęćń', 'aaissttaaaaaeeeeiiiooooouuuucnyyoucdenrstzllrszzaecn'), '\s+', ' ', 'g')) AS t) v
$function$;

COMMENT ON FUNCTION public.is_generic_search_listing(text, text) IS
  'Mirror of isSearchPageUrl (src/lib/listingUrl.ts): true for search/category/aggregator/article pages saved as listings.';

-- Rândurile existente: inactive și renunțate cu motivul generic_search; starea anterioară rămâne pentru „Readu în listă”.
UPDATE public.prospect_listings p SET
  dismissed_at = now(),
  dismissed_reason = 'generic_search',
  dismissed_prev = jsonb_build_object(
    'is_active', p.is_active, 'lifecycle_status', p.lifecycle_status,
    'outreach_status', p.outreach_status, 'outreach_scheduled_at', p.outreach_scheduled_at,
    'outreach_error', p.outreach_error,
    'wa_queue_ids', '[]'::jsonb, 'owner_outreach', '[]'::jsonb, 'ghost_ids', '[]'::jsonb),
  is_active = false
WHERE p.dismissed_at IS NULL
  AND public.is_generic_search_listing(p.source_url, p.title);