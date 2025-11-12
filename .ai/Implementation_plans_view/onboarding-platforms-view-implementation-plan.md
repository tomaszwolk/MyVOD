# Plan implementacji widoku Onboarding – Krok 1: Wybór platform VOD

## 1. Przegląd
Widok pierwszego kroku onboardingu pozwala użytkownikowi wskazać platformy VOD, z których korzysta. Wybór (0–5 platform) jest zapisywany w profilu użytkownika i będzie używany do filtrowania dostępności filmów oraz personalizowania sugestii AI. Użytkownik może pominąć ten krok bez zapisywania danych. Widok musi być dostępny (a11y), responsywny, odporny na błędy, a przycisk „Dalej” ma być zawsze aktywny.

## 2. Routing widoku
- Ścieżka: `/onboarding/platforms`
- Wymogi: autoryzacja JWT (ochrona trasy po stronie klienta). Przy 401/403 przekierowanie do logowania.
- Przejścia:
  - „Dalej” → `/onboarding/first-movies` (Krok 2) po udanym zapisie.
  - „Skip” → `/onboarding/first-movies` (Krok 2) bez zapisu.

## 3. Struktura komponentów
- OnboardingPlatformsPage (route-level)
  - OnboardingLayout
    - OnboardingHeader
    - ProgressBar (Krok 1/3)
    - PlatformsGrid
      - PlatformCheckboxCard × 5
    - ActionBar

Drzewo komponentów:
- OnboardingPlatformsPage
  - OnboardingLayout
    - OnboardingHeader
    - ProgressBar (label: „Krok 1/3”)
    - PlatformsGrid
      - PlatformCheckboxCard (Netflix)
      - PlatformCheckboxCard (HBO Max)
      - PlatformCheckboxCard (Disney+)
      - PlatformCheckboxCard (Prime Video)
      - PlatformCheckboxCard (Apple TV+)
    - ActionBar

Rekomendowane umiejscowienie plików (frontend):
- `src/pages/onboarding/OnboardingPlatformsPage.tsx`
- `src/components/onboarding/OnboardingLayout.tsx`
- `src/components/onboarding/OnboardingHeader.tsx`
- `src/components/onboarding/PlatformsGrid.tsx`
- `src/components/onboarding/PlatformCheckboxCard.tsx`
- `src/components/onboarding/ActionBar.tsx`
- `src/lib/api/platforms.ts` (GET)
- `src/lib/api/userProfile.ts` (PATCH)

## 4. Szczegóły komponentów
### OnboardingPlatformsPage
- Opis: Kontener strony. Pobiera listę platform (GET), zarządza lokalnym stanem zaznaczeń, zapisuje wybór (PATCH) i nawigacją „Dalej/Skip”.
- Główne elementy: integracja z TanStack Query (React Query), React Router, Tailwind/shadcn/ui.
- Obsługiwane interakcje:
  - Toggle zaznaczenia platformy (dodanie/usunięcie id do/z zbioru wyborów).
  - Klik „Dalej” → wywołanie PATCH `/api/me/` i nawigacja po sukcesie.
  - Klik „Skip” → nawigacja bez PATCH.
- Walidacja:
  - Dozwolone 0–5 zaznaczeń (bez blokady przy 0 – zgodnie z PRD).
  - Blokada wielokrotnego zapisu: disabled UI w trakcie mutacji.
- Typy: `PlatformDto`, `UpdateUserProfileCommand`, `UserProfileDto`, `PlatformViewModel`, `ApiProblem`.
- Propsy: brak (route-level).

### OnboardingLayout
- Opis: Wspólny layout kroków onboardingowych: nagłówek, sekcja treści, max-width, spacing.
- Elementy: wrapper, header slot, content slot.
- Interakcje: brak.
- Walidacja: n/d.
- Propsy: `{ title: string; subtitle?: string; children: ReactNode }`.

### OnboardingHeader
- Opis: Tytuł i wskazówka do kroku („Wybierz swoje platformy VOD”).
- Elementy: `h1`, `p` (hint).
- Interakcje: brak.
- Walidacja: n/d.
- Propsy: `{ title: string; hint?: string }`.

