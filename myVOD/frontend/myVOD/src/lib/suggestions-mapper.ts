import type { SuggestionItemDto, AISuggestionsDto } from "@/types/api.types";
import type {
  AISuggestionCardVM,
  AISuggestionsViewModel,
} from "@/types/view/suggestions.types";

interface ApiError extends Error {
  response?: {
    status?: number;
  };
}

/**
 * Maps API DTO to ViewModel for a single suggestion card.
 * Handles poster URL construction (TMDB base URL + poster_path).
 *
 * @param dto - API suggestion item DTO
 * @returns ViewModel for suggestion card
 */
function mapSuggestionItemToVM(dto: SuggestionItemDto): AISuggestionCardVM {
  // TMDB poster base URL
  const TMDB_POSTER_BASE = "https://image.tmdb.org/t/p/w500";

  let posterUrl: string | null = null;
  if (dto.poster_path) {
    // If poster_path is already a full URL, use it; otherwise construct from base
    if (dto.poster_path.startsWith("http")) {
      posterUrl = dto.poster_path;
    } else {
      posterUrl = `${TMDB_POSTER_BASE}${dto.poster_path}`;
    }
  }

  return {
    tconst: dto.tconst,
    title: dto.primary_title,
    year: dto.start_year,
    genres: dto.genres ?? null,
    justification: dto.justification,
    posterUrl,
    availability: dto.availability,
  };
}

/**
 * Maps API DTO to ViewModel for AI suggestions view.
 * Processes suggestions array and determines rate limit status.
 *
 * @param dto - API suggestions DTO (can be null for error states)
 * @param error - Error object if request failed
 * @returns ViewModel for suggestions view
 */
export function mapAISuggestionsToVM(
  dto: AISuggestionsDto | null,
  error: Error | null
): AISuggestionsViewModel {
  const apiError = error as ApiError;
  if (apiError && apiError?.response?.status === 429) {
    // Rate limited - return empty with rate limit flag
    return {
      expiresAt: null,
      items: [],
      isRateLimited: true,
      errorMessage: "Limit dzienny został osiągnięty",
    };
  }

  if (apiError && apiError?.response?.status === 404) {
    // No data available
    return {
      expiresAt: null,
      items: [],
      isRateLimited: false,
      errorMessage: "Brak danych do wygenerowania sugestii",
    };
  }

  if (error) {
    // Other error
    return {
      expiresAt: null,
      items: [],
      isRateLimited: false,
      errorMessage:
        error.message || "Wystąpił błąd podczas pobierania sugestii",
    };
  }

  if (!dto) {
    return {
      expiresAt: null,
      items: [],
      isRateLimited: false,
      errorMessage: "Brak danych",
    };
  }

  // Success case - map suggestions
  const items = dto.suggestions.map(mapSuggestionItemToVM);

  return {
    expiresAt: dto.expires_at,
    items,
    isRateLimited: false,
  };
}
