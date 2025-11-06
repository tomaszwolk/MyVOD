import { Info } from "lucide-react";

/**
 * Props for SearchNoResultsItem component.
 */
interface SearchNoResultsItemProps {
  query: string;
}

/**
 * SearchNoResultsItem component - pozycja w dropdown autocomplete przy braku wyników.
 * Opis: Pozycja w dropdown autocomplete przy braku wyników (US-010).
 * Główne elementy: ikonka info, "Nie znaleziono filmów", podpowiedź "Spróbuj wpisać tytuł oryginalny filmu".
 * Obsługiwane interakcje: brak akcji; dropdown pozostaje otwarty.
 * Obsługiwana walidacja: renderowane tylko dla query.length >= 2 && results.length === 0.
 * Propsy: query: string.
 */
export function SearchNoResultsItem({ query: _query }: SearchNoResultsItemProps) {
  return (
    <div
      className="flex flex-col items-center gap-2 p-6 text-center"
      role="status"
      aria-live="polite"
    >
      <Info className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <div className="text-sm font-medium text-foreground">
        Nie znaleziono filmów
      </div>
      <div className="text-xs text-muted-foreground max-w-xs">
        Spróbuj wpisać tytuł oryginalny filmu lub sprawdź pisownię
      </div>
    </div>
  );
}
