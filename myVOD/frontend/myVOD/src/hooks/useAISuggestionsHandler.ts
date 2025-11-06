import { useState } from "react";
import { toast } from "sonner";
import { useAISuggestions } from "@/hooks/useAISuggestions";
import { useAddMovie } from "@/hooks/useAddMovie";

interface ApiError extends Error {
  response?: {
    status?: number;
  };
}

/**
 * Hook for handling AI suggestions with modal state and movie adding.
 * Manages the complete flow of showing suggestions, handling errors, and adding movies.
 */
export function useAISuggestionsHandler() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addedTconsts, setAddedTconsts] = useState<Set<string>>(new Set());

  // AI suggestions query
  const suggestionsQuery = useAISuggestions();

  // Add movie mutation
  const addMovieMutation = useAddMovie();

  const openModal = () => {
    setIsModalOpen(true);
    // Trigger suggestions fetch when modal opens
    suggestionsQuery.refetch();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    // Clear added movies when modal closes
    setAddedTconsts(new Set());
  };

  const addFromSuggestion = async (tconst: string) => {
    try {
      await addMovieMutation.mutateAsync({ tconst });
      setAddedTconsts(prev => new Set([...prev, tconst]));
      toast.success("Film dodany do watchlisty");
    } catch (error) {
      const apiError = error as ApiError;
      // Handle specific error cases
      if (apiError?.response?.status === 409) {
        toast.info("Ten film jest już na Twojej watchliście");
        setAddedTconsts(prev => new Set([...prev, tconst]));
      } else {
        toast.error("Nie udało się dodać filmu");
      }
    }
  };

  const handleSuggestClick = () => {
    // Check if suggestions are rate limited
    const error = suggestionsQuery.error as ApiError;
    if (error?.response?.status === 429) {
      toast.error("Limit sugestii AI został osiągnięty. Spróbuj ponownie później.");
      return;
    }

    openModal();
  };

  const isSuggestDisabled = (suggestionsQuery.error as ApiError)?.response?.status === 429;

  return {
    // Modal state
    isModalOpen,
    openModal,
    closeModal,

    // Suggestions data
    suggestionsData: suggestionsQuery.data,
    isLoading: suggestionsQuery.isLoading,
    error: suggestionsQuery.error,

    // Adding movies
    addFromSuggestion,
    isAdding: addMovieMutation.isPending,
    addedTconsts,

    // UI state
    handleSuggestClick,
    isSuggestDisabled,
  };
}
