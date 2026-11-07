/// <reference path="../pb_data/types.d.ts" />

// Vault write semantics enforced server-side:
//
// - Conditional updates: when a client sends `expectedUpdated` with a vault
//   update, the write is rejected with 409 unless it matches the record's
//   current `updated` token. This makes "read, compare, write" atomic for
//   hosted vaults.
// - Snapshots: every create, and every update that touches `document`, appends
//   a `vault_snapshots` row after the vault is saved. Clients never write
//   snapshots themselves, so a save is one request and history cannot be left
//   half-written. Toggling `public` alone does not create a snapshot.
//
// Handlers are self-contained (PocketBase evaluates them in pooled VMs), so
// shared code lives in ./vaults-utils.js and is required inside each handler.

onRecordCreateRequest((e) => {
  e.next();

  const { appendSnapshot } = require(`${__hooks}/vaults-utils.js`);
  appendSnapshot(e.app, e.record);
}, "vaults");

onRecordUpdateRequest((e) => {
  const body = e.requestInfo().body || {};
  const expected = body.expectedUpdated;

  if (expected !== undefined && expected !== null && expected !== "") {
    const current = e.record.original().getString("updated");
    if (String(expected) !== current) {
      throw new ApiError(409, "The vault changed before this save completed.", {});
    }
  }

  e.next();

  if (Object.prototype.hasOwnProperty.call(body, "document")) {
    const { appendSnapshot } = require(`${__hooks}/vaults-utils.js`);
    appendSnapshot(e.app, e.record);
  }
}, "vaults");
