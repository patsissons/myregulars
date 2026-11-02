"use client";

import { useEffect, useLayoutEffect } from "react";
import { VaultShell } from "@/components/shell/vault-shell";
import { restoreScroll } from "@/lib/router/history";
import { isVaultScoped, type Route } from "@/lib/router/routes";
import { useVault } from "@/lib/vault-context";
import { ConnectScreen } from "@/screens/connect";
import { LandingScreen } from "@/screens/landing";
import { LocationScreen } from "@/screens/location";
import { NotFoundScreen } from "@/screens/not-found";
import { PersonScreen } from "@/screens/person";
import { VaultHomeScreen } from "@/screens/vault-home";
import { VaultsScreen } from "@/screens/vaults";

const APP_NAME = "MyRegulars";

function useDocumentTitle(route: Route) {
  const { vault } = useVault();

  useEffect(() => {
    let title = APP_NAME;
    switch (route.kind) {
      case "connect":
        title = `Connect | ${APP_NAME}`;
        break;
      case "vaults":
        title = `Your vaults | ${APP_NAME}`;
        break;
      case "vault":
        title = vault ? `${vault.name} | ${APP_NAME}` : APP_NAME;
        break;
      case "location": {
        const location = vault?.locations.find((l) => l.id === route.locationId);
        title = location ? `${location.name} | ${APP_NAME}` : APP_NAME;
        break;
      }
      case "person": {
        const location = vault?.locations.find((l) => l.id === route.locationId);
        const person = location?.groups
          .flatMap((g) => g.people)
          .find((p) => p.id === route.personId);
        title = person ? `${person.name} | ${APP_NAME}` : APP_NAME;
        break;
      }
      case "notFound":
        title = `Not found | ${APP_NAME}`;
        break;
    }
    document.title = title;
  }, [route, vault]);
}

interface RouteViewProps {
  route: Route;
  /** Changes per history entry; drives scroll restoration. */
  entryKey: string;
}

export function RouteView({ route, entryKey }: RouteViewProps) {
  useDocumentTitle(route);

  // After the screen for this entry is in the DOM, put it back where the user
  // left it (or at the top for a new entry).
  useLayoutEffect(() => {
    restoreScroll(entryKey);
  }, [entryKey]);

  if (isVaultScoped(route)) {
    return (
      <VaultShell key={route.uri} route={route}>
        {route.kind === "vault" && <VaultHomeScreen route={route} />}
        {route.kind === "location" && <LocationScreen route={route} />}
        {route.kind === "person" && <PersonScreen route={route} />}
      </VaultShell>
    );
  }

  switch (route.kind) {
    case "landing":
      return <LandingScreen route={route} />;
    case "connect":
      return <ConnectScreen route={route} />;
    case "vaults":
      return <VaultsScreen />;
    case "notFound":
      return <NotFoundScreen pathname={route.pathname} />;
  }
}
