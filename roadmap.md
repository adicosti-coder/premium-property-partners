
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
