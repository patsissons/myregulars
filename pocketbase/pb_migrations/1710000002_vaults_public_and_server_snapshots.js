/// <reference path="../pb_data/types.d.ts" />

// 1. `vaults.public` — when true, anyone with the link may read the vault
//    (mirrors how a secret gist is link-readable). Listing stays owner-only.
// 2. Snapshots become server-written (see pb_hooks/vaults.pb.js): clients can
//    no longer create them, and each one records the vault `updated` token it
//    corresponds to so a historical read can return a real version token.
// 3. Snapshot reads follow the vault's visibility so history works for shared
//    vaults too.
migrate(
  (app) => {
    const vaults = app.findCollectionByNameOrId("vaults");
    vaults.fields.add(new BoolField({ name: "public" }));
    vaults.viewRule = '(@request.auth.id != "" && owner = @request.auth.id) || public = true';
    app.save(vaults);

    const snapshots = app.findCollectionByNameOrId("vault_snapshots");
    snapshots.fields.add(new TextField({ name: "vault_updated", max: 64 }));
    const readRule = '(@request.auth.id != "" && owner = @request.auth.id) || vault.public = true';
    snapshots.listRule = readRule;
    snapshots.viewRule = readRule;
    snapshots.createRule = null;
    app.save(snapshots);
  },
  (app) => {
    const ownerRule = '@request.auth.id != "" && owner = @request.auth.id';

    const vaults = app.findCollectionByNameOrId("vaults");
    vaults.fields.removeByName("public");
    vaults.viewRule = ownerRule;
    app.save(vaults);

    const snapshots = app.findCollectionByNameOrId("vault_snapshots");
    snapshots.fields.removeByName("vault_updated");
    snapshots.listRule = ownerRule;
    snapshots.viewRule = ownerRule;
    snapshots.createRule = ownerRule;
    app.save(snapshots);
  },
);
