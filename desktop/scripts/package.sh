#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
THREAD_ROOT="$PWD"
THREAD_OUT="${1:-$THREAD_ROOT/dist}"
THREAD_CONFIG="${THREAD_BUILD_CONFIGURATION:-release}"
mkdir -p "$THREAD_OUT"
test -f "$THREAD_ROOT/../web/dist-app/app.html" || { echo "Build the React interface first."; exit 1; }
swift build -c "$THREAD_CONFIG"
THREAD_BIN_DIR="$(swift build -c "$THREAD_CONFIG" --show-bin-path)"
THREAD_STAGE="$(mktemp -d "${TMPDIR%/}/thread-package.XXXXXX")"
trap 'rm -rf "$THREAD_STAGE"' EXIT
THREAD_APP="$THREAD_STAGE/Thread.app"
mkdir -p "$THREAD_APP/Contents/MacOS" "$THREAD_APP/Contents/Resources"
cp "$THREAD_BIN_DIR/Thread" "$THREAD_APP/Contents/MacOS/Thread"
mkdir -p "$THREAD_APP/Contents/Resources/ui"
cp "$THREAD_ROOT/../web/dist-app/app.html" "$THREAD_APP/Contents/Resources/ui/app.html"
cp "$THREAD_ROOT/../web/public/third-party-notices.txt" "$THREAD_APP/Contents/Resources/Third-party-notices.txt"
cat > "$THREAD_APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>Thread</string>
<key>CFBundleIdentifier</key><string>xyz.trythread.mac</string>
<key>CFBundleName</key><string>Thread</string>
<key>CFBundleDisplayName</key><string>Thread</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>0.3.0</string>
<key>CFBundleVersion</key><string>2</string>
<key>CFBundleIconFile</key><string>Thread</string>
<key>LSMinimumSystemVersion</key><string>14.0</string>
<key>NSHighResolutionCapable</key><true/>
<key>NSPrincipalClass</key><string>NSApplication</string>
<key>NSAppTransportSecurity</key><dict><key>NSAllowsLocalNetworking</key><true/></dict>
</dict></plist>
PLIST
swift scripts/make-icon.swift "$THREAD_ROOT/.build/Thread.iconset"
iconutil -c icns "$THREAD_ROOT/.build/Thread.iconset" -o "$THREAD_APP/Contents/Resources/Thread.icns"
xattr -dr com.apple.FinderInfo "$THREAD_APP" 2>/dev/null || true
xattr -dr com.apple.ResourceFork "$THREAD_APP" 2>/dev/null || true
if [[ -n "${THREAD_SIGNING_IDENTITY:-}" ]]; then
  codesign --force --options runtime --timestamp --sign "$THREAD_SIGNING_IDENTITY" "$THREAD_APP"
else
  codesign --force --sign - "$THREAD_APP"
fi
codesign --verify --deep --strict "$THREAD_APP"
ln -s /Applications "$THREAD_STAGE/Applications"
cat > "$THREAD_STAGE/Read me.txt" <<'README'
Thread 0.3.0 — Early access
Drag Thread into Applications, then open it.
Requires an Apple silicon Mac running macOS 14 or later.

This local development build is ad-hoc signed, not Apple-notarized.
It is intended for testing; a public release requires Developer ID signing and notarization.

Open Providers, add your API key, load available models, choose a text model, and save.
API keys stay in macOS Keychain. Chat history is stored locally in Application Support/Thread.
Thread sends your conversation directly to the provider you select.
README
hdiutil create -volname "Thread" -srcfolder "$THREAD_STAGE" -ov -format UDZO "$THREAD_OUT/Thread-0.3.0-macOS-arm64.dmg"
(cd "$THREAD_OUT" && shasum -a 256 Thread-0.3.0-macOS-arm64.dmg > SHA256SUMS.txt)
