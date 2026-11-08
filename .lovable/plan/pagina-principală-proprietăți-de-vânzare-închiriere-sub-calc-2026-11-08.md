# Pagina principală: „Proprietăți de Vânzare & Închiriere” sub calculator

Imediat sub calculator, și înaintea formularului rapid, apare o secțiune compactă cu anunțurile active. Restul paginii rămâne neschimbat, inclusiv complexurile rezidențiale și secțiunea pentru oaspeți.

```text
Proprietăți de Vânzare & Închiriere
[ De vânzare ] [ De închiriat ]      <- filele existente ale componentei
[card] [card] [card] [card]          <- maximum 4: 1 pe rând pe telefon, 2 pe tabletă, 4 pe ecran mare
        [ Vezi toate anunțurile imobiliare -> /anunturi ]
```

## Ce se vede
- Acum sunt active 16 anunțuri de vânzare și 6 de închiriere. Secțiunea arată primele 4 din fila aleasă, în ordinea folosită deja pe site.
- Butonul „Vezi toate anunțurile imobiliare” are cel puțin 48px înălțime și duce la `/anunturi`. Dacă fila „De închiriat” e deschisă, duce la `/anunturi?tranzactie=inchiriere`.
- Dacă nu există anunțuri, secțiunea se ascunde. Nu apare un mesaj gol.
- Anunțurile se încarcă doar când vizitatorul ajunge aproape de secțiune, ca prima imagine a paginii să rămână rapidă.

## Fișiere atinse
1. `src/components/RealEstateListings.tsx` – două opțiuni noi, folosite doar pe pagina principală:
   - `limit`, numărul maxim de carduri;
   - `compact`, cu titlul secțiunii, mai puțin spațiu și butonul final.
   Fără ele, componenta arată exact ca acum pe pagina Imobiliare.
2. `src/pages/Index.tsx` – secțiunea nouă, pusă după calculator, încărcată la derulare ca celelalte blocuri.
3. `public/i18n/en-phrases.json` – doar dacă rămân texte noi fără variantă în engleză.
4. Un test nou lângă testele existente, care verifică:
   - că apar cel mult 4 carduri;
   - că butonul duce la `/anunturi`.

## Pași
1. Adaug opțiunile `limit` și `compact` în componenta de anunțuri, cu comportamentul de acum ca variantă implicită.
2. Pun secțiunea pe pagina principală, sub calculator.
3. Verific pe telefon și pe ecran mare:
   - cardurile, filele și butonul;
   - că pagina Imobiliare a rămas identică.
4. Verific că saltul la calculator, din butoane și din adresa `#calculator`, merge ca înainte.
5. Rulez toate testele.
