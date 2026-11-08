# Meniul de pe telefon: 3 categorii pliabile

Doar meniul de pe telefon se schimbă. Meniul de pe ecran mare, butonul „Adaugă anunț”, căutarea după cod și linkurile de admin rămân neschimbate.

## Structura propusă

```text
[Adaugă anunț]  [Căutare cod]
> Servicii Imobiliare
    Vânzări                 -> /imobiliare?tip=vanzare
    Închirieri              -> /imobiliare?tip=inchiriere
    Evaluare Gratuită 24h   -> /evaluare-gratuita
    Portofoliu Anunțuri     -> /anunturi
> Regim Hotelier / Proprietari
    Cum funcționează        -> /pentru-proprietari
    Prețuri & Comisioane 15–20% -> /preturi
    Calculator Venituri     -> /pentru-proprietari#calculator
> Cazare & Oaspeți
    Cazare Timișoara – ApArt Hotel -> /cazare
    Rezervare Directă -5%   -> /rezerva-direct
Rând simplu: Acasă · Blog · Despre noi · Contact
```

- Doar o categorie deschisă odată; se deschide automat categoria paginii curente.
- Fiecare rând are cel puțin 48px înălțime; titlurile au etichete în română și engleză.

## De decis la implementare
- Linkurile care dispar din meniu (HostScan AI, Analizează un anunț, Complexuri, Investiții, Catalog, Cartiere) — propunere: rămân într-un rând mic „Mai mult” sub cele 3 categorii, ca să nu pierdem trafic spre ele.
- Filtrul vânzare/închiriere pe /imobiliare se verifică la implementare; dacă nu există, ambele duc la /anunturi cu filtrul existent.
- „-5%” corespunde reducerii DIRECT5 deja aprobate; nu se schimbă nicio valoare comercială.

## Fișiere atinse
1. `src/components/Header.tsx` — înlocuirea grupurilor `navGroups` și a randării lor cu 3 categorii pliabile (componenta existentă `src/components/ui/accordion.tsx`, nu se modifică).
2. `public/i18n/en-phrases.json` — traduceri pentru etichetele noi, dacă nu folosesc direct varianta EN din cod.

## Pași
1. Confirm adresele pentru Vânzări/Închirieri și ancora calculatorului.
2. Rescriu grupurile din meniul de telefon în cele 3 categorii + rândul simplu.
3. Pun categoriile pliabile, cu închiderea meniului la apăsarea unui link.
4. Verific pe telefon (360px și 390px) că meniul se deschide, se derulează și fiecare link duce unde trebuie; verific că ecranul mare e identic.
5. Rulez testele existente.
