# Hosted vaults (PocketBase)

The **Hosted vault** provider stores each vault as a record in a [PocketBase](https://pocketbase.io)
instance. Unlike GitHub Gist vaults, hosted vaults require an authenticated user account (social
login), and every save appends a snapshot so version history works just like gists.

- **Local development:** a PocketBase binary launched by `npm run dev:pb` (or `npm run dev`, which
  runs the web app and PocketBase together).
- **Production:** a remote instance (e.g. [PocketHost](https://pockethost.io)).

This directory holds the committed schema (`pb_migrations/`). The binary and `pb_data/` are
gitignored.

## Data model

| Collection        | Purpose                                                              |
| ----------------- | -------------------------------------------------------------------- |
| `users`           | PocketBase auth collection; social logins enabled (see below).       |
| `vaults`          | One record per vault: `owner`, `name`, `document` (the vault JSON).  |
| `vault_snapshots` | Append-only history: `vault`, `owner`, `document`. One row per save. |

The `vaults.updated` autodate field is the optimistic-concurrency version token. All collections are
owner-scoped via API rules (`owner = @request.auth.id`); snapshots are immutable to users.

> Migrations target the PocketBase JSVM API (v0.23+, `app`/`fields`) and are verified against
> v0.39.4. If you run an older release, regenerate them from the Admin UI.

## Configuration

Config is split across two files (both read by the launcher and by Next.js):

- **`.env`** — committed, non-secret defaults: `NEXT_PUBLIC_POCKETBASE_URL`, `PB_HOST`, `PB_PORT`,
  `PB_VERSION`, `PB_SUPERUSER_EMAIL`.
- **`.env.local`** — gitignored secrets: `PB_SUPERUSER_PASSWORD`, the `PB_OAUTH2_<PROVIDER>_CLIENT_ID`
  / `_CLIENT_SECRET` pairs, and the gist `GITHUB_OAUTH_*` credentials. See `.env.example`.

## Local setup

```bash
npm run dev      # web app + PocketBase together
# or just PocketBase:
npm run dev:pb
```

On startup the launcher (`scripts/pocketbase.sh`) lazily initializes everything it needs:

1. downloads the PocketBase binary on first run,
2. applies the committed migrations (collections),
3. ensures a superuser from `PB_SUPERUSER_EMAIL` / `PB_SUPERUSER_PASSWORD`,
4. configures the social-login OAuth2 providers for every `PB_OAUTH2_<PROVIDER>_*` pair set in
   `.env.local`.

So enabling a social login is just: add its client ID/secret to `.env.local` and restart. No manual
Admin UI steps. (You can still open the Admin UI at http://127.0.0.1:8090/\_/ with the superuser
credentials.)

## Social login (OAuth2) providers

Client IDs/secrets are **not** committed — put them in `.env.local` and the launcher applies them to
the `users` collection on startup. Create each OAuth app here:

| App label | `.env.local` key prefix | Create the OAuth app at                             |
| --------- | ----------------------- | --------------------------------------------------- |
| GitHub    | `PB_OAUTH2_GITHUB_*`    | GitHub → Settings → Developer settings → OAuth Apps |
| Google    | `PB_OAUTH2_GOOGLE_*`    | Google Cloud Console → Credentials                  |
| Apple     | `PB_OAUTH2_APPLE_*`     | Apple Developer → Certificates, Identifiers         |
| Meta      | `PB_OAUTH2_FACEBOOK_*`  | Meta for Developers → My Apps                       |
| X         | `PB_OAUTH2_TWITTER_*`   | X Developer Portal → Projects & Apps                |

Each key prefix expands to `_CLIENT_ID` and `_CLIENT_SECRET`. For each provider, set the
**redirect/callback URL** to your PocketBase instance's OAuth2 redirect:
`<NEXT_PUBLIC_POCKETBASE_URL>/api/oauth2-redirect`.

## Production (PocketHost)

1. Create an instance on PocketHost; note its URL (e.g. `https://your-app.pockethost.io`).
2. Apply this schema: either commit these migrations into the deployed instance, or import the
   collections via the Admin UI.
3. Configure the same OAuth2 providers with **production** credentials and the production redirect URL.
4. Set `NEXT_PUBLIC_POCKETBASE_URL` to the instance URL in the app's production environment.

> The PocketBase GitHub OAuth app is **separate** from the Gist provider's `GITHUB_OAUTH_CLIENT_ID`
> (which uses the `gist` scope). Don't reuse credentials between them.
