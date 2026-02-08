
# Plan: Fix Header Layout - Toate cele 9 linkuri + Căutare ID vizibile la 1024-1536px

## Problema Identificată

Din analiza screenshot-ului și a codului, am identificat **cauza principală**:
- Navigația desktop folosește `flex-1 min-w-0` care permite linkurilor să "invadeze" spațiul logo-ului
- Logo-ul are constrângeri `max-w` dar textul "RealTrust & ApArt Hotel" depășește aceste limite
- Nu există separare clară (gap sau margin) între logo și navigație
- PropertyCodeSearch este ascuns sub 1536px (`hidden 2xl:block`)

## Soluție Propusă

### Pas 1: Restructurare Layout Header cu Grid/Flex Fix

Voi schimba layout-ul de la flexbox simplu la un sistem cu lățimi fixe pentru fiecare zonă:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  LOGO (fix)  │  NAVIGAȚIE (flex-1)  │  CĂUTARE + ACȚIUNI (fix)              │
│  ~180-200px  │    9 linkuri          │   ~350-400px                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Modificări tehnice în `src/components/Header.tsx`:**

1. **Adaug separare clară între logo și nav**:
```tsx
// Logo - cu lățime fixă și margin-right
<a href="/" className="... flex-shrink-0 w-[160px] lg:w-[170px] xl:w-[190px]">
```

2. **Navigație - cu overflow protection**:
```tsx
<nav className="hidden lg:flex items-center justify-center gap-1 lg:gap-1.5 xl:gap-2 flex-1 mx-2 overflow-hidden">
```

3. **PropertyCodeSearch vizibil de la lg (1024px)**:
```tsx
// Schimb de la hidden 2xl:block la hidden lg:block
// Cu lățime responsivă: w-[140px] lg:w-[160px] xl:w-[180px] 2xl:w-[200px]
<div className="hidden lg:block w-[140px] lg:w-[160px] xl:w-[180px] 2xl:w-[200px]">
  <PropertyCodeSearch />
</div>
```

### Pas 2: Optimizare Spațiu Zona Dreapta

Pentru a face loc căutării, voi:

1. **Compactare butoane acțiune**:
   - Admin button: icon-only pe lg, cu text pe xl+
   - Butonul auriu "Proprietari: Listează": ascuns pe lg-xl, vizibil pe 2xl

2. **Toggles compacte**:
   - AnimationToggle, ThemeToggle, LanguageSwitcher rămân vizibile
   - Padding-uri reduse pe lg

### Pas 3: Ajustare Font-Size Linkuri Nav

```tsx
const desktopLinkBaseClasses =
  "relative px-1 lg:px-1.5 xl:px-2 2xl:px-3 text-[10px] lg:text-[11px] xl:text-xs 2xl:text-sm ...";
```

Progresie font:
- lg (1024px): 10px
- xl (1280px): 11-12px  
- 2xl (1536px): 14px (sm)

## Diagrama Layout Final

```text
1366px viewport:
┌──────────────────────────────────────────────────────────────────────┐
│ RealTrust & ApArt │ Acasă Proprietari Oaspeți ... │ [Caută ID] ⚙️🌙RO│
│ Vânzare·Admin·Caz │        9 linkuri compact      │                   │
│ | 1 singur sistem │                               │                   │
└──────────────────────────────────────────────────────────────────────┘
        170px               ~600px                      ~350px
```

## Modificări în Detaliu

### Fișier: `src/components/Header.tsx`

**Linia 277 - Logo container**:
```tsx
// DE LA:
<a href="/" className="... flex-shrink-0 max-w-[140px] lg:max-w-[160px] xl:max-w-[180px] 2xl:max-w-none">

// LA:
<a href="/" className="... flex-shrink-0 w-[150px] lg:w-[165px] xl:w-[185px] 2xl:w-auto 2xl:max-w-none mr-2 lg:mr-3">
```

**Linia 297 - Nav container**:
```tsx
// DE LA:
<nav className="hidden lg:flex items-center justify-center gap-0.5 lg:gap-1 xl:gap-1.5 2xl:gap-3 flex-1 min-w-0">

// LA:
<nav className="hidden lg:flex items-center justify-center gap-0.5 lg:gap-1 xl:gap-1.5 2xl:gap-2 flex-1 min-w-0 overflow-hidden">
```

**Linia 149-150 - Link classes**:
```tsx
// DE LA:
"relative px-1 lg:px-1.5 xl:px-2 2xl:px-3 text-[11px] lg:text-xs xl:text-xs 2xl:text-sm ..."

// LA:  
"relative px-0.5 lg:px-1 xl:px-1.5 2xl:px-2.5 text-[10px] lg:text-[11px] xl:text-xs 2xl:text-sm ..."
```

**Liniile 342-345 - PropertyCodeSearch**:
```tsx
// DE LA:
<div className="hidden 2xl:block w-[200px]">

// LA:
<div className="hidden lg:block w-[120px] xl:w-[150px] 2xl:w-[200px]">
```

**Liniile 370-378 - Admin button compact**:
```tsx
// DE LA:
<Button variant="ghost" size="sm" className="hidden sm:inline-flex ...">
  <Shield className="w-4 h-4 mr-2" />
  Admin
</Button>

// LA:
<Button variant="ghost" size="sm" className="hidden lg:inline-flex ...">
  <Shield className="w-4 h-4 lg:mr-0 xl:mr-1.5" />
  <span className="hidden xl:inline">Admin</span>
</Button>
```

**Liniile 380-389 - Buton auriu CTA**:
```tsx
// DE LA:
className="hidden xl:inline-flex ..."

// LA:
className="hidden 2xl:inline-flex ..."
```

## Risc și Considerente

- **Risc scăzut** - modificările sunt CSS-only
- **Backward compatible** - meniul mobil rămâne neschimbat
- **Testare necesară** la: 1024px, 1280px, 1366px, 1440px, 1536px

## Fișiere Afectate

1. `src/components/Header.tsx` - singura modificare necesară

## Rezultat Așteptat

- ✅ Toate cele 9 linkuri vizibile și spațiate corect la 1024-1536px
- ✅ PropertyCodeSearch vizibil de la 1024px (în loc de 1536px)
- ✅ Logo nu se suprapune cu navigația
- ✅ Butoane compacte pe ecrane medii, full pe ecrane mari
