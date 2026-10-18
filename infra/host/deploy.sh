#!/usr/bin/env bash
# Activates an unpacked release on the VM. Runs as root; called by fetch-release.sh or by hand to
# roll back: `bash /opt/shelfie/releases/<sha>/host/deploy.sh <sha>`.
set -euo pipefail
sha=${1:?usage: deploy.sh <sha>}
root=/opt/shelfie
release=$root/releases/$sha
[[ -d $release ]] || { echo "release $release not found" >&2; exit 1; }
previous=$(readlink -f "$root/current" 2>/dev/null || true)

# backup.sh needs pg_dump; a VM created before the move to PostgreSQL gains it here.
command -v pg_dump >/dev/null 2>&1 || DEBIAN_FRONTEND=noninteractive apt-get install -y -q postgresql-client >/dev/null

install -m 0644 "$release/host/Caddyfile" /etc/caddy/Caddyfile
install -m 0644 "$release/host/shelfie.service" /etc/systemd/system/shelfie.service
install -m 0644 "$release/host/shelfie-backup.cron" /etc/cron.d/shelfie-backup
install -m 0755 "$release/host/backup.sh" /usr/local/bin/shelfie-backup
caddy validate --config /etc/caddy/Caddyfile >/dev/null
systemctl daemon-reload

healthy() {
  for _ in $(seq 1 30); do
    curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1 && return 0
    sleep 1
  done
  return 1
}

ln -sfn "$release" "$root/current"
systemctl enable shelfie >/dev/null 2>&1
systemctl restart shelfie
if ! healthy; then
  echo "release $sha failed its health check" >&2
  journalctl -u shelfie -n 20 --no-pager >&2 || true
  if [[ -n $previous && $previous != "$release" ]]; then
    ln -sfn "$previous" "$root/current"
    systemctl restart shelfie
    echo "rolled back to $(basename "$previous")" >&2
  fi
  exit 1
fi
systemctl reload caddy

# Keep the current release and the two before it.
ls -1dt "$root"/releases/*/ | tail -n +4 | while read -r old; do
  [[ $(readlink -f "$old") == "$release" ]] || rm -rf "$old"
done
echo "release $sha is live"
