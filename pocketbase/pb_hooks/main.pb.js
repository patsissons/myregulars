/// <reference path="../pb_data/types.d.ts" />

// Configures social-login OAuth2 providers on the `users` collection from
// environment variables, on every startup. Works anywhere PocketBase runs its
// hooks — local (via scripts/pocketbase.sh) and remote (PocketHost), so the
// same PB_OAUTH2_<PROVIDER>_CLIENT_ID/_CLIENT_SECRET secrets drive both.
onBootstrap((e) => {
  e.next();

  const providers = [
    ["github", "PB_OAUTH2_GITHUB"],
    ["google", "PB_OAUTH2_GOOGLE"],
    ["apple", "PB_OAUTH2_APPLE"],
    ["facebook", "PB_OAUTH2_FACEBOOK"],
    ["twitter", "PB_OAUTH2_TWITTER"],
  ];

  const configured = [];
  for (const [name, prefix] of providers) {
    const clientId = $os.getenv(prefix + "_CLIENT_ID");
    const clientSecret = $os.getenv(prefix + "_CLIENT_SECRET");
    if (clientId && clientSecret) {
      configured.push({ name, clientId, clientSecret });
    }
  }

  if (configured.length === 0) {
    return;
  }

  const users = e.app.findCollectionByNameOrId("users");
  users.oauth2.enabled = true;
  users.oauth2.providers = configured;
  e.app.save(users);

  e.app.logger().info("Configured OAuth2 providers from env", "count", configured.length);
});
