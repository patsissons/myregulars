/// <reference path="../pb_data/types.d.ts" />

// Creates the `vaults` collection — one record per hosted vault.
// The full MyRegularsDocument is stored in the `document` JSON field; the
// built-in `updated` autodate field doubles as the optimistic-concurrency
// version token used by the PocketBase storage adapter.
migrate(
  (app) => {
    const ownerRule = '@request.auth.id != "" && owner = @request.auth.id';

    const collection = new Collection({
      type: "base",
      name: "vaults",
      listRule: ownerRule,
      viewRule: ownerRule,
      createRule: ownerRule,
      updateRule: ownerRule,
      deleteRule: ownerRule,
      fields: [
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
          name: "name",
          type: "text",
          required: false,
          max: 200,
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
        {
          name: "updated",
          type: "autodate",
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: ["CREATE INDEX `idx_vaults_owner` ON `vaults` (`owner`)"],
    });

    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("vaults");
    app.delete(collection);
  },
);
