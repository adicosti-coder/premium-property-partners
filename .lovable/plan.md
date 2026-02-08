

# Plan: Adăugare Căutare după ID în Meniul Hamburger (Mobile)

## Rezumat Cerință
Utilizatorii pe mobile (sub 1024px) nu au acces la funcția de căutare rapidă după ID proprietate (`PropertyCodeSearch`), deoarece aceasta este vizibilă doar pe desktop (`hidden lg:block`). Trebuie integrată în meniul hamburger pentru a fi accesibilă pe toate dispozitivele.

## Analiza Codului Curent

### Meniul Mobil (linii 401-474)
Meniul hamburger este implementat cu AnimatePresence și motion.nav:
- Se deschide când `mobileMenuOpen === true`
- Conține toate cele 9 link-uri de navigare
- La final are o secțiune "Setări:" cu AnimationToggle, ThemeToggle, LanguageSwitcher
- Fiecare element are animații staggered (delay: `index * 0.05`)

### PropertyCodeSearch (linia 343-345)
```tsx
<div className="hidden lg:block w-[120px] xl:w-[150px] 2xl:w-[200px]">
  <PropertyCodeSearch />
</div>
```
Este ascuns complet pe mobile - nu apare nicăieri în meniul hamburger.

## Soluție Propusă

Voi adăuga componenta `PropertyCodeSearch` în meniul hamburger, poziționată **înainte de link-urile de navigare** pentru vizibilitate maximă. Aceasta va avea un design adaptat pentru mobile cu lățime completă.

### Locație în Meniu
```text
┌──────────────────────────────────────┐
│  🔍 Caută după ID (ex: RT-001)       │  ← NOU: PropertyCodeSearch
├──────────────────────────────────────┤
│  Acasă                               │
│  Proprietari                         │
│  Oaspeți                             │
│  ...                                 │
├──────────────────────────────────────┤
│  Setări: 🎬 🌙 🇷🇴                    │
└──────────────────────────────────────┘
```

## Modificări Tehnice

### Fișier: `src/components/Header.tsx`

**Linia 411 - Adaug căutarea în meniul mobil:**

```tsx
{/* Mobile Navigation */}
<AnimatePresence>
  {mobileMenuOpen && (
    <motion.nav 
      className="lg:hidden py-4 px-4 border-t border-border origin-top overflow-hidden"
      // ... animații existente
    >
      <div className="flex flex-col gap-4">
        {/* NOU: Property Code Search - Mobile */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="pb-3 border-b border-border/50"
        >
          <PropertyCodeSearch className="w-full" />
        </motion.div>
        
        {/* Restul link-urilor existente */}
        {navLinks.map((link, index) => {
          // ... cod existent
        })}
        
        {/* Mobile settings row - existent */}
      </div>
    </motion.nav>
  )}
</AnimatePresence>
```

### Stilizare pentru Mobile

Componenta `PropertyCodeSearch` acceptă deja un prop `className`, așa că o voi stiliza cu:
- `w-full` - lățime completă în meniu
- Separare vizuală cu `border-b border-border/50` și `pb-3`
- Animație de intrare subtilă (fade-in + slide-down)

## Beneficii

1. **Accesibilitate** - Utilizatorii mobil pot căuta proprietăți după cod direct din meniu
2. **Consistență** - Funcționalitatea este disponibilă pe toate dispozitivele
3. **Vizibilitate** - Poziționarea în top-ul meniului face căutarea ușor de găsit
4. **Design** - Se integrează natural în stilul existent al meniului

## Fișiere Afectate

1. `src/components/Header.tsx` - singura modificare necesară

## Timp Estimat
~3 minute pentru implementare

## Risc
**Foarte scăzut** - Adaugare simplă de componentă existentă într-o locație nouă, fără modificări la logica de bază.

