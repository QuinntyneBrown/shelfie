#!/usr/bin/env bash
# Sent to the VM by deploy.yml through `az vm run-command invoke`, prefixed with RELEASE_SHA and
# STORAGE_ACCOUNT exports. Downloads the release tarball with the VM's managed identity, unpacks it
# and hands over to the release's own deploy.sh. Prints DEPLOY_OK last so the workflow can tell
# success from failure in the run-command output. run-command starts scripts with sh, so re-exec in bash.
# GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, when deploy.yml passes them, are written to /etc/shelfie/env
# before the restart, replacing any earlier values; left empty, the file is not touched.
if [ -z "${BASH_VERSION:-}" ]; then exec bash "$0" "$@"; fi
set -euo pipefail
: "${RELEASE_SHA:?}" "${STORAGE_ACCOUNT:?}"
release=/opt/shelfie/releases/$RELEASE_SHA

token=$(curl -fsS -H 'Metadata: true' \
  'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https%3A%2F%2Fstorage.azure.com%2F' | jq -r .access_token)
tarball=$(mktemp)
curl -fsS "https://$STORAGE_ACCOUNT.blob.core.windows.net/releases/shelfie-$RELEASE_SHA.tar.gz" \
  -H "Authorization: Bearer $token" -H 'x-ms-version: 2024-11-04' -o "$tarball"

rm -rf "$release"
mkdir -p "$release"
tar -xzf "$tarball" -C "$release"
rm -f "$tarball"

for key in GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET; do
  value=${!key:-}
  [ -n "$value" ] || continue
  sed -i "/^$key=/d" /etc/shelfie/env
  printf '%s=%s\n' "$key" "$value" >> /etc/shelfie/env
done

bash "$release/host/deploy.sh" "$RELEASE_SHA"
echo DEPLOY_OK
