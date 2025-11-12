# Plan implementacji przycisku "Usuń" w widoku watched movies - Zaimplementowane

## Cel
Dodanie przycisku "Usuń" w widoku `/app/watched`, który pozwoli użytkownikowi usunąć filmy z historii obejrzanych filmów. Przycisk ma być umieszczony w prawym dolnym rogu, z prawej strony przycisku "Przywróć".

## Analiza obecnego stanu

### Schemat bazy danych (`db-plan.md`)
- `watchlist_deleted_at` - **soft-delete dla watchlist** (nie dla watched!)
- `watched_at` - timestamp gdy film został oznaczony jako obejrzany
- **Brak** kolumny `watched_deleted_at` - nie ma mechanizmu soft-delete dla watched movies

### Backend - Problem z obecną implementacją ❌

**Endpoint DELETE** (`DELETE /api/user-movies/<id>/`):
- Ustawia tylko `watchlist_deleted_at = NOW()` (soft-delete dla watchlist)
- **Nie zmienia** `watched_at`
- Dokumentacja mówi: "Soft-deletes a movie from the user's watchlist"

**Query dla watched** (`GET /api/user-movies/?status=watched`):
```python
UserMovie.objects.filter(
    user_id=supabase_user_uuid,
    watched_at__isnull=False  # Is watched
)
```
- **NIE filtruje** `watchlist_deleted_at`
- Więc jeśli DELETE ustawi `watchlist_deleted_at`, film nadal będzie widoczny w watched!

**Problem**: 
- Jeśli użytkownik usunie watched movie używając DELETE:
  1. `watchlist_deleted_at` zostanie ustawiony (soft-delete dla watchlist)
  2. `watched_at` pozostanie ustawiony (film nadal jest watched)
  3. Film **nadal będzie widoczny** w `GET /api/user-movies/?status=watched`!
  4. Film nie będzie widoczny w watchlist (bo `watchlist_deleted_at IS NOT NULL`)

**Uwaga**: Gdy film jest oznaczony jako watched (`mark_as_watched`), backend ustawia również `watchlist_deleted_at` (linia 331 w `user_movies_service.py`). Więc watched movies mają już `watchlist_deleted_at` ustawiony, więc filtrowanie `watchlist_deleted_at IS NULL` w query watched nie zadziała poprawnie!

### Rozwiązanie - Hard delete dla watched movies ⚠️

**Wybrana opcja**: Hard delete dla watched movies (ustawić `watched_at = NULL`)

**Logika**:
- Modyfikacja `delete_user_movie_soft` aby wykrywał czy film jest watched
- Jeśli `watched_at IS NOT NULL` → ustawić `watched_at = NULL` (hard delete z watched)
- Jeśli `watched_at IS NULL` → ustawić `watchlist_deleted_at = NOW()` (soft-delete z watchlist)

**Efekt**:
- Film zniknie z watched (query filtruje `watched_at__isnull=False`)
- Film zostanie zachowany w bazie (jeśli był w watchlist przed oznaczeniem jako watched)
- Jeśli film miał `watchlisted_at` przed oznaczeniem jako watched, może zostać przywrócony do watchlisty

**Uwagi**:
- To nie jest soft-delete - operacji nie można cofnąć
- Hard delete jest odpowiedni dla historii obejrzanych filmów (użytkownik może ponownie oznaczyć film jako watched jeśli chce)

### Frontend - Watchlist (referencja)
- `WatchlistPage` używa hooka `useDeleteFromWatchlist` do usuwania filmów
- Dialog potwierdzenia (`ConfirmDialog`) jest używany przed usunięciem
- Przycisk delete jest dostępny w `MovieRow` i `MovieCard` (komponenty watchlist)

### Frontend - Watched (obecny stan)
- `WatchedPage` używa hooka `useRestoreToWatchlist` do przywracania filmów
- Komponenty `UserMovieRow` i `UserMovieCard` mają tylko przycisk "Przywróć"
- Brak funkcjonalności usuwania

## Plan implementacji

### 1. Utworzenie hooka do usuwania z watched

**Plik**: `myVOD/frontend/myVOD/src/hooks/useWatchedActions.ts`

