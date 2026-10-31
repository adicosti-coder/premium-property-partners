# Roadmap — optimizări sistem analiză și administrare

## Remedieri critice Admin — 31 octombrie, 21:52 UTC
- [ ] Extragere Social Engine exclusiv din proprietăți active și articole publicate, fără Firecrawl
- [ ] Generator și galerie AI pentru toate tipurile de postări, păstrând imaginile ilustrative distincte de fotografiile reale
- [ ] Formular Admin creare/editare oferte și decizie securizată în portalul proprietarului
- [ ] Diagnosticare programări/carusele/Stories și raport SEO; Make rămâne verificabil numai cu acces la scenariu
- [ ] Teste, verificare autentificată și activarea funcțiilor modificate

## Audit lucrări nefinalizate — 31 octombrie, 21:44 UTC
- [x] Confruntate sarcinile deschise cu implementarea, testele și interfața publicată; audit fără modificări de produs, mesaje externe sau publicare
- [x] Butonul AI verificat autentificat pe mobil în preview și realtrust.ro: vizibil în ciorna blog Story, absent la proprietăți din cauza condiției `post.type === "blog" && !post.property_id`; păstrarea fotografiilor reale la proprietăți rămâne obligatorie
- [x] Jurnalul AI confirmă trei generări reușite la 21:38 UTC; nu confirmă upload/salvare integrală. Captura de extracție Firecrawl corespunde dependenței exclusive din scrape-realtrust; citirea actuală indică 1079/1500 credite, cu exhausted_at vechi (nu dovedește epuizare actuală)
- [x] Site public: CTA nou și tab Social Growth confirmate; 0 ciorne blog, 2 mementouri sent; baza sănătoasă (48% memorie, 11% disc, 23/90 conexiuni, fără alerte recente)
- [x] 27 teste selectate trecute: calculator Lead unic, galerie, imagini articole, Social Growth și prag minim proprietar; build curent OK
- [x] Restanțele comunicate în chat; următoarele sunt inventar, nu remedieri efectuate
- [ ] Extragere Social Engine: înlocuirea dependenței primare Firecrawl cu datele publicate ale site-ului; necesită implementare separată
- [ ] Oferte proprietari: formular Admin de creare/gestionare property_sale_offers absent; panourile WhatsApp nu sunt acest flux
- [ ] Postări automate: diagnosticare lipsă cron_job/cron_story în ultimele 48h; programări active și ultime statusuri success nu dovedesc publicare externă
- [ ] Raport SEO săptămânal: diagnosticare email_dispatch_failed (3 eșecuri consecutive, ultima rulare 26 octombrie)
- [ ] Verificări finale fără dovadă curentă: save/publish anunț cu listing_type/minimum_price și imagini mari, Reel din 3–5 poze, Lead Meta după salvare reală, WhatsApp widget/P.S., DA→publicare→RETRAG; trimiterile/apelurile externe necesită acord specific
- [ ] Stories multiple și Sticker Link: blocaj extern, nu există conexiune Make accesibilă în conexiunile disponibile

## Calculator — Lead unic
- [x] Eliminat evenimentul Lead duplicat; păstrat Lead_Submit cu același ID pentru Pixel/CAPI, consimțământul și notificările existente
- [x] 26 teste trecute; formular verificat în pagină cu trimiteri simulate: un Lead la acceptare, zero la refuz și o notificare în ambele cazuri; fără mesaje reale
- [ ] Publicarea corectării și verificarea primirii reale în Meta — necesită publicare aprobată; istoricul conversiilor nu este recalculat

## Social Growth — 31 octombrie
- [x] Review reclame Meta 24–31 octombrie: cont/reclame active, 352,32 RON și 13 Lead atribuite; dublarea Lead a calculatorului confirmată în codul publicat; 8 cereri calculator salvate, fără echivalare cu leaduri Meta; recomandare corectare tracking, fără modificări campaniei/bugetului
- [x] Mesaj personal pentru cinci clienți mulțumiți pregătit în chat, personalizabil cu prenumele; fără trimitere
- [x] Invitație Follow după simulare și în articole; preview numai postări publicate în footer și confirmarea widgetului
- [x] PS social în confirmări/follow-up WhatsApp existente, fără mesaje suplimentare; șabloane aprobate și STOP excluse, funcții activate, fără trimitere reală de test
- [x] Social Growth & Campaign Links în Social Engine: creare/recitire autentificată, redirect allowlist cu UTM, linkul de test șters
- [x] 15 teste și build OK; simulare, Admin și preview public (3 postări) verificate; fără publicare sau mesaje externe
- [x] Interfața Social Growth verificată pe realtrust.ro la 31 octombrie 21:48 UTC; confirmarea widgetului cu cerere reală și WhatsApp P.S. real rămân în verificările restante ale auditului

