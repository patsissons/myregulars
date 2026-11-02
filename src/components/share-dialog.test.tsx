import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useShareDialog } from "./share-dialog";

const mocks = vi.hoisted(() => ({
  setPublic: vi.fn(() => Promise.resolve()),
  state: {
    uri: "gist:abc123def456abc123def456" as string,
    vault: { name: "Test Vault", locations: [] },
    isReadOnly: false,
    isPublic: true as boolean | null,
  },
}));

vi.mock("@/lib/vault-context", () => ({
  useVault: () => ({ ...mocks.state, setPublic: mocks.setPublic }),
}));

// QRCodeSVG draws to an svg/canvas; render a stand-in so we can assert it mounts
// with the share url without depending on the real renderer.
vi.mock("qrcode.react", () => ({
  QRCodeSVG: (props: { value: string }) => <svg data-testid="qr" data-value={props.value} />,
}));

const originalShare = navigator.share;

beforeEach(() => {
  // Desktop viewport so the Modal (not the mobile Sheet) is rendered.
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
  mocks.state.uri = "gist:abc123def456abc123def456";
  mocks.state.isPublic = true;
  mocks.state.isReadOnly = false;
  mocks.setPublic.mockClear();
  Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
});

afterEach(() => {
  Object.defineProperty(navigator, "share", { configurable: true, value: originalShare });
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
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the share url, uri, and QR code once opened", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "open share" }));

    const qr = screen.getByTestId("qr");
    expect(qr.getAttribute("data-value")).toMatch(/gist=abc123def456abc123def456/);
    expect(screen.getByText(/gist=abc123def456abc123def456/)).toBeInTheDocument();
    expect(screen.getByText("gist:abc123def456abc123def456")).toBeInTheDocument();
    // Gists are always link-readable, so there is no access switch.
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("copies the share url to the clipboard when Copy link is clicked", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "open share" }));
    await user.click(screen.getByRole("button", { name: /copy link/i }));
    const text = await navigator.clipboard.readText();
    expect(text).toMatch(/gist=abc123def456abc123def456/);
    expect(screen.getByRole("button", { name: /copied/i })).toBeInTheDocument();
  });

  it("offers the native share sheet when the browser has one", async () => {
    const user = userEvent.setup();
    const share = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "open share" }));
    await user.click(screen.getByRole("button", { name: "Share…" }));
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Test Vault",
        url: expect.stringMatching(/gist=abc123def456abc123def456/),
      }),
    );
  });

  it("gates a hosted vault's link behind the public switch", async () => {
    const user = userEvent.setup();
    mocks.state.uri = "hosted:rec1234567890ab";
    mocks.state.isPublic = false;
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "open share" }));

    const toggle = screen.getByRole("switch", { name: /Anyone with the link can view/ });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("button", { name: /copy link/i })).toBeDisabled();
    expect(screen.getByText(/Turn on link access/)).toBeInTheDocument();
    expect(screen.getByTestId("qr").getAttribute("data-value")).toMatch(
      /vault=hosted%3Arec1234567890ab/,
    );

    await user.click(toggle);
    expect(mocks.setPublic).toHaveBeenCalledWith(true);
  });

  it("hides the switch for read-only viewers of a hosted vault", async () => {
    const user = userEvent.setup();
    mocks.state.uri = "hosted:rec1234567890ab";
    mocks.state.isReadOnly = true;
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "open share" }));
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.getByRole("button", { name: /copy link/i })).toBeEnabled();
  });
});
