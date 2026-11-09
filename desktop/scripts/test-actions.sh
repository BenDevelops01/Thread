#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
output=$(mktemp -d /tmp/thread-checks.XXXXXX)
trap 'rm -rf "$output"' EXIT
xcrun swiftc -parse-as-library desktop/Sources/ThreadBuddy/Model.swift desktop/Sources/ThreadBuddy/SessionStore.swift desktop/Sources/ThreadBuddy/CodexSubscription.swift desktop/Sources/ThreadBuddy/DesktopServices.swift desktop/Sources/ThreadBuddy/ScreenContext.swift desktop/Tests/ActionChecks.swift -o "$output/checks"
"$output/checks"
