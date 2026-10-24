# Runbook

How Shelfie runs in production and what to do when something needs a hand. A parent is the operator.

## Shape

| Part | Where |
|---|---|
| Host | One Ubuntu 24.04 VM (`Standard_B2ats_v2`) in Canada Central, resource group `shelfie-prod` |
| TLS and static files | Caddy, `/etc/caddy/Caddyfile`, serves the app at `https://app.shelfie.kids` and proxies its `/api/*` to the API, serves the marketing page (`/opt/shelfie/current/marketing`) at `https://www.shelfie.kids`, and redirects bare `shelfie.kids`: `/` to www, every other path to app |
| API | systemd unit `shelfie`, runs `node apps/api/src/main.ts` from `/opt/shelfie/current` as user `shelfie` |
| Database | Azure Database for PostgreSQL Flexible Server 16 (`Standard_B1ms`, 32 GiB, encrypted, TLS only), in the `database` subnet with no public endpoint; database `shelfie` owned by role `shelfie_app` |
| Backups | 7 days of automated backups with point-in-time restore on the server; a nightly `pg_dump` in the `backups` blob container as `shelfie-YYYY-MM-DD.dump`, deleted after 30 days by a lifecycle rule |
| Releases | `/opt/shelfie/releases/<git sha>`; `current` is a symlink to the live one; the last three are kept |
| Settings | `/etc/shelfie/env` (holds `DATABASE_URL`); `/etc/shelfie/db-admin` (root only) holds the administrator credential |
| Mail | Azure Communication Services Email (`shelfie-acs-…`, `shelfie-email-…`, data in Canada) sends from `Shelfie <hello@shelfie.kids>` with the VM's managed identity (ADR-0019); DNS records at Namecheap |
| Logs | journald: `journalctl -u shelfie`, `journalctl -u caddy`, `journalctl -t shelfie-backup` |

Monthly cost (CAD retail): VM 10.88 + 32 GiB SSD 3.74 + static IP 5.18 + storage ≈ 0.10 + PostgreSQL B1ms ≈ 17 + 32 GiB database storage ≈ 5 + e-mail ≈ 0 (Azure charges about US$0.00025 a mail), about **$42**.

## First-time set-up

Run once as the subscription owner, signed in with `az login` and `gh auth login`:

```bash
SSH_KEY=~/.ssh/qbs.pub bash infra/bootstrap.sh
```

It creates the resource group, deploys `infra/main.bicep` (VM, network, PostgreSQL server, storage), creates the database role `shelfie_app` from the VM and writes `DATABASE_URL` into `/etc/shelfie/env`, creates the `shelfie-github` identity that GitHub Actions uses through OpenID Connect, assigns roles, and fills the GitHub `production` environment with `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` and the `AZURE_RESOURCE_GROUP`, `AZURE_VM_NAME`, `AZURE_STORAGE_ACCOUNT` variables. It ends by printing the DNS records. The database passwords are generated on the first run and kept only on the VM; a re-run reads them back from `/etc/shelfie/db-admin`.

Moving an existing installation off SQLite: run bootstrap (it adds the server and `DATABASE_URL` to the existing VM), then on the VM copy the first release's data once with `sudo -u shelfie env $(sudo cat /etc/shelfie/env | xargs) SHELFIE_DB=/var/lib/shelfie/shelfie.db node --disable-warning=ExperimentalWarning /opt/shelfie/current/apps/api/src/import-sqlite.ts` from `/opt/shelfie/current`, and restart the API. The import refuses a database that already holds a household. A file from the profile-and-PIN release is brought up to the accounts model on the way: grown-ups become parents, each parent's username is the part of their e-mail before the `@` and each reader's is their name, and PINs and devices are left behind. Readers had only PINs, so a parent gives each reader a password from Settings, Readers, before the reader signs in.

Then at Namecheap (Advanced DNS for `shelfie.kids`):

| Type | Host | Value |
|---|---|---|
| A | `@` | the public IP printed by bootstrap |
| CNAME | `www` | `shelfie.kids.` |
| CNAME | `app` | `shelfie.kids.` |

Caddy requests a certificate for each of the three hosts as soon as its record resolves; nothing to do on the VM. `CNAME app` must exist before a release with the `app.shelfie.kids` Caddyfile goes live, or the app has no certificate and is down.

### Moving the app to app.shelfie.kids (once)

