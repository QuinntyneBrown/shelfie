#!/usr/bin/env bash
# Nightly maintenance: deletes expired sessions, spent reset tokens and old sign-in attempts, then
# writes a pg_dump of the whole database and uploads it to the storage account's `backups` container
# with the VM's managed identity. A lifecycle rule on the container deletes dumps after 30 days; the
# managed server keeps its own 7 days of point-in-time restore.
set -euo pipefail
set -a; . /etc/shelfie/env; set +a
cd /opt/shelfie/current

node --disable-warning=ExperimentalWarning apps/api/src/purge.ts

# pg_dump verifies the server certificate against the system roots, as the API does.
export PGSSLMODE=verify-full PGSSLROOTCERT=/etc/ssl/certs/ca-certificates.crt
file=$(mktemp /tmp/shelfie-XXXXXX.dump)
trap 'rm -f "$file"' EXIT
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges --file="$file"
name="shelfie-$(date -u +%F).dump"

token=$(curl -fsS -H 'Metadata: true' \
  'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https%3A%2F%2Fstorage.azure.com%2F' | jq -r .access_token)
curl -fsS -X PUT "https://$STORAGE_ACCOUNT.blob.core.windows.net/backups/$name" \
  -H "Authorization: Bearer $token" -H 'x-ms-version: 2024-11-04' -H 'x-ms-blob-type: BlockBlob' \
  -H 'Content-Type: application/octet-stream' --data-binary "@$file" -o /dev/null
echo "uploaded $name ($(stat -c %s "$file") bytes) to $STORAGE_ACCOUNT/backups"
