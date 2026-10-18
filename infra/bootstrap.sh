#!/usr/bin/env bash
# One-time, re-runnable set-up of production. Run as the Azure subscription owner after
# `az login` and `gh auth login`. Creates the resource group, the VM and the PostgreSQL server
# (infra/main.bicep), the database role the API signs in with, the identity GitHub Actions deploys
# with (OpenID Connect, no stored credentials), and the GitHub `production` environment with its
# secrets and variables. Prints the DNS records to create.
#
# The database passwords live only on the VM: /etc/shelfie/env carries DATABASE_URL for the API and
# /etc/shelfie/db-admin (root, 0600) the administrator credential. A re-run reads them back from there.
#
#   SSH_KEY=~/.ssh/id_ed25519.pub bash infra/bootstrap.sh
set -euo pipefail
export MSYS_NO_PATHCONV=1 # Git Bash on Windows: do not rewrite /subscriptions/... arguments as paths
cd "$(dirname "$0")"

RG=${RG:-shelfie-prod}
LOCATION=${LOCATION:-canadacentral}
REPO=${REPO:-QuinntyneBrown/shelfie}
APP_HOSTNAME=${APP_HOSTNAME:-shelfie.kids}
SSH_KEY=${SSH_KEY:-$HOME/.ssh/id_ed25519.pub}
ADMIN_IP=${ADMIN_IP:-$(curl -fsS https://api.ipify.org)}
IDENTITY=shelfie-github

[[ -f $SSH_KEY ]] || { echo "SSH public key $SSH_KEY not found; set SSH_KEY" >&2; exit 1; }

# `az ... -o tsv` with the carriage return the Windows CLI appends stripped off.
tsv() { az "$@" -o tsv | tr -d '\r'; }
output() { tsv deployment group show -g "$RG" -n shelfie --query "properties.outputs.$1.value"; }

# Runs a script on the VM as root and prints its stdout.
on_vm() { tsv vm run-command invoke -g "$RG" -n "${VM:-shelfie-vm}" --command-id RunShellScript --scripts "$1" --query 'value[0].message' | sed -n '/^\[stdout\]/,/^\[stderr\]/p' | sed '1d;$d'; }

echo "==> Resource group $RG in $LOCATION"
az group create -n "$RG" -l "$LOCATION" -o none

echo "==> Database passwords"
existing=$(on_vm "cat /etc/shelfie/db-admin 2>/dev/null || true" 2>/dev/null || true)
DB_ADMIN_PASSWORD=$(sed -n 's/^DB_ADMIN_PASSWORD=//p' <<<"$existing")
DB_APP_PASSWORD=$(sed -n 's/^DB_APP_PASSWORD=//p' <<<"$existing")
[[ -n $DB_ADMIN_PASSWORD ]] || DB_ADMIN_PASSWORD=$(openssl rand -base64 30 | tr -d '/+=')
[[ -n $DB_APP_PASSWORD ]] || DB_APP_PASSWORD=$(openssl rand -base64 30 | tr -d '/+=')

echo "==> VM, network, database server and storage (infra/main.bicep)"
az deployment group create -g "$RG" -n shelfie -f main.bicep -o none \
  -p adminSshPublicKey="$(cat "$SSH_KEY")" adminSourceAddress="$ADMIN_IP" hostname="$APP_HOSTNAME" \
  databaseAdminPassword="$DB_ADMIN_PASSWORD"
IP=$(output publicIp)
VM=$(output vmName)
STORAGE=$(output storageAccountName)
DB_HOST=$(output databaseHost)
VM_ID=$(tsv vm show -g "$RG" -n "$VM" --query id)
STORAGE_ID=$(tsv storage account show -g "$RG" -n "$STORAGE" --query id)

echo "==> Deployment identity $IDENTITY for GitHub Actions"
az identity create -g "$RG" -n "$IDENTITY" -o none
CLIENT_ID=$(tsv identity show -g "$RG" -n "$IDENTITY" --query clientId)
PRINCIPAL_ID=$(tsv identity show -g "$RG" -n "$IDENTITY" --query principalId)
# GitHub's OIDC subject names the owner and repository with their numeric ids.
SUBJECT="repo:$(gh api "repos/$REPO" --jq '"\(.owner.login)@\(.owner.id)/\(.name)@\(.id)"'):environment:production"
if az identity federated-credential show -g "$RG" --identity-name "$IDENTITY" -n github-production -o none 2>/dev/null; then
  verb=update
else
  verb=create
fi
az identity federated-credential $verb -g "$RG" --identity-name "$IDENTITY" -n github-production -o none \
  --issuer https://token.actions.githubusercontent.com \
  --subject "$SUBJECT" \
  --audiences api://AzureADTokenExchange
az role assignment create -o none --assignee-object-id "$PRINCIPAL_ID" --assignee-principal-type ServicePrincipal \
  --role "Virtual Machine Contributor" --scope "$VM_ID"
az role assignment create -o none --assignee-object-id "$PRINCIPAL_ID" --assignee-principal-type ServicePrincipal \
  --role "Storage Blob Data Contributor" --scope "$STORAGE_ID"

echo "==> Database role shelfie_app and DATABASE_URL on the VM"
# The server has no public endpoint, so the role is created from the VM. shelfie_app can sign in and
# owns the shelfie database (it creates the tables through migrations) but is neither superuser nor
# replication; the administrator credential stays in /etc/shelfie/db-admin for the operator.
DATABASE_URL="postgres://shelfie_app:$DB_APP_PASSWORD@$DB_HOST:5432/shelfie"
on_vm "$(cat <<SCRIPT
set -euo pipefail
command -v psql >/dev/null 2>&1 || DEBIAN_FRONTEND=noninteractive apt-get install -y -q postgresql-client >/dev/null
export PGPASSWORD=$(printf %q "$DB_ADMIN_PASSWORD") PGSSLMODE=require
psql -v ON_ERROR_STOP=1 -q "host=$DB_HOST user=shelfie_admin dbname=postgres" <<'SQL'
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'shelfie_app') THEN CREATE ROLE shelfie_app LOGIN; END IF;
END \$\$;
SQL
psql -v ON_ERROR_STOP=1 -q "host=$DB_HOST user=shelfie_admin dbname=postgres" \
  -c "ALTER ROLE shelfie_app PASSWORD '$DB_APP_PASSWORD'" -c "GRANT shelfie_app TO shelfie_admin" -c "ALTER DATABASE shelfie OWNER TO shelfie_app"
# On the flexible server the public schema belongs to azure_pg_admin, not the database owner, so the
# migrations cannot create tables until shelfie_app owns it.
psql -v ON_ERROR_STOP=1 -q "host=$DB_HOST user=shelfie_admin dbname=shelfie" -c "ALTER SCHEMA public OWNER TO shelfie_app"
install -m 0600 -o root -g root /dev/null /etc/shelfie/db-admin
printf 'DB_HOST=%s\nDB_ADMIN_USER=shelfie_admin\nDB_ADMIN_PASSWORD=%s\nDB_APP_PASSWORD=%s\n' "$DB_HOST" $(printf %q "$DB_ADMIN_PASSWORD") $(printf %q "$DB_APP_PASSWORD") > /etc/shelfie/db-admin
sed -i '/^DATABASE_URL=/d;/^SHELFIE_DB=/d;/^SHELFIE_BACKUP_DIR=/d' /etc/shelfie/env
echo DATABASE_URL=$(printf %q "$DATABASE_URL") >> /etc/shelfie/env
chmod 0640 /etc/shelfie/env; chgrp shelfie /etc/shelfie/env
systemctl try-restart shelfie 2>/dev/null || true
echo database-configured
SCRIPT
)" | grep -q database-configured

