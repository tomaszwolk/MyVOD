# Lista miejsc wpływających na przezroczystość tła wyników wyszukiwania

## 1. **Komponent UI - Popover** (najważniejsze!)
**Plik:** `myVOD/frontend/myVOD/src/components/ui/popover.tsx`
**Linia:** 22

Domyślne klasy w PopoverContent:
```typescript
"z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md..."
```

⚠️ **Problem:** Używa `bg-popover` jako domyślne tło, które może być nadpisywane przez `className` prop, ale z powodu specyficzności CSS może nie działać.

✅ **Rozwiązanie:** W pliku `components/ui/popover.tsx` zastąpiliśmy klasę `bg-popover` neutralną wartością `bg-transparent`, dzięki czemu kolor możemy narzucać z zewnątrz bez walki o specyficzność.

---

## 2. **Zmienne CSS dla kolorów**
**Plik:** `myVOD/frontend/myVOD/src/index.css`

### Tryb jasny (linie 7-70):
```css
--popover: hsl(0 0% 98.8235%);        /* Bardzo jasny szary */
--muted: hsl(0 0% 92.9412%);          /* Jaśniejszy szary */
--card: hsl(0 0% 98.8235%);           /* Bardzo jasny szary (identyczny jak popover) */
--background: hsl(0 0% 98.8235%);     /* Tło strony */
```

### Tryb ciemny (linie 72-128):
```css
--background: hsl(0 0% 7.0588%);      /* Bardzo ciemne tło */
--popover: hsl(0 0% 14.1176%);        /* ~14% jasności */
--muted: hsl(0 0% 12.1569%);          /* ~12% jasności */
--card: hsl(0 0% 18%);                /* ~18% jasności (najjaśniejszy) */
```

⚠️ **Problem:** Kolory `--popover` i `--muted` są bardzo zbliżone do `--background`, co daje małą widoczność.

✅ **Rozwiązanie:** Dodaliśmy dedykowaną zmienną CSS `--search-popover-background`:
- w `:root` (tryb jasny) ustawioną na `rgba(255, 255, 255, 0.95)`
- w `:root.dark` (tryb ciemny) ustawioną na `rgba(0, 0, 0, 0.95)`

Zmienna jest używana jako tło dropdownu wyszukiwania niezależnie od motywu.

---

## 3. **SearchCombobox - PopoverContent**
**Plik:** `myVOD/frontend/myVOD/src/components/watchlist/SearchCombobox.tsx`
**Linia:** 157

Obecne klasy:
```typescript
className="w-full p-0 bg-card text-foreground border border-border shadow-lg"
```

**Status:** ✅ Zmienione na `bg-card`, ale może być nadpisane przez domyślne klasy z popover.tsx

✅ **Rozwiązanie końcowe:** PopoverContent otrzymuje inline styl `backgroundColor: 'var(--search-popover-background)'`, więc nawet po zmianie motywu zachowuje odpowiednie krycie.

---

## 4. **SearchCombobox - Lista wyników**
**Plik:** `myVOD/frontend/myVOD/src/components/watchlist/SearchCombobox.tsx`
**Linia:** 175

Obecne klasy:
```typescript
className="max-h-60 overflow-y-auto divide-y divide-border bg-card"
```

**Status:** ✅ Zmienione na `bg-card`

✅ **Rozwiązanie końcowe:** Przechodzimy na `style={{ backgroundColor: 'var(--search-popover-background)' }}`, aby lista wyników dziedziczyła ten sam kolor co kontener.

---

## 5. **SearchCombobox - Pojedynczy element wyników**
**Plik:** `myVOD/frontend/myVOD/src/components/watchlist/SearchCombobox.tsx`
**Linia:** 187

Obecne klasy:
```typescript
className={`flex flex-col gap-3 p-3 transition-colors ${
  isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
}`}
```

**Status:** ✅ Usunięte `bg-muted`, dziedziczy tło z rodzica

---

## 6. **Funkcja cn() - łączenie klas Tailwind**
**Plik:** `myVOD/frontend/myVOD/src/lib/utils.ts` (prawdopodobnie)

Ta funkcja łączy klasy i rozwiązuje konflikty. Problem może być w:
- Kolejności klas (ostatnia w ciągu wygrywa w Tailwind)
- Specyficzności CSS