The release that adds the marketing site moves the app from `shelfie.kids` to `app.shelfie.kids` (`docs/adr/0017-marketing-site-and-app-host.md`). Before merging it:

1. Add `CNAME app shelfie.kids.` at Namecheap and wait until `dig +short app.shelfie.kids` returns the VM's IP.
2. On the VM set `APP_URL=https://app.shelfie.kids` in `/etc/shelfie/env` and `sudo systemctl restart shelfie`, so reset and invite links point at the new host. Links already sent to `shelfie.kids` keep working through the redirect.
3. Merge. Everyone signs in once more on the new host: the session cookie is host-only.
4. `shelfie-admin` now defaults to `https://app.shelfie.kids`; run `shelfie-admin login` once to store the token for that URL.

### Letting parents sign in with Google (once)

Parents can create an account, or sign in to an existing one, with a Google account (`docs/detailed-designs/sign-in/sign-in-with-google-or-facebook`, ADR-0020). The button shows only once both values are set; until then the pages look as before. Readers are unaffected. Facebook is built but deferred: it stays off in production until its two values are set (see below).

1. **Google.** In the Google Cloud console create a project (or use an existing one), configure the OAuth consent screen as an external app named Shelfie with the scopes `openid`, `email` and `profile`, publish it, then create an OAuth client of type Web application with the authorised JavaScript origin `https://app.shelfie.kids` and the authorised redirect URI `https://app.shelfie.kids/api/auth/google/callback`. Note the client ID and client secret.
2. In the repository's Settings, Secrets and variables, Actions, add the secrets `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Each deploy (`.github/workflows/deploy.yml`) passes them to `infra/host/fetch-release.sh`, which writes them into `/etc/shelfie/env` before the API restarts. Merge to `main`, or re-run the Deploy workflow, to apply them.
3. Check `https://app.shelfie.kids/api/auth/providers` answers `{"providers":["google"]}` and that the button on the sign-in page completes a round trip. The VM needs outbound HTTPS to `oauth2.googleapis.com`; the consent page is opened by the browser, not the VM.

To turn Google off, delete the two secrets, remove the two lines from `/etc/shelfie/env` on the VM and `sudo systemctl restart shelfie`; existing links stay in `profile_provider` and work again when the values return. The secret never reaches the browser: the API sends it to the provider with the client id only, and exchanges the code server to server.

Facebook (deferred): in Meta for Developers create a Consumer app with Facebook Login, Valid OAuth Redirect URI `https://app.shelfie.kids/api/auth/facebook/callback`, permissions `email` and `public_profile`, switched to Live; then add `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET` to `/etc/shelfie/env` on the VM and `sudo systemctl restart shelfie`.

### Mail (once)

Shelfie mails the confirm-your-e-mail link at sign-up, password-reset links and parent invites from `hello@shelfie.kids` through Azure Communication Services (ADR-0019, `docs/detailed-designs/sign-in/verify-email/`). ACS refuses to send from a domain it has not verified, and refuses to link one it has not verified, so it takes two bootstrap runs:

1. **Deploy.** The first `bash infra/bootstrap.sh` creates the communication service, the e-mail service, the customer-managed `shelfie.kids` domain with the `hello` sender (display name "Shelfie") and the role that lets the VM's identity send. It leaves the domain unlinked and the API without `ACS_EMAIL_ENDPOINT`, so production still sends no mail, and it prints the records below with their real values.
2. **Add the records at Namecheap** (Advanced DNS for `shelfie.kids`). Re-read the values with `az communication email domain show -g shelfie-prod --email-service-name <emailServiceName> -n shelfie.kids --query verificationRecords` if the printout is lost.

   | Type | Host | Value |
   |---|---|---|
   | TXT | `@` | `ms-domain-verification=<value from Azure>` (domain verification) |
   | TXT | `@` | `v=spf1 include:spf.protection.outlook.com -all`. Keep exactly one SPF record: if Namecheap already has one (for example `include:spf.efwd.registrar-servers.com` for mail forwarding), merge the includes into it. Azure only verifies an SPF record that ends in `-all` |
   | CNAME | `selector1-azurecomm-prod-net._domainkey` | `selector1-azurecomm-prod-net._domainkey.azurecomm.net` (DKIM) |
   | CNAME | `selector2-azurecomm-prod-net._domainkey` | `selector2-azurecomm-prod-net._domainkey.azurecomm.net` (DKIM2) |
   | TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:hello@shelfie.kids` |

   Keep the existing MX records, so `hello@shelfie.kids` still reaches the inbox that reads it.
3. **Verify.** Once `dig TXT shelfie.kids` shows the records, run `az communication email domain initiate-verification -g shelfie-prod --email-service-name <emailServiceName> --domain-name shelfie.kids --verification-type <type>` for `Domain`, `SPF`, `DKIM` and `DKIM2`, and wait until `az communication email domain show … --query verificationStates` reports each as `Verified` (minutes to a day).
4. **Link and switch on.** Run `LINK_EMAIL_DOMAIN=true bash infra/bootstrap.sh`. It deploys with `linkEmailDomain=true`, then writes `ACS_EMAIL_ENDPOINT` (`https://<communication service>.communication.azure.com`) and `ACS_EMAIL_SENDER` (`hello@shelfie.kids`) into `/etc/shelfie/env` and restarts the API. Pass `LINK_EMAIL_DOMAIN=true` on every later bootstrap run, or the domain is unlinked again.
5. **Check.** Ask for a password reset for your own parent address on `https://app.shelfie.kids/forgot-password`; the branded mail arrives from Shelfie. A failed send shows in `journalctl -u shelfie` as a `500` on the request, or as `event: verify-mail-failed` for a sign-up; neither line holds the address or the link.