**Zmiany**:
- Dodanie importu `deleteUserMovie` z `@/lib/api/movies`
- Dodanie importu `useQueryClient` z `@tanstack/react-query` (jeśli nie jest już zaimportowany)
- Dodanie nowego hooka `useDeleteFromWatched` (uproszczony bez undo - hard delete)
- Hook powinien:
  - Używać `deleteUserMovie` z API client
  - Aktualizować cache dla `["user-movies", "watched"]`
  - Wyświetlać toast z komunikatem sukcesu/błędu
  - Obsługiwać optymistyczne aktualizacje
  - **Uwaga**: Hard delete nie obsługuje undo (operacja nieodwracalna)

**Szczegóły implementacji**:
```typescript
export function useDeleteFromWatched() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return deleteUserMovie(id);
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ["user-movies", "watched"] });
      const previousData = queryClient.getQueryData<UserMovieDto[]>(["user-movies", "watched"]);
      
      // Find the movie being deleted for toast message
      const movieToDelete = previousData?.find(movie => movie.id === id);
      
      // Optimistically remove the movie from watched list
      queryClient.setQueryData<UserMovieDto[]>(["user-movies", "watched"], (old) =>
        old ? old.filter(movie => movie.id !== id) : []
      );
      
      return { previousData, movieToDelete };
    },
    onSuccess: (_, id, context) => {
      const movieTitle = context?.movieToDelete?.movie.primary_title || "Film";
      toast.success(`"${movieTitle}" usunięto z historii obejrzanych`);
    },
    onError: (_, __, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData(["user-movies", "watched"], context.previousData);
      }
      toast.error("Nie udało się usunąć filmu z historii obejrzanych");
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["user-movies", "watched"] });
    },
  });
}
```

**Uwaga**: Hard delete nie obsługuje undo - operacja jest nieodwracalna. Użytkownik może ponownie oznaczyć film jako watched jeśli chce.

### 2. Aktualizacja komponentów UserMovieRow i UserMovieCard

**Pliki**:
- `myVOD/frontend/myVOD/src/components/watched/UserMovieRow.tsx`
- `myVOD/frontend/myVOD/src/components/watched/UserMovieCard.tsx`

**Zmiany**:
- Dodanie prop `onDelete: (id: number) => void`
- Dodanie prop `isDeleting?: boolean`
- Zmiana layoutu przycisków:
  - W `UserMovieRow`: przyciski w kontenerze z `flex gap-2` umieszczonym w prawym dolnym rogu (z prawej strony przycisku "Przywróć")
  - W `UserMovieCard`: przyciski w kontenerze z `flex gap-2` poniżej przycisku "Przywróć"
- Dodanie przycisku delete z ikoną `Trash2` (jak w watchlist)

**Szczegóły dla UserMovieRow**:
```typescript
// Zmiana w sekcji Action Button (linia ~118):
<div className="ml-4 flex-shrink-0 flex gap-2">
  <RestoreButton ... />
  <Button
    size="sm"
    variant="destructive"
    onClick={() => onDelete(item.id)}
    disabled={isDeleting}
    className="flex items-center gap-2"
    aria-label={`Usuń "${item.title}" z historii obejrzanych`}
  >
    <Trash2 className="w-4 h-4" aria-hidden="true" />
  </Button>
</div>
```

**Szczegóły dla UserMovieCard**:
```typescript
// Zmiana w sekcji Action Button (linia ~108):
<div className="flex gap-2">
  <RestoreButton ... />
  <Button
    size="sm"
    variant="destructive"
    onClick={() => onDelete(item.id)}
    disabled={isDeleting}
    className="flex items-center gap-2"
    aria-label={`Usuń "${item.title}" z historii obejrzanych`}
  >
    <Trash2 className="w-4 h-4" aria-hidden="true" />
  </Button>
</div>
```

### 3. Aktualizacja komponentów pośrednich (WatchedGrid, WatchedList)

**Pliki**:
- `myVOD/frontend/myVOD/src/components/watched/WatchedGrid.tsx`
- `myVOD/frontend/myVOD/src/components/watched/WatchedList.tsx`
- `myVOD/frontend/myVOD/src/components/watched/WatchedContent.tsx`

**Zmiany**:
- Dodanie prop `onDelete: (id: number) => void`
- Dodanie prop `isDeleting?: boolean`
- Przekazywanie props do `UserMovieRow` i `UserMovieCard`

### 4. Aktualizacja WatchedPage

**Plik**: `myVOD/frontend/myVOD/src/pages/WatchedPage.tsx`

