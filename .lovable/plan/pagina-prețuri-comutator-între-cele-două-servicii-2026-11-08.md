# Pagina Prețuri: comutator între cele două servicii

Deasupra pachetelor de pe pagina Prețuri apare un comutator cu două file. Restul paginii rămâne la fel: prima secțiune, „Alte servicii”, zonele business, garanțiile, evaluarea și întrebările.

```text
[ Administrare Regim Hotelier ] [ Intermediere Imobiliară Clasică ]
```

## Fila 1 – Administrare Regim Hotelier (implicită)
- Cele trei pachete actuale, neschimbate: Starter 15%, Esențial 18%, Standard 20% din venitul net.
- Nota despre TVA rămâne sub carduri.

## Fila 2 – Intermediere Imobiliară Clasică
Două carduri în același stil:
- **Vânzări:** comision 2–4%, plătit doar la rezultat. Evaluarea costă 0 lei. Butonul principal duce la „Evaluare gratuită”, iar al doilea deschide WhatsApp.
- **Închirieri:** comision 50–100% din prima chirie. Butonul deschide WhatsApp.
- Textele de sub cifre le scriu eu și ți le arăt la final ca să le confirmi. Nu inventez alte valori, cum ar fi plafoane, minimuri sau TVA diferit.

## Comportament
- Fila aleasă se păstrează în adresă: `/preturi?serviciu=intermediere`. Așa poți trimite direct linkul către fila 2, iar `#pachete` deschide în continuare fila 1.
- Pe telefon, cele două file ocupă toată lățimea. Fiecare are cel puțin 48px înălțime, iar textele sunt în română și engleză.
- Datele pentru motoarele de căutare (titlu, descriere, `priceRange`, întrebări) rămân neschimbate în acest pas. Dacă vrei, le extind separat ca să includă și intermedierea.

## Fișiere atinse
1. `src/pages/Preturi.tsx` – comutatorul, folosind componenta existentă `src/components/ui/tabs.tsx` (neschimbată), plus cardurile pentru Vânzări și Închirieri.
2. `public/i18n/en-phrases.json` – doar dacă rămân texte noi fără variantă în engleză în cod.
3. Un test nou lângă testele existente, care verifică valorile din fila 2: 2–4%, 0 lei, 50–100% din prima chirie și pachetele 15/18/20%.

## Pași
1. Adaug comutatorul și mut grila de pachete în fila 1, fără alte schimbări.
2. Construiesc cardurile din fila 2 cu valorile aprobate.
3. Leg fila de adresă (`?serviciu=`).
4. Verific pe telefon și pe ecran mare ambele file, linkul direct către fila 2 și butoanele WhatsApp și Evaluare.
5. Rulez toate testele.
