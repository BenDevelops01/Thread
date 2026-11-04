#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .build/checks
swiftc -parse-as-library Sources/UnifiedAI/Models.swift Sources/UnifiedAI/ProviderClient.swift Tests/Checks.swift -o .build/checks/run
THREAD_PORT_FILE="$(mktemp .build/checks/port.XXXXXX)"
python3 Tests/fixture_server.py "$THREAD_PORT_FILE" &
THREAD_FIXTURE_PID=$!
trap 'kill "$THREAD_FIXTURE_PID" 2>/dev/null || true; rm -f "$THREAD_PORT_FILE"' EXIT
for attempt in {1..50}; do [[ -s "$THREAD_PORT_FILE" ]] && break; sleep .1; done
.build/checks/run "$(cat "$THREAD_PORT_FILE")"
