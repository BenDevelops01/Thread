#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
output=$(mktemp -d /tmp/thread-voice-checks.XXXXXX)
trap 'rm -rf "$output"' EXIT
xcrun swiftc -swift-version 5 -parse-as-library desktop/Sources/ThreadBuddy/Model.swift desktop/Sources/ThreadBuddy/SessionStore.swift desktop/Sources/ThreadBuddy/CodexSubscription.swift desktop/Sources/ThreadBuddy/DesktopServices.swift desktop/Sources/ThreadBuddy/ScreenContext.swift desktop/Sources/ThreadBuddy/NeuralSpeech.swift desktop/Sources/ThreadBuddy/VoiceController.swift desktop/Tests/VoiceChecks.swift -o "$output/checks"
"$output/checks"
