
## Șablon acord proprietari (7 oct 2026)
- [x] Text identic trimis la Meta: acord_publicare_proprietar_v1, MARKETING, PENDING
- [x] Activare automată la retrimitere numai după aprobare + 54 teste și deploy
- [ ] Aprobare externă Meta (șablon PENDING; fără trimiteri premature)

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

## RING Family Residence (27 sep 2026)
- [x] Denumire Booking sincronizată pe card, detalii, hartă și sursele SEO
- [x] Rating actualizat la 9,0 Superb din 4 evaluări
- [x] Chat mobil ridicat peste bara fixă de contact
- [x] Typecheck 0 erori

## WhatsApp prospect_intro_premium_v6 (30 sep 2026)
- [x] Șablon trimis la Meta cu zonă dinamică și 3 butoane; status APPROVED
- [x] Activare automată v6 cu fallback v5/v3
- [x] Limite live: 1 mesaj/oră, luni–sâmbătă 09:00–20:00
- [x] Maximum două reamintiri la 24h și 72h
- [x] Deduplicare 6h și oprire la interacțiune anterioară/STOP
- [x] Răspuns dedicat pentru butonul „Închiriere clasică”
- [x] Typecheck 0 erori și publicare solicitată

## Răspunsuri automate pe zonă + teste (4 oct 2026)
- [x] Răspunsuri pe zonă extinse la toate intențiile Andrei (butoane + text scris), zone fallback din prospect_listings, potrivire parțială, variabile {zona}/{camere}/{pret}; wa-andrei-webhook redeployat
- [x] Alerta urgentă de vizionare/colaborare trimisă și pe WhatsApp (număr admin), nu doar e-mail; wa-andrei-webhook redeployat
- [x] Scanare OLX pornită (job 1362f2a2): 6 interogări, 0 erori, 0 anunțuri noi — 10 duplicate, 5 blocate, 33 arhivate; anunțurile recente au titlu/zonă/camere/preț complete
- [x] Raport conversii în Admin: „Conversii prospectare" (trimise → livrate → citite → răspunsuri → interesați), pe zonă, în Rapoarte WhatsApp
- [ ] Test end-to-end: utilizatorul trimite mesaj de pe numărul de test → confirmare e-mail + WhatsApp urgent + răspuns Andrei (numai utilizatorul poate trimite de pe telefonul lui)

## Conversații Andrei — rafinare (4 oct 2026)
- [x] Răspunsuri pregătite mai scurte, empatice și cu un singur pas următor
- [x] Buton de apel direct lângă WhatsApp în jurnalul conversațiilor

## Vizionare clienți — pași conversaționali (4 oct 2026)
- [x] Colectare automată în ordine: zonă → camere → zi → oră
- [x] Separare strictă față de fluxul și alertele pentru proprietari
- [x] Teste de conversație și redeploy WhatsApp

## Răspunsuri clienți + zonă persistentă (4 oct 2026)
- [x] Răspunsuri scurte și empatice pentru vizionare, preț, chirie și venit hotelier
- [x] Zona cerută o singură dată și reutilizată în conversația clientului
- [x] Teste de regresie, verificare și redeploy WhatsApp

## Tabel acorduri WhatsApp (9 oct 2026)
- [x] Date proprietar, dată completă și sursă originală
- [x] Linkuri, stare site și publicare manuală existentă
- [x] Căutare, export CSV și verificare (4 teste + Admin autentificat, fără publicare reală)

## Corectitudine pagini automate (9 oct 2026)
- [ ] Cover fără watermark de portal în fluxul automat
- [ ] Separare camere/dormitoare la publicare
- [ ] Context geografic verificat în The Advisor
- [ ] Teste și activarea funcțiilor modificate