SSH is allowed only from the IP you ran bootstrap from. If yours changes, rerun bootstrap (it is idempotent) or `ADMIN_IP=<new ip> bash infra/bootstrap.sh`.

## Deploying

Merging a pull request into `main` runs `.github/workflows/deploy.yml`: CI, then a release tarball is built, uploaded to the `releases` container, unpacked on the VM and activated by `infra/host/deploy.sh`, which restarts the API (it applies any new `apps/api/migrations/*.sql` before it listens), waits for `GET /api/health`, rolls back on failure and reloads Caddy. The job ends by checking `https://app.shelfie.kids/api/health` and loading `https://www.shelfie.kids/`. The tarball carries the marketing page in `marketing/`.

To redeploy the same commit, re-run the workflow from the Actions tab.

## Rolling back

Releases on the VM are named by commit sha. From your machine:

```bash
az vm run-command invoke -g shelfie-prod -n shelfie-vm --command-id RunShellScript \
  --scripts "ls -1t /opt/shelfie/releases" --query 'value[0].message' -o tsv
az vm run-command invoke -g shelfie-prod -n shelfie-vm --command-id RunShellScript \
  --scripts "bash /opt/shelfie/releases/<sha>/host/deploy.sh <sha>" --query 'value[0].message' -o tsv
```

## Looking at logs

```bash
ssh shelfie-admin@<public ip>
sudo journalctl -u shelfie -f          # API
sudo journalctl -u caddy -n 100        # TLS, certificates, requests
sudo journalctl -t shelfie-backup      # nightly backups
```

## Backups and nightly maintenance

