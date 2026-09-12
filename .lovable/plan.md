# Repararea preluării anunțurilor de la scraper

## Problema confirmată

Funcția care primește anunțuri noi de la scraper scrie într-un tabel care nu mai există în baza de date (`scraper_leads`). Orice trimitere eșuează cu eroare de server, deci anunțurile noi nu ajung niciodată în lista de prospecți. Tabelele existente sunt `prospect_listings` (fluxul curent), `leads` și arhiva `scraper_leads_archive_2026` (778 rânduri istorice).

## Ce propun

1. Compararea câmpurilor pe care le trimite scraperul cu coloanele din `prospect_listings` (tabelul folosit azi de restul fluxului: scorare, apeluri, WhatsApp).
2. Rescrierea scrierii finale din funcție ca să insereze/actualizeze în `prospect_listings`, cu deduplicare pe adresa anunțului.
3. Mutarea și a scrierilor intermediare (verificare telefon Twilio, marcaje DNC) pe același tabel, cu tratare de erori ca un eșec parțial să nu mai oprească tot lotul.
4. Test cu un lot mic prin apel autentificat și verificarea că anunțurile apar în Admin.

## Ce nu se schimbă

Fără modificări de schemă, fără atingerea arhivei istorice, fără schimbări de design sau în paginile publice.

## Detalii tehnice

- `supabase/functions/ingest-scraper-leads/index.ts`: `supabase.from("scraper_leads")` la liniile ~126 și ~342 → `prospect_listings`, `onConflict` pe coloana de URL existentă în acel tabel; maparea statusurilor (`phone_invalid`, `dnc_blocked`) la valorile permise de enum-ul `lead_lifecycle_status`.
- Secretul `SCRAPER_INGEST_SECRET` există, deci autentificarea nu e cauza erorilor 500.
