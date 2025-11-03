import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChartsRow } from "../ChartsRow";
import type { AdminMetricsDto } from "@/types/view/admin.types";

// Mock chart components
const mockRetentionLineChart = vi.fn();
const mockUsersGrowthBarChart = vi.fn();

vi.mock("../RetentionLineChart", () => ({
  RetentionLineChart: (props: any) => {
    mockRetentionLineChart(props);
    return <div data-testid="retention-line-chart">RetentionLineChart</div>;
  },
}));

vi.mock("../UsersGrowthBarChart", () => ({
  UsersGrowthBarChart: (props: any) => {
    mockUsersGrowthBarChart(props);
    return <div data-testid="users-growth-bar-chart">UsersGrowthBarChart</div>;
  },
}));

describe("ChartsRow", () => {
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
    retention_timeseries: [
      { date: "2025-01-01", retention_7d: 0.8 },
      { date: "2025-01-02", retention_7d: 0.75 },
    ],
    new_users_timeseries: [
      { date: "2025-01-01", new_users: 10 },
      { date: "2025-01-02", new_users: 15 },
    ],
    last_updated_at: "2025-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render RetentionLineChart", () => {
    render(<ChartsRow metrics={mockMetrics} />);

    expect(screen.getByTestId("retention-line-chart")).toBeInTheDocument();
    expect(mockRetentionLineChart).toHaveBeenCalledWith({
      data: mockMetrics.retention_timeseries,
    });
  });

  it("should render UsersGrowthBarChart", () => {
    render(<ChartsRow metrics={mockMetrics} />);

    expect(screen.getByTestId("users-growth-bar-chart")).toBeInTheDocument();
    expect(mockUsersGrowthBarChart).toHaveBeenCalledWith({
      data: mockMetrics.new_users_timeseries,
    });
  });

  it("should pass correct data to RetentionLineChart", () => {
    render(<ChartsRow metrics={mockMetrics} />);

    expect(mockRetentionLineChart).toHaveBeenCalledWith({
      data: mockMetrics.retention_timeseries,
    });
  });

  it("should pass correct data to UsersGrowthBarChart", () => {
    render(<ChartsRow metrics={mockMetrics} />);

    expect(mockUsersGrowthBarChart).toHaveBeenCalledWith({
      data: mockMetrics.new_users_timeseries,
    });
  });

  it("should handle missing retention_timeseries data gracefully", () => {
    const metricsWithoutRetention: AdminMetricsDto = {
      ...mockMetrics,
      retention_timeseries: undefined,
    };

    render(<ChartsRow metrics={metricsWithoutRetention} />);

    expect(mockRetentionLineChart).toHaveBeenCalledWith({
      data: [],
    });
  });

  it("should handle missing new_users_timeseries data gracefully", () => {
    const metricsWithoutUsersGrowth: AdminMetricsDto = {
      ...mockMetrics,
      new_users_timeseries: undefined,
    };

    render(<ChartsRow metrics={metricsWithoutUsersGrowth} />);

    expect(mockUsersGrowthBarChart).toHaveBeenCalledWith({
      data: [],
    });
  });

  it("should handle null retention_timeseries data gracefully", () => {
    const metricsWithNullRetention: AdminMetricsDto = {
      ...mockMetrics,
      retention_timeseries: null as any,
    };

    render(<ChartsRow metrics={metricsWithNullRetention} />);

    expect(mockRetentionLineChart).toHaveBeenCalledWith({
      data: [],
    });
  });

  it("should handle null new_users_timeseries data gracefully", () => {
    const metricsWithNullUsersGrowth: AdminMetricsDto = {
      ...mockMetrics,
      new_users_timeseries: null as any,
    };

    render(<ChartsRow metrics={metricsWithNullUsersGrowth} />);

    expect(mockUsersGrowthBarChart).toHaveBeenCalledWith({
      data: [],
    });
  });

  it("should use correct grid layout classes", () => {
    render(<ChartsRow metrics={mockMetrics} />);

    const container = screen.getByTestId("retention-line-chart").parentElement;
    expect(container).toHaveClass("grid");
    expect(container).toHaveClass("grid-cols-1");
    expect(container).toHaveClass("lg:grid-cols-2");
    expect(container).toHaveClass("gap-4");
  });

  it("should render charts in correct order", () => {
    render(<ChartsRow metrics={mockMetrics} />);

    const container = screen.getByTestId("retention-line-chart").parentElement;
    const children = container?.children;

    expect(children?.[0]).toHaveAttribute("data-testid", "retention-line-chart");
    expect(children?.[1]).toHaveAttribute("data-testid", "users-growth-bar-chart");
  });

  it("should pass empty arrays when timeseries are undefined", () => {
    const metricsWithoutTimeseries: AdminMetricsDto = {
      ...mockMetrics,
      retention_timeseries: undefined,
      new_users_timeseries: undefined,
    };

    render(<ChartsRow metrics={metricsWithoutTimeseries} />);

    expect(mockRetentionLineChart).toHaveBeenCalledWith({
      data: [],
    });
    expect(mockUsersGrowthBarChart).toHaveBeenCalledWith({
      data: [],
    });
  });

  it("should work with empty timeseries arrays", () => {
    const metricsWithEmptyArrays: AdminMetricsDto = {
      ...mockMetrics,
      retention_timeseries: [],
      new_users_timeseries: [],
    };

    render(<ChartsRow metrics={metricsWithEmptyArrays} />);

    expect(mockRetentionLineChart).toHaveBeenCalledWith({
      data: [],
    });
    expect(mockUsersGrowthBarChart).toHaveBeenCalledWith({
      data: [],
    });
  });
});
