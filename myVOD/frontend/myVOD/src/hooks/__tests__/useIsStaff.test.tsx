import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useIsStaff } from "../useIsStaff";

// Mock dependencies
const mockUseUserProfile = vi.fn();

vi.mock("../useUserProfile", () => ({
  useUserProfile: () => mockUseUserProfile(),
}));

describe("useIsStaff", () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    return { Wrapper, queryClient };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return undefined when profile is loading", () => {
    mockUseUserProfile.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useIsStaff(), { wrapper: Wrapper });

    expect(result.current).toBeUndefined();
  });

  it("should return true when user is staff", () => {
    mockUseUserProfile.mockReturnValue({
      data: { is_staff: true },
      isLoading: false,
      error: null,
    });

    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useIsStaff(), { wrapper: Wrapper });

    expect(result.current).toBe(true);
  });

  it("should return false when user is not staff", () => {
    mockUseUserProfile.mockReturnValue({
      data: { is_staff: false },
      isLoading: false,
      error: null,
    });

    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useIsStaff(), { wrapper: Wrapper });

    expect(result.current).toBe(false);
  });

  it("should return undefined when profile is null", () => {
    mockUseUserProfile.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useIsStaff(), { wrapper: Wrapper });

    expect(result.current).toBeUndefined();
  });

  it("should update when profile changes", async () => {
    // Start with non-staff user
    mockUseUserProfile.mockReturnValue({
      data: { is_staff: false },
      isLoading: false,
      error: null,
    });

    const { Wrapper, queryClient } = createWrapper();

    const { result, rerender } = renderHook(() => useIsStaff(), { wrapper: Wrapper });

    expect(result.current).toBe(false);

    // Change to staff user
    mockUseUserProfile.mockReturnValue({
      data: { is_staff: true },
      isLoading: false,
      error: null,
    });

    // Trigger re-render (in real app this would happen automatically)
    rerender();

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});
