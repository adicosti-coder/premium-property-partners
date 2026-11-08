# Carduri de direcționare sub Hero + dovadă „Evaluare gratuită în 24h”

## Ce se schimbă pentru vizitator
1. Primul punct din banda de dovezi devine **„Evaluare gratuită în 24h”** (înlocuiește „Peste 10.000 oaspeți cazați”). Celelalte două rămân neschimbate.
2. Imediat sub Hero (înaintea benzii de dovezi) apar două carduri compacte:
   - **Vânzări / Cumpărări** → duce la /servicii-imobiliare
   - **Administrare Regim Hotelier** → duce la /administrare (pagina existentă de administrare; se confirmă adresa canonică la implementare)
   Pe telefon: unul sub altul; pe ecran mare: două coloane. Fiecare card are titlu, o propoziție scurtă și o săgeată, zonă de apăsare minim 48px.

## Fișiere atinse
- `src/components/HomeSocialProofStrip.tsx` — schimbă primul element (pictogramă ceas, text RO/EN).
- `src/components/HomeAudienceCards.tsx` (nou) — cele două carduri, static, fără încărcare de date, culori din temă (albastru/auriu RealTrust).
- `src/pages/Index.tsx` — o singură linie: inserare `<HomeAudienceCards />` între `<Hero />` și `<HomeSocialProofStrip />`.

## Pas de lucru
Un singur pas: creare componentă nouă, editare bandă, inserare în pagină; verificare vizuală pe telefon și desktop + rulare teste existente.

## Neatinse
Hero, calculatorul, analytics, restul paginii, componentele globale.

## De confirmat
- „Evaluare gratuită în 24h” este o promisiune de termen — o folosesc exact cum ai scris-o.
- Ordinea: cardurile deasupra benzii de dovezi (cum ai cerut „direct sub Hero”).
