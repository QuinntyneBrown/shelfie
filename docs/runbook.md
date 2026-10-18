# Runbook

How Shelfie runs in production and what to do when something needs a hand. A parent is the operator.

## Shape

| Part | Where |
|---|---|
| Host | One Ubuntu 24.04 VM (`Standard_B2ats_v2`) in Canada Central, resource group `shelfie-prod` |
| TLS and static files | Caddy, `/etc/caddy/Caddyfile`, serves `https://shelfie.kids`, redirects `www`, proxies `/api/*` to the API |
| API | systemd unit `shelfie`, runs `node apps/api/src/main.ts` from `/opt/shelfie/current` as user `shelfie` |
| Database | SQLite at `/var/lib/shelfie/shelfie.db` |
| Backups | `/var/lib/shelfie/backups/shelfie-YYYY-MM-DD.sqlite`, 30 days kept; a copy of each in the `backups` blob container |
| Releases | `/opt/shelfie/releases/<git sha>`; `current` is a symlink to the live one; the last three are kept |
| Settings | `/etc/shelfie/env` |
| Logs | journald: `journalctl -u shelfie`, `journalctl -u caddy`, `journalctl -t shelfie-backup` |

Monthly cost (CAD retail): VM 10.88 + 32 GiB SSD 3.74 + static IP 5.18 + storage ≈ 0.10, about **$20**.

## First-time set-up

Run once as the subscription owner, signed in with `az login` and `gh auth login`:

```bash
SSH_KEY=~/.ssh/qbs.pub bash infra/bootstrap.sh
```

It creates the resource group, deploys `infra/main.bicep`, creates the `shelfie-github` identity that GitHub Actions uses through OpenID Connect, assigns roles, and fills the GitHub `production` environment with `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` and the `AZURE_RESOURCE_GROUP`, `AZURE_VM_NAME`, `AZURE_STORAGE_ACCOUNT` variables. It ends by printing the DNS records.

Then at Namecheap (Advanced DNS for `shelfie.kids`):

| Type | Host | Value |
|---|---|---|
| A | `@` | the public IP printed by bootstrap |
| CNAME | `www` | `shelfie.kids.` |

Caddy requests the certificate as soon as the A record resolves; nothing to do on the VM.

SSH is allowed only from the IP you ran bootstrap from. If yours changes, rerun bootstrap (it is idempotent) or `ADMIN_IP=<new ip> bash infra/bootstrap.sh`.

## Deploying

Merging a pull request into `main` runs `.github/workflows/deploy.yml`: CI, then a release tarball is built, uploaded to the `releases` container, unpacked on the VM and activated by `infra/host/deploy.sh`, which restarts the API, waits for `GET /api/health`, rolls back on failure and reloads Caddy. The job ends by checking `https://shelfie.kids/api/health`.

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

## Backups

`/etc/cron.d/shelfie-backup` runs `/usr/local/bin/shelfie-backup` at 08:15 UTC. It calls the API's backup job (`VACUUM INTO` a dated file, integrity check, prune older than 30 days) and uploads the file to Blob Storage with the VM's managed identity.

```bash
az storage blob list --auth-mode login --account-name <storage account> -c backups -o table
az storage blob download --auth-mode login --account-name <storage account> -c backups \
  -n shelfie-2026-10-17.sqlite -f shelfie-2026-10-17.sqlite
```

To run a backup by hand: `sudo -u shelfie /usr/local/bin/shelfie-backup` on the VM.

## Restoring the database

1. `sudo systemctl stop shelfie`
2. Move the live file and its siblings aside: `sudo mv /var/lib/shelfie/shelfie.db{,.broken}` and the same for `shelfie.db-wal` and `shelfie.db-shm` if present.
3. Copy the chosen backup to `/var/lib/shelfie/shelfie.db` (from `/var/lib/shelfie/backups/` or downloaded from the `backups` container) and `sudo chown shelfie:shelfie /var/lib/shelfie/shelfie.db`.
4. `sudo systemctl start shelfie`
5. `curl -fsS https://shelfie.kids/api/health`

## Changing settings

Edit `/etc/shelfie/env` on the VM, then `sudo systemctl restart shelfie`. Variables: `PORT`, `SHELFIE_DB`, `SHELFIE_BACKUP_DIR`, `APP_URL`, `STORAGE_ACCOUNT`. `SMTP_URL` (and `MAIL_FROM`) carry password-reset and invite mail; the production provider is still to be chosen (see AGENTS.md, Deferred work).

## Changing the infrastructure

Edit `infra/main.bicep` and rerun `infra/bootstrap.sh`. The VM's cloud-init (`infra/cloud-init.yaml`) only runs at first boot, so a change there means deleting and recreating the VM: back up first, deploy, then restore.

## Still deferred

Uptime monitoring, log shipping beyond journald and the production e-mail provider (AGENTS.md, Deferred work).

## Health and logs

- `GET /api/health` answers `200 {"status":"ok"}` while the database is reachable and `503 {"status":"unavailable"}` when it is not.
- The API writes one JSON line per request to stdout: `requestId`, `method`, `route`, `status`, `durationMs`. Bodies, headers and URLs are never logged.
- When someone reports "something went wrong" with a code such as `SHF-4F2A`, search the log for that `requestId`; the matching `level: "error"` line holds the full error.
