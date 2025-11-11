## Plan implementacji widoku Profil użytkownika

## 1. Przegląd
Widok profilu w ścieżce `/app/profile` służy do zarządzania preferencjami platform VOD użytkownika oraz ustawieniami konta (w tym RODO – trwałe usunięcie konta). Użytkownik widzi swój email, może zaznaczać/odznaczać platformy, zapisać zmiany i w sekcji „Strefa zagrożenia” usunąć konto po potwierdzeniu w oknie dialogowym. Po zapisie zmiany natychmiast wpływają na wspólny layout watchlisty/obejrzanych (przycisk „Ukryj niedostępne” oraz liczniki w `MediaToolbar`), na sugestie AI oraz na ikony dostępności w kartach filmów.

## 2. Routing widoku
- Ścieżka: `/app/profile`
- Ochrona: trasa chroniona (wymaga zalogowania i ważnych tokenów JWT)
- React Router: dodać wpis do konfiguracji routingu aplikacji (np. element `ProfilePage`) w obrębie sekcji `/app/*`
- Po wylogowaniu lub utracie autoryzacji: przekierowanie do strony logowania

## 3. Struktura komponentów
```
ProfilePage
  ├─ PageHeader (titulacja + email)
  ├─ PlatformPreferencesCard
  │   ├─ PlatformCheckboxGroup
  │   │   └─ PlatformCheckboxItem × N (spodziewane 5)
  │   └─ SaveChangesBar (Zapisz zmiany / Anuluj)
  ├─ Separator
  ├─ ChangePasswordCard
  └─ DangerZoneCard
      └─ DeleteAccountSection
          └─ AlertDialog (potwierdzenie usunięcia)

+ Toaster (globalnie, np. shadcn/ui useToast)
```

## 4. Szczegóły komponentów
### ProfilePage
- Opis: Kontener strony. Pobiera profil i listę platform, orkiestruje zapis zmian i usunięcie konta, zarządza stanem lokalnym selekcji.
- Główne elementy: wrapper, `PageHeader`, `PlatformPreferencesCard`, `DangerZoneCard`, globalny Toaster.
- Obsługiwane interakcje: inicjalne pobranie danych; zapis zmian; inicjowanie usuwania konta.
- Walidacja: brak twardej walidacji formularzowej; kontrola typów i spójności ID platform.
- Typy: `UserProfileDto`, `PlatformDto`, `UpdateUserProfileCommand`, `PlatformSelectionViewModel`, `DeleteAccountViewModel`.
- Propsy: brak (widok routowany); korzysta z hooków i query clienta.

### PageHeader
- Opis: Nagłówek strony z tytułem „Profil” oraz podtytułem zawierającym email użytkownika.
- Elementy: `h1/h2`, tekst email, opcjonalnie ikona/avatar inicjałów.
- Interakcje: brak.
- Walidacja: brak.
- Typy: `{ email: string }`.
- Propsy: `email: string`.

### PlatformPreferencesCard
- Opis: Karta z sekcją „Moje platformy VOD”. Zawiera grupę checkboxów z ikonami i opisami oraz pasek akcji zapisu.
- Elementy: `Card`, `CardHeader` (tytuł, opis), `CardContent` (checkboxy), `CardFooter` (pasek akcji).
- Interakcje: zaznaczanie/odznaczanie platform, wyliczanie stanu „dirty”, aktywacja przycisku „Zapisz zmiany”.
- Walidacja: dopuszcza 0..N platform (0 jest dozwolone zgodnie z PRD).
- Typy: `PlatformDto[]`, `PlatformSelectionViewModel`.
- Propsy: `{ platforms: PlatformDto[]; selectedIds: number[]; onToggle(id: number): void; dirty: boolean; saving: boolean; onSave(): void; onReset(): void }`.

### PlatformCheckboxGroup
- Opis: Kontrolka grupująca listę platform w postaci checkboxów z ikonami.
- Elementy: lista elementów `PlatformCheckboxItem` w układzie siatki, opis, ewentualny helper text.
- Interakcje: toggle poszczególnych pozycji, wsparcie klawiatury/aria-checked.
- Walidacja: wymusza spójność ID (z puli dostępnych platform), brak dodatkowych ograniczeń.
- Typy: `PlatformDto[]`, `number[]` (selectedIds).
- Propsy: `{ platforms: PlatformDto[]; selectedIds: number[]; onToggle(id: number): void }`.

