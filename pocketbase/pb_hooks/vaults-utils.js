/// <reference path="../pb_data/types.d.ts" />

// Shared helpers for pb_hooks/vaults.pb.js. Hook handlers run in pooled JS
// VMs and cannot close over file-level functions, so anything they share has
// to be `require`d. Plain `.js` (not `.pb.js`) so PocketBase doesn't load it
// as a hook file on its own.

/**
 * Appends a `vault_snapshots` row for the vault's current document.
 * @param {core.App} app
 * @param {core.Record} vault
 */
function appendSnapshot(app, vault) {
  const collection = app.findCollectionByNameOrId("vault_snapshots");
  const snapshot = new Record(collection);
  snapshot.set("vault", vault.id);
  snapshot.set("owner", vault.getString("owner"));
  snapshot.set("document", vault.get("document"));
  snapshot.set("vault_updated", vault.getString("updated"));
  app.save(snapshot);
}

module.exports = { appendSnapshot };
