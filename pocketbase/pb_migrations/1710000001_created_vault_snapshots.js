/// <reference path="../pb_data/types.d.ts" />

// Creates the `vault_snapshots` collection — append-only version history.
// One row is written on every save; powers listVersions()/readVersion() in the
// PocketBase storage adapter. Snapshots are immutable to users (no update/delete
// rules), only created and read by their owner.
migrate(
  (app) => {
    const vaults = app.findCollectionByNameOrId("vaults");
    const ownerRule = '@request.auth.id != "" && owner = @request.auth.id';

    const collection = new Collection({
      type: "base",
      name: "vault_snapshots",
      listRule: ownerRule,
      viewRule: ownerRule,
      createRule: ownerRule,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: "vault",
          type: "relation",
          required: true,
          collectionId: vaults.id,
          cascadeDelete: true,
          minSelect: 0,
          maxSelect: 1,
        },
        {
          name: "owner",
          type: "relation",
          required: true,
          collectionId: "_pb_users_auth_",
          cascadeDelete: true,
          minSelect: 0,
          maxSelect: 1,
        },
        {
          name: "document",
          type: "json",
          required: true,
          maxSize: 5000000,
        },
        {
          name: "created",
          type: "autodate",
          onCreate: true,
          onUpdate: false,
        },
      ],
      indexes: ["CREATE INDEX `idx_vault_snapshots_vault` ON `vault_snapshots` (`vault`)"],
    });

    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("vault_snapshots");
    app.delete(collection);
  },
);
