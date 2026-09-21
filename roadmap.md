
## Corecție portofoliu cazare (5 sep 2026)
- [x] Recalculat numărul real de unități de cazare: 14 (13 cu link Pynbooking direct, MARA pe Booking.com)
- [x] Sincronizat DB `properties` (cazare) 1:1 cu sursa de adevăr `src/data/properties.ts`
- [x] Curățate booking_url invalide ("-", "#") ca să nu apară în JSON-LD
- [x] Typecheck (0 erori) + publicare + sitemap trimis in GSC

## Keyword Radar — durată & progres live (18 sep 2026)
- [x] Buget de timp per cuvânt-cheie + timeout per sursă (fără blocaje)
- [x] Progres în timp real în raportul radarului (Admin → Import Anunț → Keyword Radar)
- [x] Publicare: căutarea „anunțuri de la proprietari" (pe live încă apare varianta veche, „Nimic găsit")

## Anunțuri proprietari (sept 2026)
- [x] Prețuri exacte din paginile reale ale platformelor (fetch-listing-prices)
- [x] Tab Admin „Anunțuri publicate extern" (link, preț, durată sursă, durata rămasă)
- [x] refresh-published-prices la 24h + afișare ultimă reverificare în Anunțuri salvate
- [x] Buton „Expirat" pentru marcarea manuală a anunțurilor expirate
- [x] Căutare manuală reparată: oraș obligatoriu, rezultate noi + cunoscute și linkuri normalizate
- [x] Căutare live extinsă: toate zonele implicit, 15 rezultate/portal și citirea titlului/descrierii din pagina anunțului
- [x] Reparare P0 descoperire live: parsere portal actualizate, acoperire echitabilă și verificare cu rezultate reale

## Reparare completă căutare proprietari (20 sep 2026)
- [x] Eliminare agenții, anunțuri expirate și pagini generice înainte de afișare
- [x] Aliniere filtre, interogări live și numărători pe rezultate reale
- [x] Îmbunătățire discovery/parsing pentru anunțuri rezidențiale Timișoara
- [ ] Teste de regresie și verificare autentificată în Admin

## Audit portaluri căutare proprietari (21 sep 2026)
- [x] Verificat răspunsul real și formatul linkurilor pentru fiecare portal selectabil
- [x] Reparat accesul cu fallback pentru Storia, imobiliare.ro și Publi24
- [x] Reparat URL-urile și parserele Homezz.ro și Anuntul.ro
- [x] Eliminat din selector sursele moarte/parcate sau neverificabile (Tocmai, Facebook, Anunturi-Imobiliare, Bursa)
- [x] Redeploy și căutare autentificată pe fiecare portal rămas

## Mesaje către proprietari + anunțuri OLX (21 sep 2026)
- [x] Formular „Mesaj către proprietar" (preț propus, durată, text) cu salvare + istoric
- [x] Data publicării anunțurilor (`published_at`) salvată și completată la reverificare
- [x] Lista „Anunțuri găsite": filtre stare/vechime, coloane Stare și Publicat
- [x] Fotografii OLX salvate din feed (8-12 poze/anunț) — verificat pe pagina de detalii
- [ ] Telefonul proprietarilor OLX: nu este public în feed, se vede doar în anunțul original
