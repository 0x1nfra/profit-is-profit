// =============================================
// SetupProgress Tests
// src/components/setup/__tests__/SetupProgress.test.tsx
// =============================================

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SetupProgress } from "../SetupProgress";

describe("SetupProgress", () => {
  it("should render progress steps with labels", () => {
    render(
      <SetupProgress
        currentStep={1}
        totalSteps={2}
        stepLabels={["Wallets", "Goals"]}
      />
    );

    expect(screen.getByText("Wallets")).toBeInTheDocument();
    expect(screen.getByText("Goals")).toBeInTheDocument();
  });

  it("should show step 1 as current (highlighted) when currentStep is 1", () => {
    render(
      <SetupProgress
        currentStep={1}
        totalSteps={2}
        stepLabels={["Wallets", "Goals"]}
      />
    );

    // First step should have ring (current state)
    const stepContainers = screen.getAllByText(/^(1|2)$/);
    expect(stepContainers[0].parentElement?.className).toContain("ring-2");
    expect(stepContainers[1].parentElement?.className).not.toContain("ring-2");
  });

  it("should show step 1 as completed (checkmark) when currentStep is 2", () => {
    render(
      <SetupProgress
        currentStep={2}
        totalSteps={2}
        stepLabels={["Wallets", "Goals"]}
      />
    );

    // First step should show checkmark
    expect(screen.getByText("Goals")).toBeInTheDocument();
    // Checkmark icon should be present (svg with check icon)
    const checkmarks = document.querySelectorAll("svg");
    expect(checkmarks.length).toBeGreaterThan(0);
  });

  it("should render step counter text", () => {
    render(
      <SetupProgress
        currentStep={1}
        totalSteps={2}
        stepLabels={["Wallets", "Goals"]}
      />
    );

    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
  });

  it("should render correct step counter for step 2", () => {
    render(
      <SetupProgress
        currentStep={2}
        totalSteps={2}
        stepLabels={["Wallets", "Goals"]}
      />
    );

    expect(screen.getByText("Step 2 of 2")).toBeInTheDocument();
  });

  it("should render multiple steps correctly", () => {
    render(
      <SetupProgress
        currentStep={2}
        totalSteps={3}
        stepLabels={["Step 1", "Step 2", "Step 3"]}
      />
    );

    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getByText("Step 2")).toBeInTheDocument();
    expect(screen.getByText("Step 3")).toBeInTheDocument();
  });

  it("should apply correct styling for completed steps", () => {
    const { container } = render(
      <SetupProgress
        currentStep={2}
        totalSteps={2}
        stepLabels={["Wallets", "Goals"]}
      />
    );

    // First step should have primary background
    const firstStepCircle = container.querySelector(".bg-primary");
    expect(firstStepCircle).toBeInTheDocument();
  });

  it("should show pending state for future steps", () => {
    render(
      <SetupProgress
        currentStep={1}
        totalSteps={2}
        stepLabels={["Wallets", "Goals"]}
      />
    );

    // Second step label should be muted
    const goalsLabel = screen.getByText("Goals");
    expect(goalsLabel.className).toContain("text-muted-foreground");
  });
});
