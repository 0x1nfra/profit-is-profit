// =============================================
// GoalProgress Tests
// src/components/goal/__tests__/GoalProgress.test.tsx
// =============================================

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GoalProgress } from "../GoalProgress";

describe("GoalProgress", () => {
  const defaultProps = {
    monthlyGoal: 400,
    currentProgress: 125,
    weekNumber: 2,
  };

  it("should render progress title", () => {
    render(<GoalProgress {...defaultProps} />);

    expect(screen.getByText("Monthly Goal Progress")).toBeInTheDocument();
  });

  it("should show week number", () => {
    render(<GoalProgress {...defaultProps} />);

    expect(screen.getByText("Week 2 of 4")).toBeInTheDocument();
  });

  it("should display current progress and goal amounts", () => {
    render(<GoalProgress {...defaultProps} />);

    expect(screen.getByText("$125")).toBeInTheDocument();
    expect(screen.getByText("$400")).toBeInTheDocument();
  });

  it("should show on track status when progress is on pace", () => {
    // Week 2, should have at least 50% progress (200/400)
    // 250/400 = 62.5%, which is on track
    render(
      <GoalProgress
        monthlyGoal={400}
        currentProgress={250}
        weekNumber={2}
      />
    );

    expect(screen.getByText(/On track!/)).toBeInTheDocument();
    expect(screen.getByText("$250 of $400")).toBeInTheDocument();
  });

  it("should show behind pace warning when progress is low", () => {
    // Week 2, should have at least 50% progress (200/400)
    // 100/400 = 25%, which is behind
    render(
      <GoalProgress
        monthlyGoal={400}
        currentProgress={100}
        weekNumber={2}
      />
    );

    expect(screen.getByText(/behind pace/)).toBeInTheDocument();
  });

  it("should show goal achieved status when goal is met", () => {
    render(
      <GoalProgress
        monthlyGoal={400}
        currentProgress={450}
        weekNumber={3}
      />
    );

    expect(screen.getByText(/Goal achieved!/)).toBeInTheDocument();
  });

  it("should render boost suggestion when provided and behind pace", () => {
    const boostSuggestion = {
      gapAmount: 60,
      suggestedBoostPercent: 10,
    };

    render(
      <GoalProgress
        monthlyGoal={400}
        currentProgress={140}
        weekNumber={2}
        boostSuggestion={boostSuggestion}
        onAcceptBoost={vi.fn()}
        onDeclineBoost={vi.fn()}
      />
    );

    expect(screen.getByText("Behind Monthly Pace")).toBeInTheDocument();
    expect(
      screen.getByText(/You're \$60 behind your \$400 goal/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Boost cashouts by \+10%/)).toBeInTheDocument();
  });

  it("should not show boost suggestion when goal is met", () => {
    const boostSuggestion = {
      gapAmount: 60,
      suggestedBoostPercent: 10,
    };

    render(
      <GoalProgress
        monthlyGoal={400}
        currentProgress={400}
        weekNumber={3}
        boostSuggestion={boostSuggestion}
        onAcceptBoost={vi.fn()}
        onDeclineBoost={vi.fn()}
      />
    );

    expect(screen.queryByText("Behind Monthly Pace")).not.toBeInTheDocument();
  });

  it("should call onAcceptBoost when accept button clicked", () => {
    const mockAccept = vi.fn();
    const boostSuggestion = {
      gapAmount: 60,
      suggestedBoostPercent: 10,
    };

    render(
      <GoalProgress
        monthlyGoal={400}
        currentProgress={140}
        weekNumber={2}
        boostSuggestion={boostSuggestion}
        onAcceptBoost={mockAccept}
        onDeclineBoost={vi.fn()}
      />
    );

    const acceptButton = screen.getByText("Accept Boost");
    fireEvent.click(acceptButton);

    expect(mockAccept).toHaveBeenCalled();
  });

  it("should call onDeclineBoost when decline button clicked", () => {
    const mockDecline = vi.fn();
    const boostSuggestion = {
      gapAmount: 60,
      suggestedBoostPercent: 10,
    };

    render(
      <GoalProgress
        monthlyGoal={400}
        currentProgress={140}
        weekNumber={2}
        boostSuggestion={boostSuggestion}
        onAcceptBoost={vi.fn()}
        onDeclineBoost={mockDecline}
      />
    );

    const declineButton = screen.getByText("Decline");
    fireEvent.click(declineButton);

    expect(mockDecline).toHaveBeenCalled();
  });

  it("should not show boost buttons if callbacks not provided", () => {
    const boostSuggestion = {
      gapAmount: 60,
      suggestedBoostPercent: 10,
    };

    render(
      <GoalProgress
        monthlyGoal={400}
        currentProgress={140}
        weekNumber={2}
        boostSuggestion={boostSuggestion}
      />
    );

    expect(screen.queryByText("Accept Boost")).not.toBeInTheDocument();
    expect(screen.queryByText("Decline")).not.toBeInTheDocument();
  });

  it("should cap progress bar at 100%", () => {
    // 600/400 = 150%, but bar should show 100%
    const { container } = render(
      <GoalProgress
        monthlyGoal={400}
        currentProgress={600}
        weekNumber={3}
      />
    );

    // Progress indicator should be at 100% (translateX(-0%))
    const progressIndicator = container.querySelector(
      "[data-slot='progress-indicator']"
    );
    expect(progressIndicator).toHaveStyle({
      transform: "translateX(-0%)",
    });
  });

  it("should render correct progress percentage", () => {
    // 125/400 = 31.25%
    const { container } = render(
      <GoalProgress
        monthlyGoal={400}
        currentProgress={125}
        weekNumber={2}
      />
    );

    const progressIndicator = container.querySelector(
      "[data-slot='progress-indicator']"
    );
    expect(progressIndicator).toHaveStyle({
      transform: "translateX(-68.75%)", // 100 - 31.25 = 68.75
    });
  });
});