The server keeps 7 days of automated backups and can be restored to any minute in that window (Azure portal, the server's **Backup and restore** blade, or `az postgres flexible-server restore`).

`/etc/cron.d/shelfie-backup` runs `/usr/local/bin/shelfie-backup` at 08:15 UTC. It deletes expired sessions, spent reset tokens and old sign-in attempts (`apps/api/src/purge.ts`), then writes a `pg_dump` of the whole database and uploads it to Blob Storage with the VM's managed identity. The `backups` container's lifecycle rule deletes dumps after 30 days.

```bash
az storage blob list --auth-mode login --account-name <storage account> -c backups -o table
az storage blob download --auth-mode login --account-name <storage account> -c backups \
  -n shelfie-2026-10-17.dump -f shelfie-2026-10-17.dump
```

To run the job by hand: `sudo -u shelfie /usr/local/bin/shelfie-backup` on the VM.

## Restoring the database

For a wrong deletion or a corrupted table, point-in-time restore is quickest: restore the server to a new server from the portal, then put the new host name into `DATABASE_URL` in `/etc/shelfie/env` and `sudo systemctl restart shelfie`.

To restore a dump into the existing server (the server is private, so run this on the VM):

1. `sudo systemctl stop shelfie`
2. Load the credentials: `set -a; . /etc/shelfie/db-admin; set +a; export PGPASSWORD=$DB_ADMIN_PASSWORD PGSSLMODE=require`
3. Recreate the empty database: `psql "host=$DB_HOST user=shelfie_admin dbname=postgres" -c 'DROP DATABASE shelfie' -c 'CREATE DATABASE shelfie OWNER shelfie_app'`
4. `pg_restore --no-owner --no-privileges --role=shelfie_app -d "host=$DB_HOST user=shelfie_admin dbname=shelfie" shelfie-2026-10-17.dump` (download the dump first, see above)
5. `sudo systemctl start shelfie`
6. `curl -fsS https://app.shelfie.kids/api/health`

## Erasing a household

A household owns everything created for it, and every table cascades from it. On the VM, as the operator:

```bash
set -a; . /etc/shelfie/env; set +a
psql "$DATABASE_URL" -c "SELECT h.id, p.name, p.email FROM household h JOIN profile p ON p.household_id = h.id WHERE p.email = 'parent@example.com'"
psql "$DATABASE_URL" -c "DELETE FROM household WHERE id = '<id from above>'"
```

The one `DELETE` removes the household's profiles, devices, sessions, password resets, books, chapter logs, answers, questions, rewards, profile photos, book cover pictures, feedback, push subscriptions, Google or Facebook links, and the streak healing activity and healed days; other households are untouched. The nightly dumps still hold the data for up to 30 days and point-in-time restore for 7.

## Changing settings

Edit `/etc/shelfie/env` on the VM, then `sudo systemctl restart shelfie`. Variables: `PORT`, `DATABASE_URL`, `APP_URL` (`https://app.shelfie.kids`; the host that reset and invite links point at), `STORAGE_ACCOUNT`. `ACS_EMAIL_ENDPOINT` and `ACS_EMAIL_SENDER` send every mail (the confirm-your-e-mail link, reset and invite) through Azure Communication Services with the VM's managed identity; bootstrap writes them once the domain is linked ("Mail" above). With `ACS_EMAIL_ENDPOINT` unset, `SMTP_URL` (and `MAIL_FROM`, default `Shelfie <hello@shelfie.kids>`) send over SMTP, which is how development reaches Mailpit; with neither set, nothing is sent and the API logs a warning without the address. The VM needs outbound HTTPS to `*.communication.azure.com`. `ANTHROPIC_API_KEY` turns on the AI review assistant on Review a chapter (`docs/detailed-designs/review/ai-review-assistant/`); it is optional and not set in production today, so the page says "The assistant isn’t set up" and reviewing works as before. Setting it sends a chapter's book title, chapter number, questions and answers to Anthropic when a parent presses "Help me review"; the key stays on the VM and is never logged. The same key switches on suggested questions on Manage a book (`docs/detailed-designs/books/suggest-questions/`): when a parent presses "Suggest questions" the API sends the book's title, author, next chapter number and existing questions to Anthropic (`claude-opus-5-5`), at most 5 asks per household in 10 minutes; without the key the dialog says suggestions aren’t switched on and adding questions by hand keeps working. The same key turns on the AI fallback of book autocomplete on Add a book (`docs/detailed-designs/books/autocomplete-book/`); unset, titles are looked up in the Open Library catalogue only. The VM needs outbound HTTPS to `openlibrary.org`, `covers.openlibrary.org` and, with the key, `api.anthropic.com`. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET` turn on Continue with Google and Continue with Facebook for parents (see "Letting parents sign in with Google" above; deploy sets the Google pair from GitHub secrets); each provider needs both of its values, and with none set the sign-in and sign-up pages are unchanged. `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` (a `mailto:` or `https:` contact for the push services) turn on push notifications for feedback (`docs/detailed-designs/shell/push-notifications/`, ADR-0016); all are optional, and with the two keys unset Settings says "Notifications aren’t set up", the shelf offers nothing and nothing is sent. Make a pair once with `npx web-push generate-vapid-keys` and keep it: a new pair strands every stored subscription until each person turns notifications on again. A message carries only a title, a body, a tag and a page, never answers, notes or reward text. The VM needs outbound HTTPS to the browser vendors' push services (for Chrome, `fcm.googleapis.com`).

## Changing the infrastructure

Edit `infra/main.bicep` and rerun `infra/bootstrap.sh`. The VM's cloud-init (`infra/cloud-init.yaml`) only runs at first boot, so a change there means deleting and recreating the VM: back up first, deploy, then restore.

## Admin CLI

`shelfie-admin` queries and changes production data through the admin API (`/api/admin/v1`, contract in `apps/api/admin-api.yaml`). It never touches the VM or the database; only token provisioning below uses SSH. Decisions: `docs/adr/0001`-`0006`.

### Going live

The admin API ships with the normal deploy: merge to `main`. On start the API adds the `admin_token` and `admin_audit` tables to the existing database. No Caddy, Bicep or settings change is needed. Check it after the deploy:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://app.shelfie.kids/api/admin/v1/whoami   # 401 means it is live
```

### Installing the CLI

Needs the .NET 10 SDK. From a clone of the repository:

```bash
dotnet pack apps/admin-cli/src/ShelfieAdmin -c Release -o ~/shelfie-admin-pkg
dotnet tool install --global ShelfieAdmin --add-source ~/shelfie-admin-pkg     # later: dotnet tool update --global ...
shelfie-admin --version
```

On Linux the token store is the Secret Service (`secret-tool`, package `libsecret-tools`); Windows and macOS use Credential Manager and the Keychain.

### Creating a token

Run on the VM (the value is printed once; copy it straight into `login`):

```bash
ssh shelfie-admin@<public ip>
sudo -u shelfie bash -c 'set -a; . /etc/shelfie/env; set +a; cd /opt/shelfie/current && \
  node --disable-warning=ExperimentalWarning apps/api/src/admin-token.ts create --name laptop --scopes read,write --days 30'
```

Use `--scopes read` for a token that only queries. Then, on your machine:

```bash
shelfie-admin login        # paste the token at the hidden prompt
shelfie-admin whoami
```

`list` and `revoke <id>` take the place of `create` in the same command. Revoke a token as soon as the machine holding it is lost; create a new one before the old one expires (`whoami` shows the expiry).

### Before any write session

Write commands change production directly. Take a backup first: `sudo -u shelfie /usr/local/bin/shelfie-backup` on the VM. Prefer `--dry-run` before the real command; `users reset-password` and `logs delete` also preview and ask `Continue? [y/N]`.

### Commands

| Command | Does |
|---|---|
| `login`, `logout`, `whoami` | Store, remove or show the token for the target |
| `users list` | Every parent and reader |
| `users reset-password <parent id>` | New password from hidden prompts; ends the parent's sessions |
| `books list` | Every book with progress, finished time and reward |
| `books finish <id>` | Mark a book finished now |
| `books reward <id> --text <text> [--note <note>]` | Give the reward for a finished book |
| `logs list --book <id>` | A book's logged chapters with review status |
| `logs show <id>` | One chapter with its answers |
| `feedback list` | Every household's feedback, newest first |
| `logs correct <id> --read-on <yyyy-mm-dd>` | Fix the day a chapter was read |
| `logs delete <id>` | Delete the newest logged chapter of a book |

Every command takes `--json` and `--api-url`; writes take `--dry-run`, destructive ones `--yes`. Exit codes: 0 done, 1 refused or failed, 2 token problem, 3 aborted. For development, point it at the local API: `shelfie-admin login --api-url http://localhost:3000` with a token made by `DATABASE_URL=<local database> npm run admin-token -w apps/api -- create --name dev --scopes read,write`.

### Reading the audit trail

Every admin call, refused ones included, is a row in `admin_audit` (time, token id, method, route, target id, dry run, status, request id); no bodies or secrets. On the VM:

```bash
sudo bash -c 'set -a; . /etc/shelfie/env; psql "$DATABASE_URL" -c "SELECT * FROM admin_audit ORDER BY id DESC LIMIT 50"'
```

The request id matches the `requestId` in `journalctl -u shelfie`. The admin API allows 60 calls a minute; beyond that it answers 429.

## Still deferred

Uptime monitoring, log shipping beyond journald and re-verifying an e-mail changed in Settings (AGENTS.md, Deferred work).

## Health and logs

- `GET /api/health` answers `200 {"status":"ok"}` while the database is reachable and `503 {"status":"unavailable"}` when it is not. If the API cannot reach the database when it starts, it logs one error line and exits; systemd restarts it every 2 s until the server answers.
- The API writes one JSON line per request to stdout: `requestId`, `method`, `route`, `status`, `durationMs`. Bodies, headers and URLs are never logged.
- When someone reports "something went wrong" with a code such as `SHF-4F2A`, search the log for that `requestId`; the matching `level: "error"` line holds the full error.
