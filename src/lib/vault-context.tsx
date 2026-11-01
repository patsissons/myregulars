"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useOptionalToast } from "@/components/ui/toast";
import {
  createDatastore,
  loadDatastore,
  loadDatastoreVersion,
  saveDatastore,
  syncDatastoreReplicas,
} from "@/lib/db";
import { DatastoreConflictError } from "@/lib/datastore/errors";
import { findRegistryEntryByUri, siblingUriOf } from "@/lib/datastore/registry";
import { createEmptyDocument } from "@/lib/datastore/schema";
import { siblingProvider, siblingUriFromDocument } from "@/lib/datastore/sync";
import {
  createGroup,
  createLocation,
  createPerson,
  extractVaultNameFromFileName,
  generateId,
  localDateString,
  toVisitTimestamp,
} from "@/lib/datastore/helpers";
import { getIdFromUri, getProviderFromUri } from "@/lib/datastore/uri";
import { getVaultAuthToken, resolveVaultOwnership } from "@/lib/datastore/ownership";
import { addKnownVault, getKnownVaults, updateKnownVault } from "@/lib/known-vaults";
import type {
  DatastoreProviderId,
  Group,
  Location,
  MyRegularsDocument,
  Person,
} from "@/lib/datastore/types";
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
  isHistoricalVersion: boolean;
  historicalVersionId: string | null;
  latestVersion: string | null;
}

