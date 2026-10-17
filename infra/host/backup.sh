#!/usr/bin/env bash
# Runs the API's backup job (VACUUM INTO a dated, verified copy; 30-day pruning) and uploads the
# copy to the storage account's `backups` container with the VM's managed identity.
set -euo pipefail
set -a; . /etc/shelfie/env; set +a
cd /opt/shelfie/current

node --disable-warning=ExperimentalWarning apps/api/src/backup.ts
file="$SHELFIE_BACKUP_DIR/shelfie-$(date -u +%F).sqlite"
[[ -f $file ]] || { echo "expected backup file $file is missing" >&2; exit 1; }

token=$(curl -fsS -H 'Metadata: true' \
  'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https%3A%2F%2Fstorage.azure.com%2F' | jq -r .access_token)
curl -fsS -X PUT "https://$STORAGE_ACCOUNT.blob.core.windows.net/backups/$(basename "$file")" \
  -H "Authorization: Bearer $token" -H 'x-ms-version: 2024-11-04' -H 'x-ms-blob-type: BlockBlob' \
  -H 'Content-Type: application/octet-stream' --data-binary "@$file" -o /dev/null
echo "uploaded $(basename "$file") to $STORAGE_ACCOUNT/backups"
