"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useDuplicateConfirm } from "@/components/duplicate-confirm-dialog";
import { useVault } from "@/lib/vault-context";
import type { Location, Pet, Person } from "@/lib/datastore/types";

export interface PersonFormConfig {
  mode: "add" | "edit";
  location: Location;
  locationId: string;
  groupId?: string;
  person?: Person;
}

interface PersonFormProps {
  config: PersonFormConfig;
  onClose: () => void;
}

export function PersonForm({ config, onClose }: PersonFormProps) {
  const { mode, location, locationId, person } = config;
  const { vault, addGroup, addPerson, updatePerson, deletePerson, movePerson } = useVault();
  const { showToast } = useToast();
  const { checkDuplicate, DuplicateConfirmDialogComponent } = useDuplicateConfirm();

  const liveLocation = vault?.locations.find((l) => l.id === locationId) ?? location;
  const initialGroupId = config.groupId ?? liveLocation.groups[0]?.id ?? null;

  const [name, setName] = useState(person?.name ?? "");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(initialGroupId);
  const [detail, setDetail] = useState(person?.detail ?? "");
  const [showPhotoField, setShowPhotoField] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(person?.photoUrl ?? "");
  const [pets, setPets] = useState<Pet[]>(person?.pets ?? []);
  const [showAddPet, setShowAddPet] = useState(false);
  const [newPetName, setNewPetName] = useState("");
  const [newPetSpecies, setNewPetSpecies] = useState("");
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus the name field after mount without scrolling — autoFocus inside the
  // animated mobile sheet caused the scroll container to jump to the bottom.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      nameInputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, []);

  function handleAddPet() {
    if (!newPetName.trim()) return;
    setPets((prev) => [
      ...prev,
      { name: newPetName.trim(), species: newPetSpecies.trim() || "pet" },
    ]);
    setNewPetName("");
    setNewPetSpecies("");
    setShowAddPet(false);
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return;
    const existingNames = liveLocation.groups.map((g) => g.name);
    const confirmed = await checkDuplicate("group", newGroupName.trim(), existingNames);
    if (!confirmed) return;
    const groupId = addGroup(locationId, newGroupName.trim());
    setSelectedGroupId(groupId);
    setNewGroupName("");
    setShowNewGroupInput(false);
  }

  async function handleSave() {
    if (!name.trim()) return;

    // Determine group ID (may need to create the group first)
    let groupId = selectedGroupId;

    // If no group is selected but the location has groups, use the first
    if (!groupId && liveLocation.groups.length > 0) {
      groupId = liveLocation.groups[0].id;
    }

    // If still no group, create a default "Regulars" group
    if (!groupId) {
      groupId = addGroup(locationId, "Regulars");
    }

    // Check for duplicate person name (add mode only)
    if (mode === "add") {
      const existingNames = liveLocation.groups.flatMap((g) => g.people.map((p) => p.name));
      const confirmed = await checkDuplicate("person", name.trim(), existingNames);
      if (!confirmed) return;
    }

    const personData = {
      name: name.trim(),
      detail: detail.trim(),
      photoUrl: photoUrl.trim() || undefined,
      pets: pets.length > 0 ? pets : undefined,
    };

    if (mode === "add") {
      addPerson(locationId, groupId, {
        ...personData,
        lastSeen: undefined,
        visitLog: undefined,
        relationships: undefined,
      });
      showToast("Person added");
    } else if (person && config.groupId) {
      if (groupId && groupId !== config.groupId) {
        movePerson(locationId, config.groupId, groupId, person.id);
        updatePerson(locationId, groupId, person.id, personData);
      } else {
        updatePerson(locationId, config.groupId, person.id, personData);
      }
      showToast("Person updated");
    }

    onClose();
  }

  function handleDelete() {
    if (!person || !config.groupId) return;
    deletePerson(locationId, config.groupId, person.id);
    showToast("Person removed");
    onClose();
  }

  const canSave = name.trim().length > 0;

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Avatar preview + Name */}
      <div className="flex items-center gap-4">
        <Avatar name={name || "?"} size={56} photoUrl={photoUrl || undefined} />
        <input
          ref={nameInputRef}
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-w-0 flex-1 bg-transparent outline-none"
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            color: "var(--mr-text)",
          }}
        />
      </div>

      {/* Group selector */}
      <div>
        <p className="mb-2 text-[12px] font-[500]" style={{ color: "var(--mr-dim)" }}>
          Group
        </p>
        <div className="flex flex-wrap gap-2">
          {liveLocation.groups.map((g) => (
            <Chip
              key={g.id}
              active={selectedGroupId === g.id}
              onClick={() => {
                setSelectedGroupId(g.id);
                setShowNewGroupInput(false);
              }}
            >
              {g.name}
            </Chip>
          ))}

          {showNewGroupInput ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="Group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateGroup();
                  if (e.key === "Escape") {
                    setShowNewGroupInput(false);
                    setNewGroupName("");
                  }
                }}
                autoFocus
                className="h-7 rounded-full px-3 text-[16px] outline-none lg:text-[13px]"
                style={{
                  background: "var(--mr-subtle)",
                  border: "1px solid var(--mr-edge)",
                  color: "var(--mr-text)",
                  width: 120,
                }}
              />
              <button
                type="button"
                onClick={handleCreateGroup}
                className="text-[12px] font-[500] transition-opacity hover:opacity-50"
                style={{ color: "var(--mr-accent)" }}
              >
                Add
              </button>
            </div>
          ) : (
            <Chip variant="dashed" onClick={() => setShowNewGroupInput(true)}>
              + New group
            </Chip>
          )}
        </div>
      </div>

      {/* Key detail */}
      <div>
        <p className="mb-1 text-[12px] font-[500]" style={{ color: "var(--mr-dim)" }}>
          One key detail
        </p>
        <p className="mb-2 text-[11px]" style={{ color: "var(--mr-faint)" }}>
          Something memorable. The thing you&apos;d whisper before walking in.
        </p>
        <Textarea
          placeholder="e.g. Brings a golden retriever named Biscuit."
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={3}
        />
      </div>

      {/* Photo URL (collapsible) */}
      {showPhotoField ? (
        <div>
          <p className="mb-2 text-[12px] font-[500]" style={{ color: "var(--mr-dim)" }}>
            Photo URL
          </p>
          <Input
            placeholder="https://example.com/photo.jpg"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowPhotoField(true)}
          className="self-start text-[13px] transition-opacity hover:opacity-50"
          style={{ color: "var(--mr-accent)" }}
        >
          Add photo
        </button>
      )}

      {/* Pets (edit mode only) */}
      {mode === "edit" && (
        <div>
          <p className="mb-2 text-[12px] font-[500]" style={{ color: "var(--mr-dim)" }}>
            Pets
          </p>
          <div className="flex flex-wrap gap-2">
            {pets.map((pet, idx) => (
              <Chip key={idx}>
                {pet.name} ({pet.species})
                <button
                  type="button"
                  onClick={() => setPets((prev) => prev.filter((_, i) => i !== idx))}
                  className="ml-1.5 transition-opacity hover:opacity-50"
                  aria-label={`Remove ${pet.name}`}
                >
                  <X size={12} />
                </button>
              </Chip>
            ))}

            {showAddPet ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Name"
                  value={newPetName}
                  onChange={(e) => setNewPetName(e.target.value)}
                  autoFocus
                  className="h-7 w-20 rounded-full px-3 text-[16px] outline-none lg:text-[13px]"
                  style={{
                    background: "var(--mr-subtle)",
                    border: "1px solid var(--mr-edge)",
                    color: "var(--mr-text)",
                  }}
                />
                <input
                  type="text"
                  placeholder="Species"
                  value={newPetSpecies}
                  onChange={(e) => setNewPetSpecies(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddPet()}
                  className="h-7 w-20 rounded-full px-3 text-[16px] outline-none lg:text-[13px]"
                  style={{
                    background: "var(--mr-subtle)",
                    border: "1px solid var(--mr-edge)",
                    color: "var(--mr-text)",
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddPet}
                  className="text-[12px] font-[500] transition-opacity hover:opacity-50"
                  style={{ color: "var(--mr-accent)" }}
                >
                  Add
                </button>
              </div>
            ) : (
              <Chip variant="dashed" onClick={() => setShowAddPet(true)}>
                + Add pet
              </Chip>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div
        className="flex items-center justify-between gap-2 border-t pt-4"
        style={{ borderColor: "var(--mr-edge)" }}
      >
        {/* Delete (edit mode only) */}
        {mode === "edit" && !showDeleteConfirm && (
          <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
            Delete person
          </Button>
        )}
        {mode === "edit" && showDeleteConfirm && (
          <div className="flex items-center gap-2">
            <span className="text-[12px]" style={{ color: "var(--mr-danger)" }}>
              Sure?
            </span>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              Yes, delete
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
          </div>
        )}
        {mode === "add" && <div />}

        <div className="flex gap-2">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={handleSave} disabled={!canSave}>
            {mode === "add" ? "Add person" : "Save"}
          </Button>
        </div>
      </div>

      {DuplicateConfirmDialogComponent}
    </div>
  );
}