interface VaultContextValue extends VaultState {
  loadVault: (uri: string) => Promise<void>;
  createVault: (name: string, provider?: DatastoreProviderId) => Promise<DatastoreUri>;
  importVault: (
    name: string,
    document: MyRegularsDocument,
    provider?: DatastoreProviderId,
  ) => Promise<DatastoreUri>;
  addLocation: (name: string, description?: string) => void;
  updateLocation: (locationId: string, updates: Partial<Location>) => void;
  deleteLocation: (locationId: string) => void;
  addGroup: (locationId: string, name: string) => string;
  deleteGroup: (locationId: string, groupId: string) => void;
  updateVaultName: (name: string) => void;
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
  movePerson: (
    locationId: string,
    fromGroupId: string,
    toGroupId: string,
    personId: string,
  ) => void;
  /** Logs a visit. `day` is a local `YYYY-MM-DD`; defaults to today. */
  logVisit: (
    locationId: string,
    groupId: string,
    personId: string,
    note?: string,
    day?: string,
  ) => void;
  cloneVault: (name: string) => Promise<DatastoreUri>;
  loadVaultVersion: (uri: string, version: string) => Promise<void>;
  revertToVersion: () => Promise<void>;
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
    isHistoricalVersion: false,
    historicalVersionId: null,
    latestVersion: null,
  });

  const vaultRef = useRef<Vault | null>(null);
  const uriRef = useRef<DatastoreUri | null>(null);
  const versionRef = useRef<string | null>(null);
  // The document as last read from or written to the datastore. Saves spread
  // it so metadata (id, replica links, sync base) survives round trips.
  const documentRef = useRef<MyRegularsDocument | null>(null);
  // Bumped on every local mutation; lets async work tell "edited since I started".
  const mutationSeqRef = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Toasts are optional so the provider also works without a ToastProvider.
  const toast = useOptionalToast();
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

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
      const token = uri ? getVaultAuthToken(uri) : null;

      if (!vault || !uri || !version || !token) return;

      updateState({ isSyncing: true });

      try {
        const document: MyRegularsDocument = {
          ...(documentRef.current ?? createEmptyDocument()),
          name: vault.name,
          data: { locations: vault.locations },
        };

        const snapshot = await saveDatastore({
          uri,
          expectedVersion: version,
          document,
          authToken: token,
        });

        versionRef.current = snapshot.version;
        documentRef.current = snapshot.document;
        updateState({ isSyncing: false, error: null });

        if (snapshot.mirror.status === "pending") {
          toastRef.current?.showToast(
            snapshot.mirror.reason === "diverged"
              ? "Your other copy has different changes. Open Storage to resolve."
              : "Saved here, but couldn't update your other copy yet.",
            { variant: "info" },
          );
        }

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
          // The vault changed elsewhere. Reload the latest copy and tell the
          // user; their unsaved local edits are replaced by the remote state.
          try {
            const snapshot = await loadDatastore(uri);
            const newVault: Vault = {
              name: vault.name,
              locations: snapshot.document.data.locations,
            };
            vaultRef.current = newVault;
            versionRef.current = snapshot.version;
            documentRef.current = snapshot.document;
            setState((prev) => ({ ...prev, vault: newVault, isSyncing: false }));
            toastRef.current?.showToast("This vault changed elsewhere. Loaded the latest copy.", {
              variant: "error",
            });
          } catch {
            updateState({ isSyncing: false, error: "Sync conflict — reload to get latest." });
            toastRef.current?.showToast("Sync conflict. Reload to get the latest.", {
              variant: "error",
            });
          }
        } else {
          updateState({ isSyncing: false, error: "Failed to save changes." });
          toastRef.current?.showToast("Couldn't save changes.", { variant: "error" });
        }
      }
    }, DEBOUNCE_MS);
  }, []);

  function mutateLocations(updater: (locations: Location[]) => Location[]) {
    const current = vaultRef.current;
    if (!current) return;
    const updated: Vault = { ...current, locations: updater(current.locations) };
    mutationSeqRef.current += 1;
    setVault(updated);
    scheduleSync();
  }

  /**
   * After opening a vault that has a copy in the other provider, bring the two
   * back in line in the background. The sibling is fast-forwarded remotely;
   * if this copy is the one that is behind, its content is adopted locally
   * and flows through the normal save path, so a user who started editing in
   * the meantime never has a remote write pulled out from under them.
   */
  const reconcileReplicas = useCallback(
    (uri: DatastoreUri, document: MyRegularsDocument, writable: boolean) => {
      const entry = findRegistryEntryByUri(uri);
      const siblingUri =
        (entry ? siblingUriOf(entry, uri) : null) ?? siblingUriFromDocument(document, uri);
      if (!siblingUri) return;

      const seqAtStart = mutationSeqRef.current;
      const self = getProviderFromUri(uri);

      void syncDatastoreReplicas(uri, { applyTo: [siblingProvider(self)] })
        .then((result) => {
          if (uriRef.current !== uri) return;
          if (result.status.kind !== "fastForward" || result.status.to !== self) return;
          if (!writable || mutationSeqRef.current !== seqAtStart) return;

          const current = vaultRef.current;
          const incoming = result.sibling.document;
          if (!current) return;

          const adopted: Vault = {
            name: incoming.name ?? current.name,
            locations: incoming.data.locations,
          };
          documentRef.current = {
            ...(documentRef.current ?? incoming),
            name: adopted.name,
            data: { locations: adopted.locations },
          };
          mutationSeqRef.current += 1;
          setVault(adopted);
          scheduleSync();
          toastRef.current?.showToast("Updated from your other copy.", { variant: "info" });
        })
        .catch(() => {
          // Offline, signed out of the other provider, etc. Nothing to do now;
          // the next save retries the mirror.
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheduleSync],
  );

  const loadVault = useCallback(
    async (uriInput: string) => {
      updateState({ isLoading: true, error: null });
      try {
        const snapshot = await loadDatastore(uriInput);
        const uri = snapshot.uri;

        // Read-only status and owner are resolved per provider.
        const { ownerHandle, isReadOnly } = await resolveVaultOwnership(uri, {
          ownerId: snapshot.ownerId,
        });

        const existingVault = getKnownVaults().find((v) => v.uri === uri);
        const nameFromFile = snapshot.vaultFileName
          ? extractVaultNameFromFileName(snapshot.vaultFileName)
          : null;
        const nameFromDocument = snapshot.document.name;
        const vault: Vault = {
          name:
            nameFromDocument ??
            existingVault?.name ??
            nameFromFile ??
            `Vault ${getIdFromUri(uri).slice(0, 6)}`,
          locations: snapshot.document.data.locations,
        };

        vaultRef.current = vault;
        uriRef.current = uri;
        versionRef.current = snapshot.version;
        documentRef.current = snapshot.document;

        const peopleCount = vault.locations.flatMap((l) =>
          l.groups.flatMap((g) => g.people),
        ).length;
        addKnownVault({
          id: snapshot.document.id,
          uri,
          provider: getProviderFromUri(uri),
          name: vault.name,
          lastOpened: new Date().toISOString(),
          peopleCount,
          locationCount: vault.locations.length,
          replicas: snapshot.document.replicas,
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

        if (snapshot.source === "remote") {
          reconcileReplicas(uri, snapshot.document, !isReadOnly);
        }
      } catch (error) {
        updateState({
          isLoading: false,
          error: error instanceof Error ? error.message : "Failed to load vault.",
        });
      }
    },
    [reconcileReplicas],
  );

  const createVault = useCallback(
    async (name: string, provider: DatastoreProviderId = "gist"): Promise<DatastoreUri> => {
      const snapshot = await createDatastore(name, undefined, provider);
      const uri = snapshot.uri;

      const vault: Vault = { name, locations: [] };
      vaultRef.current = vault;
      uriRef.current = uri;
      versionRef.current = snapshot.version;
      documentRef.current = snapshot.document;

      addKnownVault({
        id: snapshot.document.id,
        uri,
        provider: getProviderFromUri(uri),
        name,
        lastOpened: new Date().toISOString(),
        peopleCount: 0,
        locationCount: 0,
      });

      updateState({ vault, uri, version: snapshot.version, isReadOnly: false, isLoading: false });
      return uri;
    },
    [],
  );

  const importVault = useCallback(
    async (
      name: string,
      document: MyRegularsDocument,
      provider: DatastoreProviderId = "gist",
    ): Promise<DatastoreUri> => {
      // An import is a brand-new vault: fresh id, no replica links or sync
      // state carried over from wherever the JSON came from.
      const seed: MyRegularsDocument = {
        ...createEmptyDocument(),
        name,
        data: document.data,
      };
      const snapshot = await createDatastore(name, seed, provider);
      const uri = snapshot.uri;

      const vault: Vault = {
        name,
        locations: snapshot.document.data.locations,
      };
      vaultRef.current = vault;
      uriRef.current = uri;
      versionRef.current = snapshot.version;
      documentRef.current = snapshot.document;

      const peopleCount = vault.locations.flatMap((l) => l.groups.flatMap((g) => g.people)).length;
      addKnownVault({
        id: snapshot.document.id,
        uri,
        provider: getProviderFromUri(uri),
        name,
        lastOpened: new Date().toISOString(),
        peopleCount,
        locationCount: vault.locations.length,
      });

      updateState({ vault, uri, version: snapshot.version, isReadOnly: false, isLoading: false });
      return uri;
    },
    [],
  );

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
    (locationId: string, name: string): string => {
      const normalizedName = name.trim().toLowerCase();
      const location = vaultRef.current?.locations.find((l) => l.id === locationId);
      const existing = location?.groups.find((g) => g.name.toLowerCase() === normalizedName);
      if (existing) {
        return existing.id;
      }
      const newGroup = createGroup(name);
      mutateLocations((locs) =>
        locs.map((l) =>
          l.id === locationId
            ? {
                ...l,
                groups: [...l.groups, newGroup],
                updatedAt: new Date().toISOString(),
              }
            : l,
        ),
      );
      return newGroup.id;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheduleSync],
  );

  const deleteGroup = useCallback(
    (locationId: string, groupId: string) => {
      mutateLocations((locs) =>
        locs.map((l) =>
          l.id === locationId
            ? {
                ...l,
                groups: l.groups.filter((g) => g.id !== groupId),
                updatedAt: new Date().toISOString(),
              }
            : l,
        ),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheduleSync],
  );

  const updateVaultName = useCallback(
    (name: string) => {
      const current = vaultRef.current;
      const uri = uriRef.current;
      if (!current || !uri) return;
      const updated: Vault = { ...current, name };
      setVault(updated);
      updateKnownVault(uri, { name });
      scheduleSync();
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

  const movePerson = useCallback(
    (locationId: string, fromGroupId: string, toGroupId: string, personId: string) => {
      mutateLocations((locs) =>
        locs.map((l) => {
          if (l.id !== locationId) return l;
          const person = l.groups
            .find((g) => g.id === fromGroupId)
            ?.people.find((p) => p.id === personId);
          if (!person) return l;
          return {
            ...l,
            groups: l.groups.map((g) => {
              if (g.id === fromGroupId) {
                return {
                  ...g,
                  people: g.people.filter((p) => p.id !== personId),
                  updatedAt: new Date().toISOString(),
                };
              }
              if (g.id === toGroupId) {
                return {
                  ...g,
                  people: [...g.people, { ...person, updatedAt: new Date().toISOString() }],
                  updatedAt: new Date().toISOString(),
                };
              }
              return g;
            }),
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheduleSync],
  );

  const logVisit = useCallback(
    (locationId: string, groupId: string, personId: string, note?: string, day?: string) => {
      const visitDate = toVisitTimestamp(day ?? localDateString());
      mutateLocations((locs) =>
        locs.map((l) =>
          l.id === locationId
            ? {
                ...l,
                groups: l.groups.map((g) =>
                  g.id === groupId
                    ? {
                        ...g,
                        people: g.people.map((p) => {
                          if (p.id !== personId) return p;
                          const entry = { date: visitDate, ...(note ? { note } : {}) };
                          // Keep the log newest-first even when back-filling an
                          // older visit, and never let lastSeen move backwards.
                          const visitLog = [entry, ...(p.visitLog ?? [])].sort((a, b) =>
                            b.date.localeCompare(a.date),
                          );
                          const lastSeen =
                            p.lastSeen && p.lastSeen > visitDate ? p.lastSeen : visitDate;
                          return {
                            ...p,
                            lastSeen,
                            visitLog,
                            updatedAt: new Date().toISOString(),
                          };
                        }),
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
    const sourceUri = uriRef.current;
    if (!currentVault || !sourceUri) throw new Error("No vault loaded to clone.");

    const provider = getProviderFromUri(sourceUri);
    if (!getVaultAuthToken(sourceUri)) {
      throw new Error("Authentication required to clone vault.");
    }

    // Create a new vault in the same provider as the source.
    const snapshot = await createDatastore(name, undefined, provider);
    const newUri = snapshot.uri;

    // Save the current vault's data into the new vault. A clone is its own
    // vault (new id, no replica links), so spread the freshly created document.
    const document: MyRegularsDocument = {
      ...snapshot.document,
      name,
      data: { locations: currentVault.locations },
    };

    const saved = await saveDatastore({
      uri: newUri,
      expectedVersion: snapshot.version,
      document,
      authToken: getVaultAuthToken(newUri) ?? undefined,
    });

    const peopleCount = currentVault.locations.flatMap((l) =>
      l.groups.flatMap((g) => g.people),
    ).length;

    addKnownVault({
      id: saved.document.id,
      uri: newUri,
      provider: getProviderFromUri(newUri),
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
    documentRef.current = saved.document;

    updateState({
      vault: newVault,
      uri: newUri,
      version: saved.version,
      isReadOnly: false,
      isLoading: false,
    });

    return newUri;
  }, []);

  const loadVaultVersion = useCallback(async (uriInput: string, version: string) => {
    updateState({ isLoading: true, error: null });
    try {
      // First load the latest to get current version for potential revert
      const latestSnapshot = await loadDatastore(uriInput);
      const uri = latestSnapshot.uri;

      // Now load the historical version
      const snapshot = await loadDatastoreVersion(uri, version);

      const existingVault = getKnownVaults().find((v) => v.uri === uri);
      const vault: Vault = {
        name:
          snapshot.document.name ?? existingVault?.name ?? `Vault ${getIdFromUri(uri).slice(0, 6)}`,
        locations: snapshot.document.data.locations,
      };

      vaultRef.current = vault;
      uriRef.current = uri;
      versionRef.current = latestSnapshot.version;
      // Keep the latest copy's metadata so a revert writes a well-formed v2
      // document with the right id and replica links.
      documentRef.current = latestSnapshot.document;

      updateState({
        vault,
        uri,
        version: latestSnapshot.version,
        isReadOnly: true,
        isLoading: false,
        error: null,
        ownerHandle: null,
        isHistoricalVersion: true,
        historicalVersionId: version,
        latestVersion: latestSnapshot.version,
      });
    } catch (error) {
      updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load version.",
      });
    }
  }, []);

  const revertToVersion = useCallback(async () => {
    const currentVault = vaultRef.current;
    const uri = uriRef.current;
    const latestVersion = versionRef.current;
    const token = uri ? getVaultAuthToken(uri) : null;

    if (!currentVault || !uri || !latestVersion || !token) {
      throw new Error("Cannot revert: missing vault data or authentication.");
    }

    const document: MyRegularsDocument = {
      ...(documentRef.current ?? createEmptyDocument()),
      name: currentVault.name,
      data: { locations: currentVault.locations },
    };

    const saved = await saveDatastore({
      uri,
      expectedVersion: latestVersion,
      document,
      authToken: token,
    });

    versionRef.current = saved.version;
    documentRef.current = saved.document;

    updateState({
      version: saved.version,
      isReadOnly: false,
      isHistoricalVersion: false,
      historicalVersionId: null,
      latestVersion: null,
      isSyncing: false,
    });
  }, []);

  // Helper to find a person (used by components)
  const contextValue: VaultContextValue = {
    ...state,
    loadVault,
    createVault,
    importVault,
    addLocation,
    updateLocation,
    deleteLocation,
    addGroup,
    deleteGroup,
    updateVaultName,
    addPerson,
    updatePerson,
    deletePerson,
    movePerson,
    logVisit,
    cloneVault,
    loadVaultVersion,
    revertToVersion,
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
