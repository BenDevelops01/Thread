#!/bin/sh
set -eu
repo_dir=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
cd "$repo_dir"
if [ ! -f desktop/voice/node_modules/kokoro-js/package.json ]; then npm ci --prefix desktop/voice --ignore-scripts; fi
runtime_root=$(mktemp -d /tmp/thread-neural-runtime.XXXXXX)
mkdir -p "$runtime_root/NeuralVoice" "$repo_dir/.thread-data"
node_source=$(node -p 'process.execPath')
lipo "$node_source" -thin arm64 -output "$runtime_root/thread-voice-node" 2>/dev/null || cp -X "$node_source" "$runtime_root/thread-voice-node"
chmod 755 "$runtime_root/thread-voice-node"
ditto --noextattr --norsrc desktop/voice/node_modules "$runtime_root/NeuralVoice/node_modules"
cp -X desktop/voice/engine.mjs desktop/voice/pack.json desktop/voice/package.json desktop/voice/package-lock.json "$runtime_root/NeuralVoice/"
python3 desktop/voice/prune-runtime.py "$runtime_root"

curl -fsSL https://raw.githubusercontent.com/nodejs/node/v24.21.0/LICENSE -o "$runtime_root/NeuralVoice/NODE-LICENSE.txt"
cp -X desktop/voice/THIRD-PARTY-NOTICES.txt "$runtime_root/NeuralVoice/"
printf '%s\n' "$runtime_root" > "$repo_dir/.thread-data/voice-runtime-path"
printf 'Prepared local neural voice runtime: %s\n' "$runtime_root"
