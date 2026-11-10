// Isolated local speech process. No network server and no provider credentials.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import {KokoroTTS,TextSplitterStream} from 'kokoro-js';
import {StyleTextToSpeech2Model,AutoTokenizer,env} from '@huggingface/transformers';
process.umask(0o077);
const root=path.resolve(process.argv[2]||'');
if(!path.isAbsolute(process.argv[2]||''))throw Error('Absolute private voice directory required');
const pack=JSON.parse(await fs.readFile(new URL('./pack.json',import.meta.url),'utf8'));
const modelDir=path.join(root,'pack'),audioDir=path.join(root,'audio');
await fs.mkdir(audioDir,{recursive:true,mode:0o700});
for(const f of await fs.readdir(audioDir))if(/^[a-f0-9-]+-\d+\.wav$/.test(f))await fs.rm(path.join(audioDir,f),{force:true});
const emit=value=>process.stdout.write(JSON.stringify(value)+'\n');
const voices=new Set(['af_heart','af_bella','af_nicole','am_michael','bf_emma','bm_george']);
const shutdownAbort=new AbortController();const cancelled=new Set(),activeIds=new Set();let tts,loading,chain=Promise.resolve(),pending=0;
async function prepare(){
 if(tts)return tts;if(loading)return loading;
 loading=(async()=>{
  const total=pack.files.reduce((n,f)=>n+f.bytes,0);let complete=0;
  for(const file of pack.files){
   const target=path.join(modelDir,file.path);await fs.mkdir(path.dirname(target),{recursive:true,mode:0o700});
   let valid=false;try{const bytes=await fs.readFile(target);valid=bytes.length===file.bytes&&crypto.createHash('sha256').update(bytes).digest('hex')===file.sha256}catch{}
   if(!valid){
    emit({type:'progress',percent:Math.floor(complete/total*100),message:'Downloading neural voice pack'});
    const response=await fetch(`https://huggingface.co/${pack.model}/resolve/${pack.revision}/${file.path}`,{signal:AbortSignal.any([AbortSignal.timeout(300000),shutdownAbort.signal])});
    if(!response.ok)throw Error('Voice pack download failed');
    const temporary=target+'.part',handle=await fs.open(temporary,'w',0o600),hash=crypto.createHash('sha256');let received=0,last=-1;
    try{for await(const chunk of response.body){received+=chunk.length;if(received>file.bytes)throw Error('Voice pack size mismatch');await handle.write(chunk);hash.update(chunk);const percent=Math.floor((complete+received)/total*100);if(percent!==last){emit({type:'progress',percent,message:'Downloading neural voice pack'});last=percent}}}finally{await handle.close()}
    if(received!==file.bytes||hash.digest('hex')!==file.sha256){await fs.rm(temporary,{force:true});throw Error('Voice pack checksum mismatch')}
    await fs.rename(temporary,target);
   }
   complete+=file.bytes;
  }
  emit({type:'progress',percent:100,message:'Warming up neural voices'});
  env.allowRemoteModels=false;env.allowLocalModels=true;env.useBrowserCache=false;env.cacheDir=path.join(root,'cache');
  const options={dtype:'q8',device:'cpu',session_options:{intraOpNumThreads:2,interOpNumThreads:1}};
  const [model,tokenizer]=await Promise.all([StyleTextToSpeech2Model.from_pretrained(modelDir,options),AutoTokenizer.from_pretrained(modelDir)]);
  tts=new KokoroTTS(model,tokenizer);
  await fs.writeFile(path.join(root,'ready.json'),JSON.stringify({revision:pack.revision,version:1}),{mode:0o600});
  emit({type:'ready'});return tts;
 })().catch(error=>{loading=null;throw error});return loading;
}
async function speak(input){
 const{id,text,voice,speed}=input;if(cancelled.has(id)){cancelled.delete(id);return};activeIds.add(id);
 if(!/^[a-f0-9-]{36}$/.test(id)||typeof text!=='string'||!text.trim()||text.length>2400||!voices.has(voice)||!Number.isFinite(speed)||speed<0.8||speed>1.2)throw Error('Invalid speech request');
 const engine=await prepare();if(cancelled.has(id))return;
 const stream=new TextSplitterStream();stream.push(text);stream.close();let index=0;
 for await(const part of engine.stream(stream,{voice,speed})){
  if(cancelled.has(id))break;
  const file=path.join(audioDir,`${id}-${index++}.wav`);await part.audio.save(file);
  if(cancelled.has(id)){await fs.rm(file,{force:true});break}
  emit({type:'audio',id,path:file});
 }
 if(!cancelled.has(id))emit({type:'done',id});cancelled.delete(id);activeIds.delete(id);
}
const lines=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
lines.on('line',line=>{
 if(line.length>20000)return;
 let input;try{input=JSON.parse(line)}catch{return}
 if(input.type==='cancel'&&typeof input.id==='string'){cancelled.add(input.id);return}
 if(input.type==='shutdown'){shutdown();return}
 if(!['load','speak'].includes(input.type))return;if(pending>=3){emit({type:'error',id:input.id||null,message:'Voice is busy. Try the voice again in a moment.'});return};pending++;
 chain=chain.then(()=>input.type==='load'?prepare():speak(input)).catch(()=>emit({type:'error',id:input.id||null,message:'Neural voice could not finish. Check the connection for the one-time download, then try again.'})).finally(()=>pending--);
});
let closing=false;async function shutdown(cancel=true){if(cancel){shutdownAbort.abort();for(const id of activeIds)cancelled.add(id)};if(closing)return;closing=true;await chain.catch(()=>{});try{await tts?.model?.dispose()}catch{};tts=null;process.exit(0)}
process.stdout.on('error',()=>{});process.on('SIGTERM',shutdown);lines.on('close',()=>shutdown(false));
emit({type:'started'});
