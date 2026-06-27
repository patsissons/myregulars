import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useShareDialog } from "./share-dialog";

vi.mock("@/lib/vault-context", () => ({
  useVault: () => ({ uri: "gist:abc123" }),
}));

// QRCodeSVG draws to an svg/canvas; render a stand-in so we can assert it mounts
// with the share url without depending on the real renderer.
vi.mock("qrcode.react", () => ({
  QRCodeSVG: (props: { value: string }) => <svg data-testid="qr" data-value={props.value} />,
}));

beforeEach(() => {
  // Desktop viewport so the Modal (not the mobile Sheet) is rendered.
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
});

function Harness() {
  const { openShare, ShareDialogComponent } = useShareDialog();
  return (
    <>
      <button onClick={openShare}>open share</button>
      {ShareDialogComponent}
    </>
  );
}

describe("useShareDialog", () => {
  it("renders no dialog content before it is opened", () => {
    render(<Harness />);
    expect(screen.queryByText("Share vault")).not.toBeInTheDocument();
    expect(screen.queryByTestId("qr")).not.toBeInTheDocument();
  });

  it("shows the share url, gist uri, and QR code once opened", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "open share" }));

    // QR code rendered with the share url as its value.
    const qr = screen.getByTestId("qr");
    expect(qr).toBeInTheDocument();
    expect(qr.getAttribute("data-value")).toContain("gist=abc123");

    // Share url pill contains the gist id query param.
    expect(screen.getByText(/gist=abc123/)).toBeInTheDocument();
    // URI footer shows the raw datastore uri.
    expect(screen.getByText("gist:abc123")).toBeInTheDocument();
  });

  it("copies the share url to the clipboard when Copy link is clicked", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "open share" }));
    await user.click(screen.getByRole("button", { name: /copy link/i }));

    // userEvent provides a working clipboard; read back what the component wrote.
    expect(await navigator.clipboard.readText()).toContain("gist=abc123");
    // Button flips to a confirmation state.
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });
});