echo "==> Blob access for you (to list and download backups)"
az role assignment create -o none --assignee "$(tsv ad signed-in-user show --query id)" \
  --role "Storage Blob Data Contributor" --scope "$STORAGE_ID"

echo "==> GitHub environment 'production'"
gh api -X PUT "repos/$REPO/environments/production" --silent
gh secret set AZURE_CLIENT_ID -R "$REPO" --env production -b "$CLIENT_ID"
gh secret set AZURE_TENANT_ID -R "$REPO" --env production -b "$(tsv account show --query tenantId)"
gh secret set AZURE_SUBSCRIPTION_ID -R "$REPO" --env production -b "$(tsv account show --query id)"
gh variable set AZURE_RESOURCE_GROUP -R "$REPO" --env production -b "$RG"
gh variable set AZURE_VM_NAME -R "$REPO" --env production -b "$VM"
gh variable set AZURE_STORAGE_ACCOUNT -R "$REPO" --env production -b "$STORAGE"

cat <<SUMMARY

Done. Create these DNS records for $APP_HOSTNAME:
  A      @     $IP
  CNAME  www   $APP_HOSTNAME.

VM: $VM   Storage account: $STORAGE   Database: $DB_HOST (private; credentials in /etc/shelfie on the VM)
SSH: ssh shelfie-admin@$IP (allowed from $ADMIN_IP only)
The first push to main now deploys; Caddy fetches the certificate once the A record resolves.
SUMMARY
