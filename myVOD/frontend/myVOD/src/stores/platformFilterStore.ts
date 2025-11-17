import { create } from 'zustand';
import { PlatformDto } from '@/types/api.types';

/**
 * Store for managing global platform filters across the application.
 * Handles selection/deselection of VOD platforms for filtering movies.
 */
interface PlatformFilterState {
  // State
  platforms: PlatformDto[];
  selectedPlatformIds: Set<number>;

  // Actions
  togglePlatform: (platformId: number) => void;
  selectAll: () => void;
  deselectAll: () => void;
  initialize: (platforms: PlatformDto[]) => void;

  // Computed getters
  getSelectedPlatformIdsArray: () => number[];
  isPlatformSelected: (platformId: number) => boolean;
  hasAnySelection: () => boolean;
}

/**
 * Zustand store for platform filtering.
 * All platforms are selected by default upon initialization.
 */
export const usePlatformFilterStore = create<PlatformFilterState>((set, get) => ({
  // Initial state
  platforms: [],
  selectedPlatformIds: new Set(),

  // Actions
  togglePlatform: (platformId: number) =>
    set((state) => {
      const newSelected = new Set(state.selectedPlatformIds);
      if (newSelected.has(platformId)) {
        newSelected.delete(platformId);
      } else {
        newSelected.add(platformId);
      }
      return { selectedPlatformIds: newSelected };
    }),

  selectAll: () =>
    set((state) => ({
      selectedPlatformIds: new Set(state.platforms.map(p => p.id))
    })),

  deselectAll: () =>
    set(() => ({
      selectedPlatformIds: new Set()
    })),

  initialize: (platforms: PlatformDto[]) =>
    set(() => ({
      platforms,
      selectedPlatformIds: new Set(platforms.map(p => p.id)) // All selected by default
    })),

  // Computed getters
  getSelectedPlatformIdsArray: () => Array.from(get().selectedPlatformIds),

  isPlatformSelected: (platformId: number) => get().selectedPlatformIds.has(platformId),

  hasAnySelection: () => get().selectedPlatformIds.size > 0,
}));
