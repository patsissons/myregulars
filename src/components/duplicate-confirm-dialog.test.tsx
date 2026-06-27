import { describe, expect, it } from "vitest";
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useDuplicateConfirm } from "./duplicate-confirm-dialog";

function Harness({ existing }: { existing: string[] }) {
  const { checkDuplicate, DuplicateConfirmDialogComponent } = useDuplicateConfirm();
  const [result, setResult] = useState<string>("");

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const confirmed = await checkDuplicate("person", "Alice", existing);
          setResult(String(confirmed));
        }}
      >
        check
      </button>
      <span data-testid="result">{result}</span>
      {DuplicateConfirmDialogComponent}
    </>
  );
}

describe("useDuplicateConfirm", () => {
  it("resolves true without showing a dialog when there is no duplicate", async () => {
    const user = userEvent.setup();
    render(<Harness existing={["Bob", "Carol"]} />);

    await user.click(screen.getByRole("button", { name: "check" }));

    await waitFor(() => expect(screen.getByTestId("result")).toHaveTextContent("true"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows a confirm dialog and resolves true when the user creates anyway", async () => {
    const user = userEvent.setup();
    render(<Harness existing={["alice"]} />);

    await user.click(screen.getByRole("button", { name: "check" }));

    expect(await screen.findByText("Duplicate person name")).toBeInTheDocument();
    expect(screen.getByTestId("result")).toHaveTextContent("");

    await user.click(screen.getByRole("button", { name: "Create anyway" }));

    await waitFor(() => expect(screen.getByTestId("result")).toHaveTextContent("true"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("resolves false when the user cancels the duplicate dialog", async () => {
    const user = userEvent.setup();
    render(<Harness existing={["Alice"]} />);

    await user.click(screen.getByRole("button", { name: "check" }));

    expect(await screen.findByText("Duplicate person name")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.getByTestId("result")).toHaveTextContent("false"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
