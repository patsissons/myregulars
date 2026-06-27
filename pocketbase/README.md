# Hosted vaults (PocketBase)

The **Hosted vault** provider stores each vault as a record in a [PocketBase](https://pocketbase.io)
instance. Unlike GitHub Gist vaults, hosted vaults require an authenticated user account (social
login), and every save appends a snapshot so version history works just like gists.

- **Local development:** a PocketBase binary launched by `npm run pb:dev`.
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

## Local setup

1. Start PocketBase (downloads the binary on first run, applies migrations):

   ```bash
   npm run pb:dev
   ```

   Overrides: `PB_VERSION`, `PB_HOST`, `PB_PORT`.

2. Open the Admin UI at http://127.0.0.1:8090/\_/ and create the first superuser.

3. Configure social logins (see next section). At minimum enable **GitHub**.

4. In the Next.js app, set:

   ```bash
   NEXT_PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090
   ```

   then `npm run dev`.

## Social login (OAuth2) configuration

Client IDs/secrets are **not** committed — configure them inside PocketBase: **Admin UI → Collections
→ `users` → Options → OAuth2**. Enable the providers and paste each app's credentials.

Supported providers in the app's `/connect` screen:

| App label | PocketBase provider | Create the OAuth app at                             |
| --------- | ------------------- | --------------------------------------------------- |
| GitHub    | `github`            | GitHub → Settings → Developer settings → OAuth Apps |
| Google    | `google`            | Google Cloud Console → Credentials                  |
| Apple     | `apple`             | Apple Developer → Certificates, Identifiers         |
| Meta      | `facebook`          | Meta for Developers → My Apps                       |
| X         | `twitter`           | X Developer Portal → Projects & Apps                |

For each provider, set the **redirect/callback URL** to your PocketBase instance's OAuth2 redirect:
`<NEXT_PUBLIC_POCKETBASE_URL>/api/oauth2-redirect`.

## Production (PocketHost)

1. Create an instance on PocketHost; note its URL (e.g. `https://your-app.pockethost.io`).
2. Apply this schema: either commit these migrations into the deployed instance, or import the
   collections via the Admin UI.
3. Configure the same OAuth2 providers with **production** credentials and the production redirect URL.
4. Set `NEXT_PUBLIC_POCKETBASE_URL` to the instance URL in the app's production environment.

> The PocketBase GitHub OAuth app is **separate** from the Gist provider's `GITHUB_OAUTH_CLIENT_ID`
> (which uses the `gist` scope). Don't reuse credentials between them.
