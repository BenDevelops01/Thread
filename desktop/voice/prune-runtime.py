from pathlib import Path
import shutil,sys,subprocess
runtime=Path(sys.argv[1]);root=runtime/'NeuralVoice/node_modules'
for native in (root/'onnxruntime-node/bin').glob('napi-*'):
 for name in ['linux','win32','darwin/x64']:
  p=native/name
  if p.exists():shutil.rmtree(p)
 for p in native.glob('darwin/arm64/libonnxruntime.*.*.dylib'):
  alias=p.parent/'libonnxruntime.1.dylib'
  if alias.exists() and not alias.is_symlink():alias.unlink();alias.symlink_to(p.name)
for folder in [root/'onnxruntime-web/dist',root/'@huggingface/transformers/dist']:
 for p in folder.glob('*.wasm'):p.unlink()
keep={'af_heart','af_bella','af_nicole','am_michael','bf_emma','bm_george'}
for p in (root/'kokoro-js/voices').glob('*.bin'):
 if p.stem not in keep:p.unlink()
for p in root.rglob('*.map'):p.unlink()
subprocess.run(['strip','-S','-x',str(runtime/'thread-voice-node')],check=True)
for p in (root/'onnxruntime-node/bin').glob('napi-*/darwin/arm64/*.dylib'):
 if not p.is_symlink():subprocess.run(['strip','-S','-x',str(p)],check=True)
