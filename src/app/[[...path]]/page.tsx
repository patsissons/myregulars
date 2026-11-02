import { AppShell } from "@/components/shell/app-shell";

/**
 * The one page. Every app URL (`/`, `/connect`, `/vaults`, `/v/...`) renders
 * this shell; which screen shows is decided on the client from `location`,
 * and in-app navigation is `history.pushState`, so moving between screens,
 * including browser back/forward, never asks the server for anything.
 * `/api/*` route handlers are static segments and take precedence.
 */
export default function AppPage() {
  return <AppShell />;
}
