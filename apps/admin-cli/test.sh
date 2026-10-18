#!/usr/bin/env bash
# Runs the CLI acceptance tests inside a private D-Bus session with an unlocked GNOME keyring, so the
# tool's Linux credential store (secret-tool) is the real one (ADR-0002). Needs dbus, gnome-keyring,
# libsecret-tools, node 24 and the .NET 10 SDK.
set -euo pipefail
cd "$(dirname "$0")"
export XDG_DATA_HOME="$(mktemp -d)"
exec dbus-run-session -- bash -c 'printf "test\n" | gnome-keyring-daemon --unlock --components=secrets >/dev/null && dotnet test --solution ShelfieAdmin.slnx "$@"' -- "$@"
