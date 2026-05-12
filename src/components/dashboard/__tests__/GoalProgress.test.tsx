import { render, screen } from "@testing-library/react";
import { GoalProgress } from "../GoalProgress";

// These tests FAIL until Plan 03 creates GoalProgress.tsx
describe("GoalProgress", () => {
  it("renders goal progress copy with dollar amounts", () => {
    render(<GoalProgress currentProgressUsd={200} monthlyGoalUsd={400} />);
    expect(screen.getByText(/Goal: \$200 \/ \$400 this month/)).toBeInTheDocument();
  });

  it("renders zero progress correctly", () => {
    render(<GoalProgress currentProgressUsd={0} monthlyGoalUsd={400} />);
    expect(screen.getByText(/Goal: \$0 \/ \$400 this month/)).toBeInTheDocument();
  });

  it("clamps display at 100% when progress exceeds goal", () => {
    // Component should not crash when currentProgressUsd > monthlyGoalUsd
    render(<GoalProgress currentProgressUsd={500} monthlyGoalUsd={400} />);
    // The text should still render — progress bar clamped internally
    expect(screen.getByText(/this month/)).toBeInTheDocument();
  });
});
