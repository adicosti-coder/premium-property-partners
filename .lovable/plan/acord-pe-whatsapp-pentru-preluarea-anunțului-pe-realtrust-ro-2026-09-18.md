# Acord pe WhatsApp pentru preluarea anunțului pe realtrust.ro

## Ce rezolvăm

Azi anunțurile proprietarilor ajung pe site doar prin decizie internă. Vrem ca proprietarul să dea el acordul, direct în conversația de WhatsApp, iar anunțul să fie preluat pe realtrust.ro doar după acest acord — cu dovada acordului păstrată.

## Cum va funcționa

1. În conversația de WhatsApp, proprietarului i se trimite o întrebare clară: „Doriți să publicăm apartamentul dumneavoastră pe realtrust.ro, gratuit? Răspundeți cu DA PUBLIC pentru acord.” Se trimite din Admin, cu un buton pe fiecare anunț de proprietar.
2. Când proprietarul răspunde „DA PUBLIC” (sau „accept publicarea”, „da, publicați”, „acord”), sistemul:
   - înregistrează acordul (numărul, textul exact al mesajului, data, anunțul la care se referă);
   - confirmă imediat pe WhatsApp: „Am înregistrat acordul. Anunțul apare pe realtrust.ro în scurt timp. Puteți retrage acordul oricând scriind RETRAG.”
   - pornește preluarea anunțului pe site prin fluxul existent de publicare (curățare text, imagini, verificare de calitate).
3. Dacă proprietarul scrie „RETRAG” / „nu mai public” / „ștergeți anunțul”, acordul se anulează și anunțul se retrage imediat de pe site.
4. Anunțurile fără acord înregistrat nu se mai pot publica automat pe site; rămân doar ca prospect intern.
5. În Admin apare o rubrică „Acorduri de publicare”: telefon, anunț, data acordului, textul mesajului, starea publicării (în lucru / publicat / retras) și linkul paginii de pe site.

## Detalii tehnice

- Tabel nou `wa_publish_consents` (`phone_normalized`, `prospect_listing_id`, `consent_text`, `consented_at`, `revoked_at`, `property_id`, `status`, `source`) cu RLS admin-only + GRANT pentru `authenticated`/`service_role`.
- `supabase/functions/_shared/waAutoReply.ts`: detectare `PUBLISH_CONSENT` și `PUBLISH_REVOKE` (cu diacritice/variante), înaintea regulilor de refuz, ca „da, publicați, mulțumesc” să nu fie citit ca refuz.
- `supabase/functions/wa-andrei-webhook/index.ts`: la mesaj de acord → inserează consimțământul (idempotent pe telefon+anunț), setează `lifecycle_status` potrivit, trimite confirmarea și invocă `auto-publish-listing-worker` cu `prospect_id`; la revocare → `revoked_at`, dezactivează proprietatea publicată (`is_active=false`) și confirmă.
- Funcție nouă `wa-request-publish-consent`: trimite din Admin cererea de acord (prin coada outbound existentă), marchează cererea pe anunț.
- `auto-publish-listing-worker` / `auto-publish-listings`: verificare obligatorie de acord valid înainte de publicare; la publicare salvează `property_id` pe consimțământ.
- UI: componentă nouă `src/components/admin/WaPublishConsents.tsx`, montată lângă panourile de anunțuri existente, cu butonul „Cere acordul pe WhatsApp” pe fiecare prospect.

## Ce nu se schimbă

Fără modificări pe paginile publice în afara apariției normale a anunțurilor publicate, fără numere noi de telefon expuse public, fără schimbări de design.
