# Reparare completă — Caută anunțuri de la proprietari

## Obiectiv
Căutarea va afișa în lista principală numai anunțuri imobiliare individuale, active, din Timișoara, compatibile cu filtrele alese și fără semnale de agenție. Rezultatele incerte nu vor mai fi prezentate ca fiind confirmate de proprietari.

## Modificări

### 1. Corectarea clasificării proprietar / agenție
- Nu mai marca automat fiecare rezultat nou drept `proprietar` doar pentru că interogarea conține acest cuvânt.
- Clasifică drept proprietar confirmat numai anunțurile cu semnal explicit sau telefon/domeniu validat; restul rămân „de verificat”.
- Aplică aceeași blocare pentru agenții, telefoane cunoscute și anunțuri expirate atât rezultatelor noi, cât și celor deja salvate.

### 2. Corectarea descoperirii și filtrării
- Trimite către fiecare portal interogări coerente cu tipul, tranzacția, camerele, zona și termenul liber, fără combinații care consumă buget și fragmentează rezultatele.
- Elimină paginile de căutare, categoriile și linkurile neindividuale înainte de numărare.
- Folosește datele citite din pagina reală pentru titlu, descriere, preț, camere, suprafață și zonă înainte de filtrare.
- Păstrează criteriile esențiale stricte: tip, tranzacție, camere și zonă. Detaliile necunoscute vor fi marcate clar, nu confundate cu potriviri confirmate.

### 3. Rezultate și interfață clare
- Lista principală va conține doar potrivirile conforme.
- Rezultatele respinse vor fi mutate într-o secțiune de diagnostic închisă implicit, nu amestecate vizual cu ofertele bune.
- Numărătorile vor separa: găsite brut, anunțuri individuale, proprietari confirmați, de verificat, agenții excluse, expirate și conforme filtrelor.
- Optimizează afișarea pe telefon astfel încât titlul, portalul, motivul verificării, prețul și acțiunile să nu se înghesuie.

### 4. Verificare reală
- Adaugă teste pentru URL individual, agenție, anunț expirat, camere, tranzacție, tip, zonă și „decomandat” versus „semidecomandat”.
- Rulează verificările proiectului și funcției de scanare.
- Rulează o căutare autentificată în Admin și verifică manual linkurile și datele câtorva rezultate, nu doar numărul total.

## Detalii tehnice
- Centralizez regulile pure de clasificare și filtrare într-un modul testabil, folosit de interfața Admin.
- Actualizez funcția `scrape-prospects` astfel încât răspunsul să includă statutul de verificare și diagnostice corecte, fără a promova automat rezultate broad la proprietar confirmat.
- Păstrez protecția datelor: căutarea și telefoanele rămân numai în zona Admin.