## Corectare constatări SEO — 31 octombrie
- [x] Scanare nouă: nouă verificări de bază trecute; 13 pagini publice cu metadate și previzualizări distincte, canonice proprii și imagini absolute
- [x] Titlu proprietari scurtat și descriere 157 caractere sincronizată cu prerandarea; eliminată promisiunea de randament garantat din metadatele prerandate ale investițiilor; trei teste SEO și verificare în pagină trecute, build OK
- [ ] Publicarea schimbărilor — necesită publicare aprobată de utilizator

## Generator imagini din articole în Social Engine
- [x] Galerie AI minimum trei imagini, selecție/regenerare/adăugare și salvare image_urls; carusel Feed și cadre Story complete în payload Make
- [x] 14 teste trecute; trei generări reale 4:5, selecție minimum trei, salvare și redeschidere autentificate; ciorna de probă și imaginile șterse, fără publicare socială
- [ ] Publicarea poveștii multiple în Make — necesită iterarea story_frames în scenariul Make, la care nu există acces; transmiterea reală pe Facebook/Instagram nu a fost testată
- [x] Generare AI din titlu și descriere în editor și postare nouă; Feed 1:1/4:5, Story 9:16; salvare explicită
- [x] 10 teste trecute; generare Story reală 1080×1920, salvare, redeschidere și editare verificate autentificat; ciorna de probă și imaginea șterse, fără publicare socială
- [x] Modul de selecție articol și generare din titlu plus conținut, cu imagine salvată în ciorna socială
- [x] 24 teste trecute; generare reală 1024×1024 pentru articolul fiscalitate, salvare și recitire autentificată confirmate, fără publicare socială

## Stories Social Engine
- [x] Generare Feed/Reels/Stories cu descrieri separate, Reel din 3–5 poze (lipsa pozelor/MP4 semnalată) și text suprapus pe Story
- [x] Trimitere doar a variantei selectate cu media_type, video_url, story_link_url și caption
- [x] Opțiune Story, fotografie/video 1080×1920 și link opțional precompletat
- [x] Generare AI și payload Story verificate pe ciornă reală, JPEG 1080×1920 și text suprapus inspectate; 22 teste trecute, fără publicare
- [ ] Verificare completă selecție/salvare în editor — blocată de codul e-mail Admin; Reel real din 3–5 fotografii rămâne neverificat (ciorna disponibilă are o singură imagine)
- [ ] Router și Sticker Link în scenariul Make.com — necesită configurarea scenariului de către utilizator; nu s-a trimis webhook real

## Audit conversații WhatsApp
- [x] 10 conversații inspectate; corectate prioritatea refuzului, istoricul AI, comisioanele pe tranzacție și protecția trimiterilor paralele
- [x] Calitate WhatsApp în Centrul Auto-îmbunătățire: 5 propuneri reale salvate, dovezi cu acces direct, reguli separate de voce și anulare condiționată
- [x] 79 teste trecute; audit și acces la conversații verificate autentificat, fără erori; selecția persistă după reîncărcare
- [x] Funcțiile activate; fără trimitere reală și fără aprobarea regulilor în verificare; șablonul Meta aprobat păstrat, cererea directă nouă fără promisiuni neconfirmate

## Refacere Flux proprietari
- [x] Contoare din aceleași liste, pas păstrat în adresă și pagină simplificată
- [x] Verificare proprietar salvată, contactare fără duplicate, șabloane și mementouri după tranzacție; SMS inactiv eliminat
- [x] 22 teste și patru pași verificați autentificat, inclusiv pregătire/anulare memento real, fără mesaje sau apeluri; contactarea era goală, deci trimiterea nu a fost testată
- [x] Scăderi de preț: eliminate pagini de căutare și salturi suspecte din afișare, fără modificarea datelor originale

## Imagini Social Engine
- [x] Extragere fotografie principală originală, respingere fallback generic
- [x] Asociere automată cu imagini editoriale existente pentru taxe, finanțe și acces digital; fără AI/Unsplash recurent
- [x] Format Instagram 1:1/4:5 înainte de webhook; 17 teste și dry-run autentificat pe ciornă reală, JPEG 1080×1080, fără publicare
- [x] Butonul AI din dialog verificat autentificat pe realtrust.ro în ciorna blog Story; la postările de proprietăți este ascuns intenționat de condiția actuală

## Descrieri Social Engine pe platforme
- [x] Instagram fără URL, cu CTA de profil, titlu cu emoji, paragrafe și hashtag-uri finale
- [x] Facebook cu link păstrat; regulă comună la generare, copiere și trimitere
- [x] Șapte teste, funcții activate și generare reală verificată după reîncărcare în previzualizarea Instagram/Facebook; fără publicare pe rețele

## Descrieri toate cele 51 de anunțuri
- [x] Toate cele 51 de anunțuri: descrieri scurte și structurate salvate; dotări adăugate fără ștergeri; verificat pe site
- [x] 397 din 415 fotografii au descrieri; la cele neinterpretate nu s-au inventat texte

