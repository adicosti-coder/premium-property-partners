# Roadmap — optimizări sistem analiză și administrare

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