---

## 7. **Tailwind Config**
**Plik:** `myVOD/frontend/myVOD/tailwind.config.js`
**Linie:** 12-53

Definicje kolorów:
```javascript
colors: {
  background: 'hsl(var(--background))',
  popover: {
    DEFAULT: 'hsl(var(--popover))',
    foreground: 'hsl(var(--popover-foreground))'
  },
  card: {
    DEFAULT: 'hsl(var(--card))',
    foreground: 'hsl(var(--card-foreground))'
  },
  muted: {
    DEFAULT: 'hsl(var(--muted))',
    foreground: 'hsl(var(--muted-foreground))'
  },
  // ...
}
```

---

## 8. **Globalne style CSS**
**Plik:** `myVOD/frontend/myVOD/src/index.css`
**Linie:** 137-146

```css
@layer base {
  * {
    @apply border-border;
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  }
  body {
    @apply bg-background text-foreground;
    transition: background-color 0.2s ease, color 0.2s ease;
  }
}
```

---

## 9. **Potencjalne inline style**
**Plik:** `myVOD/frontend/myVOD/src/components/watchlist/SearchCombobox.tsx`
**Linia:** 160

```typescript
style={{ width: inputRef.current?.offsetWidth }}
```

⚠️ **Możliwy problem:** Jeśli gdzieś jest inline style dla `background`, nadpisuje klasy CSS.

---

## 10. **Portal i z-index**
**Plik:** `myVOD/frontend/myVOD/src/components/ui/popover.tsx`
**Linia:** 16

```typescript
<PopoverPrimitive.Portal>
```

Portal renderuje zawartość poza normalnym drzewem DOM, co może wpływać na dziedziczenie stylów.

---

## 11. **Porównanie z komponentem onboarding**
**Plik:** `myVOD/frontend/myVOD/src/components/onboarding/MovieSearchCombobox.tsx`
**Linie:** 122-126

Wersja onboardingowa używa `PopoverContent` bez jawnego `bg-card`:
```typescript
<PopoverContent
  className="w-full p-0"
  align="start"
  onOpenAutoFocus={(e) => e.preventDefault()}
>
```

⚠️ **Problem:** Wersja onboardingowa może działać poprawnie, podczas gdy wersja watchlist ma jawne `bg-card`, które może być nadpisywane przez domyślne style Radix UI.

---

## 12. **Kontekst rodzica - WatchlistControlsBar**
**Plik:** `myVOD/frontend/myVOD/src/components/watchlist/WatchlistControlsBar.tsx`
**Linia:** 49

Kontener rodzica również ma `bg-card`:
```typescript
<div className="bg-card border-b px-4 py-3">
```

⚠️ **Problem:** Może powodować konflikty specyficzności CSS między rodzicem a potomkiem.

---

## Potencjalne rozwiązania do przetestowania:

### A. **Wymuszenie koloru inline style:**
```typescript
<PopoverContent
  className="w-full p-0 text-foreground border border-border shadow-lg"
  style={{ 
    width: inputRef.current?.offsetWidth,
    backgroundColor: 'hsl(var(--card))' // ← wymuszenie
  }}
/>
```

### B. **Nadpisanie zmiennych CSS dla popover:**
W `index.css` zmień:
```css
:root.dark {
  --popover: hsl(0 0% 18%);  /* Taki sam jak card */
}
```

### C. **Użycie !important w custom CSS:**
Dodaj w `index.css`:
```css
.search-popover-content {
  background-color: hsl(var(--card)) !important;
}
```

### D. **Całkowite nadpisanie komponentu Popover:**
Stwórz własny wrapper z wymuszonym tłem.

---

## Rekomendowane kroki debugowania:

1. ✅ Sprawdź DevTools przeglądarki → zakładka Elements → Zobacz computed styles dla popovera
2. ✅ Sprawdź czy `bg-card` jest w DOM (może być usunięte przez cn())
3. ✅ Sprawdź wartość `hsl(var(--card))` w computed styles
4. ✅ Sprawdź czy nie ma inline `background: transparent` albo `opacity`
5. ✅ Spróbuj wymusić kolor przez inline style jako test
6. ✅ Sprawdź czy dark mode jest poprawnie aktywny (klasa `.dark` na `:root`)