**Zmiany**:
- Dodanie importu `useDeleteFromWatched` z `useWatchedActions`
- Dodanie importu `ConfirmDialog` z `@/components/watchlist/ConfirmDialog`
- Dodanie importu `useState` (jeśli nie jest już zaimportowany)
- Dodanie hooka `useDeleteFromWatched()`
- Dodanie state dla dialogu potwierdzenia (podobnie jak w `WatchlistPage`)
- Dodanie handlera `handleDelete` z dialogiem potwierdzenia
- Przekazanie `onDelete` i `isDeleting` do `WatchedContent`
- Dodanie komponentu `ConfirmDialog` do renderu

**Szczegóły implementacji**:
```typescript
// Dodanie hooka
const deleteFromWatchedMutation = useDeleteFromWatched();

// Dodanie state dla dialogu
const [confirmDialog, setConfirmDialog] = useState<{
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}>({
  open: false,
  title: "",
  message: "",
  onConfirm: () => {},
});

// Handler
const handleDelete = (id: number) => {
  const movie = filteredItems.find(item => item.id === id);
  if (!movie) return;

  setConfirmDialog({
    open: true,
    title: "Usuń film z historii obejrzanych",
    message: `Czy na pewno chcesz usunąć "${movie.title}" z Twojej historii obejrzanych? Ta operacja jest nieodwracalna.`,
    onConfirm: () => {
      deleteFromWatchedMutation.mutate(id);
      setConfirmDialog(prev => ({ ...prev, open: false }));
    },
  });
};

// W renderze:
<WatchedContent
  ...
  onDelete={handleDelete}
  isDeleting={deleteFromWatchedMutation.isPending}
/>

<ConfirmDialog
  open={confirmDialog.open}
  onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
  title={confirmDialog.title}
  message={confirmDialog.message}
  onConfirm={confirmDialog.onConfirm}
/>
```

### 5. Dodanie importu ikony Trash2

**Pliki**:
- `myVOD/frontend/myVOD/src/components/watched/UserMovieRow.tsx`
- `myVOD/frontend/myVOD/src/components/watched/UserMovieCard.tsx`

**Zmiany**:
- Dodanie importu `Trash2` z `lucide-react`

## Czy potrzebne są zmiany w backendzie?

**Odpowiedź: TAK** - Backend wymaga modyfikacji, aby DELETE działał poprawnie dla watched movies.

### Problem

Obecna implementacja DELETE:
- Ustawia tylko `watchlist_deleted_at` (soft-delete dla watchlist)
- Nie zmienia `watched_at`
- Query watched nie filtruje `watchlist_deleted_at`
- **Rezultat**: Film usunięty z watched nadal będzie widoczny w liście watched!

### Rozwiązanie - Hard delete dla watched movies

Modyfikacja `delete_user_movie_soft` aby wykrywał czy film jest watched i odpowiednio obsługiwał:

```python
@transaction.atomic
def delete_user_movie_soft(*, user, user_movie_id: int):
    # Resolve canonical user UUID for the user
    supabase_user_uuid = _resolve_user_uuid(user)

    # Guard clause: Fetch the user_movie and ensure it belongs to authenticated user
    try:
        user_movie = UserMovie.objects.get(id=user_movie_id, user_id=supabase_user_uuid)
    except UserMovie.DoesNotExist:
        raise UserMovie.DoesNotExist(
            f"UserMovie with id {user_movie_id} not found or does not belong to user"
        )

    # Guard clause: Check if already soft-deleted (only for watchlist)
    if user_movie.watchlist_deleted_at is not None and user_movie.watched_at is None:
        raise UserMovie.DoesNotExist(
            f"UserMovie with id {user_movie_id} not found or does not belong to user"
        )

    # Determine if movie is watched or on watchlist
    is_watched = user_movie.watched_at is not None
    
    if is_watched:
        # Hard delete from watched: set watched_at to NULL
        user_movie.watched_at = None
        user_movie.save(update_fields=['watched_at'])
    else:
        # Soft delete from watchlist: set watchlist_deleted_at
        user_movie.watchlist_deleted_at = timezone.now()
        user_movie.save(update_fields=['watchlist_deleted_at'])
    
    return user_movie
```

