#!/bin/sh
set -eu
repo_dir=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
cd "$repo_dir"
swift build --package-path desktop --configuration release --arch arm64
binary_dir=$(swift build --package-path desktop --configuration release --arch arm64 --show-bin-path)
bundle_root=$(mktemp -d /tmp/thread-native-beta.XXXXXX)
app_dir="$bundle_root/Thread Beta.app"
mkdir -p "$app_dir/Contents/MacOS" "$app_dir/Contents/Resources" "$repo_dir/web/public/downloads"
cp -X "$binary_dir/Thread" "$app_dir/Contents/MacOS/Thread"
cp -X desktop/Resources/Info.plist "$app_dir/Contents/Info.plist"
if [ -f desktop/Resources/Thread.icns ]; then cp -X desktop/Resources/Thread.icns "$app_dir/Contents/Resources/Thread.icns"; fi
xattr -dr com.apple.FinderInfo "$app_dir" 2>/dev/null || true
xattr -dr com.apple.ResourceFork "$app_dir" 2>/dev/null || true
mkdir -p "$app_dir/Contents/Resources/Buddies"
cp -X desktop/Resources/Buddies/*.png "$app_dir/Contents/Resources/Buddies/"
if [ ! -f "$repo_dir/.thread-data/voice-runtime-path" ]; then "$repo_dir/desktop/scripts/prepare-voice-runtime.sh"; fi
voice_runtime=$(cat "$repo_dir/.thread-data/voice-runtime-path")
cp -X desktop/voice/engine.mjs desktop/voice/pack.json desktop/voice/package.json desktop/voice/package-lock.json desktop/voice/THIRD-PARTY-NOTICES.txt "$voice_runtime/NeuralVoice/"
mkdir -p "$app_dir/Contents/Helpers"
cp -X "$voice_runtime/thread-voice-node" "$app_dir/Contents/Helpers/thread-voice-node"
ditto --noextattr --norsrc "$voice_runtime/NeuralVoice" "$app_dir/Contents/Resources/NeuralVoice"
find "$app_dir/Contents/Resources/NeuralVoice" -type f \( -name '*.node' -o -name '*.dylib' \) -exec codesign --force --sign - {} \;
codesign --force --sign - --options runtime --entitlements desktop/Resources/VoiceRuntime.entitlements "$app_dir/Contents/Helpers/thread-voice-node"
codesign --force --sign - --options runtime --entitlements desktop/Resources/Thread.entitlements "$app_dir"
codesign --verify --strict --verbose=2 "$app_dir"
stage_dir=$(mktemp -d /tmp/thread-dmg.XXXXXX)
trap 'rm -rf "$stage_dir"' EXIT
ditto --noextattr --norsrc "$app_dir" "$stage_dir/Thread Beta.app"
ln -s /Applications "$stage_dir/Applications"
cp desktop/Resources/START-HERE.txt "$stage_dir/START HERE.txt"
hdiutil create -volname "Thread Beta" -srcfolder "$stage_dir" -ov -format UDZO "$repo_dir/web/public/downloads/Thread-Beta-0.8.0-arm64.dmg"
python3 - <<'PY'
from pathlib import Path
import json,hashlib
p=Path('web/public/downloads/Thread-Beta-0.8.0-arm64.dmg')
d={'version':'0.8.0','filename':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'architecture':'arm64','minimumMacOS':'14.0','notarized':False,'channel':'beta'}
Path('web/public/downloads/release.json').write_text(json.dumps(d,indent=2)+'\n')
print(json.dumps(d))
PY

mkdir -p "$repo_dir/.thread-data"
printf "%s\n" "$app_dir" > "$repo_dir/.thread-data/native-bundle-path"
printf "Native verification bundle: %s\n" "$app_dir"