### ProgressBar
- Opis: Wskaźnik postępu Krok 1/3.
- Elementy: komponent shadcn/ui `Progress` lub własny pasek + etykieta.
- Interakcje: brak.
- Walidacja: n/d.
- Propsy: `{ current: number; total: number }` (tutaj `1` i `3`).

### PlatformsGrid
- Opis: Siatka kart z checkboxami (accessible checkbox group).
- Elementy: `fieldset` + `legend` (a11y), grid (Tailwind), lista `PlatformCheckboxCard`.
- Interakcje: `onToggle(id)` dla elementów; wsparcie Space/Enter.
- Walidacja: wizualna informacja (0–5), brak blokady „Dalej”.
- Propsy: `{ platforms: PlatformViewModel[]; onToggle(id: number): void; isDisabled: boolean }`.

### PlatformCheckboxCard
- Opis: Karta platformy z logo, nazwą i checkboxem. Kliknięcie całej karty zaznacza/odznacza.
- Elementy: `input type="checkbox"` powiązany z `label`, `img/svg` logo, nazwa; stany: checked, focus, hover, disabled.
- Interakcje: klik/Space/Enter toggluje zaznaczenie.
- Walidacja: brak (delegowane do rodzica).
- Propsy: `{ id: number; name: string; slug: string; checked: boolean; iconSrc?: string; onChange(id: number): void; disabled?: boolean }`.

### ActionBar
- Opis: Pasek akcji z przyciskami „Skip” i „Dalej”.
- Elementy: shadcn/ui `Button` (ghost dla Skip, default dla Dalej).
- Interakcje: `onSkip()` i `onNext()`.
- Walidacja: oba przyciski disabled, gdy `isBusy` (mutacja w toku); „Dalej” zawsze aktywny semantycznie.
- Propsy: `{ onSkip(): void; onNext(): void; isBusy: boolean }`.

## 5. Typy
- Istniejące (z `src/types/api.types.ts`):
  - `PlatformDto` – odpowiada `platform` w bazie: `{ id: number; platform_slug: string; platform_name: string }`.
  - `UpdateUserProfileCommand` – `{ platforms: number[] }`.
  - `UserProfileDto` – `{ email: string; platforms: PlatformDto[] }`.

- Nowe ViewModel-e i pomocnicze:
```ts
export type PlatformViewModel = {
  id: number;
  slug: string;
  name: string;
  selected: boolean;
  iconSrc?: string;
};

export type OnboardingPlatformsState = {
  selectedIds: Set<number>;
  isSaving: boolean;
};

export type ApiProblem = {
  message: string;
  status?: number;
};
```

## 6. Zarządzanie stanem
- Lokalny stan zaznaczeń: `useState<Set<number>>` w `OnboardingPlatformsPage`.
  - Inicjalnie: pusty `Set`.
  - `toggle(id)`: tworzy nowy `Set` i dodaje/usuwa `id`.
- React Query:
  - `useQuery(['platforms'], getPlatforms)` – GET `/api/platforms/`.
  - `useMutation((ids) => patchUserPlatforms(ids))` – PATCH `/api/me/`.
  - `isLoading` → skeleton siatki; `isPending` → zablokowane interakcje.
- A11y focus management:
  - Po błędzie zapisu przenieś focus na alert/komunikat.
  - Po sukcesie i nawigacji fokus na nagłówku Kroku 2.
- Opcjonalnie: zachowaj wybór w `sessionStorage` (`onboarding.platforms`) dla odporności na odświeżenie (nie wymagane przez PRD).

## 7. Integracja API
- GET `/api/platforms/` (public):
  - Response: `PlatformDto[]`.
  - Mapowanie do VM: `{ id, slug: platform_slug, name: platform_name, selected: selectedIds.has(id), iconSrc: iconsBySlug[slug] }`.

- PATCH `/api/me/` (auth):
  - Request body (`UpdateUserProfileCommand`): `{ platforms: number[] }`.
  - Response: `UserProfileDto` (w tym widoku nieużywany poza ewentualnym odświeżeniem cache profilu).

