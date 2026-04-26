"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { createDatastore, loadDatastore, saveDatastore } from "@/lib/db";
import { getGitHubAuthToken } from "@/lib/datastore/auth";
import { DatastoreConflictError } from "@/lib/datastore/errors";
import { createEmptyDocument } from "@/lib/datastore/schema";
import { createGroup, createLocation, createPerson, generateId } from "@/lib/datastore/helpers";
import { getGistIdFromUri } from "@/lib/datastore/uri";
import { getAuthenticatedUser } from "@/lib/github-user";
import { addKnownVault, updateKnownVault } from "@/lib/known-vaults";
import type { Group, Location, Person } from "@/lib/datastore/types";
import type { DatastoreUri } from "@/lib/datastore/types";
import type { Vault } from "@/lib/vault-types";

interface VaultState {
  vault: Vault | null;
  uri: DatastoreUri | null;
  version: string | null;
  isReadOnly: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  ownerHandle: string | null;
}

interface VaultContextValue extends VaultState {
  loadVault: (uri: string) => Promise<void>;
  createVault: (name: string) => Promise<DatastoreUri>;
  addLocation: (name: string, description?: string) => void;
  updateLocation: (locationId: string, updates: Partial<Location>) => void;
  deleteLocation: (locationId: string) => void;
  addGroup: (locationId: string, name: string) => void;
  addPerson: (
    locationId: string,
    groupId: string,
    person: Omit<Person, "id" | "createdAt" | "updatedAt">,
  ) => void;
  updatePerson: (
    locationId: string,
    groupId: string,
    personId: string,
    updates: Partial<Person>,
  ) => void;
  deletePerson: (locationId: string, groupId: string, personId: string) => void;
  logVisit: (locationId: string, groupId: string, personId: string, note?: string) => void;
  cloneVault: (name: string) => Promise<DatastoreUri>;
}

const VaultContext = createContext<VaultContextValue | null>(null);

