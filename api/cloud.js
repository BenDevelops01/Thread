import{backendURL,publicKey}from'./_lib/thread.js';
import{allowedCloudRoute}from'./_lib/cloud-routes.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 try{
  if(!backendURL||!publicKey)return res.status(503).json({message:'Workspace configuration is unavailable.'});
  const incoming=new URL(req.url,'http://localhost');const path=req.query?.path||incoming.searchParams.get('path');incoming.searchParams.delete('path');
  if(!allowedCloudRoute(path,req.method,incoming.searchParams))return res.status(404).json({message:'Endpoint unavailable.'});
  const headers={apikey:publicKey};for(const name of['authorization','content-type','accept','prefer','range','range-unit'])if(req.headers[name])headers[name]=req.headers[name];
  // Ignore the browser client's placeholder key; never use an administrative key here.
  if(headers.authorization==='Bearer thread-browser-client')delete headers.authorization;
  const init={method:req.method,headers,redirect:'error',signal:AbortSignal.timeout(path==='functions/v1/thread-buddy'?55000:20000)};
  if(!['GET','HEAD'].includes(req.method)){const body=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});if(Buffer.byteLength(body)>(path==='functions/v1/thread-buddy'?2000000:64000))return res.status(413).json({message:'Request too large.'});init.body=body;}
  const target=new URL(path,backendURL.replace(/\/$/,'')+'/');target.search=incoming.searchParams.toString();const upstream=await fetch(target,init);
  for(const name of['content-type','content-range','range-unit','retry-after'])if(upstream.headers.has(name))res.setHeader(name,upstream.headers.get(name));
  res.statusCode=upstream.status;res.end(req.method==='HEAD'?undefined:Buffer.from(await upstream.arrayBuffer()));
 }catch{return res.status(503).json({message:'Unable to reach the workspace. Please retry.'});}
}