### PlatformCheckboxItem
- Opis: Pojedynczy checkbox platformy z ikoną i etykietą.
- Elementy: `input[type="checkbox"]` lub komponent `Checkbox` (shadcn/ui), ikona platformy, label z `platform_name`.
- Interakcje: kliknięcie/klawiatura zmienia zaznaczenie; focus ring; aria.
- Walidacja: brak.
- Typy: `PlatformDto`.
- Propsy: `{ platform: PlatformDto; checked: boolean; onChange(id: number): void }`.

### SaveChangesBar
- Opis: Pasek akcji do zapisu zmian preferencji z informacją o stanie i anulowaniu.
- Elementy: przycisk `Zapisz zmiany` (primary), opcjonalnie `Anuluj` (przywraca stan wyjściowy), wskaźnik ładowania.
- Interakcje: klik „Zapisz” wywołuje PATCH; „Anuluj” resetuje zaznaczenia do stanu z serwera.
- Walidacja: przycisk „Zapisz” disabled gdy `dirty === false` lub `saving === true`.
- Typy: proste booleany + callbacki.
- Propsy: `{ dirty: boolean; saving: boolean; onSave(): void; onReset(): void }`.

### ChangePasswordCard
- Opis: Karta do zmiany hasła.
- Elementy: pola na obecne hasło, nowe hasło i potwierdzenie nowego hasła.
- Interakcje: wysyłanie formularza.
- Walidacja: siła hasła, zgodność.
- Typy: `ChangePasswordCommand`.
- Propsy: `{ onSubmit: (data: ChangePasswordCommand) => void; isSubmitting: boolean; error?: string }`.

### DangerZoneCard
- Opis: Karta „Strefa zagrożenia” z akcją usunięcia konta.
- Elementy: tytuł, opis, przycisk `Usuń konto` w wariancie destrukcyjnym.
- Interakcje: otwarcie `AlertDialog`.
- Walidacja: brak.
- Typy: brak specjalnych.
- Propsy: `{ onRequestDelete(): void }`.

### DeleteAccountSection (AlertDialog)
- Opis: Dialog potwierdzający RODO – trwałe usunięcie konta.
- Elementy: `AlertDialogHeader`, treść ostrzeżenia, przyciski „Anuluj” i „Tak, usuń”.
- Interakcje: potwierdzenie usuwa konto; anulowanie zamyka dialog bez zmian.
- Walidacja: blokada potwierdzenia podczas żądania (loading), focus trap, aria-labels.
- Typy: `DeleteAccountViewModel`.
- Propsy: `{ open: boolean; onOpenChange(open: boolean): void; deleting: boolean; onConfirm(): void }`.

## 5. Typy
- Istniejące (frontend `src/types/api.types.ts`):
  - `PlatformDto`
  - `UserProfileDto` { email: string; platforms: PlatformDto[] }
  - `UpdateUserProfileCommand` { platforms: number[] }
- Nowe (ViewModel dla widoku):
```ts
type PlatformSelectionViewModel = {
  allPlatforms: PlatformDto[];
  selectedPlatformIds: number[];
  initialSelectedPlatformIds: number[];
  isDirty: boolean; // selectedPlatformIds !== initialSelectedPlatformIds
  isSaving: boolean;
};

type DeleteAccountViewModel = {
  isDialogOpen: boolean;
  isDeleting: boolean;
  error?: string;
};

// Stałe klucze zapytań TanStack Query
const QueryKeys = {
  userProfile: ['userProfile'] as const,
  platforms: ['platforms'] as const,
  userMovies: ['userMovies'] as const,
  aiSuggestions: ['aiSuggestions'] as const,
} as const;
```

## 6. Zarządzanie stanem
- Pobieranie danych: TanStack Query
  - `useQuery(UserProfile)` → GET `/api/me/`
  - `useQuery(Platforms)` → GET `/api/platforms/` (lista dla checkboxów z ikonami)
