# Roadmap — optimizări sistem analiză și administrare

1. [Blocat: utilizator] Activare Maps Embed API + Static API în Google Cloud Console
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
- [ ] SMS evaluare: livrare efectivă amânată la cererea utilizatorului — funcția send-evaluation-sms e gata, dar nu există canal SMS activ (Make neconectat; numărul Twilio +40373800342 e voice-only; Twilio nu are numere RO cu SMS). De reluat când utilizatorul alege: număr Twilio GB cu SMS sau scenariu Make propriu.

## Fișe prospecte Command Center — Andrei
- [x] Contact proprietar și linkuri original/evaluare pe card
- [x] Editare rapidă număr cu salvare și validare
- [x] Detalii complete, istoric WhatsApp și note în dialog
- [x] Verificare interacțiuni fără inițierea apelurilor

## Context simulator Andrei
- [x] Verificare contact/linkuri și detalii pe cardurile existente
- [x] Legare simulator de primul prospect vizibil, inclusiv după editarea telefonului
- [x] Verificare context fără inițierea apelurilor reale
