#!/bin/sh
set -eu
app=${1:?Pass the packaged app path}
codesign --verify --deep --strict "$app"
APP_BUNDLE="$app" python3 - <<'PY'
from pathlib import Path
import os,plistlib,re,subprocess
app=Path(os.environ['APP_BUNDLE']);info=plistlib.loads((app/'Contents/Info.plist').read_bytes());binary=app/'Contents/MacOS/Thread'
assert info['CFBundleIdentifier']=='xyz.trythread.buddy.beta'
assert info['CFBundleShortVersionString']=='0.9.0'
assert info['LSMinimumSystemVersion']=='14.0'
assert subprocess.check_output(['lipo','-archs',str(binary)],text=True).strip()=='arm64'
metadata=subprocess.check_output(['otool','-l',str(binary)],text=True)
versions=re.findall(r'\bminos\s+(\d+)\.(\d+)',metadata)
assert versions and all((int(a),int(b))<=(14,0) for a,b in versions),'Binary exceeds the advertised minimum macOS version'
assert (app/'Contents/Helpers/thread-voice-node').is_file()
assert (app/'Contents/Resources/NeuralVoice/engine.mjs').is_file()
assert not list(app.rglob('.env*')),'Private environment files must not be packaged'
print('PASS: packaged app signature, identifier, version, arm64 target, macOS 14 minimum and bundled neural runtime; no environment files bundled.')
PY
