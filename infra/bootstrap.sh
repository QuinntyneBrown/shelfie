#!/usr/bin/env bash
# One-time, re-runnable set-up of production. Run as the Azure subscription owner after
# `az login` and `gh auth login`. Creates the resource group and the VM (infra/main.bicep), the
# identity GitHub Actions deploys with (OpenID Connect, no stored credentials), and the GitHub
# `production` environment with its secrets and variables. Prints the DNS records to create.
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

echo "==> Resource group $RG in $LOCATION"
az group create -n "$RG" -l "$LOCATION" -o none

echo "==> VM, network and storage (infra/main.bicep)"
az deployment group create -g "$RG" -n shelfie -f main.bicep -o none \
  -p adminSshPublicKey="$(cat "$SSH_KEY")" adminSourceAddress="$ADMIN_IP" hostname="$APP_HOSTNAME"
IP=$(output publicIp)
VM=$(output vmName)
STORAGE=$(output storageAccountName)
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

VM: $VM   Storage account: $STORAGE   SSH: ssh shelfie-admin@$IP (allowed from $ADMIN_IP only)
The first push to main now deploys; Caddy fetches the certificate once the A record resolves.
SUMMARY
