// =============================================
// GoalSetupForm Tests
// src/components/setup/__tests__/GoalSetupForm.test.tsx
// =============================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GoalSetupForm } from "../GoalSetupForm";
import { DEFAULTS } from "@/lib/constants";

describe("GoalSetupForm", () => {
  const mockSubmit = vi.fn().mockResolvedValue(undefined);
  const mockSkip = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with default goal value", () => {
    render(<GoalSetupForm onSubmit={mockSubmit} onSkip={mockSkip} />);

    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(input.value).toBe(DEFAULTS.MONTHLY_GOAL_USD.toString());
  });

  it("should render with custom default goal", () => {
    const customGoal = 500;
    render(
      <GoalSetupForm
        defaultGoal={customGoal}
        onSubmit={mockSubmit}
        onSkip={mockSkip}
      />
    );

    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(input.value).toBe(customGoal.toString());
  });

  it("should render all form elements", () => {
    render(<GoalSetupForm onSubmit={mockSubmit} onSkip={mockSkip} />);

    expect(screen.getByText("Monthly Goal (USD)")).toBeInTheDocument();
    expect(
      screen.getByText("Target amount to secure in your vault each month")
    ).toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    expect(screen.getByText("Complete Setup")).toBeInTheDocument();
    expect(screen.getByText("Skip for Now")).toBeInTheDocument();
  });

  it("should have dollar sign icon prefix", () => {
    render(<GoalSetupForm onSubmit={mockSubmit} onSkip={mockSkip} />);

    // Check that the DollarSign icon is rendered (it has class text-muted-foreground)
    const input = screen.getByRole("spinbutton");
    const parent = input.parentElement;
    expect(parent?.querySelector("svg")).toBeInTheDocument();
  });

  it("should disable submit button when form is invalid (below minimum)", async () => {
    render(<GoalSetupForm onSubmit={mockSubmit} onSkip={mockSkip} />);

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "50" } });

    const submitButton = screen.getByText("Complete Setup").closest("button");
    expect(submitButton).toBeDisabled();
  });

  it("should disable submit button when form is invalid (above maximum)", async () => {
    render(<GoalSetupForm onSubmit={mockSubmit} onSkip={mockSkip} />);

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "150000" } });

    const submitButton = screen.getByText("Complete Setup").closest("button");
    expect(submitButton).toBeDisabled();
  });

  it("should enable submit button with valid input", async () => {
    render(<GoalSetupForm onSubmit={mockSubmit} onSkip={mockSkip} />);

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "500" } });

    const submitButton = screen.getByText("Complete Setup").closest("button");
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it("should call onSubmit with form data when submitted", async () => {
    render(<GoalSetupForm onSubmit={mockSubmit} onSkip={mockSkip} />);

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "750" } });

    const submitButton = screen.getByText("Complete Setup");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({ monthlyGoal: 750 });
    });
  });

  it("should call onSkip when skip button is clicked", () => {
    render(<GoalSetupForm onSubmit={mockSubmit} onSkip={mockSkip} />);

    const skipButton = screen.getByText("Skip for Now");
    fireEvent.click(skipButton);

    expect(mockSkip).toHaveBeenCalled();
  });

  it("should show submitting state", () => {
    render(
      <GoalSetupForm
        onSubmit={mockSubmit}
        onSkip={mockSkip}
        isSubmitting={true}
      />
    );

    expect(screen.getByText("Saving...")).toBeInTheDocument();
    expect(screen.getByText("Saving...").closest("button")).toBeDisabled();
  });

  it("should disable skip button when submitting", () => {
    render(
      <GoalSetupForm
        onSubmit={mockSubmit}
        onSkip={mockSkip}
        isSubmitting={true}
      />
    );

    const skipButton = screen.getByText("Skip for Now").closest("button");
    expect(skipButton).toBeDisabled();
  });

  it("should handle decimal values correctly", async () => {
    render(<GoalSetupForm onSubmit={mockSubmit} onSkip={mockSkip} />);

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "500.50" } });

    const submitButton = screen.getByText("Complete Setup");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({ monthlyGoal: 500.5 });
    });
  });

  it("should validate more than 2 decimal places is invalid", async () => {
    render(<GoalSetupForm onSubmit={mockSubmit} onSkip={mockSkip} />);

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "500.999" } });

    fireEvent.blur(input);

    await waitFor(() => {
      expect(
        screen.getByText("Maximum 2 decimal places allowed")
      ).toBeInTheDocument();
    });
  });
});
