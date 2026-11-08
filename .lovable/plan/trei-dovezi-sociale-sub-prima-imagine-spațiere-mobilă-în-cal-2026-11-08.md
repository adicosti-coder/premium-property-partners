# Trei dovezi sociale sub prima imagine + spațiere mobilă în calculator

## Ce se schimbă pentru vizitator
- Sub prima imagine a paginii principale apare o bandă compactă cu 3 dovezi: pe telefon una sub alta sau pe un singur rând îngust, pe calculator pe un rând.
- În calculatorul de randament, pe telefon, marginile și distanțele dintre blocuri devin mai mici, ca vizitatorul să vadă mai repede rezultatul. Pe calculator rămâne la fel.

## Cifrele folosite (doar valori aprobate)
1. Scor consolidat 9,7/10 pe Booking — aprobat.
2. Randament net estimat 6,5–9,4%/an — aprobat (grila oficială).
3. A treia dovadă necesită confirmarea ta. Pe pagină apar acum două numere diferite pentru apartamentele administrate (15 în română, 14 în engleză), așa că nu aleg eu unul. Alternativă fără cifră: „Contract scris, raportare lunară”.

## Fișiere care se modifică
- `src/components/HomeSocialProofStrip.tsx` (nou) — banda cu cele 3 dovezi, texte în română și engleză, fără imagini noi.
- `src/pages/Index.tsx` — banda se pune imediat după `<Hero />`, înainte de `<HomeIntro />`.
- `public/i18n/en-phrases.json` — doar dacă vreun text rămâne fără traducere în engleză.
- `src/components/UnifiedCalculator.tsx` — spațierea pe telefon (liniile cu `px-5 py-6`, `space-y-8`, `space-y-6`).
- `src/components/UnifiedCalculator.test.tsx` sau testul existent — o verificare că rezultatul și formularul rămân accesibile.

## Pași
1. Confirmi a treia dovadă.
2. Creez banda: înălțime fixă, fără animații și fără încărcare de date, ca să nu încetinească pagina și să nu împingă conținutul la încărcare.
3. O așez sub prima imagine.
4. Reduc pe telefon marginile calculatorului (de exemplu `px-4 py-5`, `space-y-6`, `space-y-5`), păstrând butoanele de minimum 48 px.
5. Verific pe telefon (384 px) și pe calculator, rulez toate testele.

## Detalii tehnice
- Banda e importată direct (nu lazy), cu dimensiuni rezervate, ca regulile de viteză (LCP/CLS) să rămână respectate.
- Calculatorul păstrează markerul `data-calculator-ready` și ancora `#calculator`.