**Plusy**:
- Nie wymaga zmian w schemacie bazy danych
- Nie wymaga zmian w query watched (już filtruje `watched_at__isnull=False`)
- Film zniknie z watched po DELETE
- Jeśli film był w watchlist przed oznaczeniem jako watched, może zostać przywrócony do watchlisty

**Minusy**:
- Hard delete z watched (operacja nieodwracalna)
- Brak możliwości cofnięcia operacji (undo)

**Uwaga**: Hard delete jest odpowiedni dla historii obejrzanych filmów - użytkownik może ponownie oznaczyć film jako watched jeśli chce go przywrócić.

## Checklist implementacji

### Backend (WYMAGANE przed frontend)
- [ ] Modyfikacja `delete_user_movie_soft` w `services/user_movies_service.py` aby obsługiwać watched movies
- [ ] Dodanie logiki wykrywania czy film jest watched (`watched_at IS NOT NULL`)
- [ ] Implementacja hard delete dla watched (`watched_at = NULL`) gdy film jest watched
- [ ] Zachowanie soft delete dla watchlist (`watchlist_deleted_at = NOW()`) gdy film nie jest watched
- [ ] Aktualizacja guard clause aby obsługiwać zarówno watched jak i watchlist
- [ ] Testy jednostkowe dla DELETE watched movies (hard delete)
- [ ] Testy jednostkowe dla DELETE watchlist movies (soft delete - zachowanie istniejącego zachowania)
- [ ] Testy integracyjne dla DELETE watched movies

### Frontend
- [ ] Utworzenie hooka `useDeleteFromWatched` w `useWatchedActions.ts`
- [ ] Dodanie importu `deleteUserMovie` do `useWatchedActions.ts`
- [ ] Aktualizacja `UserMovieRow` - dodanie prop `onDelete` i `isDeleting`
- [ ] Aktualizacja `UserMovieRow` - dodanie przycisku delete z ikoną Trash2
- [ ] Aktualizacja `UserMovieCard` - dodanie prop `onDelete` i `isDeleting`
- [ ] Aktualizacja `UserMovieCard` - dodanie przycisku delete z ikoną Trash2
- [ ] Aktualizacja `WatchedGrid` - przekazanie props `onDelete` i `isDeleting`
- [ ] Aktualizacja `WatchedList` - przekazanie props `onDelete` i `isDeleting`
- [ ] Aktualizacja `WatchedContent` - przekazanie props `onDelete` i `isDeleting`
- [ ] Aktualizacja `WatchedPage` - dodanie hooka `useDeleteFromWatched`
- [ ] Aktualizacja `WatchedPage` - dodanie state dla dialogu potwierdzenia
- [ ] Aktualizacja `WatchedPage` - dodanie handlera `handleDelete`
- [ ] Aktualizacja `WatchedPage` - dodanie komponentu `ConfirmDialog`
- [ ] Testowanie funkcjonalności - usuwanie filmu z watched
- [ ] Testowanie funkcjonalności - layout przycisków w widoku listy i siatki

## Uwagi techniczne

1. **Hard delete - brak undo**: 
   - Hard delete (`watched_at = NULL`) jest operacją nieodwracalną
   - Hook nie obsługuje undo - operacja jest uproszczona
   - Użytkownik może ponownie oznaczyć film jako watched jeśli chce go przywrócić do historii

2. **Dialog potwierdzenia**: 
   - Ze względu na nieodwracalność operacji, dialog potwierdzenia jest szczególnie ważny
   - Komunikat powinien jasno informować, że operacja jest nieodwracalna

3. **Layout**: 
   - W widoku listy (`UserMovieRow`) przyciski powinny być w prawym dolnym rogu, z prawej strony przycisku "Przywróć"
   - W widoku siatki (`UserMovieCard`) przyciski mogą być obok siebie w jednej linii

4. **Accessibility**: 
   - Przyciski powinny mieć odpowiednie `aria-label` dla czytników ekranu
   - Dialog potwierdzenia powinien być dostępny dla czytników ekranu

5. **Loading state**: 
   - Przycisk delete powinien być disabled podczas usuwania (`isDeleting`)

6. **Error handling**: 
   - Hook powinien obsługiwać błędy i wyświetlać odpowiednie komunikaty
   - Błędy powinny być wyświetlane w toast z jasnym komunikatem

7. **Backend - zachowanie istniejącego zachowania**: 
   - Soft delete dla watchlist musi pozostać bez zmian
   - Tylko watched movies będą używane hard delete

