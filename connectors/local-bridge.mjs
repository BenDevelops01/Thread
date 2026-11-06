#!/usr/bin/env node
import http from 'node:http';
import{agentManager}from'./agents.mjs';
import crypto from 'node:crypto';
import fs from'node:fs';import path from'node:path';
import{fileURLToPath}from'node:url';
import{PROVIDERS,listModels,generate}from'./providers.mjs';
export function siteOrigin(value){const url=new URL(value);if(url.username||url.password||url.pathname!=='/'||url.search||url.hash||!(url.protocol==='https:'||(url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname))))throw Error('Use the exact HTTPS website origin, or a loopback development origin.');return url.origin;}
export function sameSecret(a,b){const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&crypto.timingSafeEqual(x,y);}
export function createBridge({origin,env=process.env,token=crypto.randomBytes(32).toString('base64url'),fetcher=fetch}={}){
 const allowed=siteOrigin(origin),runs=new Map();let reportToken=env.THREAD_WEBHOOK_TOKEN||'';
 async function report(run){if(!run.taskId||!reportToken)return;try{const r=await fetcher(allowed+'/api/events',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+reportToken},body:JSON.stringify({task_id:run.taskId,status:run.status,detail:run.status==='done'?`${run.providerName} finished the task. Open your bridge panel to read the result.`:run.status==='working'?`${run.providerName} is running ${run.model}.`:run.status==='paused'?'Run cancelled from Thread.':run.error||'The model run failed.'}),signal:AbortSignal.timeout(10000),redirect:'error'});if(!r.ok)throw Error();run.syncError='';}catch{run.syncError='The model ran, but its workspace update could not be delivered.';}}
 function publicRun(run){return{id:run.id,taskId:run.taskId,model:run.model,provider:run.provider,status:run.status,prompt:run.prompt,output:run.output,error:run.error,syncError:run.syncError,createdAt:run.createdAt};}
 const modelDir=path.join(env.THREAD_DATA_DIR||path.join(process.cwd(),'.thread-data'),'models');fs.mkdirSync(modelDir,{recursive:true,mode:0o700});
 for(const file of fs.readdirSync(modelDir).filter(f=>f.endsWith('.json'))){try{const r=JSON.parse(fs.readFileSync(path.join(modelDir,file)));if(r.status==='working')r.status='interrupted';runs.set(r.id,r)}catch{}}
 function saveModel(r){fs.writeFileSync(path.join(modelDir,r.id+'.json'),JSON.stringify(publicRun(r)),{mode:0o600})}
 const agents=agentManager({env,token,dataDir:path.join(env.THREAD_DATA_DIR||path.join(process.cwd(),'.thread-data'),'agents'),port:Number(env.THREAD_BRIDGE_PORT||8787)});
 const server=http.createServer(async(req,res)=>{
  const incomingOrigin=req.headers.origin;if(incomingOrigin&&incomingOrigin!==allowed){res.writeHead(403);return res.end('Origin denied');}
  if(incomingOrigin===allowed){res.setHeader('Access-Control-Allow-Origin',allowed);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','authorization,content-type');res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');res.setHeader('Access-Control-Allow-Private-Network','true');}
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  if(!sameSecret(req.headers.authorization,'Bearer '+token))return send(401,{error:'Pairing token required.'});
  let input={};try{if(req.method==='POST'){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16000)return send(413,{error:'Request too large.'});}input=JSON.parse(raw||'{}');}
   const url=new URL(req.url,'http://localhost');
   if(req.method==='GET'&&url.pathname==='/agents')return send(200,{runs:agents.list(),approvals:agents.approvals()});
   if(req.method==='GET'&&url.pathname==='/agents/available')return send(200,{agents:agents.available()});
   if(req.method==='POST'&&url.pathname==='/agents')return send(202,agents.start(input));
   if(req.method==='POST'&&url.pathname==='/agent-hook')return send(200,{allow:await agents.hook(input.runId,input.input)});
   const decision=url.pathname.match(/^\/approvals\/([a-f0-9-]{36})$/);if(req.method==='POST'&&decision){if(typeof input.allow!=='boolean')return send(400,{error:'Choose approve or deny'});agents.decide(decision[1],input.allow);return send(200,{ok:true});}
   const agentPath=url.pathname.match(/^\/agents\/([a-f0-9-]{36})$/);if(req.method==='DELETE'&&agentPath){agents.cancel(agentPath[1]);return send(200,{ok:true});}

   if(req.method==='GET'&&url.pathname==='/health')return send(200,{name:'Thread bridge',version:1,reportingConfigured:!!reportToken,providers:PROVIDERS.map(p=>({id:p.id,name:p.name,local:!!p.local,configured:p.local||!!env[p.env]}))});
   if(req.method==='POST'&&url.pathname==='/configure'){if(!/^thr_[a-f0-9]{64}$/.test(input.token||''))return send(400,{error:'Use a Thread connection token.'});reportToken=input.token;return send(200,{ok:true});}
   if(req.method==='GET'&&url.pathname==='/models')return send(200,{models:await listModels(url.searchParams.get('provider'),env,fetcher)});
   if(req.method==='GET'&&url.pathname==='/runs')return send(200,{runs:[...runs.values()].map(publicRun).reverse()});
   const match=url.pathname.match(/^\/runs\/([a-f0-9-]{36})$/);
   if(match&&req.method==='GET'){const r=runs.get(match[1]);return send(r?200:404,r?publicRun(r):{error:'Run not found.'});}
   if(match&&req.method==='DELETE'){const r=runs.get(match[1]);if(!r)return send(404,{error:'Run not found.'});if(r.status==='working')r.controller.abort();return send(200,{ok:true});}
   if(req.method==='POST'&&url.pathname==='/runs'){
    const provider=PROVIDERS.find(p=>p.id===input.provider);if(!provider||(!provider.local&&!env[provider.env]))return send(400,{error:'Provider is not configured.'});
    if(typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>12000||typeof input.model!=='string'||!input.model||input.model.length>200)return send(400,{error:'Choose a model and enter a prompt up to 12,000 characters.'});
    if(input.taskId&&!/^[a-f0-9-]{36}$/.test(input.taskId))return send(400,{error:'Invalid task ID.'});
    if([...runs.values()].filter(x=>x.status==='working').length>=2)return send(429,{error:'Two runs are already active. Wait or cancel one.'});
    if(input.taskId&&!reportToken)return send(400,{error:'Configure a workspace connection token first.'});
    while(runs.size>=20){const old=[...runs.values()].find(x=>x.status!=='working');if(!old)break;runs.delete(old.id);try{fs.unlinkSync(path.join(modelDir,old.id+'.json'))}catch{}}
    const run={id:crypto.randomUUID(),provider:provider.id,providerName:provider.name,model:input.model,prompt:input.prompt,taskId:input.taskId||null,status:'working',createdAt:new Date().toISOString(),output:'',error:'',syncError:'',controller:new AbortController()};runs.set(run.id,run);saveModel(run);send(202,publicRun(run));
    const timeout=setTimeout(()=>run.controller.abort(),180000);
    (async()=>{try{await report(run);run.output=await generate(run.provider,run.model,input.prompt,env,run.controller.signal,fetcher);run.status='done';}catch(error){run.status=run.controller.signal.aborted?'paused':'failed';run.error=run.controller.signal.aborted?'Run cancelled or timed out.':error.message;}finally{clearTimeout(timeout);await report(run);saveModel(run);}})();return;
   }
   return send(404,{error:'Not found.'});
  }catch(error){return send(400,{error:error.message||'Unable to complete request.'});}
 });
 server.on('close',()=>agents.close());server.requestTimeout=330000;server.headersTimeout=10000;return{server,token,origin:allowed};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 try{const flag=process.argv.indexOf('--origin'),origin=flag>=0?process.argv[flag+1]:process.env.THREAD_SITE_ORIGIN;if(!origin)throw Error('Usage: node connectors/local-bridge.mjs --origin <your Thread website origin>');const port=Number(process.env.THREAD_BRIDGE_PORT||8787);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid bridge port.');const bridge=createBridge({origin});bridge.server.listen(port,'127.0.0.1',()=>{console.log(`Thread bridge is listening on loopback port ${port}.\nPairing token (keep private, valid until restart):\n${bridge.token}\n\nOpen Connections in Thread and paste the token. Only ${bridge.origin} is allowed.\nProvider keys are read from your environment, never sent to Thread.`);});bridge.server.on('error',()=>{console.error('Could not start the bridge. The port may already be in use.');process.exitCode=1;});}catch(error){console.error(error.message);process.exitCode=1;}
}
