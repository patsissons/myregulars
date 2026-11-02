import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { AppLink } from "./app-link";
import { routes } from "@/lib/router/routes";

const mocks = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("@/lib/router/history", () => ({ navigate: mocks.navigate }));

beforeEach(() => {
  mocks.navigate.mockClear();
});

describe("AppLink", () => {
  it("renders a real anchor with the route's href", () => {
    render(<AppLink route={routes.vaults()}>Vaults</AppLink>);
    expect(screen.getByRole("link", { name: "Vaults" })).toHaveAttribute("href", "/vaults");
  });

  it("navigates in-app on a plain left click", () => {
    render(<AppLink route={routes.vaults()}>Vaults</AppLink>);
    const event = fireEvent.click(screen.getByRole("link"));
    expect(event).toBe(false); // default prevented
    expect(mocks.navigate).toHaveBeenCalledWith(routes.vaults(), {
      replace: undefined,
      transition: undefined,
    });
  });

  it("passes replace/transition through", () => {
    render(
      <AppLink route={routes.vaults()} replace transition="back">
        Vaults
      </AppLink>,
    );
    fireEvent.click(screen.getByRole("link"));
    expect(mocks.navigate).toHaveBeenCalledWith(routes.vaults(), {
      replace: true,
      transition: "back",
    });
  });

  it.each([
    ["meta", { metaKey: true }],
    ["ctrl", { ctrlKey: true }],
    ["shift", { shiftKey: true }],
    ["alt", { altKey: true }],
    ["middle button", { button: 1 }],
  ])("lets the browser handle a %s click", (_label, init) => {
    render(<AppLink route={routes.vaults()}>Vaults</AppLink>);
    fireEvent.click(screen.getByRole("link"), init);
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("lets the browser handle target=_blank", () => {
    render(
      <AppLink route={routes.vaults()} target="_blank">
        Vaults
      </AppLink>,
    );
    fireEvent.click(screen.getByRole("link"));
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("respects a consumer onClick that prevents default", () => {
    render(
      <AppLink route={routes.vaults()} onClick={(e) => e.preventDefault()}>
        Vaults
      </AppLink>,
    );
    fireEvent.click(screen.getByRole("link"));
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