- Mutacje:
  - `useMutation(UpdateUserPlatforms)` → PATCH `/api/me/` z `UpdateUserProfileCommand`
  - `useMutation(DeleteAccount)` → DELETE (patrz Integracja API)
  - `useChangePasswordMutation()` → POST `/api/me/change-password/`
- Stan lokalny:
  - `selectedPlatformIds` (kontroluje zaznaczenia w grupie)
  - `initialSelectedPlatformIds` (z profilu)
  - `isDirty` wyliczane przez porównanie zbiorów
  - Dialog usunięcia: `isDialogOpen`, `isDeleting`
- Po sukcesie PATCH:
  - Aktualizacja stanu początkowego = bieżące zaznaczenia; `isDirty = false`
  - `invalidateQueries(QueryKeys.userProfile, QueryKeys.userMovies, QueryKeys.aiSuggestions)`
  - Emisja/aktualizacja flagi globalnej „hasSelectedPlatforms = platforms.length > 0” (wykorzystywana w `FiltersBar`/`WatchedFiltersBar` do aktywacji/dezaktywacji przycisku „Ukryj niedostępne” i w logice sugestii AI)
- Po sukcesie DELETE:
  - Wyczyść tokeny (localStorage), `queryClient.clear()` i przekieruj na `/` + toast „Konto zostało usunięte”.

## 7. Integracja API
- GET `/api/me/` (wymaga JWT)
  - Response: `UserProfileDto`
- PATCH `/api/me/` (wymaga JWT)
  - Body: `UpdateUserProfileCommand` np. `{ "platforms": [1,3] }`
  - Response: `UserProfileDto` (zaktualizowany profil)
- GET `/api/platforms/` (publiczny)
  - Response: `PlatformDto[]` (id, platform_slug, platform_name)
- DELETE konto (RODO) – do ustalenia po stronie backend (brak w aktualnym kodzie):
  - Propozycja: `DELETE /api/me/` → 204 No Content
  - Alternatywa: `POST /api/me/delete` → 200 OK
  - Frontend zakłada 2xx jako sukces. Po sukcesie czyści sesję i przekierowuje.
- Uwagi dot. bezpieczeństwa i sesji:
  - Axios z interceptorami odświeżania tokena (US-043). Gdy odświeżenie nie powiedzie się → redirect do logowania.

## 8. Interakcje użytkownika
- Zaznaczenie/odznaczenie platformy → aktualizacja `selectedPlatformIds`, ustawienie `isDirty = true`.
- Klik „Zapisz zmiany” → PATCH `/api/me/` → toast sukcesu „Zapisano zmiany” → invalidacja danych (watchlista, sugestie AI) i aktualizacja ikon dostępności.
- Klik „Anuluj” → przywrócenie zaznaczeń do `initialSelectedPlatformIds`, `isDirty = false`.
- Klik „Usuń konto” → otwarcie `AlertDialog` z ostrzeżeniem →
  - „Anuluj” → zamknięcie dialogu bez efektu
  - „Tak, usuń” → DELETE (patrz wyżej) → czyszczenie sesji, redirect `/`, toast „Konto zostało usunięte”.
- Błędy → toast z przyjaznym komunikatem, pozostanie na stronie, możliwość ponowienia.

## 9. Warunki i walidacja
- Platformy: dozwolone 0..N; UI nie wymusza minimum. Wysyłamy zawsze tablicę ID (pusta dozwolona).
- Spójność ID: wysyłane ID muszą należeć do listy pobranych `PlatformDto`; UI filtruje/ignoruje spoza zakresu.
- Przycisk „Zapisz zmiany”: disabled, gdy `!isDirty` lub trwa zapis.
- Po zapisaniu 0 platform: globalnie ustaw „hasSelectedPlatforms = false” → watchlista wyłącza filtr „Tylko dostępne na moich platformach”.
- Dialog: przycisk „Tak, usuń” disabled podczas żądania; focus trap; ESC zamyka (opcjonalnie).

## 10. Obsługa błędów
- GET `/api/me/`: 
  - 401 → próba automatycznego odświeżenia; jeśli nieudane → redirect do logowania.
  - 5xx / sieć → komunikat w karcie i przycisk „Spróbuj ponownie”.