## Texte și accesibilitate drafturi sociale
- [x] Texte lizibile completate cu descrierile salvate ale fotografiilor, fără informații inventate
- [x] Texte alternative și descrieri foto vizibile, cu copiere separată
- [x] Trei teste trecute și pagina autentificată verificată; fără publicare pe rețele sociale
- [ ] Verificarea copierii unei postări reale — blocată: momentan nu există drafturi salvate

## Prompt Andrei — replici concise
- [x] Reguli prioritare comune și exemple fictive realiste pentru vânzare
- [x] Trei teste trecute, build OK și funcții activate fără apeluri reale
- [x] Drill live „obiectii_clasice”: 5/5 trecute (scor 75–90), replica „Sunt ocupat” ajustată cu alternativă de 2 minute

## Îmbunătățiri prioritizate — 11 octombrie, runda 2
- [x] Stabilitate: încărcare vizibilă, recuperare izolată și notificări disponibile imediat
- [x] Site public: reîncercare verificare de securitate fără pierderea datelor și erori lângă câmpurile evaluării
- [x] Admin / Andrei: jurnal stabil la actualizare, stări distincte, confirmare în pagină și feedback corect la salvarea campaniei
- [x] Șapte teste și verificarea paginilor /index, /analiza-anunt, /evaluare, /contact, /investitori, paginii legale și panoului Andrei, fără apeluri sau mesaje reale

## Verificare premium, viteză și eficiență — 11 octombrie
- [x] Verificare pagini principale și navigare fără operațiuni reale
- [x] Meniu accesibil, fără derulare a paginii din spate, controale tactile de minimum 48px
- [x] Recuperare limitată după erori de încărcare, fără bucle de reîncărcare
- [x] Verificare automată și vizuală a modificărilor

1. [x] Activare Maps Embed API + Static API confirmată anterior de utilizator
2. [Blocat: utilizator] Test DA → publicare → STOP pe 0723 154 520
3. [Decizie utilizator] Card WhatsApp per anunț — necesită migrare TanStack Start (SSR)
4. [x] Notificare instant către admin la „DA" (link anunț publicat)
5. [x] Dashboard conversie acorduri 7/30 zile (ConsentFunnelPanel)
6. [x] 131026 → apar automat în „Apeluri de făcut" cu badge „Fără WhatsApp"
7. [x] Retry automat (1h, max 3×) pentru erori Meta recuperabile (rate limit)

## Gestionare lead-uri „Fără WhatsApp" (11 oct) — DONE
- [x] Filtru rapid „Fără WhatsApp" în Admin → Prospecte (listă + pipeline)
- [x] Butoane rapide: „Marchează ca Apelat" (dialog cu notă, status → contacted, tag apelat-telefonic) și „Trimite SMS Evaluare" (edge fn send-evaluation-sms via Make relay, cooldown 7 zile)
- [x] Contor „Necesită Apel Telefonic (Fără WhatsApp)" în Dashboard/Astăzi → click spre unified-pipeline
- [Amânat de utilizator] SMS evaluare — gestionarea prospectelor rămâne prin apeluri vocale; canalul SMS nu este activ.

## Fișe prospecte Command Center — Andrei
- [x] Contact proprietar și linkuri original/evaluare pe card
- [x] Editare rapidă număr cu salvare și validare
- [x] Detalii complete, istoric WhatsApp și note în dialog
- [x] Verificare interacțiuni fără inițierea apelurilor

## Context simulator Andrei
- [x] Verificare contact/linkuri și detalii pe cardurile existente
- [x] Legare simulator de primul prospect vizibil, inclusiv după editarea telefonului
- [x] Verificare context fără inițierea apelurilor reale

## Verificarea surselor în Piața anunțurilor
- [x] „Vezi anunțurile” în rapoartele zilnice și pe portaluri/zone: titlul extras de pe platformă și linkul către pagina-sursă, maximum 5 anunțuri, încărcate doar la cerere
- [x] Exemple cu link și pe cardurile din Centrul Auto-îmbunătățire (Piața anunțurilor), salvate la fiecare analiză
- [x] Ambele rapoarte verificate în browser autentificat, cu titluri reale afișate; funcția de analiză reactivată

## Marketing
- [ ] Test outreach Make.com pe numărul lui Adrian — așteaptă numărul de telefon
- [x] Articol „Regim hotelier vs. chirie clasică în Timișoara – cifre reale” + text r/timisoara

- [x] Cost: înlocuire model AI + curățare cron duplicat
- [x] Verificare presiune bază de date + curățare istoric programări (6,5 GB → 12 MB) + curățare zilnică

## Mementouri programate
- [x] Tabela `admin_reminders` + funcția `admin-reminder-check` (cron orar) — mementourile se trimit singure pe email, o singură dată
- [x] Mementourile sunt sent; verificarea bazei din 31 octombrie confirmă lipsa presiunii și a alertelor recente după trecerea anterior efectuată la Small
