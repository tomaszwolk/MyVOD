import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MetricCard } from "../MetricCard";
import type { MetricCardVM } from "@/types/view/admin.types";

describe("MetricCard", () => {
  const defaultVm: MetricCardVM = {
    label: "Test Metric",
    value: "123",
    hint: "Test hint",
    tooltip: "Test tooltip",
    icon: "📊",
  };

  it("should render label", () => {
    render(<MetricCard vm={defaultVm} />);

    expect(screen.getByText("Test Metric")).toBeInTheDocument();
  });

  it("should render value", () => {
    render(<MetricCard vm={defaultVm} />);

    expect(screen.getByText("123")).toBeInTheDocument();
  });

  it("should render hint when provided", () => {
    render(<MetricCard vm={defaultVm} />);

    expect(screen.getByText("Test hint")).toBeInTheDocument();
  });

  it("should not render hint when not provided", () => {
    const vmWithoutHint: MetricCardVM = {
      ...defaultVm,
      hint: undefined,
    };

    render(<MetricCard vm={vmWithoutHint} />);

    expect(screen.queryByText("Test hint")).not.toBeInTheDocument();
  });

  it("should render icon", () => {
    render(<MetricCard vm={defaultVm} />);

    expect(screen.getByText("📊")).toBeInTheDocument();
  });

  it("should display '—' for null value", () => {
    const vmWithNull: MetricCardVM = {
      ...defaultVm,
      value: null as any,
    };

    render(<MetricCard vm={vmWithNull} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("should display '—' for undefined value", () => {
    const vmWithUndefined: MetricCardVM = {
      ...defaultVm,
      value: undefined as any,
    };

    render(<MetricCard vm={vmWithUndefined} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("should have correct ARIA attributes", () => {
    render(<MetricCard vm={defaultVm} />);

    const iconElement = screen.getByText("📊");
    expect(iconElement).toHaveAttribute("aria-hidden", "true");
  });

  it("should render with cursor-help class when tooltip is provided", () => {
    render(<MetricCard vm={defaultVm} />);

    // The main card container should have cursor-help class when tooltip is provided
    const cardElement = screen.getByText("Test Metric").closest(".cursor-help");
    expect(cardElement).toBeInTheDocument();
  });

  it("should not render tooltip when tooltip is not provided", () => {
    const vmWithoutTooltip: MetricCardVM = {
      ...defaultVm,
      tooltip: undefined,
    };

    render(<MetricCard vm={vmWithoutTooltip} />);

    const tooltipTrigger = screen.queryByText("Test Metric")?.closest("[data-radix-tooltip-trigger]");
    expect(tooltipTrigger).toBeNull();
  });
});
