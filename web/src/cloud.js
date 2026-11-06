import{createClient}from'@supabase/supabase-js';
export const cloudBase=location.origin+'/api/cloud';
export const db=createClient(cloudBase,'thread-browser-client',{auth:{storageKey:'thread-workspace-session'}});
export async function cloudFunction(name,body,session){const r=await fetch('/api/cloud?path=functions/v1/'+name,{method:'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.access_token}:{})},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error||data.message||'Unable to complete this request.');return data;}
