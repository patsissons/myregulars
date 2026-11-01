import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { LogVisitDialog, useLogVisitDialog } from "./log-visit-dialog";
import { localDateString } from "@/lib/datastore/helpers";

describe("LogVisitDialog", () => {
  it("defaults the date to the local calendar day", () => {
    render(<LogVisitDialog open onOpenChange={() => {}} onLog={() => {}} />);
    expect(screen.getByLabelText("Date")).toHaveValue(localDateString());
  });

  it("submits the chosen day and trimmed note, then closes", async () => {
    const user = userEvent.setup();
    const onLog = vi.fn();
    const onOpenChange = vi.fn();
    render(<LogVisitDialog open onOpenChange={onOpenChange} onLog={onLog} />);

    const date = screen.getByLabelText("Date");
    await user.clear(date);
    await user.type(date, "2024-03-15");
    await user.type(screen.getByLabelText("Note (optional)"), "  chatted  ");
    await user.click(screen.getByRole("button", { name: "Log visit" }));

    expect(onLog).toHaveBeenCalledWith("2024-03-15", "chatted");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("omits the note when it is blank", async () => {
    const user = userEvent.setup();
    const onLog = vi.fn();
    render(<LogVisitDialog open onOpenChange={() => {}} onLog={onLog} />);

    await user.click(screen.getByRole("button", { name: "Log visit" }));

    expect(onLog).toHaveBeenCalledWith(localDateString(), undefined);
  });

  it("cancel closes without logging", async () => {
    const user = userEvent.setup();
    const onLog = vi.fn();
    const onOpenChange = vi.fn();
    render(<LogVisitDialog open onOpenChange={onOpenChange} onLog={onLog} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onLog).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("useLogVisitDialog", () => {
  function Harness({ onLog }: { onLog: (day: string, note?: string) => void }) {
    const { openLogVisit, LogVisitDialogComponent } = useLogVisitDialog(onLog);
    return (
      <>
        <button type="button" onClick={openLogVisit}>
          open
        </button>
        {LogVisitDialogComponent}
      </>
    );
  }

  it("is closed until opened, then logs through the callback", async () => {
    const user = userEvent.setup();
    const onLog = vi.fn();
    render(<Harness onLog={onLog} />);

    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByText("open"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Log visit" }));
    expect(onLog).toHaveBeenCalledWith(localDateString(), undefined);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
