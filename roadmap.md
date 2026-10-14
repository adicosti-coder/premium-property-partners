# Roadmap — optimizări sistem analiză și administrare

## Stories Social Engine
- [ ] Opțiune Story, fotografie/video 1080×1920 și link opțional precompletat
- [ ] Salvare și payload Make.com STORY cu link separat; verificări fără publicare reală

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
- [ ] Verificarea butonului nou din dialog — blocată de verificarea suplimentară Admin prin cod e-mail

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