const DEBOUNCE_MS = 1500;

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VaultState>({
    vault: null,
    uri: null,
    version: null,
    isReadOnly: false,
    isLoading: false,
    isSyncing: false,
    error: null,
    ownerHandle: null,
  });

  const vaultRef = useRef<Vault | null>(null);
  const uriRef = useRef<DatastoreUri | null>(null);
  const versionRef = useRef<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateState(updates: Partial<VaultState>) {
    setState((prev) => ({ ...prev, ...updates }));
  }

  function setVault(vault: Vault) {
    vaultRef.current = vault;
    updateState({ vault });
  }

  // Debounced sync to Gist
  const scheduleSync = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      const vault = vaultRef.current;
      const uri = uriRef.current;
      const version = versionRef.current;
      const token = getGitHubAuthToken();

      if (!vault || !uri || !version || !token) return;

      updateState({ isSyncing: true });

      try {
        const document = {
          ...createEmptyDocument(),
          data: { locations: vault.locations },
        };

        const snapshot = await saveDatastore({
          uri,
          expectedVersion: version,
          document,
          authToken: token,
        });

        versionRef.current = snapshot.version;
        updateState({ isSyncing: false, error: null });

        // Update known vaults metadata
        const peopleCount = vault.locations.flatMap((l) =>
          l.groups.flatMap((g) => g.people),
        ).length;
        updateKnownVault(uri, {
          lastOpened: new Date().toISOString(),
          peopleCount,
          locationCount: vault.locations.length,
        });
      } catch (error) {
        if (error instanceof DatastoreConflictError) {
          // Retry once by reloading
          try {
            const snapshot = await loadDatastore(uri);
            const newVault: Vault = {
              name: vault.name,
              locations: snapshot.document.data.locations,
            };
            vaultRef.current = newVault;
            versionRef.current = snapshot.version;
            setState((prev) => ({ ...prev, vault: newVault, isSyncing: false }));
          } catch {
            updateState({ isSyncing: false, error: "Sync conflict — reload to get latest." });
          }
        } else {
          updateState({ isSyncing: false, error: "Failed to save changes." });
        }
      }
    }, DEBOUNCE_MS);
  }, []);

  function mutateLocations(updater: (locations: Location[]) => Location[]) {
    const current = vaultRef.current;
    if (!current) return;
    const updated: Vault = { ...current, locations: updater(current.locations) };
    setVault(updated);
    scheduleSync();
  }

  const loadVault = useCallback(async (uriInput: string) => {
    updateState({ isLoading: true, error: null });
    try {
      const snapshot = await loadDatastore(uriInput);
      const uri = snapshot.uri;
      const gistId = getGistIdFromUri(uri);

      // Determine read-only status by checking if auth user owns the gist
      // For now, check the gist owner from the GitHub API
      const user = await getAuthenticatedUser();
      let ownerHandle: string | null = null;
      let isReadOnly = true;

      if (user) {
        // Fetch gist info to get owner
        const token = getGitHubAuthToken();
        const resp = await fetch(`https://api.github.com/gists/${gistId}`, {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
              }
            : { Accept: "application/vnd.github.v3+json" },
        });
        if (resp.ok) {
          const gistData = (await resp.json()) as { owner: { login: string } };
          ownerHandle = gistData.owner.login;
          isReadOnly = ownerHandle !== user.login;
        }
      }

      const vault: Vault = {
        name: `Vault ${gistId.slice(0, 6)}`,
        locations: snapshot.document.data.locations,
      };

      vaultRef.current = vault;
      uriRef.current = uri;
      versionRef.current = snapshot.version;

      const peopleCount = vault.locations.flatMap((l) => l.groups.flatMap((g) => g.people)).length;
      addKnownVault({
        uri,
        name: vault.name,
        lastOpened: new Date().toISOString(),
        peopleCount,
        locationCount: vault.locations.length,
      });

      updateState({
        vault,
        uri,
        version: snapshot.version,
        isReadOnly,
        ownerHandle,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load vault.",
      });
    }
  }, []);

  const createVault = useCallback(async (name: string): Promise<DatastoreUri> => {
    const snapshot = await createDatastore();
    const uri = snapshot.uri;

    const vault: Vault = { name, locations: [] };
    vaultRef.current = vault;
    uriRef.current = uri;
    versionRef.current = snapshot.version;

    addKnownVault({
      uri,
      name,
      lastOpened: new Date().toISOString(),
      peopleCount: 0,
      locationCount: 0,
    });

    updateState({ vault, uri, version: snapshot.version, isReadOnly: false, isLoading: false });
    return uri;
  }, []);

  const addLocation = useCallback(
    (name: string, description?: string) => {
      mutateLocations((locs) => [...locs, createLocation(name, description)]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheduleSync],
  );

  const updateLocation = useCallback(
    (locationId: string, updates: Partial<Location>) => {
      mutateLocations((locs) =>
        locs.map((l) =>
          l.id === locationId ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l,
        ),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheduleSync],
  );

  const deleteLocation = useCallback(
    (locationId: string) => {
      mutateLocations((locs) => locs.filter((l) => l.id !== locationId));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheduleSync],
  );

  const addGroup = useCallback(
    (locationId: string, name: string) => {
      mutateLocations((locs) =>
        locs.map((l) =>
          l.id === locationId
            ? {
                ...l,
                groups: [...l.groups, createGroup(name)],
                updatedAt: new Date().toISOString(),
              }
            : l,
        ),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheduleSync],
  );

  const addPerson = useCallback(
    (
      locationId: string,
      groupId: string,
      person: Omit<Person, "id" | "createdAt" | "updatedAt">,
    ) => {
      const newPerson = createPerson(person.name, person.detail);
      const fullPerson: Person = { ...newPerson, ...person };
      mutateLocations((locs) =>
        locs.map((l) =>
          l.id === locationId
            ? {
                ...l,
                groups: l.groups.map((g) =>
                  g.id === groupId
                    ? {
                        ...g,
                        people: [...g.people, fullPerson],
                        updatedAt: new Date().toISOString(),
                      }
                    : g,
                ),
                updatedAt: new Date().toISOString(),
              }
            : l,
        ),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheduleSync],
  );

  const updatePerson = useCallback(
    (locationId: string, groupId: string, personId: string, updates: Partial<Person>) => {
      mutateLocations((locs) =>
        locs.map((l) =>
          l.id === locationId
            ? {
                ...l,
                groups: l.groups.map((g) =>
                  g.id === groupId
                    ? {
                        ...g,
                        people: g.people.map((p) =>
                          p.id === personId
                            ? { ...p, ...updates, updatedAt: new Date().toISOString() }
                            : p,
                        ),
                        updatedAt: new Date().toISOString(),
                      }
                    : g,
                ),
                updatedAt: new Date().toISOString(),
              }
            : l,
        ),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheduleSync],
  );

  const deletePerson = useCallback(
    (locationId: string, groupId: string, personId: string) => {
      mutateLocations((locs) =>
        locs.map((l) =>
          l.id === locationId
            ? {
                ...l,
                groups: l.groups.map((g) =>
                  g.id === groupId
                    ? {
                        ...g,
                        people: g.people.filter((p) => p.id !== personId),
                        updatedAt: new Date().toISOString(),
                      }
                    : g,
                ),
                updatedAt: new Date().toISOString(),
              }
            : l,
        ),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheduleSync],
  );

  const logVisit = useCallback(
    (locationId: string, groupId: string, personId: string, note?: string) => {
      const today = new Date().toISOString().split("T")[0] + "T00:00:00.000Z";
      mutateLocations((locs) =>
        locs.map((l) =>
          l.id === locationId
            ? {
                ...l,
                groups: l.groups.map((g) =>
                  g.id === groupId
                    ? {
                        ...g,
                        people: g.people.map((p) =>
                          p.id === personId
                            ? {
                                ...p,
                                lastSeen: today,
                                visitLog: [
                                  { date: today, ...(note ? { note } : {}) },
                                  ...(p.visitLog ?? []),
                                ],
                                updatedAt: new Date().toISOString(),
                              }
                            : p,
                        ),
                        updatedAt: new Date().toISOString(),
                      }
                    : g,
                ),
                updatedAt: new Date().toISOString(),
              }
            : l,
        ),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheduleSync],
  );

  const cloneVault = useCallback(async (name: string): Promise<DatastoreUri> => {
    const currentVault = vaultRef.current;
    if (!currentVault) throw new Error("No vault loaded to clone.");

    const token = getGitHubAuthToken();
    if (!token) throw new Error("Authentication required to clone vault.");

    // Create a new empty gist
    const snapshot = await createDatastore();
    const newUri = snapshot.uri;

    // Save current vault data into new gist
    const document = {
      ...createEmptyDocument(),
      data: { locations: currentVault.locations },
    };

    const saved = await saveDatastore({
      uri: newUri,
      expectedVersion: snapshot.version,
      document,
      authToken: token,
    });

    const peopleCount = currentVault.locations.flatMap((l) =>
      l.groups.flatMap((g) => g.people),
    ).length;

    addKnownVault({
      uri: newUri,
      name,
      lastOpened: new Date().toISOString(),
      peopleCount,
      locationCount: currentVault.locations.length,
    });

    // Switch to new vault
    const newVault: Vault = { name, locations: currentVault.locations };
    vaultRef.current = newVault;
    uriRef.current = newUri;
    versionRef.current = saved.version;

    updateState({
      vault: newVault,
      uri: newUri,
      version: saved.version,
      isReadOnly: false,
      isLoading: false,
    });

    return newUri;
  }, []);

  // Helper to find a person (used by components)
  const contextValue: VaultContextValue = {
    ...state,
    loadVault,
    createVault,
    addLocation,
    updateLocation,
    deleteLocation,
    addGroup,
    addPerson,
    updatePerson,
    deletePerson,
    logVisit,
    cloneVault,
  };

  return <VaultContext.Provider value={contextValue}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used inside VaultProvider");
  return ctx;
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

// Unused but exported for completeness
void generateId;
