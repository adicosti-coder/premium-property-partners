# Traducere în engleză a paginilor publice principale

## Ce se traduce (în ordine)
1. Elemente comune: meniu, subsol, butoane plutitoare, widget contact, cookie banner.
2. Acasă.
3. Pentru proprietari (+ condiții proprietari, prețuri).
4. Calculator randament / Analiză randament apartament.
5. Investiții și imobiliare (liste + pagina proprietății).
6. Cazare (listă + pagina apartamentului).
7. Contact și despre noi.

Admin, portalul proprietarului și articolele de blog rămân în română.

## Reguli
- Cifrele comerciale rămân identice (6,5–9,4% net, 15–20% din net, 65–75% ocupare, contract 12 luni cu probă 90 zile).
- Paginile EN rămân „noindex, follow” până la finalizare.
- Se traduc doar textele vizibile; adresele paginilor nu se schimbă.

## Detalii tehnice
- Textele hardcodate se mută în `translations.ro.ts` / `translations.en.ts` (aceleași chei), citite prin `useLanguage().t`.
- Titlurile/descrierile SEO EN se adaugă în același dicționar.
- Verificare: build, teste existente, Playwright pe fiecare pagină cu `?lang=en`, căutând diacritice românești rămase.
- Livrare în 2–3 etape, câte un grup de pagini pe etapă.