- PATCH `/api/me/`:
  - 400 (np. nieprawidłowe ID) → toast „Nie udało się zapisać zmian. Sprawdź wybrane platformy.”
  - 401 → jw. odświeżenie/redirect
  - 5xx → toast „Wystąpił błąd. Spróbuj ponownie później.”, nie resetuj lokalnych zmian.
- DELETE konto:
  - 2xx → sukces (czyść sesję i przekieruj)
  - 401/403 → potraktuj jak utratę sesji: czyść lokalnie i przekieruj z komunikatem
  - 5xx → toast „Nie udało się usunąć konta. Spróbuj ponownie później.”

## 11. Kroki implementacji
1. Routing
   - Dodaj trasę `/app/profile` do konfiguracji React Router (chroniona trasa) i placeholder `ProfilePage`.
2. Hooki i klient API
   - Zapewnij instancję Axios z interceptorami JWT (odświeżanie tokena na 401).
   - Utwórz hooki:
     - `useUserProfileQuery()` → GET `/api/me/`
     - `usePlatformsQuery()` → GET `/api/platforms/`
     - `useUpdateUserPlatformsMutation()` → PATCH `/api/me/`
     - `useDeleteAccountMutation()` → tymczasowo w oparciu o `DELETE /api/me/` (po potwierdzeniu backendu zaktualizować w razie potrzeby)
     - `useChangePasswordMutation()` → POST `/api/me/change-password/`
3. UI – szkielety
   - Zbuduj `ProfilePage` z loaderem (skeleton) i stanami błędów.
   - Dodaj `PageHeader` z emailem z `UserProfileDto`.
4. Preferencje platform
   - Zbuduj `PlatformPreferencesCard` z `PlatformCheckboxGroup` i elementami `PlatformCheckboxItem` z ikonami przypisanymi do `platform_slug`.
   - Zaimplementuj stan lokalny `selectedPlatformIds`, inicjuj z danych profilu.
   - Dodaj `SaveChangesBar` z logiką `dirty/saving` oraz akcjami `onSave` (PATCH) i `onReset`.
5. Logika zapisu
   - Na `onSave`: wyślij `UpdateUserProfileCommand` z posortowaną listą ID.
   - Po sukcesie: toast „Zapisano zmiany”, ustaw nowy stan bazowy, `invalidateQueries` profilu, userMovies i aiSuggestions.
   - Zaktualizuj globalną flagę „hasSelectedPlatforms”.
6. Zmiana hasła
   - Zbuduj `ChangePasswordCard` z polami na obecne hasło, nowe hasło i potwierdzenie nowego hasła.
   - Zaimplementuj walidację po stronie klienta dla siły hasła i zgodności.
   - Na `onSubmit`: wywołaj mutację `useChangePasswordMutation` z `ChangePasswordCommand`.
   - Po sukcesie: wyczyść formularz i wyświetl toast „Hasło zostało zmienione”.
   - W przypadku błędu: wyświetl odpowiedni toast z informacją o błędzie (np. „Nieprawidłowe obecne hasło”).
7. Strefa zagrożenia
   - Zbuduj `DangerZoneCard` i `DeleteAccountSection` z `AlertDialog` (shadcn/ui) i treścią ostrzeżenia z PRD.
   - Na potwierdzeniu: wywołaj mutację usunięcia, w trakcie zablokuj przyciski, po sukcesie czyść sesję i redirect.
8. Dostępność/UX
   - Zapewnij aria-atributy dla checkboxów i dialogu, focus management, stany `disabled`, skeletony i komunikaty błędów.
9. Testy
   - Testy komponentów: logika `dirty`, enable/disable przycisków, wywołanie PATCH z poprawnym payloadem, zachowanie dialogu.
   - Testy integracyjne z mockiem API: sukces i błędy dla GET/PATCH/DELETE.
10. Dokumentacja
    - Krótki README sekcji profilu (przepływy, klucze zapytań, zależności od watchlisty) i adnotacja, że endpoint usunięcia konta jest wymagany po stronie backendu.


