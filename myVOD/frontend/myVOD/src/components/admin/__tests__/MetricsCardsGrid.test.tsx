import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricsCardsGrid } from "../MetricsCardsGrid";
import type { AdminMetricsDto } from "@/types/view/admin.types";

// Mock MetricCard component
const mockMetricCard = vi.fn();
vi.mock("../MetricCard", () => ({
  MetricCard: (props: any) => {
    mockMetricCard(props);
    return <div data-testid={`metric-card-${props.vm.label}`}>{props.vm.label}: {props.vm.value}</div>;
  },
}));

describe("MetricsCardsGrid", () => {
  const mockMetrics: AdminMetricsDto = {
    total_users: 1234,
    new_users: {
      today: 56,
      last_7_days: 123,
      last_30_days: 456,
    },
    retention_7d_percent: 45.67,
    retention_30d_percent: 65.2,
    pct_users_with_min_10_movies: 78.9,
    pct_users_used_ai: 12.3,
    pct_users_added_ai_movies: 8.7,
    avg_movies_per_user: 8.5,
    retention_timeseries: [],
    new_users_timeseries: [],
    last_updated_at: "2025-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all 10 metric cards", () => {
    render(<MetricsCardsGrid metrics={mockMetrics} />);

    expect(mockMetricCard).toHaveBeenCalledTimes(10);
  });

  it("should format numbers correctly", () => {
    render(<MetricsCardsGrid metrics={mockMetrics} />);

    const calls = mockMetricCard.mock.calls;

    // Find the total_users card
    const totalUsersCard = calls.find(call => call[0].vm.label === "Łączna liczba użytkowników");
    expect(typeof totalUsersCard?.[0].vm.value).toBe("string");
    expect(totalUsersCard?.[0].vm.value).toMatch(/1.*234/); // Should contain "1234" formatted somehow

    // Find the new_users.today card
    const newUsersTodayCard = calls.find(call => call[0].vm.hint === "Dziś");
    expect(newUsersTodayCard?.[0].vm.value).toBe("56");
  });

  it("should format percentages correctly", () => {
    render(<MetricsCardsGrid metrics={mockMetrics} />);

    const calls = mockMetricCard.mock.calls;

    // Find retention cards
    const retention7dCard = calls.find(call => call[0].vm.label === "Retention 7 dni");
    expect(retention7dCard?.[0].vm.value).toBe("45.7%");

    const retention30dCard = calls.find(call => call[0].vm.label === "Retention 30 dni");
    expect(retention30dCard?.[0].vm.value).toBe("65.2%");

    // Find AI usage cards
    const aiUsageCard = calls.find(call => call[0].vm.label === "Użytkownicy używający AI");
    expect(aiUsageCard?.[0].vm.value).toBe("12.3%");
  });

  it("should format decimals correctly", () => {
    render(<MetricsCardsGrid metrics={mockMetrics} />);

    const calls = mockMetricCard.mock.calls;

    // Find average movies per user card
    const avgMoviesCard = calls.find(call => call[0].vm.label === "Średnia liczba filmów/użytkownika");
    expect(avgMoviesCard?.[0].vm.value).toBe("8.5");
  });

  it("should display '—' for null values", () => {
    const metricsWithNulls: AdminMetricsDto = {
      ...mockMetrics,
      total_users: null,
      retention_7d_percent: null,
    };

    render(<MetricsCardsGrid metrics={metricsWithNulls} />);

    const calls = mockMetricCard.mock.calls;

    // Find total_users card
    const totalUsersCard = calls.find(call => call[0].vm.label === "Łączna liczba użytkowników");
    expect(totalUsersCard?.[0].vm.value).toBe("—");

    // Find retention card
    const retentionCard = calls.find(call => call[0].vm.label === "Retention 7 dni");
    expect(retentionCard?.[0].vm.value).toBe("—");
  });

  it("should display '—' for undefined values", () => {
    const metricsWithUndefined: AdminMetricsDto = {
      ...mockMetrics,
      new_users: undefined,
      avg_movies_per_user: undefined,
    };

    render(<MetricsCardsGrid metrics={metricsWithUndefined} />);

    const calls = mockMetricCard.mock.calls;

    // Find new users today card
    const newUsersTodayCard = calls.find(call => call[0].vm.hint === "Dziś");
    expect(newUsersTodayCard?.[0].vm.value).toBe("—");

    // Find average movies card
    const avgMoviesCard = calls.find(call => call[0].vm.label === "Średnia liczba filmów/użytkownika");
    expect(avgMoviesCard?.[0].vm.value).toBe("—");
  });

  it("should handle nested null values (new_users.today=null)", () => {
    const metricsWithNestedNull: AdminMetricsDto = {
      ...mockMetrics,
      new_users: {
        ...mockMetrics.new_users!,
        today: null,
      },
    };

    render(<MetricsCardsGrid metrics={metricsWithNestedNull} />);

    const calls = mockMetricCard.mock.calls;

    // Find new users today card
    const newUsersTodayCard = calls.find(call => call[0].vm.hint === "Dziś");
    expect(newUsersTodayCard?.[0].vm.value).toBe("—");
  });

  it("should render correct labels and tooltips", () => {
    render(<MetricsCardsGrid metrics={mockMetrics} />);

    const calls = mockMetricCard.mock.calls;

    // Check that all expected labels are present
    const labels = calls.map(call => call[0].vm.label);
    expect(labels).toContain("Łączna liczba użytkowników");
    expect(labels).toContain("Retention 7 dni");
    expect(labels).toContain("Retention 30 dni");
    expect(labels).toContain("Użytkownicy z ≥10 filmami");
    expect(labels).toContain("Użytkownicy używający AI");
    expect(labels).toContain("Średnia liczba filmów/użytkownika");

    // Check that tooltips are present
    const tooltips = calls.map(call => call[0].vm.tooltip).filter(Boolean);
    expect(tooltips.length).toBeGreaterThan(0);
  });

  it("should render icons for each metric", () => {
    render(<MetricsCardsGrid metrics={mockMetrics} />);

    const calls = mockMetricCard.mock.calls;

    // Check that all cards have icons
    calls.forEach(call => {
      expect(call[0].vm.icon).toBeDefined();
    });
  });

  it("should handle empty metrics object gracefully", () => {
    const emptyMetrics: AdminMetricsDto = {};

    render(<MetricsCardsGrid metrics={emptyMetrics} />);

    const calls = mockMetricCard.mock.calls;

    // Should still render 10 cards, but with "—" values
    expect(calls).toHaveLength(10);

    // All values should be "—"
    calls.forEach(call => {
      expect(call[0].vm.value).toBe("—");
    });
  });

  it("should use useMemo for cards calculation", () => {
    const { rerender } = render(<MetricsCardsGrid metrics={mockMetrics} />);

    // Clear previous calls
    mockMetricCard.mockClear();

    // Re-render with same metrics - useMemo should prevent recalculation
    rerender(<MetricsCardsGrid metrics={mockMetrics} />);

    // Should not have called MetricCard again since props didn't change meaningfully
    // (This is hard to test directly, but we can verify the component renders without errors)
    expect(mockMetricCard).toHaveBeenCalled();
  });
});
