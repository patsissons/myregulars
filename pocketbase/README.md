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
4. serves with the committed `pb_hooks`, whose bootstrap hook configures the social-login OAuth2
   providers from every `PB_OAUTH2_<PROVIDER>_*` pair present in the environment.

So enabling a social login is just: add its client ID/secret to `.env.local` and restart. No manual
Admin UI steps. (You can still open the Admin UI at http://127.0.0.1:8090/\_/ with the superuser
credentials.)

> OAuth2 config lives in `pocketbase/pb_hooks/main.pb.js` (committed, no secrets) and reads env vars
> at boot. The same hook runs on PocketHost, so production is configured the same way — by env vars,
> not the Admin UI (see below).

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

## Production (Vercel app + PocketHost instance)

**On PocketHost (the PocketBase instance):**

1. Create an instance; note its URL (e.g. `https://your-app.pockethost.io`).
2. Deploy `pocketbase/pb_migrations` and `pocketbase/pb_hooks` to it (PocketHost supports both), so
   the collections are created and the OAuth2 bootstrap hook runs.
3. Set the OAuth2 secrets as **instance environment variables** — the hook reads them on boot:
   ```
   PB_OAUTH2_GITHUB_CLIENT_ID=...
   PB_OAUTH2_GITHUB_CLIENT_SECRET=...
   # add other PB_OAUTH2_<PROVIDER>_* pairs as needed
   ```
   (`PB_SUPERUSER_*` is not needed — PocketHost manages the admin account.)

**On Vercel (the Next.js app):**

4. Set one env var and redeploy (it is inlined at build time):
   ```
   NEXT_PUBLIC_POCKETBASE_URL=https://your-app.pockethost.io
   ```
   No trailing slash. The `PB_*` vars are **not** used by the web app — they belong on PocketHost.

**OAuth app callback:** each production OAuth app's callback/redirect URL must be
`https://your-app.pockethost.io/api/oauth2-redirect`. A classic GitHub OAuth app allows only one
callback URL, so use a **separate** OAuth app for production vs local.

> The PocketBase GitHub OAuth app is **separate** from the Gist provider's `GITHUB_OAUTH_CLIENT_ID`
> (which uses the `gist` scope). Don't reuse credentials between them.
