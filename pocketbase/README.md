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

| Collection        | Purpose                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| `users`           | PocketBase auth collection; social logins enabled (see below).                                              |
| `vaults`          | One record per vault: `owner`, `name`, `public`, `document` (the vault JSON).                               |
| `vault_snapshots` | Append-only history written by the server: `vault`, `owner`, `document`, `vault_updated`. One row per save. |

The `vaults.updated` autodate field is the optimistic-concurrency version token. Vaults are
owner-scoped via API rules (`owner = @request.auth.id`), except that a vault with `public = true` can
be **viewed** (not listed, not edited) by anyone with its id, which is how share links work for
hosted vaults. Snapshot reads follow the same visibility; snapshots are never writable by clients.

`pb_hooks/vaults.pb.js` enforces the write semantics the app relies on:

- **Conditional updates.** A vault update that carries `expectedUpdated` is rejected with `409`
  unless it equals the record's current `updated`. The client sends the version it last read, so
  "read, compare, write" is atomic.
- **Server-side snapshots.** Every create, and every update that changes `document`, appends a
  `vault_snapshots` row after the save (recording the vault's new `updated` in `vault_updated`).
  Toggling `public` alone does not snapshot.

> Deploy order matters for existing instances: apply `pb_migrations` and `pb_hooks` **before** the
> web app build that stops writing snapshots itself, or history will have a gap. After deploying,
> `scripts/pocketbase-smoke.sh https://your-app.pockethost.io` verifies the rules and hooks end to
> end (it signs up a throwaway user, so run it against instances where sign-up is allowed).

> Hook handlers run in pooled JS VMs and cannot reference functions defined at the top of the hook
> file; shared code lives in `pb_hooks/vaults-utils.js` and is `require`d inside each handler.

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

## Production (Cloudflare Worker + PocketHost instance)

**On PocketHost (the PocketBase instance):**

1. Create an instance; note its URL (e.g. `https://your-app.pockethost.io`).
2. Deploy `pocketbase/pb_migrations` and `pocketbase/pb_hooks` to it (PocketHost supports both), so
   the collections are created and the OAuth2 bootstrap hook runs. The
   `.github/workflows/deploy-pocketbase.yml` workflow does this over FTP on every push to `main`
   that touches those folders; it needs the `POCKETHOST_FTP_USER` / `POCKETHOST_FTP_PASSWORD`
   secrets and the `POCKETHOST_INSTANCE` (instance subdomain) and `NEXT_PUBLIC_POCKETBASE_URL`
   variables on the `production` environment. Hooks reload live; **migrations run on the next
   start**, so power-cycle the instance from the PocketHost dashboard after a migration ships.
   The first deploy of this repo's current migrations must happen **before** the web app that
   relies on them (server-written snapshots, `vaults.public`).
3. Set the OAuth2 secrets as **instance environment variables** — the hook reads them on boot:
   ```
   PB_OAUTH2_GITHUB_CLIENT_ID=...
   PB_OAUTH2_GITHUB_CLIENT_SECRET=...
   # add other PB_OAUTH2_<PROVIDER>_* pairs as needed
   ```
   (`PB_SUPERUSER_*` is not needed — PocketHost manages the admin account.)

**On Cloudflare (the Next.js app, as a Worker):**

4. Set the build-time variable on the GitHub `production` environment and deploy (it is inlined
   into the client bundle by `npm run cf:build`):
   ```
   NEXT_PUBLIC_POCKETBASE_URL=https://your-app.pockethost.io
   ```
   No trailing slash. The `PB_*` vars are **not** used by the web app — they belong on PocketHost.
   See the root README's Deployment section for the Worker secrets.

**OAuth app callback:** each production OAuth app's callback/redirect URL must be
`https://your-app.pockethost.io/api/oauth2-redirect`. A classic GitHub OAuth app allows only one
callback URL, so use a **separate** OAuth app for production vs local.

> The PocketBase GitHub OAuth app is **separate** from the Gist provider's `GITHUB_OAUTH_CLIENT_ID`
> (which uses the `gist` scope). Don't reuse credentials between them.
