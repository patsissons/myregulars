import { getVaultRoutePath, normalizeDatastoreUri } from "@/lib/datastore/uri";
import type { DatastoreUri } from "@/lib/datastore/types";

/**
 * Every screen the app can show, as data. URLs are derived from these (and
 * parsed back into them) in one place so the shapes stay byte-identical to
 * the paths the app has always used: `/`, `/connect`, `/vaults`,
 * `/v/[vaultId]`, `/v/[vaultId]/l/[locationId]`, `/v/[vaultId]/l/[locationId]/p/[personId]`.
 */
export type Route =
  | { kind: "landing"; open?: DatastoreUri }
  | { kind: "connect"; returnTo?: string }
  | { kind: "vaults" }
  | { kind: "vault"; uri: DatastoreUri; version?: string }
  | { kind: "location"; uri: DatastoreUri; locationId: string; version?: string }
  | {
      kind: "person";
      uri: DatastoreUri;
      locationId: string;
      personId: string;
      version?: string;
    }
  | { kind: "notFound"; pathname: string };

export type VaultScopedRoute = Extract<Route, { kind: "vault" | "location" | "person" }>;

type RouteOf<K extends Route["kind"]> = Extract<Route, { kind: K }>;

export const routes = {
  landing: (open?: DatastoreUri): RouteOf<"landing"> => ({
    kind: "landing",
    ...(open ? { open } : {}),
  }),
  connect: (returnTo?: string): RouteOf<"connect"> => ({
    kind: "connect",
    ...(returnTo ? { returnTo } : {}),
  }),
  vaults: (): RouteOf<"vaults"> => ({ kind: "vaults" }),
  vault: (uri: DatastoreUri, version?: string): RouteOf<"vault"> => ({
    kind: "vault",
    uri,
    ...(version ? { version } : {}),
  }),
  location: (uri: DatastoreUri, locationId: string, version?: string): RouteOf<"location"> => ({
    kind: "location",
    uri,
    locationId,
    ...(version ? { version } : {}),
  }),
  person: (
    uri: DatastoreUri,
    locationId: string,
    personId: string,
    version?: string,
  ): RouteOf<"person"> => ({
    kind: "person",
    uri,
    locationId,
    personId,
    ...(version ? { version } : {}),
  }),
};

export function isVaultScoped(route: Route): route is VaultScopedRoute {
  return route.kind === "vault" || route.kind === "location" || route.kind === "person";
}

function safeDecode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export function parseRoute(pathname: string, search = ""): Route {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const rawSegments = pathname.split("/").filter(Boolean);
  const segments: string[] = [];
  for (const raw of rawSegments) {
    const decoded = safeDecode(raw);
    if (decoded === null) return { kind: "notFound", pathname };
    segments.push(decoded);
  }

  if (segments.length === 0) {
    const open = params.get("vault") ?? params.get("gist");
    if (open) {
      try {
        return routes.landing(normalizeDatastoreUri(open));
      } catch {
        return routes.landing();
      }
    }
    return routes.landing();
  }

  if (segments.length === 1 && segments[0] === "connect") {
    return routes.connect(params.get("returnTo") ?? undefined);
  }

  if (segments.length === 1 && segments[0] === "vaults") {
    return routes.vaults();
  }

  if (segments[0] === "v" && segments.length >= 2) {
    let uri: DatastoreUri;
    try {
      uri = normalizeDatastoreUri(segments[1]);
    } catch {
      return { kind: "notFound", pathname };
    }
    const version = params.get("version") ?? undefined;

    if (segments.length === 2) return routes.vault(uri, version);
    if (segments.length === 4 && segments[2] === "l") {
      return routes.location(uri, segments[3], version);
    }
    if (segments.length === 6 && segments[2] === "l" && segments[4] === "p") {
      return routes.person(uri, segments[3], segments[5], version);
    }
  }

  return { kind: "notFound", pathname };
}

function versionQuery(version?: string): string {
  return version ? `?version=${encodeURIComponent(version)}` : "";
}

export function href(route: Route): string {
  switch (route.kind) {
    case "landing":
      return route.open ? `/?vault=${encodeURIComponent(route.open)}` : "/";
    case "connect":
      return route.returnTo
        ? `/connect?returnTo=${encodeURIComponent(route.returnTo)}`
        : "/connect";
    case "vaults":
      return "/vaults";
    case "vault":
      return `${getVaultRoutePath(route.uri)}${versionQuery(route.version)}`;
    case "location":
      return `${getVaultRoutePath(route.uri)}/l/${encodeURIComponent(route.locationId)}${versionQuery(route.version)}`;
    case "person":
      return `${getVaultRoutePath(route.uri)}/l/${encodeURIComponent(route.locationId)}/p/${encodeURIComponent(route.personId)}${versionQuery(route.version)}`;
    case "notFound":
      return route.pathname;
  }
}

/** Where "Back" goes when there is no in-app history to return to. */
export function parentRoute(route: Route): Route | null {
  switch (route.kind) {
    case "person":
      return routes.location(route.uri, route.locationId, route.version);
    case "location":
      return routes.vault(route.uri, route.version);
    case "vault":
      return routes.vaults();
    case "vaults":
    case "connect":
    case "notFound":
      return routes.landing();
    case "landing":
      return null;
  }
}

/** Parses an app-relative `returnTo` value; anything off-origin falls back to the vault list. */
export function parseReturnTo(returnTo: string | undefined): Route {
  if (!returnTo) return routes.vaults();
  try {
    const url = new URL(returnTo, "http://app.local");
    if (url.origin !== "http://app.local") return routes.vaults();
    return parseRoute(url.pathname, url.search);
  } catch {
    return routes.vaults();
  }
}
