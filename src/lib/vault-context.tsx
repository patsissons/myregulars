"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  getServerVaultState,
  getVaultState,
  subscribeVaultStore,
  vaultActions,
  type VaultActions,
  type VaultState,
} from "@/lib/vault-store";
import type { Group, Location, Person } from "@/lib/datastore/types";
import type { Vault } from "@/lib/vault-types";

export type VaultContextValue = VaultState & VaultActions;

/**
 * Kept so existing trees keep rendering; the vault store no longer needs a
 * provider (it lives at module level, see vault-store.ts). Removed with the
 * route refactor.
 */
export function VaultProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/** The open vault's state plus every action, from anywhere in the tree. */
export function useVault(): VaultContextValue {
  const state = useSyncExternalStore(subscribeVaultStore, getVaultState, getServerVaultState);
  return useMemo(() => ({ ...state, ...vaultActions }), [state]);
}

// Helper to get total people count
export function getPeopleCount(vault: Vault | null): number {
  if (!vault) return 0;
  return vault.locations.flatMap((l) => l.groups.flatMap((g) => g.people)).length;
}

// Helper to get all people with location/group context
export interface PersonWithContext {
  person: Person;
  group: Group;
  location: Location;
}

export function getAllPeople(vault: Vault | null): PersonWithContext[] {
  if (!vault) return [];
  return vault.locations.flatMap((location) =>
    location.groups.flatMap((group) => group.people.map((person) => ({ person, group, location }))),
  );
}

// Helper to find a specific person
export function findPerson(
  vault: Vault | null,
  locationId: string,
  personId: string,
): PersonWithContext | null {
  if (!vault) return null;
  for (const location of vault.locations) {
    if (location.id !== locationId) continue;
    for (const group of location.groups) {
      const person = group.people.find((p) => p.id === personId);
      if (person) return { person, group, location };
    }
  }
  return null;
}