Przykładowe helpery (Axios):
```ts
async function getPlatforms(): Promise<PlatformDto[]> {
  const { data } = await axios.get('/api/platforms/');
  return data;
}

async function patchUserPlatforms(ids: number[]): Promise<UserProfileDto> {
  const { data } = await axios.patch('/api/me/', { platforms: ids } satisfies UpdateUserProfileCommand);
  return data;
}
```

## 8. Interakcje użytkownika
- Zaznaczenie/odznaczenie platformy → aktualizacja lokalnego stanu i natychmiastowa zmiana stanu karty.
- „Dalej” → wysyła PATCH z aktualnym wyborem; sukces → przejście do Kroku 2.
- „Skip” → przejście do Kroku 2 bez żadnych wywołań API.
- Klawiatura: Tab do poruszania się, Space/Enter do toggla checkboxa; przyciski w `ActionBar` są dostępne przez Tab.

## 9. Warunki i walidacja
- Dozwolone 0–5 zaznaczeń: UI może pokazać licznik „Wybrane: X/5”. Brak blokady „Dalej”.
- Weryfikacja źródła `id` do PATCH: `id` muszą pochodzić z listy GET (zapobiegamy manipulacji).
- Blokada UI podczas zapisu (`isPending`/`isSaving`).
- A11y:
  - `fieldset`/`legend` dla grupy checkboxów.
  - `label` powiązany z `input`.
  - Widoczny focus ring, poprawne `aria-checked`.

## 10. Obsługa błędów
- GET `/api/platforms/`:
  - Pokaż stan błędu z CTA „Spróbuj ponownie”.
  - Tekst: „Nie udało się wczytać listy platform. Spróbuj ponownie.”
- PATCH `/api/me/`:
  - 400/422: „Nie udało się zapisać wyboru platform. Spróbuj ponownie.” (loguj szczegóły w dev).
  - 401/403: przekierowanie do logowania + komunikat o wygaśnięciu sesji.
  - 5xx: toast/alert i pozostanie na stronie; umożliw ponowną próbę.

## 11. Kroki implementacji
1. Routing
   - Dodaj trasę `'/onboarding/platforms'` w React Router (ochrona autoryzacją JWT).
2. Klient API
   - Dodaj `getPlatforms()` i `patchUserPlatforms()` w `src/lib/api` (Axios z interceptorami JWT).
3. Komponenty UI
   - `OnboardingLayout` (layout, max-w, spacing) i `OnboardingHeader` (tytuł + hint).
   - `ProgressBar` (shadcn/ui lub własny) z etykietą „Krok 1/3”.
   - `PlatformCheckboxCard` (label+input, focus ring, checked/hover/disabled).
   - `PlatformsGrid` (fieldset/legend, responsywna siatka, mapowanie listy do kart).
   - `ActionBar` (Skip/Dalej z obsługą `isBusy`).
4. Strona `OnboardingPlatformsPage`
   - `useQuery` do pobrania platform i mapowanie do `PlatformViewModel`.
   - Lokalny stan `selectedIds: Set<number>` + `toggle(id)`.
   - `useMutation` dla zapisu; `onSuccess` → navigate do Kroku 2; `onError` → alert/toast.
   - Przekaż propsy do `PlatformsGrid` i `ActionBar`.
5. UX i A11y
   - Focus outlines, role, `label`-`input`, obsługa Space/Enter.
   - Skeleton w trakcie ładowania; disabled interakcje przy zapisie.
6. Obsługa błędów
   - Dodaj komponent Alert/Toast dla błędów GET/PATCH.
7. Ikony
   - Przygotuj mapę `iconsBySlug` (np. lokalne SVG) z fallbackiem (placeholder) dla brakujących.
8. Testy (Vitest + React Testing Library)
   - Render loading → render kart po sukcesie GET.
   - Toggle karty aktualizuje stan.
   - „Dalej” wywołuje PATCH z poprawną listą id i nawiguje.
   - „Skip” nie wywołuje PATCH i nawiguje.
   - 401/403 → wywołane przekierowanie do logowania.
9. Style
   - Tailwind: siatka `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, stany hover/focus.
10. Integracja z Krokiem 2
   - Upewnij się, że `/onboarding/first-movies` istnieje lub dodaj placeholder.
