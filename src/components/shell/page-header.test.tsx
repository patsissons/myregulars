import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { PageHeader } from "./page-header";

const goBack = vi.fn();
vi.mock("@/lib/router/history", () => ({ goBack: () => goBack() }));

describe("PageHeader", () => {
  it("renders a 44px Back control that uses hierarchical Back by default", async () => {
    const user = userEvent.setup();
    render(<PageHeader title="Blue Bottle" />);
    const back = screen.getByRole("button", { name: "Back" });
    expect(back.className).toContain("h-11");
    expect(back.className).toContain("w-11");
    await user.click(back);
    expect(goBack).toHaveBeenCalledOnce();
    expect(screen.getByText("Blue Bottle")).toBeTruthy();
  });

  it("accepts a custom back handler and label, and a right slot", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<PageHeader onBack={onBack} backLabel="Back to vaults" right={<span>chip</span>} />);
    await user.click(screen.getByRole("button", { name: "Back to vaults" }));
    expect(onBack).toHaveBeenCalledOnce();
    expect(screen.getByText("chip")).toBeTruthy();
  });

  it("hides Back when onBack is null", () => {
    render(<PageHeader onBack={null} title="Vaults" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
